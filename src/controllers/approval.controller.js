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
        employee: {
          managerId: req.user.id
        }
      },
      include: {
        employee: {
          include: { user: userSelect, policy: true }
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

exports.approveBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorId } = req.body;

    if (req.user.role === 'MANAGER') {
      const err = await assertManagerOwns(id, req.user.id);
      if (err) return res.status(err.status).json({ error: err.error });
    }

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

    if (req.user.role === 'MANAGER') {
      const err = await assertManagerOwns(id, req.user.id);
      if (err) return res.status(err.status).json({ error: err.error });
    }

    const booking = await approvalService.reject(id, reason);
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
