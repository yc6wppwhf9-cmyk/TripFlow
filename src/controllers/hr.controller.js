const prisma = require('../config/db');
const { userSelect } = require('../config/selects');

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      include: {
        employee: { include: { user: userSelect, policy: true } },
        vendor: { include: { user: userSelect } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDeptSpend = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: userSelect,
        bookings: { where: { stage: { not: 'REJECTED' } } },
        policy: true
      }
    });

    const deptMap = {};
    for (const emp of employees) {
      const dept = emp.department;
      if (!deptMap[dept]) {
        deptMap[dept] = { department: dept, totalCost: 0, bookingCount: 0, employees: 0 };
      }
      deptMap[dept].employees++;
      for (const b of emp.bookings) {
        deptMap[dept].totalCost += b.cost || 0;
        deptMap[dept].bookingCount++;
      }
    }

    res.json(Object.values(deptMap));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPolicyCompliance = async (req, res) => {
  try {
    const [withPolicy, withoutPolicy, totalBookings, pendingApprovals, completed, rejected] =
      await Promise.all([
        prisma.employee.count({ where: { policyId: { not: null } } }),
        prisma.employee.count({ where: { policyId: null } }),
        prisma.booking.count(),
        prisma.booking.count({ where: { stage: 'PENDING_MANAGER' } }),
        prisma.booking.count({ where: { stage: 'COMPLETED' } }),
        prisma.booking.count({ where: { stage: 'REJECTED' } })
      ]);

    res.json({ withPolicy, withoutPolicy, totalBookings, pendingApprovals, completed, rejected });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMonthlyTrend = async (req, res) => {
  try {
    const months = 6;
    const results = [];

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      start.setMonth(start.getMonth() - i);

      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);

      const [count, agg] = await Promise.all([
        prisma.booking.count({ where: { createdAt: { gte: start, lt: end }, stage: { not: 'REJECTED' } } }),
        prisma.booking.aggregate({ where: { createdAt: { gte: start, lt: end }, stage: { not: 'REJECTED' } }, _sum: { cost: true } })
      ]);

      results.push({
        month: start.toLocaleString('default', { month: 'short', year: 'numeric' }),
        bookings: count,
        totalCost: agg._sum.cost || 0
      });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
