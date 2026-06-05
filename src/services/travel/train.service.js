const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const { resolveStation } = require('./resolvers');
const { getDistanceKm } = require('../../utils/distance');
const { ROUTE_TRAINS, TRAIN_SCHEDULES, TRAIN_NAMES } = require('../../data/route-trains');
const { searchTrainsBetweenStations } = require('../train-db.service');

const _anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

async function askClaude(prompt) {
  if (!_anthropic) throw new Error('ANTHROPIC_API_KEY not set');
  const res = await _anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });
  const text = res.content[0].text.trim();
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

function getTrainFares(origin, destination, classesList = ['SL', '3A', '2A', '1A']) {
  const distance = getDistanceKm(origin, destination);
  const baseFares = {
    'SL': Math.max(175, Math.round(distance * 0.65 + 30)),
    '3A': Math.max(520, Math.round(distance * 1.65 + 60)),
    '2A': Math.max(760, Math.round(distance * 2.35 + 80)),
    '1A': Math.max(1250, Math.round(distance * 4.10 + 120))
  };
  const res = {};
  classesList.forEach(c => {
    const cls = c.toUpperCase();
    res[cls] = baseFares[cls] ?? Math.max(150, Math.round(distance * 0.5));
  });
  return res;
}

async function fetchTrainFare(apiKey, trainNo, fromCode, toCode) {
  try {
    const res = await axios.get(
      `http://indianrailapi.com/api/v2/TrainFare/apikey/${apiKey}/TrainNumber/${trainNo}/From/${fromCode}/To/${toCode}/Quota/GN`,
      { timeout: 8000 }
    );
    const fares = res.data?.Fares;
    if (!Array.isArray(fares) || !fares.length) return null;
    return fares.reduce((acc, f) => {
      const cls  = f.ClassType?.trim();
      const fare = parseInt(f.Fare, 10);
      if (cls && !isNaN(fare) && fare > 0) acc[cls] = fare;
      return acc;
    }, {});
  } catch {
    return null;
  }
}

const MUMBAI_STATIONS = ['CSTM', 'LTT', 'BCT', 'BDTS'];

function getRouteCandidates(from, to) {
  const candidates = [`${from}-${to}`, `${to}-${from}`];
  if (MUMBAI_STATIONS.includes(from)) {
    MUMBAI_STATIONS.forEach(alt => {
      if (alt !== from) { candidates.push(`${alt}-${to}`, `${to}-${alt}`); }
    });
  }
  if (MUMBAI_STATIONS.includes(to)) {
    MUMBAI_STATIONS.forEach(alt => {
      if (alt !== to) { candidates.push(`${from}-${alt}`, `${alt}-${from}`); }
    });
  }
  return candidates;
}

async function searchTrains(origin, destination, date) {
  const fromCode = resolveStation(origin);
  const toCode   = resolveStation(destination);

  // 1. Own Supabase DB — fastest, no external dependency
  try {
    const dbResults = await searchTrainsBetweenStations(fromCode, toCode);
    if (Array.isArray(dbResults) && dbResults.length) {
      return dbResults;
    }
    // Mumbai multi-terminal fallback
    if (MUMBAI_STATIONS.includes(fromCode) || MUMBAI_STATIONS.includes(toCode)) {
      const altsFrom = MUMBAI_STATIONS.includes(fromCode) ? MUMBAI_STATIONS.filter(s => s !== fromCode) : [fromCode];
      const altsTo   = MUMBAI_STATIONS.includes(toCode)   ? MUMBAI_STATIONS.filter(s => s !== toCode)   : [toCode];
      for (const f of altsFrom) {
        for (const t of altsTo) {
          const alt = await searchTrainsBetweenStations(f, t);
          if (Array.isArray(alt) && alt.length) return alt;
        }
      }
    }
  } catch (err) {
    console.warn('[trains] DB lookup failed:', err.message);
  }

  // 2. indianrailapi.com
  if (process.env.INDIAN_RAIL_API_KEY) {
    try {
      const res = await axios.get(
        `http://indianrailapi.com/api/v2/TrainBetweenStation/apikey/${process.env.INDIAN_RAIL_API_KEY}/From/${fromCode}/To/${toCode}`,
        { timeout: 10000 }
      );
      const list = res.data?.Trains;
      if (Array.isArray(list) && list.length) {
        const top = list.slice(0, 5);
        const fareResults = await Promise.all(
          top.map(t => fetchTrainFare(process.env.INDIAN_RAIL_API_KEY, t.TrainNo, fromCode, toCode))
        );
        return top.map((t, i) => {
          const liveFares  = fareResults[i];
          const classes    = liveFares ? Object.keys(liveFares) : ['SL', '3A', '2A', '1A'];
          const classFares = liveFares || getTrainFares(origin, destination, classes);
          return {
            trainNumber: t.TrainNo,
            trainName:   t.TrainName,
            departure:   t.DepartureTime,
            arrival:     t.ArrivalTime,
            duration:    t.TravelTime,
            trainType:   t.TrainType,
            classes,
            classFares,
            note: liveFares ? 'Live IRCTC fares — book at IRCTC.co.in' : 'Estimated fares — verify at IRCTC.co.in'
          };
        });
      }
    } catch (err) {
      console.warn('[trains] indianrailapi failed:', err.response?.status || err.message);
    }
  }

  // 3. Known popular-route fallback
  const candidates = getRouteCandidates(fromCode, toCode);
  const knownNos   = candidates.reduce((acc, key) => {
    (ROUTE_TRAINS[key] || []).forEach(t => { if (!acc.includes(t)) acc.push(t); });
    return acc;
  }, []);

  if (knownNos.length) {
    const classes = ['SL', '3A', '2A', '1A'];
    const fares   = getTrainFares(origin, destination, classes);
    return [...new Set(knownNos)].slice(0, 5).map(no => {
      const sched = TRAIN_SCHEDULES[no];
      return {
        trainNumber: no,
        trainName:   TRAIN_NAMES[no] || `Train ${no}`,
        departure:   sched?.dep  || null,
        arrival:     sched?.arr  || null,
        duration:    sched?.duration || null,
        classes,
        classFares:  fares,
        note: 'Fares are estimated — book at IRCTC.co.in for confirmed availability'
      };
    });
  }

  // 4. Claude fallback
  try {
    const raw    = await askClaude(`List up to 3 real Indian Railways trains that run between ${origin} and ${destination}. Only include trains you are highly confident exist on this route. Return ONLY a JSON array. Each object: { "trainNumber": "string", "trainName": "string", "departure": "HH:MM", "arrival": "HH:MM", "classes": ["SL","3A","2A","1A"] }. If you are not confident about any trains on this route, return [].`);
    const trains = JSON.parse(raw);
    if (!Array.isArray(trains) || !trains.length)
      return { available: false, reason: `No trains found for ${origin} → ${destination}. Check IRCTC.co.in for live availability.` };
    return trains.map(t => ({
      ...t,
      classFares: getTrainFares(origin, destination, t.classes || ['SL', '3A', '2A', '1A']),
      note: 'Estimated — verify schedule and availability at IRCTC.co.in before booking'
    }));
  } catch {
    return { available: false, reason: `Train search unavailable for this route. Check IRCTC.co.in directly.` };
  }
}

module.exports = { searchTrains, getTrainFares };
