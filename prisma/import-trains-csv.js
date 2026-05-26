/**
 * Import full Indian Railways timetable from data.gov.in CSV
 * Usage: node prisma/import-trains-csv.js
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const CSV_PATH = 'C:\\Users\\himanshu.thakur\\Downloads\\Train_details_22122017.csv';
const BATCH    = 500; // rows per INSERT batch

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── helpers ───────────────────────────────────────────────────────────────────

function hhmm(raw) {
  const t = (raw || '').trim();
  if (!t || t === '00:00:00') return null;
  return t.slice(0, 5); // "HH:MM"
}

function toMins(hh) {
  if (!hh) return -1;
  const [h, m] = hh.split(':').map(Number);
  return h * 60 + m;
}

function progress(label, done, total) {
  const pct = Math.round((done / total) * 100);
  process.stdout.write(`\r  ${label}: ${done}/${total} (${pct}%)`);
}

// ── parse CSV ─────────────────────────────────────────────────────────────────

function parseCsv(filePath) {
  console.log('Reading CSV...');
  const raw   = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/);

  const trainMap   = new Map(); // trainNo -> { name, fromCode, toCode, stops[] }
  const stationMap = new Map(); // code -> name

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const c = line.split(',');
    if (c.length < 12) continue;

    const no   = c[0].trim();
    const name = c[1].trim();
    const seq  = parseInt(c[2].trim(), 10);
    const sc   = c[3].trim();
    const sn   = c[4].trim();
    const arr  = c[5].trim();
    const dep  = c[6].trim();
    const dist = parseFloat(c[7].trim()) || 0;
    const fc   = c[8].trim();
    const fn   = c[9].trim();
    const tc   = c[10].trim();
    // c[11] may have trailing whitespace / newline
    const tn   = c[11].trim();

    if (!no || isNaN(seq)) continue;

    stationMap.set(sc, sn);
    if (fc) stationMap.set(fc, fn);
    if (tc) stationMap.set(tc, tn);

    if (!trainMap.has(no)) {
      trainMap.set(no, { name, fromCode: fc, toCode: tc, stops: [] });
    }
    trainMap.get(no).stops.push({ seq, code: sc, arr, dep, dist });
  }

  // Sort stops and compute day count
  for (const [, t] of trainMap) {
    t.stops.sort((a, b) => a.seq - b.seq);
    let day = 1, prevMins = -1;
    const n = t.stops.length;

    for (let i = 0; i < n; i++) {
      const s    = t.stops[i];
      const last = i === n - 1;

      // At origin (seq index 0) arrival is always null;
      // at destination departure is always null.
      s.arrFmt = (i === 0)  ? null : hhmm(s.arr);
      s.depFmt = last       ? null : hhmm(s.dep);

      // Day rollover: if reference time is >60 min behind previous departure → new day
      const ref = toMins(s.arrFmt ?? s.depFmt);
      if (prevMins >= 0 && ref >= 0 && ref < prevMins - 60) day++;
      s.day = day;

      const cur = toMins(s.depFmt ?? s.arrFmt);
      if (cur >= 0) prevMins = cur;
    }
  }

  console.log(`  ${trainMap.size} trains, ${stationMap.size} unique stations`);
  return { trainMap, stationMap };
}

// ── batch helpers ─────────────────────────────────────────────────────────────

async function runQuery(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

/** Chunk an array into sub-arrays of size n */
function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// ── import stations ───────────────────────────────────────────────────────────

async function importStations(stationMap) {
  const entries = [...stationMap.entries()];
  const chunks  = chunk(entries, BATCH);
  let done = 0;

  for (const ch of chunks) {
    // Build parameterised INSERT ... ON CONFLICT DO NOTHING
    const values  = [];
    const params  = [];
    let   pIdx    = 1;

    for (const [code, name] of ch) {
      values.push(`($${pIdx++}, $${pIdx++})`);
      params.push(code, name);
    }

    await runQuery(
      `INSERT INTO "RailStation" (code, name)
       VALUES ${values.join(',')}
       ON CONFLICT (code) DO NOTHING`,
      params
    );
    done += ch.length;
    progress('Stations', done, entries.length);
  }
  console.log('');
}

// ── import trains ─────────────────────────────────────────────────────────────

