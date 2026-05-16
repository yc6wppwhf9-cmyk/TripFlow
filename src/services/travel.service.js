const axios = require('axios');

// ── IATA airport codes for major cities ──────────────────────────────────────
const CITY_TO_IATA = {
  // India — Metro
  'delhi': 'DEL', 'new delhi': 'DEL',
  'mumbai': 'BOM', 'bombay': 'BOM',
  'bangalore': 'BLR', 'bengaluru': 'BLR',
  'hyderabad': 'HYD',
  'chennai': 'MAA', 'madras': 'MAA',
  'kolkata': 'CCU', 'calcutta': 'CCU',
  // India — Tier 2
  'pune': 'PNQ',
  'ahmedabad': 'AMD',
  'goa': 'GOI', 'panaji': 'GOI',
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
  'mangalore': 'IXE', 'mangaluru': 'IXE',
  'trichy': 'TRZ', 'tiruchirappalli': 'TRZ',
  'madurai': 'IXM',
  'ranchi': 'IXR',
  'bhopal': 'BHO',
  'agra': 'AGR',
  'leh': 'IXL',
  'srinagar': 'SXR',
  'port blair': 'IXZ',
  'jabalpur': 'JLR',
  'vadodara': 'BDQ', 'baroda': 'BDQ',
  'rajkot': 'RAJ',
  'aurangabad': 'IXU',
  'jodhpur': 'JDH',
  'udaipur': 'UDR',
  'hubli': 'HBX',
  'belgaum': 'IXG', 'belagavi': 'IXG',
  'tirupati': 'TIR',
  'vijayawada': 'VGA',
  'rajahmundry': 'RJA',
  'salem': 'SXV',
  'tuticorin': 'TCR', 'thoothukudi': 'TCR',
  'pondicherry': 'PNY',
  'shimla': 'SLV',
  'dehradun': 'DED',
  'gorakhpur': 'GOP',
  'allahabad': 'IXD', 'prayagraj': 'IXD',
  'gwalior': 'GWL',
  'jammu': 'IXJ',
  'dibrugarh': 'DIB',
  'guwahati': 'GAU',
  'imphal': 'IMF',
  'dimapur': 'DMU',
  'agartala': 'IXA',
  'aizawl': 'AJL',
  'shillong': 'SHL',
  'bagdogra': 'IXB',
  'silchar': 'IXS',
  'jorhat': 'JRH',
  'tezpur': 'TEZ',
  'lilabari': 'IXI',
  'portblair': 'IXZ',
  'kavaratti': 'AGX',
  'darbhanga': 'DBR',
  'pune': 'PNQ',
  'shirdi': 'SAG',
  'nashik': 'ISK',
  'kolhapur': 'KLH',
  'solapur': 'SSE',
  'akola': 'AKD',
  'nanded': 'NDC',
  'latur': 'LTU',
  'ozar': 'ISK',
  'kannur': 'CNN',
  'calicut': 'CCJ', 'kozhikode': 'CCJ',
  'thrissur': 'TCR',
  'trivandrum': 'TRV', 'thiruvananthapuram': 'TRV',
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
  'toronto': 'YYZ',
  'los angeles': 'LAX',
  'chicago': 'ORD',
  'san francisco': 'SFO',
  'seattle': 'SEA',
  'washington': 'IAD',
  'dallas': 'DFW',
  'houston': 'IAH',
  'boston': 'BOS',
  'miami': 'MIA',
  'abu dhabi': 'AUH',
  'doha': 'DOH',
  'riyadh': 'RUH',
  'jeddah': 'JED',
  'muscat': 'MCT',
  'colombo': 'CMB',
  'dhaka': 'DAC',
  'kathmandu': 'KTM',
  'nairobi': 'NBO',
  'johannesburg': 'JNB',
  'istanbul': 'IST',
  'zurich': 'ZRH',
  'vienna': 'VIE',
  'madrid': 'MAD',
  'barcelona': 'BCN',
  'seoul': 'ICN',
  'jakarta': 'CGK',
  'manila': 'MNL',
  'taipei': 'TPE',
  'ho chi minh city': 'SGN', 'saigon': 'SGN',
  'hanoi': 'HAN',
  'melbourne': 'MEL',
  'auckland': 'AKL',
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
  const key = city.toLowerCase().trim();
  const code = CITY_TO_IATA[key];
  if (!code) throw new Error(`Airport not found for "${city}". Please use a city with an airport (e.g. Mumbai, Delhi, Patna).`);
  return code;
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
    let depCode, arrCode;
    try { depCode = resolveIATA(origin); } catch (e) { return { available: false, reason: e.message }; }
    try { arrCode = resolveIATA(destination); } catch (e) { return { available: false, reason: e.message }; }

    const res = await axios.get('https://google-flights2.p.rapidapi.com/api/v1/searchFlights', {
      headers: FLIGHT_HEADERS(),
      params: {
        departure_id: depCode,
        arrival_id: arrCode,
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

// Station code aliases — some APIs use alternate codes
const STATION_ALIASES = {
  'CSTM': ['CSTM', 'CST', 'CSMT', 'C SHIVAJI'],
  'BCT':  ['BCT', 'MUMBAI CENTRAL', 'BANDRA'],
  'LTT':  ['LTT', 'LOKMANYA'],
  'NDLS': ['NDLS', 'NEW DELHI', 'NEWDELHI'],
  'DLI':  ['DLI', 'OLD DELHI', 'DELHI JN'],
  'NZM':  ['NZM', 'HAZRAT NIZAMUDDIN'],
  'SBC':  ['SBC', 'BANGALORE', 'BENGALURU', 'KSR'],
  'MAS':  ['MAS', 'CHENNAI CENTRAL', 'MADRAS'],
  'HWH':  ['HWH', 'HOWRAH'],
  'HYB':  ['HYB', 'HYDERABAD', 'SECUNDERABAD', 'SC'],
};

function findStop(schedule, code) {
  const upper = code.toUpperCase();
  const aliases = STATION_ALIASES[upper] || [upper];
  return schedule.find(s => {
    const name = s.station.toUpperCase();
    return aliases.some(alias => name.includes(alias));
  });
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

      const isTimeStr = v => v && v !== 'Source' && v !== 'Destination' && v !== 'Start' && v !== 'End' && /\d{1,2}:\d{2}/.test(v);
      const dep = fromStop?.departs;
      const arr = toStop?.arrives;

      results.push({
        trainNumber: trainNo,
        trainName: TRAIN_NAMES[trainNo] || data.train_name || trainNo,
        departure: isTimeStr(dep) ? dep : (isTimeStr(fromStop?.arrives) ? fromStop.arrives : null),
        arrival: isTimeStr(arr) ? arr : null,
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

    const allHotels = res.data?.result || [];
    if (!allHotels.length) return { available: false, reason: `No hotels found in "${city}" for those dates.` };

    // Prefer hotels with at least 1 star; fall back to all if none found
    const hotels = allHotels.filter(h => h.class >= 1).length
      ? allHotels.filter(h => h.class >= 1)
      : allHotels;

    return hotels.slice(0, 5).map(h => {
      const nights = Math.max(1, (() => {
        try {
          const d1 = new Date(checkIn), d2 = new Date(checkOut || checkIn);
          return Math.round((d2 - d1) / 86400000) || 1;
        } catch { return 1; }
      })());
      const total = Math.round(h.min_total_price || h.price_breakdown?.gross_price || 0);
      const perNight = Math.round(total / nights);
      return {
        name: h.hotel_name,
        stars: h.class || 0,
        pricePerNight: perNight,
        totalPrice: total,
        price: perNight,
        currency: 'INR',
        rating: h.review_score,
        reviewWord: h.review_score_word,
        reviewCount: h.review_nr,
        address: h.address,
        distanceFromCenter: h.distance_to_cc_formatted
      };
    });
  } catch (err) {
    const detail = err.response?.data?.message || err.message;
    return { available: false, reason: `Hotel search error: ${detail}` };
  }
}

// ── Nearest airports for cities without direct service ──────────────────────
// Each entry lists airports sorted by proximity
const NEAREST_AIRPORTS = {
  // Bihar
  'muzaffarpur': [{ city: 'Darbhanga', code: 'DBR', km: 50 }, { city: 'Patna', code: 'PAT', km: 75 }],
  'muzzafarpur': [{ city: 'Darbhanga', code: 'DBR', km: 50 }, { city: 'Patna', code: 'PAT', km: 75 }],
  'mfp': [{ city: 'Darbhanga', code: 'DBR', km: 50 }, { city: 'Patna', code: 'PAT', km: 75 }],
  'bhagalpur': [{ city: 'Patna', code: 'PAT', km: 220 }],
  'gaya': [{ city: 'Gaya', code: 'GAY', km: 5 }],
  'motihari': [{ city: 'Darbhanga', code: 'DBR', km: 120 }, { city: 'Patna', code: 'PAT', km: 145 }],
  'sitamarhi': [{ city: 'Darbhanga', code: 'DBR', km: 65 }],
  'madhubani': [{ city: 'Darbhanga', code: 'DBR', km: 60 }],
  'samastipur': [{ city: 'Darbhanga', code: 'DBR', km: 40 }, { city: 'Patna', code: 'PAT', km: 90 }],
  'begusarai': [{ city: 'Patna', code: 'PAT', km: 120 }],
  'hajipur': [{ city: 'Patna', code: 'PAT', km: 20 }],
  'chapra': [{ city: 'Patna', code: 'PAT', km: 75 }],
  'arrah': [{ city: 'Patna', code: 'PAT', km: 55 }],
  'sasaram': [{ city: 'Varanasi', code: 'VNS', km: 80 }, { city: 'Patna', code: 'PAT', km: 160 }],
  // Uttar Pradesh
  'mathura': [{ city: 'Delhi', code: 'DEL', km: 150 }, { city: 'Agra', code: 'AGR', km: 55 }],
  'vrindavan': [{ city: 'Delhi', code: 'DEL', km: 155 }, { city: 'Agra', code: 'AGR', km: 60 }],
  'kanpur': [{ city: 'Lucknow', code: 'LKO', km: 80 }],
  'aligarh': [{ city: 'Delhi', code: 'DEL', km: 140 }, { city: 'Agra', code: 'AGR', km: 90 }],
  'meerut': [{ city: 'Delhi', code: 'DEL', km: 70 }],
  'noida': [{ city: 'Delhi', code: 'DEL', km: 45 }],
  'gurgaon': [{ city: 'Delhi', code: 'DEL', km: 30 }],
  'faridabad': [{ city: 'Delhi', code: 'DEL', km: 35 }],
  'moradabad': [{ city: 'Delhi', code: 'DEL', km: 170 }],
  'bareilly': [{ city: 'Delhi', code: 'DEL', km: 250 }],
  'jhansi': [{ city: 'Gwalior', code: 'GWL', km: 100 }],
  'mirzapur': [{ city: 'Varanasi', code: 'VNS', km: 55 }],
  // Uttarakhand
  'haridwar': [{ city: 'Dehradun', code: 'DED', km: 55 }],
  'rishikesh': [{ city: 'Dehradun', code: 'DED', km: 45 }],
  'nainital': [{ city: 'Pantnagar', code: 'PGH', km: 70 }],
  'mussoorie': [{ city: 'Dehradun', code: 'DED', km: 35 }],
  'manali': [{ city: 'Kullu', code: 'KUU', km: 55 }, { city: 'Chandigarh', code: 'IXC', km: 280 }],
  // Himachal Pradesh
  'dharamshala': [{ city: 'Kangra', code: 'DHM', km: 15 }],
  'mcleodganj': [{ city: 'Kangra', code: 'DHM', km: 20 }],
  'kullu': [{ city: 'Kullu', code: 'KUU', km: 10 }],
  'kasauli': [{ city: 'Chandigarh', code: 'IXC', km: 70 }],
  // Rajasthan
  'ajmer': [{ city: 'Jaipur', code: 'JAI', km: 135 }],
  'pushkar': [{ city: 'Jaipur', code: 'JAI', km: 145 }],
  'mount abu': [{ city: 'Udaipur', code: 'UDR', km: 180 }],
  'chittorgarh': [{ city: 'Udaipur', code: 'UDR', km: 115 }],
  // Jharkhand
  'jamshedpur': [{ city: 'Ranchi', code: 'IXR', km: 130 }],
  'dhanbad': [{ city: 'Ranchi', code: 'IXR', km: 180 }],
  'bokaro': [{ city: 'Ranchi', code: 'IXR', km: 120 }],
  // West Bengal
  'siliguri': [{ city: 'Bagdogra', code: 'IXB', km: 15 }],
  'darjeeling': [{ city: 'Bagdogra', code: 'IXB', km: 75 }],
  'gangtok': [{ city: 'Bagdogra', code: 'IXB', km: 125 }],
  'durgapur': [{ city: 'Kolkata', code: 'CCU', km: 165 }],
  // Maharashtra
  'nashik': [{ city: 'Mumbai', code: 'BOM', km: 175 }],
  'shirdi': [{ city: 'Shirdi', code: 'SAG', km: 15 }],
  'kolhapur': [{ city: 'Kolhapur', code: 'KLH', km: 10 }],
  'satara': [{ city: 'Pune', code: 'PNQ', km: 115 }],
  // Madhya Pradesh
  'ujjain': [{ city: 'Indore', code: 'IDR', km: 55 }],
  'sagar': [{ city: 'Bhopal', code: 'BHO', km: 185 }],
  'rewa': [{ city: 'Jabalpur', code: 'JLR', km: 160 }],
  // Gujarat
  'anand': [{ city: 'Ahmedabad', code: 'AMD', km: 75 }],
  'gandhinagar': [{ city: 'Ahmedabad', code: 'AMD', km: 30 }],
  'morbi': [{ city: 'Rajkot', code: 'RAJ', km: 65 }],
  // Karnataka
  'mysuru': [{ city: 'Bangalore', code: 'BLR', km: 145 }],
  'mysore': [{ city: 'Bangalore', code: 'BLR', km: 145 }],
  'hampi': [{ city: 'Hubli', code: 'HBX', km: 155 }],
  'hospet': [{ city: 'Hubli', code: 'HBX', km: 155 }],
  // Tamil Nadu
  'ooty': [{ city: 'Coimbatore', code: 'CJB', km: 90 }],
  'kodaikanal': [{ city: 'Madurai', code: 'IXM', km: 120 }],
  // Kerala
  'munnar': [{ city: 'Kochi', code: 'COK', km: 130 }],
  'thekkady': [{ city: 'Madurai', code: 'IXM', km: 100 }],
  'alleppey': [{ city: 'Kochi', code: 'COK', km: 65 }],
  'alappuzha': [{ city: 'Kochi', code: 'COK', km: 65 }],
};

// Returns nearest airports for a destination (or its own airport if it has one)
function getNearestAirports(city) {
  const key = city.toLowerCase().trim();
  if (CITY_TO_IATA[key]) {
    return [{ city, code: CITY_TO_IATA[key], km: 0 }];
  }
  return NEAREST_AIRPORTS[key] || [];
}

// ── Trip Planner — bundles flights + trains + hotels in one call ──────────────
async function planTrip(from, to, fromDate, toDate) {
  const airports = getNearestAirports(to);
  const hasAirport = airports.length > 0;

  // Run all searches in parallel
  const [outboundFlights, returnFlights, trains, hotels] = await Promise.all([
    // Outbound flights to each nearby airport
    hasAirport
      ? Promise.all(airports.slice(0, 2).map(ap =>
          searchFlights(from, ap.city, fromDate)
            .then(r => ({ via: ap.city, code: ap.code, km: ap.km, results: r }))
            .catch(() => ({ via: ap.city, code: ap.code, km: ap.km, results: { available: false } }))
        ))
      : Promise.resolve([]),

    // Return flights (only if toDate provided)
    hasAirport && toDate
      ? Promise.all(airports.slice(0, 2).map(ap =>
          searchFlights(ap.city, from, toDate)
            .then(r => ({ via: ap.city, code: ap.code, km: ap.km, results: r }))
            .catch(() => ({ via: ap.city, results: { available: false } }))
        ))
      : Promise.resolve([]),

    // Trains directly to destination
    searchTrains(from, to, fromDate).catch(() => ({ available: false, reason: 'Train search failed.' })),

    // Hotels at destination
    searchHotels(to, fromDate, toDate || fromDate).catch(() => ({ available: false, reason: 'Hotel search failed.' }))
  ]);

  return {
    destination: to,
    from,
    fromDate,
    toDate: toDate || null,
    nearestAirports: airports.map(ap => ({
      city: ap.city,
      code: ap.code,
      distanceKm: ap.km
    })),
    outboundFlights,   // Array of { via, code, km, results[] }
    returnFlights,     // Array of { via, code, km, results[] }
    trains: Array.isArray(trains) ? trains : (trains?.available === false ? [] : trains),
    trainNote: !Array.isArray(trains) ? trains?.reason : null,
    hotels: Array.isArray(hotels) ? hotels : [],
    hotelNote: !Array.isArray(hotels) ? hotels?.reason : null,
  };
}

module.exports = { searchFlights, searchTrains, searchHotels, planTrip, resolveIATA, resolveStation };
