const prisma = require('../config/db');
const approvalService = require('../services/approval.service');
const storageService = require('../services/storage.service');

exports.getVendorRequests = async (req, res) => {
  try {
    if (!req.user.vendor) return res.status(400).json({ error: 'User is not a vendor' });

    const bookings = await prisma.booking.findMany({
      where: {
        vendorId: req.user.vendor.id,
        stage: 'PENDING_VENDOR'
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

exports.getCompletedBookings = async (req, res) => {
  try {
    if (!req.user.vendor) return res.status(400).json({ error: 'User is not a vendor' });
    const bookings = await prisma.booking.findMany({
      where: { vendorId: req.user.vendor.id, stage: 'COMPLETED' },
      include: { employee: { include: { user: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.uploadTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { pnr } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'Ticket file is required' });

    const ticketUrl = await storageService.uploadTicket(file);

    const booking = await approvalService.complete(id, ticketUrl, pnr);
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
