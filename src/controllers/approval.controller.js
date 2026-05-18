const prisma = require('../config/db');
const approvalService = require('../services/approval.service');

exports.getVendors = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({ include: { user: true } });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPendingApprovals = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        stage: 'PENDING_MANAGER',
        employee: {
          managerId: req.user.id
        }
      },
      include: {
        employee: {
          include: { user: true }
        }
      }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTeamBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        employee: { managerId: req.user.id }
      },
      include: {
        employee: { include: { user: true } },
        vendor: { include: { user: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.approveBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;
    
    const booking = await approvalService.approve(id, vendorId);
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const booking = await approvalService.reject(id, reason);
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
