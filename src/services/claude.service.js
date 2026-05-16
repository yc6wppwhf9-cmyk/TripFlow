const Anthropic = require('@anthropic-ai/sdk');

const anthropic = process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.includes('REPLACE')
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const CLAUDE_MODEL = "claude-3-5-sonnet-20241022";

exports.generateApprovalEmail = async (booking, employee) => {
  if (!anthropic) return "Subject: Travel Request\n\n[Claude not configured - Default Email Content]";
  const prompt = `Generate a professional travel approval request email for a manager. 
  Employee: ${employee.user.name}
  Travel Type: ${booking.type}
  Details: ${JSON.stringify(booking.details)}
  Cost: ${booking.cost || 'To be determined'}
  
  Provide only the subject line and body.`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
};

exports.generateVendorEmail = async (booking, vendor) => {
  if (!anthropic) return "Subject: Booking Request\n\n[Claude not configured - Default Content]";
  const prompt = `Generate a travel booking request for a vendor.
  Vendor: ${vendor.companyName}
  Travel Type: ${booking.type}
  Requirements: ${JSON.stringify(booking.details)}
  
  Instruct the vendor to upload the ticket and PNR once booked.
  Provide only the subject line and body.`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
};

exports.generateWAMessage = async (booking, employee) => {
  if (!anthropic) return "TripFlow booking confirmed! PNR: " + booking.pnr;
  const prompt = `Generate a short, friendly WhatsApp notification for an employee whose travel has been booked.
  Employee: ${employee.user.name}
  Travel: ${booking.type}
  PNR: ${booking.pnr}
  
  Keep it under 160 characters.`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0].text;
};

exports.extractPolicyRules = async (policyText) => {
  if (!anthropic) return { flightLimit: 500, hotelLimit: 150 }; // Mock rules
  const prompt = `Extract travel policy rules from the following text into a JSON format:
  Text: ${policyText}
  
  Fields: flightLimit, hotelLimit, cabLimit, trainLimit, globalMonthlyBudget.
  If not mentioned, set to null. Provide ONLY the JSON object.`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch (e) {
    console.error('Failed to parse Claude response as JSON', e);
    return {};
  }
};

exports.getTravelSuggestions = async (origin, destination) => {
  if (!anthropic) {
    return {
      flights: [
        { option: "IndiGo 6E-212", price: 4500, time: "08:00 AM" },
        { option: "Air India AI-673", price: 5200, time: "11:30 AM" }
      ],
      hotels: [
        { name: "Hotel Maurya", price: 3500, rating: "4.5" },
        { name: "Lemon Tree Premier", price: 4200, rating: "4.3" }
      ]
    };
  }

  const prompt = `Provide travel suggestions for a trip from ${origin} to ${destination}.
  Include 2-3 flight options (mock data) and 2-3 hotel options.
  Return ONLY a JSON object with this structure:
  {
    "flights": [{"option": "string", "price": number, "time": "string"}],
    "hotels": [{"name": "string", "price": number, "rating": "string"}]
  }`;

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch (e) {
    console.error('Failed to parse Claude suggestions', e);
    return { flights: [], hotels: [] };
  }
};
