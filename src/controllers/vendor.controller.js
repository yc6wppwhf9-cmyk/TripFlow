const prisma = require('../config/db');
const { userSelect } = require('../config/selects');
const approvalService = require('../services/approval.service');
const storageService = require('../services/storage.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { STAGE } = require('../constants/booking');

exports.getVendorRequests = asyncHandler(async (req, res) => {
  if (!req.user.vendor) throw new AppError('User is not a vendor', 400);
  const bookings = await prisma.booking.findMany({
    where:   { vendorId: req.user.vendor.id, stage: STAGE.PENDING_VENDOR },
    include: { employee: { include: { user: userSelect } } }
  });
  res.json(bookings);
});

exports.getCompletedBookings = asyncHandler(async (req, res) => {
  if (!req.user.vendor) throw new AppError('User is not a vendor', 400);
  const bookings = await prisma.booking.findMany({
    where:   { vendorId: req.user.vendor.id, stage: STAGE.COMPLETED },
    include: { employee: { include: { user: userSelect } } },
    orderBy: { updatedAt: 'desc' }
  });
  res.json(bookings);
});

exports.uploadTicket = asyncHandler(async (req, res) => {
  const { pnr } = req.body;
  const file = req.file;

  if (!req.user.vendor)  throw new AppError('User is not a vendor', 400);
  if (!file && !pnr)     throw new AppError('Either a ticket file or PNR reference is required', 400);

  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw new AppError('Booking not found', 404);
  if (booking.vendorId !== req.user.vendor.id) {
    throw new AppError('This booking is not assigned to your account', 403);
  }
  if (booking.stage !== STAGE.PENDING_VENDOR) {
    throw new AppError(`Booking is not awaiting vendor fulfillment (stage: ${booking.stage})`, 409);
  }

  const ticketUrl = file ? await storageService.uploadTicket(file) : null;
  const updated = await approvalService.complete(req.params.id, ticketUrl, pnr);
  res.json(updated);
});
