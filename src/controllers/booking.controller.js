const prisma = require('../config/db');
const approvalService = require('../services/approval.service');
const claudeService = require('../services/claude.service');

exports.getSuggestions = async (req, res) => {
  try {
    const { origin, destination } = req.query;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }
    const suggestions = await claudeService.getTravelSuggestions(origin, destination);
    res.json(suggestions);
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
    const { type, details, cost } = req.body;
    if (!req.user.employee) return res.status(400).json({ error: 'User is not an employee' });

    const booking = await prisma.booking.create({
      data: {
        employeeId: req.user.employee.id,
        type,
        details,
        cost: parseFloat(cost),
        stage: 'PENDING_MANAGER'
      }
    });

    await approvalService.submitRequest(booking.id);

    res.status(201).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
