const prisma = require('../config/db');
const { getDistanceKm } = require('./travel');
const { getStartOfMonth } = require('../utils/date');

// City classification per HSCVPL T&E Policy 2026 §6.1
const CITY_CAT_A = new Set([
  'mumbai', 'bombay', 'delhi', 'new delhi',
  'bangalore', 'bengaluru', 'chennai', 'madras',
  'kolkata', 'calcutta', 'hyderabad'
]);

const CITY_CAT_B = new Set([
  'jammu', 'varanasi', 'agra', 'kanpur', 'meerut', 'faridabad',
  'jalandhar', 'chandigarh', 'amritsar', 'cuttack', 'indore', 'bhopal',
  'gwalior', 'pune', 'ahmedabad', 'baroda', 'vadodara', 'surat', 'nagpur',
  'nasik', 'nashik', 'cochin', 'kochi', 'vijayawada',
  'jaipur', 'lucknow', 'patna', 'bhubaneswar', 'raipur', 'ranchi',
  'guwahati', 'shimla', 'dehradun', 'gandhinagar', 'panaji', 'goa',
  'thiruvananthapuram', 'trivandrum', 'dispur', 'itanagar', 'aizawl',
  'kohima', 'imphal', 'shillong', 'agartala', 'srinagar'
]);

function getCityCategory(city) {
  const key = (city || '').toLowerCase().trim();
  if (CITY_CAT_A.has(key)) return 'A';
  if (CITY_CAT_B.has(key)) return 'B';
  return 'C';
}

// Lower rank = more premium (1A is rank 1, SL is rank 4)
const TRAIN_CLASS_RANK = { '1A': 1, 'FC': 1, '2A': 2, '3A': 3, 'SL': 4, 'CC': 4, '2S': 5 };

function getMealCapKey(days) {
  if (days <= 5)  return '1_to_5_days';
  if (days <= 10) return '1_to_10_days';
  return '1_to_20_days';
}

