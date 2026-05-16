const prisma = require('../config/db');
const claudeService = require('../services/claude.service');
const bcrypt = require('bcryptjs');

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        employee: { include: { user: true } },
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
    const totalBookings = await prisma.booking.count();
    const pendingApprovals = await prisma.booking.count({ where: { stage: 'PENDING_MANAGER' } });
    const completedTrips = await prisma.booking.count({ where: { stage: 'COMPLETED' } });
    const totalCost = await prisma.booking.aggregate({
      _sum: { cost: true }
    });

    res.json({
      totalBookings,
      pendingApprovals,
      completedTrips,
      totalCost: totalCost._sum.cost || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const { policyText, name } = req.body;
    const rules = await claudeService.extractPolicyRules(policyText);
    
    const policy = await prisma.policy.create({
      data: {
        name: name || 'New Policy',
        rules
      }
    });
    
    res.status(201).json(policy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: { user: true, manager: true }
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getVendors = async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({ include: { user: true } });
    res.json(vendors);
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

exports.createEmployee = async (req, res) => {
  // Similar to register but specific for admin
  try {
    const { email, name, role, phone, department, managerId, password } = req.body;
    const hashedPassword = await bcrypt.hash(password || 'Welcome@123', 12);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'EMPLOYEE',
        phone,
        employee: {
          create: {
            department: department || 'General',
            managerId: managerId
          }
        }
      }
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
