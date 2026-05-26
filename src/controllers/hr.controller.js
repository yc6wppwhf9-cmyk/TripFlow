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
        bookings: { where: { stage: { notIn: ['REJECTED', 'CANCELLED'] } } },
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
    const [withPolicy, withoutPolicy, totalBookings, pendingManager, pendingHr, completed, rejected] =
      await Promise.all([
        prisma.employee.count({ where: { policyId: { not: null } } }),
        prisma.employee.count({ where: { policyId: null } }),
        prisma.booking.count(),
        prisma.booking.count({ where: { stage: 'PENDING_MANAGER' } }),
        prisma.booking.count({ where: { stage: 'PENDING_HR' } }),
        prisma.booking.count({ where: { stage: 'COMPLETED' } }),
        prisma.booking.count({ where: { stage: 'REJECTED' } })
      ]);

    res.json({
      withPolicy,
      withoutPolicy,
      totalBookings,
      pendingApprovals: pendingManager + pendingHr,
      pendingManager,
      pendingHr,
      completed,
      rejected
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Single GROUP BY query replacing 12 sequential DB round-trips
exports.getMonthlyTrend = async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        date_trunc('month', "createdAt") AS month,
        COUNT(*)::int                    AS bookings,
        COALESCE(SUM(cost), 0)::float    AS "totalCost"
      FROM "Booking"
      WHERE
        "createdAt" >= date_trunc('month', NOW()) - INTERVAL '5 months'
        AND stage NOT IN ('REJECTED', 'CANCELLED')
      GROUP BY date_trunc('month', "createdAt")
      ORDER BY month ASC
    `;

    // Fill in any missing months so the chart always shows 6 data points
    const results = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setHours(0, 0, 0, 0);
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      const match = rows.find(r => {
        const rm = new Date(r.month);
        return rm.getFullYear() === d.getFullYear() && rm.getMonth() === d.getMonth();
      });
      results.push({
        month: label,
        bookings: match ? match.bookings : 0,
        totalCost: match ? Number(match.totalCost) : 0
      });
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
