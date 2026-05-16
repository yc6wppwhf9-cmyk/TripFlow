const Anthropic = require('@anthropic-ai/sdk');
const prisma = require('../config/db');
const approvalService = require('../services/approval.service');

const anthropic = process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('REPLACE')
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const BOOKING_TOOL = {
  name: 'create_booking',
  description: 'Create a corporate travel booking request once all details are confirmed by the employee.',
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['FLIGHT', 'HOTEL', 'TRAIN', 'CAB'] },
      origin: { type: 'string', description: 'Departure city or current location' },
      destination: { type: 'string', description: 'Destination city, airport, or hotel name' },
      date: { type: 'string', description: 'Travel date in YYYY-MM-DD format' },
      cost: { type: 'number', description: 'Estimated cost in USD' },
    },
    required: ['type', 'origin', 'destination', 'date', 'cost']
  }
};

exports.chat = async (req, res) => {
  try {
    if (!anthropic) {
      return res.json({
        reply: "AI assistant is not configured. Please set ANTHROPIC_API_KEY in environment variables.",
        booking: null
      });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const user = req.user;

    // Get employee policy limits
    let policyLimits = { flightLimit: 'unlimited', hotelLimit: 'unlimited', cabLimit: 'unlimited', trainLimit: 'unlimited' };
    if (user.employee?.policyId) {
      const policy = await prisma.policy.findUnique({ where: { id: user.employee.policyId } });
      if (policy?.rules) policyLimits = { ...policyLimits, ...policy.rules };
    }

    // Get current month's spend
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlySpend = await prisma.booking.aggregate({
      where: {
        employeeId: user.employee?.id,
        stage: { not: 'REJECTED' },
        createdAt: { gte: startOfMonth }
      },
      _sum: { cost: true }
    });

    const spent = monthlySpend._sum.cost || 0;

    const systemPrompt = `You are TripFlow's smart AI travel assistant helping ${user.name} from the ${user.employee?.department || 'company'} department book corporate travel.

Travel policy limits:
- Flights: $${policyLimits.flightLimit} per booking
- Hotels: $${policyLimits.hotelLimit} per night
- Trains: $${policyLimits.trainLimit} per booking
- Cabs: $${policyLimits.cabLimit} per booking
- This month's spend so far: $${spent.toFixed(2)}

Instructions:
1. Understand the travel need. Ask only for missing required info (origin, destination, date, travel type).
2. Suggest 2-3 realistic cost options for the route. Use current typical prices for Indian or international routes.
3. If estimated cost exceeds policy limits, warn the employee but still offer to proceed.
4. Once the employee confirms their choice, immediately call create_booking — do not ask again.
5. Be concise. 2-3 sentences max per reply unless listing options.

Today's date: ${new Date().toISOString().split('T')[0]}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      tools: [BOOKING_TOOL],
      messages
    });

    // Handle tool use — create the booking
    if (response.stop_reason === 'tool_use') {
      const toolBlock = response.content.find(b => b.type === 'tool_use');

      if (toolBlock?.name === 'create_booking') {
        const { type, origin, destination, date, cost } = toolBlock.input;

        if (!user.employee) {
          return res.json({ reply: "I can only create bookings for employees. Your account type doesn't support this.", booking: null });
        }

        const booking = await prisma.booking.create({
          data: {
            employeeId: user.employee.id,
            type,
            details: { origin, destination, date },
            cost: parseFloat(cost),
            stage: 'PENDING_MANAGER'
          }
        });

        await approvalService.submitRequest(booking.id);

        const ref = booking.id.slice(0, 8).toUpperCase();
        return res.json({
          reply: `✅ Booked! Your ${type.toLowerCase()} from **${origin}** to **${destination}** on ${date} ($${cost}) has been submitted.\n\nReference: **#${ref}**\n\nYour manager will review it shortly. Need anything else?`,
          booking
        });
      }
    }

    const textBlock = response.content.find(b => b.type === 'text');
    res.json({ reply: textBlock?.text || "How can I help you plan your trip?", booking: null });

  } catch (error) {
    console.error('AI chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
