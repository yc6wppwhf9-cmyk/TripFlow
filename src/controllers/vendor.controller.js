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

    if (!req.user.vendor) return res.status(400).json({ error: 'User is not a vendor' });
    if (!file && !pnr) return res.status(400).json({ error: 'Either a ticket file or PNR reference is required' });

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.vendorId !== req.user.vendor.id) {
      return res.status(403).json({ error: 'This booking is not assigned to your account' });
    }
    if (booking.stage !== 'PENDING_VENDOR') {
      return res.status(409).json({ error: `Booking is not awaiting vendor fulfillment (stage: ${booking.stage})` });
    }

    let ticketUrl = null;
    if (file) ticketUrl = await storageService.uploadTicket(file);

    const updated = await approvalService.complete(id, ticketUrl, pnr);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
