const prisma = require('../config/db');
const { userSelect } = require('../config/selects');
const approvalService = require('../services/approval.service');

exports.getVendors = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({ include: { user: userSelect } });
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
        employee: { managerId: req.user.id }
      },
      include: {
        employee: { include: { user: userSelect, policy: true } }
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
      where: { employee: { managerId: req.user.id } },
      include: {
        employee: { include: { user: userSelect } },
        vendor: { include: { user: userSelect } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// HR: list all PENDING_HR bookings awaiting vendor assignment
exports.getHrPendingApprovals = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { stage: 'PENDING_HR' },
      include: {
        employee: { include: { user: userSelect, policy: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

async function assertManagerOwns(bookingId, managerId) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { employee: true }
  });
  if (!booking) return { error: 'Booking not found', status: 404 };
  if (booking.stage !== 'PENDING_MANAGER') {
    return { error: `Booking is not awaiting manager approval (current stage: ${booking.stage})`, status: 409 };
  }
  if (booking.employee.managerId !== managerId) {
    return { error: 'You can only act on bookings from your direct reports', status: 403 };
  }
  return null;
}

// Manager approves → moves to PENDING_HR
exports.approveBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'MANAGER') {
      const err = await assertManagerOwns(id, req.user.id);
      if (err) return res.status(err.status).json({ error: err.error });
    } else {
      // ADMIN/HR acting as manager: verify the booking exists and is PENDING_MANAGER
      const booking = await prisma.booking.findUnique({ where: { id } });
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.stage !== 'PENDING_MANAGER') {
        return res.status(409).json({ error: `Booking is not awaiting manager approval (current stage: ${booking.stage})` });
      }
    }

    const booking = await approvalService.approve(id);
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// HR assigns vendor to a PENDING_HR booking → moves to PENDING_VENDOR
exports.assignVendorToBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;
    if (!vendorId) return res.status(400).json({ error: 'vendorId is required' });

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.stage !== 'PENDING_HR') {
      return res.status(409).json({ error: `Booking is not in PENDING_HR stage (current: ${booking.stage})` });
    }

    const result = await approvalService.assignVendor(id, vendorId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await prisma.booking.findUnique({ where: { id }, include: { employee: true } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.user.role === 'MANAGER') {
      const err = await assertManagerOwns(id, req.user.id);
      if (err) return res.status(err.status).json({ error: err.error });
    } else if (req.user.role === 'HR') {
      if (booking.stage !== 'PENDING_HR') {
        return res.status(409).json({ error: `HR can only reject PENDING_HR bookings (current: ${booking.stage})` });
      }
    }
    // ADMIN can reject any stage

    const result = await approvalService.reject(id, reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
