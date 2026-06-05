const prisma = require('../config/db');
const { userSelect } = require('../config/selects');
const claudeService = require('../services/claude.service');
const bcrypt = require('bcryptjs');

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        employee: { include: { user: userSelect } },
        vendor: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const [totalBookings, pendingApprovals, completedTrips, totalCost, totalUsers] = await Promise.all([
      prisma.booking.count(),
      prisma.booking.count({ where: { stage: 'PENDING_MANAGER' } }),
      prisma.booking.count({ where: { stage: 'COMPLETED' } }),
      prisma.booking.aggregate({ _sum: { cost: true } }),
      prisma.user.count()
    ]);
    res.json({ totalBookings, pendingApprovals, completedTrips, totalCost: totalCost._sum.cost || 0, totalUsers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      omit: { password: true },
      include: {
        employee: {
          include: {
            manager: { omit: { password: true } }
          }
        },
        vendor: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: { user: userSelect, manager: true }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({ include: { user: userSelect } });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPolicies = async (req, res) => {
  try {
    const policies = await prisma.policy.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createPolicy = async (req, res) => {
  try {
    const { name, flightLimit, hotelLimit, cabLimit, trainLimit } = req.body;
    const policy = await prisma.policy.create({
      data: {
        name,
        rules: {
          flightLimit: parseFloat(flightLimit) || null,
          hotelLimit: parseFloat(hotelLimit) || null,
          cabLimit: parseFloat(cabLimit) || null,
          trainLimit: parseFloat(trainLimit) || null
        }
      }
    });
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.assignPolicy = async (req, res) => {
  try {
    const { employeeId, policyId } = req.body;
    const employee = await prisma.employee.update({
      where: { id: employeeId },
      data: { policyId }
    });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.analyzePolicy = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Policy text is required' });
    const rules = await claudeService.extractPolicyRules(text);
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const { policyText, name } = req.body;
    const rules = await claudeService.extractPolicyRules(policyText);
    const policy = await prisma.policy.create({ data: { name: name || 'New Policy', rules } });
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, name, role, phone, department, managerId, password, companyName, serviceType } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password is required and must be at least 8 characters' });
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Keep old name as alias for backward compat
exports.createEmployee = exports.createUser;