async function importTrains(trainMap) {
  const entries = [...trainMap.entries()];
  const chunks  = chunk(entries, BATCH);
  let done = 0;

  for (const ch of chunks) {
    const values = [];
    const params = [];
    let   pIdx   = 1;

    for (const [no, t] of ch) {
      values.push(`($${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++}, $${pIdx++})`);
      params.push(
        no,
        t.name,
        'EXP',        // trainType — will be enriched later if needed
        t.fromCode,
        t.toCode,
        'Daily',      // runDays — CSV doesn't carry this
        '{}'          // classes — empty; the fare calc falls back to all classes
      );
    }

    await runQuery(
      `INSERT INTO "RailTrain" ("trainNo","trainName","trainType","fromCode","toCode","runDays","classes")
       VALUES ${values.join(',')}
       ON CONFLICT ("trainNo") DO UPDATE SET
         "trainName" = EXCLUDED."trainName",
         "fromCode"  = EXCLUDED."fromCode",
         "toCode"    = EXCLUDED."toCode"`,
      params
    );
    done += ch.length;
    progress('Trains ', done, entries.length);
  }
  console.log('');
}

// ── import stops ──────────────────────────────────────────────────────────────

async function importStops(trainMap) {
  const trainNos = [...trainMap.keys()];

  // Fetch all train IDs in batches
  const idMap = new Map(); // trainNo -> id
  for (const ch of chunk(trainNos, 1000)) {
    const placeholders = ch.map((_, i) => `$${i + 1}`).join(',');
    const { rows } = await runQuery(
      `SELECT id, "trainNo" FROM "RailTrain" WHERE "trainNo" IN (${placeholders})`,
      ch
    );
    rows.forEach(r => idMap.set(r.trainNo, r.id));
  }

  // Delete existing stops for all these trains
  console.log('  Clearing existing stops...');
  for (const ch of chunk([...idMap.values()], 1000)) {
    const placeholders = ch.map((_, i) => `$${i + 1}`).join(',');
    await runQuery(
      `DELETE FROM "RailStop" WHERE "trainId" IN (${placeholders})`,
      ch
    );
  }

  // Build all stop rows
  const allStops = [];
  for (const [no, t] of trainMap) {
    const tid = idMap.get(no);
    if (!tid) continue;
    for (const s of t.stops) {
      allStops.push([tid, s.code, s.seq, s.arrFmt, s.depFmt, s.day, s.dist]);
    }
  }

  console.log(`  Inserting ${allStops.length} stops...`);
  const stopChunks = chunk(allStops, BATCH);
  let done = 0;

  for (const ch of stopChunks) {
    const values = [];
    const params = [];
    let   pIdx   = 1;

    for (const [tid, code, seq, arr, dep, day, dist] of ch) {
      values.push(`($${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++},$${pIdx++})`);
      params.push(tid, code, seq, arr, dep, day, dist);
    }

    await runQuery(
      `INSERT INTO "RailStop" ("trainId","stationCode","sequence","arrivalTime","departureTime","dayCount","distanceKm")
       VALUES ${values.join(',')}
       ON CONFLICT ("trainId","sequence") DO NOTHING`,
      params
    );
    done += ch.length;
    progress('Stops  ', done, allStops.length);
  }
  console.log('');
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { trainMap, stationMap } = parseCsv(CSV_PATH);

  console.log('\nImporting stations...');
  await importStations(stationMap);

  console.log('Importing trains...');
  await importTrains(trainMap);

  console.log('Importing stops...');
  await importStops(trainMap);

  // Final counts
  const { rows: counts } = await runQuery(`
    SELECT
      (SELECT COUNT(*) FROM "RailStation") AS stations,
      (SELECT COUNT(*) FROM "RailTrain")   AS trains,
      (SELECT COUNT(*) FROM "RailStop")    AS stops
  `, []);
  console.log('\n✓ Import complete!');
  console.log(`  Stations : ${counts[0].stations}`);
  console.log(`  Trains   : ${counts[0].trains}`);
  console.log(`  Stops    : ${counts[0].stops}`);
}

main()
  .catch(e => { console.error('\nFATAL:', e.message); process.exit(1); })
  .finally(() => pool.end());
