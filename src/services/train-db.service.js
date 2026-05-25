const prisma = require('../config/db');

// IRCTC fare formula (distance-slab, per class)
function calcIRCTCFare(distanceKm, trainType, classes) {
  const d = Math.max(1, distanceKm);
  const isRajdhani = /RAJDHANI|DURONTO/i.test(trainType || '');
  const isShatabdi = /SHATABDI/i.test(trainType || '');

  let all = {};

  if (isRajdhani) {
    all = {
      '3A': Math.max(1000, Math.round(d * 2.1  + 100)),
      '2A': Math.max(1450, Math.round(d * 3.1  + 150)),
      '1A': Math.max(2500, Math.round(d * 5.5  + 250)),
    };
  } else if (isShatabdi) {
    all = {
      'CC': Math.max(450, Math.round(d * 1.4 + 80)),
      'EC': Math.max(850, Math.round(d * 2.8 + 150)),
    };
  } else {
    const sl = Math.max(175, Math.round(d * 0.54 + 50));
    all = {
      'SL': sl,
      '3A': Math.max(520,  Math.round(sl * 2.5 + 30)),
      '2A': Math.max(765,  Math.round(sl * 3.8 + 45)),
      '1A': Math.max(1305, Math.round(sl * 7.5 + 70)),
    };
  }

  // Filter to classes the train actually runs
  if (Array.isArray(classes) && classes.length) {
    const filtered = Object.fromEntries(
      Object.entries(all).filter(([k]) => classes.includes(k))
    );
    return Object.keys(filtered).length ? filtered : all;
  }
  return all;
}

function minsToHHMM(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// Find trains running between two station codes using our DB
async function searchTrainsBetweenStations(fromCode, toCode) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        t."trainNo",
        t."trainName",
        t."trainType",
        t.classes,
        t."runDays",
        fs."departureTime"                   AS departure,
        fs."dayCount"                        AS "depDay",
        ts."arrivalTime"                     AS arrival,
        ts."dayCount"                        AS "arrDay",
        (ts."distanceKm" - fs."distanceKm") AS "distanceKm"
      FROM "RailTrain" t
      INNER JOIN "RailStop" fs
        ON fs."trainId" = t.id AND fs."stationCode" = ${fromCode}
      INNER JOIN "RailStop" ts
        ON ts."trainId" = t.id AND ts."stationCode" = ${toCode}
      WHERE fs.sequence < ts.sequence
      ORDER BY fs."departureTime" ASC NULLS LAST
      LIMIT 8
    `;

    if (!rows || !rows.length) return null;

    return rows.map(r => {
      const distKm  = Number(r.distanceKm) || 0;
      const classes = Array.isArray(r.classes) ? r.classes : ['SL', '3A', '2A', '1A'];
      const classFares = calcIRCTCFare(distKm, r.trainType, classes);

      // Duration from stored times + day difference
      let duration = null;
      if (r.departure && r.arrival) {
        const [dh, dm] = r.departure.split(':').map(Number);
        const [ah, am] = r.arrival.split(':').map(Number);
        const dayDiff  = (Number(r.arrDay) || 1) - (Number(r.depDay) || 1);
        const totalMins = (ah * 60 + am + dayDiff * 1440) - (dh * 60 + dm);
        if (totalMins > 0) duration = minsToHHMM(totalMins);
      }

      return {
        trainNumber: r.trainNo,
        trainName:   r.trainName,
        trainType:   r.trainType,
        departure:   r.departure  || null,
        arrival:     r.arrival    || null,
        duration,
        runDays:     r.runDays,
        classes,
        classFares,
        distanceKm:  distKm,
        note: 'Fares calculated using IRCTC formula — book at IRCTC.co.in for live pricing'
      };
    });
  } catch (err) {
    console.warn('[train-db] query failed:', err.message);
    return null;
  }
}

module.exports = { searchTrainsBetweenStations };
