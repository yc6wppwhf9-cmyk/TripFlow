const prisma = require('../config/db');
const approvalService = require('../services/approval.service');
const claudeService = require('../services/claude.service');
const travelService = require('../services/travel.service');

const POLICY_LIMIT_KEY = {
  FLIGHT: 'flightLimit',
  HOTEL: 'hotelLimit',
  CAB: 'cabLimit',
  TRAIN: 'trainLimit'
};

async function checkPolicyLimits(employeeId, type, cost) {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { policy: true }
  });

  if (!employee?.policy) return null;

  const rules = employee.policy.rules || {};
  const limitKey = POLICY_LIMIT_KEY[type];
  const typeLimit = rules[limitKey];

  if (typeLimit && cost > typeLimit) {
    return {
      error: `Cost ₹${cost} exceeds your ${type.toLowerCase()} policy limit of ₹${typeLimit}.`,
      policyLimit: typeLimit,
      requestedCost: cost
    };
  }

  if (rules.globalMonthlyBudget) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { _sum } = await prisma.booking.aggregate({
      where: { employeeId, stage: { not: 'REJECTED' }, createdAt: { gte: startOfMonth } },
      _sum: { cost: true }
    });
    const spent = _sum.cost || 0;
    if (spent + cost > rules.globalMonthlyBudget) {
      return {
        error: `This booking would exceed your monthly budget of ₹${rules.globalMonthlyBudget}. Spent so far: ₹${spent.toFixed(2)}.`,
        monthlyBudget: rules.globalMonthlyBudget,
        spentSoFar: spent
      };
    }
  }

  return null;
}

exports.checkPolicyLimits = checkPolicyLimits;

exports.getSuggestions = async (req, res) => {
  try {
    const { origin, destination, date, type, checkOut } = req.query;
    if (!destination || !date) {
      return res.status(400).json({ error: 'destination and date are required' });
    }

    const travelType = (type || 'FLIGHT').toUpperCase();

    let data;
    if (travelType === 'FLIGHT') {
      if (!origin) return res.status(400).json({ error: 'origin is required for flights' });
      data = await travelService.searchFlights(origin, destination, date);
    } else if (travelType === 'TRAIN') {
      if (!origin) return res.status(400).json({ error: 'origin is required for trains' });
      data = await travelService.searchTrains(origin, destination, date);
    } else if (travelType === 'HOTEL') {
      data = await travelService.searchHotels(destination, date, checkOut);
    } else {
      return res.status(400).json({ error: 'type must be FLIGHT, TRAIN, or HOTEL' });
    }

    res.json({ type: travelType, results: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    if (!req.user.employee) return res.status(400).json({ error: 'User is not an employee' });

    const bookings = await prisma.booking.findMany({
      where: { employeeId: req.user.employee.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { type, details, cost, managerOverride } = req.body;
    if (!req.user.employee) return res.status(400).json({ error: 'User is not an employee' });

    const parsedCost = parseFloat(cost);

    if (!managerOverride) {
      const violation = await checkPolicyLimits(req.user.employee.id, type, parsedCost);
      if (violation) return res.status(422).json(violation);
    }

    const booking = await prisma.booking.create({
      data: {
        employeeId: req.user.employee.id,
        type,
        details,
        cost: parsedCost,
        stage: 'PENDING_MANAGER'
      }
    });

    await approvalService.submitRequest(booking.id);

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
