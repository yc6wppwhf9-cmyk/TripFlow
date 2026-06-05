const prisma = require('../config/db');
const { userSelect } = require('../config/selects');
const asyncHandler = require('../utils/asyncHandler');
const { STAGE } = require('../constants/booking');

exports.getAllBookings = asyncHandler(async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip  = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      include: {
        employee: { include: { user: userSelect, policy: true } },
        vendor: { include: { user: userSelect } }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    }),
    prisma.booking.count()
  ]);

  res.json({ data: bookings, total, page, limit, totalPages: Math.ceil(total / limit) });
});

exports.getDeptSpend = asyncHandler(async (req, res) => {
  const rows = await prisma.$queryRaw`
    SELECT
      e.department,
      COUNT(DISTINCT e.id)::int          AS employees,
      COUNT(b.id)::int                   AS "bookingCount",
      COALESCE(SUM(b.cost), 0)::float    AS "totalCost"
    FROM "Employee" e
    LEFT JOIN "Booking" b ON b."employeeId" = e.id
      AND b.stage NOT IN ('REJECTED', 'CANCELLED')
    GROUP BY e.department
    ORDER BY "totalCost" DESC
  `;
  res.json(rows);
});

exports.getPolicyCompliance = asyncHandler(async (req, res) => {
  const [withPolicy, withoutPolicy, totalBookings, pendingManager, pendingHr, completed, rejected] =
    await Promise.all([
      prisma.employee.count({ where: { policyId: { not: null } } }),
      prisma.employee.count({ where: { policyId: null } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { stage: STAGE.PENDING_MANAGER } }),
      prisma.booking.count({ where: { stage: STAGE.PENDING_HR } }),
      prisma.booking.count({ where: { stage: STAGE.COMPLETED } }),
      prisma.booking.count({ where: { stage: STAGE.REJECTED } })
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
});

// Single GROUP BY query replacing 12 sequential DB round-trips
exports.getMonthlyTrend = asyncHandler(async (req, res) => {
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
});
