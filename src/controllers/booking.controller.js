const prisma = require('../config/db');
const approvalService = require('../services/approval.service');
const { checkPolicyLimits } = require('../services/policy.service');
const storageService = require('../services/storage.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { STAGE, TYPE } = require('../constants/booking');

exports.getTripPlan = asyncHandler(async (req, res) => {
  const { from, to, fromDate, toDate } = req.query;
  if (!from || !to || !fromDate) {
    throw new AppError('from, to, and fromDate are required', 400);
  }
  const { planTrip } = require('../services/travel');
  const plan = await planTrip(from, to, fromDate, toDate || null);
  res.json(plan);
});

exports.getSuggestions = asyncHandler(async (req, res) => {
  const { origin, destination, date, type, checkOut } = req.query;
  if (!destination || !date) {
    throw new AppError('destination and date are required', 400);
  }
  const { searchFlights, searchTrains, searchHotels } = require('../services/travel');
  const travelType = (type || 'FLIGHT').toUpperCase();
  let data;
  if (travelType === TYPE.FLIGHT) {
    if (!origin) throw new AppError('origin is required for flights', 400);
    data = await searchFlights(origin, destination, date);
  } else if (travelType === TYPE.TRAIN) {
    if (!origin) throw new AppError('origin is required for trains', 400);
    data = await searchTrains(origin, destination, date);
  } else if (travelType === TYPE.HOTEL) {
    data = await searchHotels(destination, date, checkOut);
  } else {
    throw new AppError('type must be FLIGHT, TRAIN, or HOTEL', 400);
  }
  res.json({ type: travelType, results: data });
});

exports.getMyBookings = asyncHandler(async (req, res) => {
  if (!req.user.employee) throw new AppError('User is not an employee', 400);

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip  = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where:   { employeeId: req.user.employee.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.booking.count({ where: { employeeId: req.user.employee.id } })
  ]);

  res.json({ data: bookings, total, page, limit, totalPages: Math.ceil(total / limit) });
});

exports.createBooking = asyncHandler(async (req, res) => {
  const { type, details, cost, managerOverride } = req.body;
  if (!req.user.employee) throw new AppError('User is not an employee', 400);

  const parsedCost  = parseFloat(cost);
  const canOverride = managerOverride && ['MANAGER', 'ADMIN', 'HR'].includes(req.user.role);

  if (!canOverride) {
    if (type === TYPE.TRIP_PACKAGE) {
      const travelViolation = await checkPolicyLimits(
        req.user.employee.id, details.travelType, parseFloat(details.travelCost), details
      );
      if (travelViolation) return res.status(422).json({ ...travelViolation, component: 'travel' });

      const hotelViolation = await checkPolicyLimits(
        req.user.employee.id, TYPE.HOTEL, parseFloat(details.hotelPerNight),
        { destination: details.destination }
      );
      if (hotelViolation) return res.status(422).json({ ...hotelViolation, component: 'hotel' });
    } else {
      const violation = await checkPolicyLimits(req.user.employee.id, type, parsedCost, details);
      if (violation) return res.status(422).json(violation);
    }
  }

  const booking = await prisma.booking.create({
    data: { employeeId: req.user.employee.id, type, details, cost: parsedCost, stage: STAGE.PENDING_MANAGER }
  });

  await approvalService.submitRequest(booking.id);
  res.status(201).json(booking);
});

exports.getBookingById = asyncHandler(async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: {
      employee: {
        include: {
          user:    { select: { id: true, name: true, email: true, phone: true, role: true } },
          manager: { select: { id: true, name: true, email: true } }
        }
      }
    }
  });
  if (!booking) throw new AppError('Booking not found', 404);
  if (req.user.role === 'EMPLOYEE' && booking.employee.userId !== req.user.id) {
    throw new AppError('Unauthorized to view this booking', 403);
  }
  res.json(booking);
});

exports.deleteBooking = asyncHandler(async (req, res) => {
  const booking = await prisma.booking.findUnique({
    where:   { id: req.params.id },
    include: { employee: true }
  });
  if (!booking) throw new AppError('Booking not found', 404);
  if (req.user.role === 'EMPLOYEE' && booking.employee.userId !== req.user.id) {
    throw new AppError('Unauthorized to cancel this booking', 403);
  }
  if (booking.stage === STAGE.COMPLETED) {
    throw new AppError('Completed bookings cannot be cancelled. Contact HR.', 409);
  }
  if (booking.stage === STAGE.PENDING_VENDOR || booking.stage === STAGE.PENDING_HR) {
    throw new AppError('Booking is already in vendor assignment. Contact HR to cancel.', 409);
  }
  await prisma.booking.update({ where: { id: req.params.id }, data: { stage: STAGE.CANCELLED } });
  res.json({ success: true, message: 'Booking cancelled successfully' });
});

exports.uploadReceipt = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Receipt file is required (PDF or image)', 400);

  const booking = await prisma.booking.findUnique({
    where:   { id: req.params.id },
    include: { employee: true }
  });
  if (!booking) throw new AppError('Booking not found', 404);
  if (req.user.role === 'EMPLOYEE' && booking.employee.userId !== req.user.id) {
    throw new AppError('Unauthorized to add receipts to this booking', 403);
  }
  if (booking.stage === STAGE.REJECTED) {
    throw new AppError('Cannot attach receipts to a rejected booking', 409);
  }

  const receiptUrl = await storageService.uploadFile(req.file);
  await prisma.booking.update({ where: { id: req.params.id }, data: { receiptUrl } });
  res.json({ receiptUrl, bookingId: req.params.id });
});

// Export checkPolicyLimits from canonical location for backward compatibility
exports.checkPolicyLimits = checkPolicyLimits;
