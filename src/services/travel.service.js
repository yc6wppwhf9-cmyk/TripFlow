const axios = require('axios');

// ── IATA airport codes for major cities ──────────────────────────────────────
const CITY_TO_IATA = {
  // India
  'delhi': 'DEL', 'new delhi': 'DEL',
  'mumbai': 'BOM', 'bombay': 'BOM',
  'bangalore': 'BLR', 'bengaluru': 'BLR',
  'hyderabad': 'HYD',
  'chennai': 'MAA', 'madras': 'MAA',
  'kolkata': 'CCU', 'calcutta': 'CCU',
  'pune': 'PNQ',
  'ahmedabad': 'AMD',
  'goa': 'GOI',
  'jaipur': 'JAI',
  'lucknow': 'LKO',
  'kochi': 'COK', 'cochin': 'COK',
  'chandigarh': 'IXC',
  'bhubaneswar': 'BBI',
  'indore': 'IDR',
  'nagpur': 'NAG',
  'coimbatore': 'CJB',
  'visakhapatnam': 'VTZ', 'vizag': 'VTZ',
  'amritsar': 'ATQ',
  'varanasi': 'VNS',
  'patna': 'PAT',
  'raipur': 'RPR',
  'surat': 'STV',
  'mangalore': 'IXE',
  'trichy': 'TRZ', 'tiruchirappalli': 'TRZ',
  'madurai': 'IXM',
  'ranchi': 'IXR',
  'bhopal': 'BHO',
  'agra': 'AGR',
  'leh': 'IXL',
  'srinagar': 'SXR',
  'port blair': 'IXZ',
  // International
  'london': 'LHR',
  'dubai': 'DXB',
  'singapore': 'SIN',
  'bangkok': 'BKK',
  'new york': 'JFK',
  'tokyo': 'NRT',
  'paris': 'CDG',
  'frankfurt': 'FRA',
  'amsterdam': 'AMS',
  'hong kong': 'HKG',
  'kuala lumpur': 'KUL',
  'beijing': 'PEK',
  'shanghai': 'PVG',
  'sydney': 'SYD',
  'milan': 'MXP',
  'rome': 'FCO',
};

// ── Indian Railway station codes ─────────────────────────────────────────────
const CITY_TO_STATION = {
  'delhi': 'NDLS', 'new delhi': 'NDLS',
  'mumbai': 'CSTM', 'bombay': 'CSTM',
  'mumbai central': 'BCT',
  'bangalore': 'SBC', 'bengaluru': 'SBC',
  'hyderabad': 'HYB',
  'chennai': 'MAS', 'madras': 'MAS',
  'kolkata': 'HWH', 'calcutta': 'HWH',
  'pune': 'PUNE',
  'ahmedabad': 'ADI',
  'jaipur': 'JP',
  'lucknow': 'LKO',
  'kochi': 'ERS', 'cochin': 'ERS',
  'chandigarh': 'CDG',
  'bhopal': 'BPL',
  'nagpur': 'NGP',
  'varanasi': 'BSB',
  'patna': 'PNBE',
  'agra': 'AGC',
  'amritsar': 'ASR',
  'indore': 'INDB',
  'surat': 'ST',
  'coimbatore': 'CBE',
  'madurai': 'MDU',
  'visakhapatnam': 'VSKP', 'vizag': 'VSKP',
  'ranchi': 'RNC',
  'bhubaneswar': 'BBS',
  'raipur': 'R',
  'goa': 'MAO', 'madgaon': 'MAO',
};

function resolveIATA(city) {
  return CITY_TO_IATA[city.toLowerCase().trim()] || city.toUpperCase().slice(0, 3);
}

function resolveStation(city) {
  return CITY_TO_STATION[city.toLowerCase().trim()] || city.toUpperCase().slice(0, 4);
}

const FLIGHT_HEADERS = () => ({
  'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'google-flights2.p.rapidapi.com'
});

const HOTEL_HEADERS = () => ({
  'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'booking-com.p.rapidapi.com'
});

const TRAIN_HEADERS = () => ({
  'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'irctc1.p.rapidapi.com'
});

// Cache Booking.com destination lookups
const _hotelDestCache = {};

