const prisma = require('../config/db');
const { userSelect } = require('../config/selects');
const approvalService = require('../services/approval.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { STAGE } = require('../constants/booking');

exports.getVendors = asyncHandler(async (req, res) => {
  const vendors = await prisma.vendor.findMany({ include: { user: userSelect } });
  res.json(vendors);
});

exports.getPendingApprovals = asyncHandler(async (req, res) => {
  // managerId on Employee is a User FK — match against req.user.id directly
  const bookings = await prisma.booking.findMany({
    where:   { stage: STAGE.PENDING_MANAGER, employee: { managerId: req.user.id } },
    include: { employee: { include: { user: userSelect, policy: true } } }
  });
  res.json(bookings);
});

exports.getTeamBookings = asyncHandler(async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where:   { employee: { managerId: req.user.id } },
    include: { employee: { include: { user: userSelect } }, vendor: { include: { user: userSelect } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(bookings);
});

exports.getHrPendingApprovals = asyncHandler(async (req, res) => {
  const bookings = await prisma.booking.findMany({
    where:   { stage: STAGE.PENDING_HR },
    include: { employee: { include: { user: userSelect, policy: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(bookings);
});

// managerId on Employee is a User FK — compare directly to userId
async function assertManagerOwns(bookingId, userId) {
  const booking = await prisma.booking.findUnique({
    where:   { id: bookingId },
    include: { employee: true }
  });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.employee.managerId !== userId) {
    throw new AppError('You can only act on bookings from your direct reports', 403);
  }
  return booking;
}

exports.approveBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (req.user.role === 'MANAGER') {
    const booking = await assertManagerOwns(id, req.user.id);
    if (booking.stage !== STAGE.PENDING_MANAGER) {
      throw new AppError(`Booking is not awaiting manager approval (current stage: ${booking.stage})`, 409);
    }
  } else {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new AppError('Booking not found', 404);
    if (booking.stage !== STAGE.PENDING_MANAGER) {
      throw new AppError(`Booking is not awaiting manager approval (current stage: ${booking.stage})`, 409);
    }
  }

  const updated = await approvalService.approve(id);
  res.json(updated);
});

exports.assignVendorToBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { vendorId } = req.body;
  if (!vendorId) throw new AppError('vendorId is required', 400);

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.stage !== STAGE.PENDING_HR) {
    throw new AppError(`Booking is not in PENDING_HR stage (current: ${booking.stage})`, 409);
  }

  const result = await approvalService.assignVendor(id, vendorId);
  res.json(result);
});

exports.rejectBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id }, include: { employee: true } });
  if (!booking) throw new AppError('Booking not found', 404);

  if (req.user.role === 'MANAGER') {
    await assertManagerOwns(id, req.user.id);
  } else if (req.user.role === 'HR') {
    if (booking.stage !== STAGE.PENDING_HR) {
      throw new AppError(`HR can only reject PENDING_HR bookings (current: ${booking.stage})`, 409);
    }
  }
  // ADMIN can reject at any stage

  const result = await approvalService.reject(id, reason);
  res.json(result);
});
