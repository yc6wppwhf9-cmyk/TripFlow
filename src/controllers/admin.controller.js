const prisma = require('../config/db');
const { userSelect } = require('../config/selects');
const claudeService = require('../services/claude.service');
const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');
const { STAGE } = require('../constants/booking');

exports.getAllBookings = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip  = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      include: {
        employee: { include: { user: userSelect } },
        vendor: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.booking.count()
  ]);

  res.json({ data: bookings, total, page, limit, totalPages: Math.ceil(total / limit) });
});

exports.getStats = asyncHandler(async (req, res) => {
  const [totalBookings, pendingApprovals, completedTrips, totalCost, totalUsers] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { stage: STAGE.PENDING_MANAGER } }),
    prisma.booking.count({ where: { stage: STAGE.COMPLETED } }),
    prisma.booking.aggregate({ _sum: { cost: true } }),
    prisma.user.count()
  ]);
  res.json({ totalBookings, pendingApprovals, completedTrips, totalCost: totalCost._sum.cost || 0, totalUsers });
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip  = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      omit: { password: true },
      include: {
        employee: { include: { manager: { omit: { password: true } } } },
        vendor: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.user.count()
  ]);

  res.json({ data: users, total, page, limit, totalPages: Math.ceil(total / limit) });
});

exports.getEmployees = asyncHandler(async (req, res) => {
  const employees = await prisma.employee.findMany({
    include: { user: userSelect, manager: true }
  });
  res.json(employees);
});

exports.getVendors = asyncHandler(async (req, res) => {
  const vendors = await prisma.vendor.findMany({ include: { user: userSelect } });
  res.json(vendors);
});

exports.getPolicies = asyncHandler(async (req, res) => {
  const policies = await prisma.policy.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(policies);
});

exports.createPolicy = asyncHandler(async (req, res) => {
  const { name, flightLimit, hotelLimit, cabLimit, trainLimit } = req.body;
  const policy = await prisma.policy.create({
    data: {
      name,
      rules: {
        flightLimit: parseFloat(flightLimit) || null,
        hotelLimit:  parseFloat(hotelLimit)  || null,
        cabLimit:    parseFloat(cabLimit)     || null,
        trainLimit:  parseFloat(trainLimit)   || null
      }
    }
  });
  res.status(201).json(policy);
});

exports.updatePolicy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id) throw new AppError('Policy ID is required', 400);

  const { name, flightLimit, hotelLimit, cabLimit, trainLimit } = req.body;

  const existing = await prisma.policy.findUnique({ where: { id } });
  if (!existing) throw new AppError('Policy not found', 404);

  const updatedRules = {
    ...(existing.rules || {}),
    ...(flightLimit !== undefined && { flightLimit: parseFloat(flightLimit) || null }),
    ...(hotelLimit  !== undefined && { hotelLimit:  parseFloat(hotelLimit)  || null }),
    ...(cabLimit    !== undefined && { cabLimit:    parseFloat(cabLimit)     || null }),
    ...(trainLimit  !== undefined && { trainLimit:  parseFloat(trainLimit)   || null })
  };

  const policy = await prisma.policy.update({
    where: { id },
    data: {
      ...(name && { name }),
      rules: updatedRules
    }
  });
  res.json(policy);
});

exports.assignPolicy = asyncHandler(async (req, res) => {
  const { employeeId, policyId } = req.body;
  const employee = await prisma.employee.update({
    where: { id: employeeId },
    data: { policyId }
  });
  res.json(employee);
});

exports.analyzePolicy = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) throw new AppError('Policy text is required', 400);
  const rules = await claudeService.extractPolicyRules(text);
  res.json(rules);
});

exports.importPolicyFromText = asyncHandler(async (req, res) => {
  const { policyText, name } = req.body;
  if (!policyText) throw new AppError('policyText is required', 400);
  const rules = await claudeService.extractPolicyRules(policyText);
  const policy = await prisma.policy.create({ data: { name: name || 'New Policy', rules } });
  res.status(201).json(policy);
});

exports.createUser = asyncHandler(async (req, res) => {
  const { email, name, role, phone, department, managerId, password, companyName, serviceType } = req.body;
  if (!password || password.length < 8) {
    throw new AppError('Password is required and must be at least 8 characters', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const data = { email, password: hashedPassword, name, role: role || 'EMPLOYEE', phone };

  if (role === 'EMPLOYEE') {
    data.employee = { create: { department: department || 'General', managerId: managerId || null } };
  } else if (role === 'VENDOR') {
    data.vendor = { create: { companyName: companyName || name, serviceType: serviceType || 'FULL_SERVICE' } };
  }

  const user = await prisma.user.create({
    data,
    omit: { password: true },
    include: { employee: true, vendor: true }
  });
  res.status(201).json(user);
});

// Keep old name as alias for backward compat
exports.createEmployee = exports.createUser;