async function getHotelDestination(city) {
  const key = city.toLowerCase().trim();
  if (_hotelDestCache[key]) return _hotelDestCache[key];

  const res = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/locations', {
    headers: HOTEL_HEADERS(),
    params: { name: city, locale: 'en-gb' }
  });

  const dest = res.data?.[0];
  if (!dest) throw new Error(`Hotel destination not found for "${city}"`);

  _hotelDestCache[key] = { dest_id: dest.dest_id, dest_type: dest.dest_type, name: dest.name };
  return _hotelDestCache[key];
}

// ── Flights via Google Flights (RapidAPI) ─────────────────────────────────────
// Uses IATA codes directly — no entity ID lookup needed
async function searchFlights(origin, destination, date) {
  if (!process.env.RAPIDAPI_KEY) {
    return { available: false, reason: 'RapidAPI not configured (RAPIDAPI_KEY missing).' };
  }

  try {
    const res = await axios.get('https://google-flights2.p.rapidapi.com/api/v1/searchFlights', {
      headers: FLIGHT_HEADERS(),
      params: {
        departure_id: resolveIATA(origin),
        arrival_id: resolveIATA(destination),
        outbound_date: date,
        currency: 'INR',
        adults: 1,
        language: 'en-US'
      }
    });

    const topFlights = res.data?.data?.itineraries?.topFlights || [];
    const otherFlights = res.data?.data?.itineraries?.otherFlights || [];
    const all = [...topFlights, ...otherFlights];

    if (!all.length) return { available: false, reason: 'No flights found for this route and date.' };

    return all.slice(0, 5).map(it => {
      const seg = it.flights?.[0];
      return {
        airline: seg?.airline || 'Unknown',
        flightNumber: seg?.flight_number || '',
        aircraft: seg?.aircraft || '',
        departure: seg?.departure_airport?.time,
        arrival: seg?.arrival_airport?.time,
        duration: it.duration?.text,
        stops: it.stops,
        price: Math.round(it.price || 0),
        currency: 'INR'
      };
    });
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    return { available: false, reason: `Flight search error: ${detail}` };
  }
}

// Route → train numbers map (both directions)
const ROUTE_TRAINS = {
  'NDLS-CSTM': ['12952','12954','12910'], 'CSTM-NDLS': ['12951','12953','12909'],
  'NDLS-BCT':  ['12952','12954'],         'BCT-NDLS':  ['12951','12953'],
  'NDLS-LTT':  ['12952'],                 'LTT-NDLS':  ['12951'],
  'NDLS-SBC':  ['22692','12628'],         'SBC-NDLS':  ['22691','12627'],
  'NDLS-MAS':  ['12622','12616'],         'MAS-NDLS':  ['12621','12615'],
  'NDLS-HWH':  ['12302','12312'],         'HWH-NDLS':  ['12301','12311'],
  'NDLS-JP':   ['12016','12058'],         'JP-NDLS':   ['12015','12057'],
  'NDLS-ADI':  ['12958','12918'],         'ADI-NDLS':  ['12957','12917'],
  'NDLS-HYB':  ['12724','12716'],         'HYB-NDLS':  ['12723','12715'],
  'NDLS-LKO':  ['12230','12004'],         'LKO-NDLS':  ['12229','12003'],
  'CSTM-SBC':  ['11302','16536'],         'SBC-CSTM':  ['11301','16535'],
  'CSTM-HWH':  ['12810','12322'],         'HWH-CSTM':  ['12809','12321'],
};

const TRAIN_NAMES = {
  '12951':'Mumbai Rajdhani','12952':'Mumbai Rajdhani',
  '12953':'August Kranti Rajdhani','12954':'August Kranti Rajdhani',
  '12909':'Garib Rath','12910':'Garib Rath',
  '22691':'Bangalore Rajdhani','22692':'Bangalore Rajdhani',
  '12627':'Karnataka Express','12628':'Karnataka Express',
  '12621':'Tamil Nadu Express','12622':'Tamil Nadu Express',
  '12615':'Grand Trunk Express','12616':'Grand Trunk Express',
  '12301':'Howrah Rajdhani','12302':'Howrah Rajdhani',
  '12311':'Kalka Mail','12312':'Kalka Mail',
  '12015':'Ajmer Shatabdi','12016':'Ajmer Shatabdi',
  '12057':'Jan Shatabdi','12058':'Jan Shatabdi',
  '12957':'Swarna Jayanti Rajdhani','12958':'Swarna Jayanti Rajdhani',
  '12917':'Gujarat Express','12918':'Gujarat Express',
  '12723':'Telangana Express','12724':'Telangana Express',
  '12715':'Sachkhand Express','12716':'Sachkhand Express',
  '12229':'Lucknow Mail','12230':'Lucknow Mail',
  '12003':'Lucknow Shatabdi','12004':'Lucknow Shatabdi',
};

