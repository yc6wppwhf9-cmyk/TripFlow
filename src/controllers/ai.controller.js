const Anthropic = require('@anthropic-ai/sdk');
const prisma = require('../config/db');
const approvalService = require('../services/approval.service');
const { checkPolicyLimits } = require('./booking.controller');
const travelService = require('../services/travel.service');

const anthropic = process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('REPLACE')
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const SEARCH_TRAVEL_TOOL = {
  name: 'search_travel',
  description: 'Search for real flight prices, train schedules, or hotel rates. Call this BEFORE presenting any options to the employee so you show actual fares — never guess prices.',
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['FLIGHT', 'TRAIN', 'HOTEL'], description: 'Type of travel to search' },
      origin: { type: 'string', description: 'Departure city (flights/trains)' },
      destination: { type: 'string', description: 'Destination city' },
      date: { type: 'string', description: 'Travel / check-in date in YYYY-MM-DD format' },
      checkOut: { type: 'string', description: 'Check-out date for hotels in YYYY-MM-DD format' }
    },
    required: ['type', 'destination', 'date']
  }
};

const BOOKING_TOOL = {
  name: 'create_booking',
  description: 'Create a corporate travel booking request once the employee has confirmed their choice from the real search results.',
  input_schema: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['FLIGHT', 'HOTEL', 'TRAIN', 'CAB'] },
      origin: { type: 'string', description: 'Departure city or current location' },
      destination: { type: 'string', description: 'Destination city or hotel name' },
      date: { type: 'string', description: 'Travel date in YYYY-MM-DD format' },
      cost: { type: 'number', description: 'Exact price from search results in INR' }
    },
    required: ['type', 'origin', 'destination', 'date', 'cost']
  }
};

async function executeTravelSearch(type, origin, destination, date, checkOut) {
  if (type === 'FLIGHT') return travelService.searchFlights(origin, destination, date);
  if (type === 'TRAIN') return travelService.searchTrains(origin, destination, date);
  if (type === 'HOTEL') return travelService.searchHotels(destination, date, checkOut);
  return { available: false, reason: `Unsupported search type: ${type}` };
}

exports.chat = async (req, res) => {
  try {
    if (!anthropic) {
      return res.json({
        reply: 'AI assistant is not configured. Please set ANTHROPIC_API_KEY in environment variables.',
        booking: null
      });
    }

    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const user = req.user;

    // Fetch policy limits
    let policyLimits = { flightLimit: 'unlimited', hotelLimit: 'unlimited', cabLimit: 'unlimited', trainLimit: 'unlimited' };
    if (user.employee?.policyId) {
      const policy = await prisma.policy.findUnique({ where: { id: user.employee.policyId } });
      if (policy?.rules) policyLimits = { ...policyLimits, ...policy.rules };
    }

    // Fetch current month spend
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { _sum } = await prisma.booking.aggregate({
      where: { employeeId: user.employee?.id, stage: { not: 'REJECTED' }, createdAt: { gte: startOfMonth } },
      _sum: { cost: true }
    });
    const spent = _sum.cost || 0;

    const systemPrompt = `You are TripFlow's AI travel assistant helping ${user.name} (${user.employee?.department || 'company'} dept) book corporate travel.

Policy limits (INR):
- Flights: ₹${policyLimits.flightLimit} per booking
- Hotels: ₹${policyLimits.hotelLimit} per night
- Trains: ₹${policyLimits.trainLimit} per booking
- Cabs: ₹${policyLimits.cabLimit} per booking
- Month spend so far: ₹${spent.toFixed(2)}

Rules:
1. Collect: travel type, origin, destination, date (and check-out for hotels).
2. ALWAYS call search_travel to get real prices before presenting options. Never invent fares.
3. Present the results clearly with price, timing, and duration.
4. Warn if cost exceeds policy limit but let the employee decide.
5. Once employee confirms a specific option, call create_booking with the exact price from search results.
6. Be concise — 2-3 sentences unless listing options.

Today: ${new Date().toISOString().split('T')[0]}`;

    // Agentic loop — Claude may call search_travel before create_booking
    let currentMessages = [...messages];
    const MAX_ITERATIONS = 6;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        tools: [SEARCH_TRAVEL_TOOL, BOOKING_TOOL],
        messages: currentMessages
      });

      // ── Tool use ─────────────────────────────────────────────────────────
      if (response.stop_reason === 'tool_use') {
        const toolBlock = response.content.find(b => b.type === 'tool_use');

        // search_travel — fetch real data and loop back to Claude
        if (toolBlock?.name === 'search_travel') {
          const { type, origin, destination, date, checkOut } = toolBlock.input;
          const result = await executeTravelSearch(type, origin || '', destination, date, checkOut);

          currentMessages = [
            ...currentMessages,
            { role: 'assistant', content: response.content },
            {
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: JSON.stringify(result)
              }]
            }
          ];
          continue; // send results back to Claude
        }

        // create_booking — validate policy then write to DB
        if (toolBlock?.name === 'create_booking') {
          const { type, origin, destination, date, cost } = toolBlock.input;

          if (!user.employee) {
            return res.json({ reply: "I can only create bookings for employees. Your account type doesn't support this.", booking: null });
          }

          const violation = await checkPolicyLimits(user.employee.id, type, parseFloat(cost));
          if (violation) {
            return res.json({
              reply: `⚠️ Cannot book: ${violation.error} Please pick a lower-cost option or ask your manager for an override.`,
              booking: null,
              policyViolation: violation
            });
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
            reply: `✅ Booked! Your ${type.toLowerCase()} from **${origin}** to **${destination}** on ${date} (₹${cost}) has been submitted for approval.\n\nReference: **#${ref}**\n\nYour manager will review it shortly.`,
            booking
          });
        }
      }

      // ── Text response — conversation turn complete ─────────────────────
      const textBlock = response.content.find(b => b.type === 'text');
      return res.json({ reply: textBlock?.text || 'How can I help you plan your trip?', booking: null });
    }

    return res.json({ reply: 'Something went wrong in the search. Please try again.', booking: null });

  } catch (error) {
    console.error('AI chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
};