async function checkPolicyLimits(employeeId, type, cost, details = {}) {
  // Guard: nullable cost causes NaN comparisons which silently pass all checks
  if (cost == null || isNaN(cost)) return null;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: { policy: true }
  });

  if (!employee?.policy) return null;
  const rules = employee.policy.rules || {};

  // 1. Advance booking — 30 days domestic, 45 days foreign (T&E 5.1 / 5.3)
  if (details.date) {
    const isForeign = !!details.isForeignTravel;
    const requiredDays = isForeign
      ? (rules.foreignTravelAdvanceDays || 45)
      : (rules.advanceBookingDays || 30);
    const daysUntil = Math.floor((new Date(details.date) - new Date()) / 86400000);

    if (daysUntil < requiredDays) {
      if (!details.urgencyReason) {
        return {
          error: `Bookings require ${requiredDays} days advance notice (${isForeign ? 'foreign' : 'intercity'} travel). Travel is in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}. If urgent, resubmit with details.urgencyReason explaining the business need — your manager will review.`,
          advanceRequired: requiredDays,
          daysUntilTravel: daysUntil,
          policyRule: 'T&E Policy 2026 §5.1'
        };
      }

      const maxUrgent = rules.maxUrgentBookingsPerMonth ?? 2;
      const startOfMonth = getStartOfMonth();
      const urgentThisMonth = await prisma.booking.count({
        where: {
          employeeId,
          stage: { not: 'REJECTED' },
          createdAt: { gte: startOfMonth },
          details: { path: ['urgencyReason'], not: null }
        }
      });

      if (urgentThisMonth >= maxUrgent) {
        return {
          error: `Urgent booking limit reached. You have already made ${urgentThisMonth} urgent booking${urgentThisMonth !== 1 ? 's' : ''} this month (max ${maxUrgent} allowed per Band ${rules.band}). Contact HR for exceptions.`,
          urgentUsed: urgentThisMonth,
          urgentLimit: maxUrgent,
          policyRule: 'T&E Policy 2026 §5.1 — urgent booking frequency cap'
        };
      }
    }
  }

  // 2. Flight mode eligibility — air only for journeys > 12 hours (T&E 5.1.1)
  if (type === 'FLIGHT' && details.origin && details.destination && !details.isForeignTravel) {
    try {
      const distKm = getDistanceKm(details.origin, details.destination);
      const estimatedHours = Math.round(distKm / 70);
      if (estimatedHours < 12) {
        return {
          error: `Flight not permitted for ${details.origin} → ${details.destination}. Estimated rail journey is ~${estimatedHours} hrs. Air travel is only allowed when surface travel exceeds 12 hours (T&E §5.1.1). Please book a train or road instead.`,
          estimatedTravelHours: estimatedHours,
          policyRule: 'T&E Policy 2026 §5.1.1 — Air: above 12 hours only'
        };
      }
    } catch (_) { /* unknown city pair — skip distance check */ }
  }

  // 3. Train class entitlement (T&E 5.1.2)
  if (type === 'TRAIN' && details.trainClass) {
    const entitlement = rules.trainClassEntitlement || '3A';
    const bookedRank      = TRAIN_CLASS_RANK[(details.trainClass || '').toUpperCase()] ?? 99;
    const entitlementRank = TRAIN_CLASS_RANK[entitlement.toUpperCase()] ?? 3;
    if (bookedRank < entitlementRank) {
      return {
        error: `Your band entitles you to ${rules.railRoadEntitlement || entitlement} class. You selected ${details.trainClass.toUpperCase()}, which is above your entitlement.`,
        allowedClass: entitlement,
        bookedClass: details.trainClass.toUpperCase(),
        policyRule: 'T&E Policy 2026 §5.1.2'
      };
    }
  }

  // 4. Hotel cap — city-category aware (T&E 6.2)
  if (type === 'HOTEL') {
    const category = getCityCategory(details.destination || '');
    const cityHotelCaps = rules.hotelCapsByCity || {};
    const cap = cityHotelCaps[category] ?? rules.hotelLimit;
    const CITY_LABEL = { A: 'metro city (Cat A)', B: 'major city (Cat B)', C: 'other town (Cat C)' };
    if (cap && cost > cap) {
      return {
        error: `Hotel cost ₹${cost}/night exceeds the ${CITY_LABEL[category]} cap of ₹${cap} for Band ${rules.band} (T&E §6.2).`,
        policyLimit: cap,
        cityCategory: category,
        requestedCost: cost,
        policyRule: 'T&E Policy 2026 §6.2'
      };
    }
  }

  // 5. Per-type flat limits for FLIGHT / CAB / TRAIN
  const FLAT_LIMIT_KEY = { FLIGHT: 'flightLimit', CAB: 'cabLimit', TRAIN: 'trainLimit' };
  const flatKey = FLAT_LIMIT_KEY[type];
  if (flatKey) {
    const limit = rules[flatKey];
    if (limit && cost > limit) {
      return {
        error: `Cost ₹${cost} exceeds your ${type.toLowerCase()} policy limit of ₹${limit}.`,
        policyLimit: limit,
        requestedCost: cost
      };
    }
  }

  // 6. Meal monthly cap (T&E 7.1)
  if (type === 'MEAL') {
    const durationDays = parseInt(details.durationDays) || 1;
    const capKey  = getMealCapKey(durationDays);
    const mealCap = (rules.mealCapsPerMonth || {})[capKey];
    if (mealCap) {
      const startOfMonth = getStartOfMonth();
      const { _sum } = await prisma.booking.aggregate({
        where: {
          employeeId,
          type: 'MEAL',
          stage: { notIn: ['REJECTED', 'CANCELLED'] },
          createdAt: { gte: startOfMonth }
        },
        _sum: { cost: true }
      });
      const mealSpent = _sum.cost || 0;
      if (mealSpent + cost > mealCap) {
        return {
          error: `Meal claim of ₹${cost} would exceed your monthly cap of ₹${mealCap} for trips up to ${durationDays} days. Meal expenses claimed this month: ₹${mealSpent.toFixed(2)}.`,
          mealCap,
          mealSpentSoFar: mealSpent,
          durationBracket: capKey,
          policyRule: 'T&E Policy 2026 §7.1'
        };
      }
    }
  }

  // 7. Global monthly budget cap
  const globalBudget = rules.globalMonthlyBudget;
  if (globalBudget) {
    const startOfMonth = getStartOfMonth();
    const { _sum } = await prisma.booking.aggregate({
      where: {
        employeeId,
        stage: { notIn: ['REJECTED', 'CANCELLED'] },
        createdAt: { gte: startOfMonth }
      },
      _sum: { cost: true }
    });
    const monthSpent = _sum.cost || 0;
    if (monthSpent + cost > globalBudget) {
      return {
        error: `This booking of ₹${cost} would exceed your monthly travel budget of ₹${globalBudget}. You have spent ₹${monthSpent.toFixed(2)} this month.`,
        globalMonthlyBudget: globalBudget,
        monthSpentSoFar: monthSpent,
        policyRule: 'T&E Policy 2026 — Global Monthly Budget'
      };
    }
  }

  return null;
}

module.exports = { checkPolicyLimits };