const _scheduleCache = {};

async function getTrainSchedule(trainNo) {
  if (_scheduleCache[trainNo]) return _scheduleCache[trainNo];
  const qs = require('querystring');
  const res = await axios.post(
    'https://irctc-railway-api1.p.rapidapi.com/train-schedule.php',
    qs.stringify({ train_no: trainNo }),
    { headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': 'irctc-railway-api1.p.rapidapi.com', 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  _scheduleCache[trainNo] = res.data;
  return res.data;
}

function findStop(schedule, code) {
  return schedule.find(s => s.station.toUpperCase().includes(code.toUpperCase()));
}

// ── Trains via IRCTC Railway API (real schedule data) ────────────────────────
async function searchTrains(origin, destination, date) {
  if (!process.env.RAPIDAPI_KEY) {
    return { available: false, reason: 'RapidAPI not configured.' };
  }

  const fromCode = resolveStation(origin);
  const toCode = resolveStation(destination);
  const routeKey = `${fromCode}-${toCode}`;
  const reverseKey = `${toCode}-${fromCode}`;
  const trainNos = ROUTE_TRAINS[routeKey] || ROUTE_TRAINS[reverseKey] || [];

  if (!trainNos.length) {
    return {
      available: false,
      reason: `No known trains for ${origin} → ${destination}. Please check IRCTC.co.in and enter the fare manually.`
    };
  }

  const results = [];
  for (const trainNo of trainNos.slice(0, 3)) {
    try {
      const data = await getTrainSchedule(trainNo);
      const stops = data.schedule || [];
      const fromStop = findStop(stops, fromCode);
      const toStop = findStop(stops, toCode);

      results.push({
        trainNumber: trainNo,
        trainName: TRAIN_NAMES[trainNo] || data.train_no,
        departure: fromStop?.departs || fromStop?.arrives || '—',
        arrival: toStop?.arrives || '—',
        fromDay: fromStop?.day,
        toDay: toStop?.day,
        classes: ['1A', '2A', '3A', 'SL'],
        note: 'Fares vary by class — check IRCTC for exact price'
      });
    } catch {
      // skip this train if fetch fails
    }
  }

  if (!results.length) {
    return { available: false, reason: 'Could not fetch train schedules. Please check IRCTC.co.in.' };
  }

  return results;
}

// ── Hotels via Booking.com (RapidAPI) ────────────────────────────────────────
async function searchHotels(city, checkIn, checkOut) {
  if (!process.env.RAPIDAPI_KEY) {
    return { available: false, reason: 'RapidAPI not configured (RAPIDAPI_KEY missing).' };
  }

  try {
    const dest = await getHotelDestination(city);

    const res = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/search', {
      headers: HOTEL_HEADERS(),
      params: {
        dest_id: dest.dest_id,
        dest_type: dest.dest_type,
        checkin_date: checkIn,
        checkout_date: checkOut || checkIn,
        adults_number: 1,
        room_number: 1,
        order_by: 'price',
        filter_by_currency: 'INR',
        locale: 'en-gb',
        units: 'metric',
        page_number: 0
      }
    });

    const hotels = res.data?.result || [];
    if (!hotels.length) return { available: false, reason: `No hotels found in "${city}" for those dates.` };

    return hotels.slice(0, 5).map(h => ({
      name: h.hotel_name,
      stars: h.class,
      pricePerNight: Math.round(h.price_breakdown?.gross_price || 0),
      totalPrice: Math.round(h.min_total_price || 0),
      currency: 'INR',
      rating: h.review_score,
      reviewWord: h.review_score_word,
      reviewCount: h.review_nr,
      address: h.address,
      distanceFromCenter: h.distance_to_cc_formatted
    }));
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    return { available: false, reason: `Hotel search error: ${detail}` };
  }
}

module.exports = { searchFlights, searchTrains, searchHotels, resolveIATA, resolveStation };
