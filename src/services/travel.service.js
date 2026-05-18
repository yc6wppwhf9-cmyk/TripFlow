const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

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
  // strip markdown fences if present
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

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

// ── Trains ────────────────────────────────────────────────────────────────────
// Primary:  irctc-api3.p.rapidapi.com  (subscribed — uses POST form data)
// Fallback: Claude AI  (works without any subscription)

// Convert ISO date (YYYY-MM-DD) to DD-MM-YYYY required by irctc-api3
function toIRCTCDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
}

async function searchTrains(origin, destination, date) {
  const fromCode = resolveStation(origin);
  const toCode   = resolveStation(destination);

  // 1. Try irctc-api3 API if key is present
  if (process.env.RAPIDAPI_KEY) {
    try {
      const params = new URLSearchParams({
        source:      fromCode,
        destination: toCode,
        date:        toIRCTCDate(date)
      });
      const res = await axios.post(
        'https://irctc-api3.p.rapidapi.com/search.php',
        params.toString(),
        {
          headers: {
            'X-RapidAPI-Key':  process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'irctc-api3.p.rapidapi.com',
            'Content-Type':    'application/x-www-form-urlencoded'
          },
          timeout: 8000
        }
      );
      const list = res.data?.trains?.data?.trainList || [];
      if (Array.isArray(list) && list.length) {
        return list.slice(0, 5).map(t => {
          // Build per-class fare summary from availabilityCache
          const cache = t.availabilityCache || {};
          const fares = Object.entries(cache).map(([cls, info]) =>
            `${cls}: ₹${info.fare} (${info.availabilityDisplayName || info.availability || ''})`
          ).join(' · ');

          // duration is in minutes — convert to "Xh Ym"
          const dur = t.duration
            ? `${Math.floor(t.duration / 60)}h ${t.duration % 60}m`
            : null;

          return {
            trainNumber: t.trainNumber,
            trainName:   t.trainName,
            departure:   t.departureTime,
            arrival:     t.arrivalTime,
            duration:    dur,
            classes:     t.avlClasses || ['SL', '3A', '2A', '1A'],
            fares:       fares || null,
            note:        'Book at IRCTC.co.in'
          };
        });
      }
    } catch (_) { /* fall through to known-routes table */ }
  }

  // 2. Instant result for known popular routes (no API call needed)
  const routeKey   = `${fromCode}-${toCode}`;
  const reverseKey = `${toCode}-${fromCode}`;
  const knownNos   = ROUTE_TRAINS[routeKey] || ROUTE_TRAINS[reverseKey] || [];
  if (knownNos.length) {
    return knownNos.slice(0, 3).map(no => ({
      trainNumber: no,
      trainName:   TRAIN_NAMES[no] || no,
      departure:   null,
      arrival:     null,
      classes:     ['1A', '2A', '3A', 'SL'],
      note:        'Fares vary by class — book at IRCTC.co.in'
    }));
  }

  // 3. Claude fallback for all other routes
  try {
    const raw    = await askClaude(`List up to 4 real Indian Railways trains from ${origin} to ${destination}. Return ONLY a JSON array. Each object: { "trainNumber": "string", "trainName": "string", "departure": "HH:MM", "arrival": "HH:MM", "classes": ["1A","2A","3A","SL"] }. If no trains exist return [].`);
    const trains = JSON.parse(raw);
    if (!Array.isArray(trains) || !trains.length)
      return { available: false, reason: `No trains found for ${origin} → ${destination}. Check IRCTC.co.in.` };
    return trains.map(t => ({ ...t, note: 'Book at IRCTC.co.in' }));
  } catch {
    return { available: false, reason: `Train search unavailable. Check IRCTC.co.in.` };
  }
}

// ── Hotels ────────────────────────────────────────────────────────────────────
// Primary:  booking-com15.p.rapidapi.com  (subscribe at rapidapi.com → "Booking.com" by APIplugin)
// Fallback: Claude AI  (works without any subscription)
const _hotelDestCache = {};

async function searchHotels(city, checkIn, checkOut) {
  const nights = (() => {
    try {
      const d1 = new Date(checkIn), d2 = new Date(checkOut || checkIn);
      return Math.max(1, Math.round((d2 - d1) / 86400000));
    } catch { return 1; }
  })();

  // 1. Try live Booking.com API if key is present
  if (process.env.RAPIDAPI_KEY) {
    try {
      const cacheKey = city.toLowerCase().trim();
      if (!_hotelDestCache[cacheKey]) {
        const destRes = await axios.get('https://booking-com15.p.rapidapi.com/api/v1/hotels/searchDestination', {
          headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': 'booking-com15.p.rapidapi.com' },
          params:  { query: city }
        });
        const dest = destRes.data?.data?.[0];
        if (dest) _hotelDestCache[cacheKey] = { dest_id: dest.dest_id, search_type: dest.search_type };
      }

      if (_hotelDestCache[cacheKey]) {
        const { dest_id, search_type } = _hotelDestCache[cacheKey];
        const hotRes = await axios.get('https://booking-com15.p.rapidapi.com/api/v1/hotels/searchHotels', {
          headers: { 'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, 'X-RapidAPI-Host': 'booking-com15.p.rapidapi.com' },
          params:  {
            dest_id, search_type,
            arrival_date:   checkIn,
            departure_date: checkOut || checkIn,
            adults: 1, room_qty: 1,
            currency_code: 'INR', languagecode: 'en-us',
            units: 'metric', page_number: 1
          }
        });
        const list = hotRes.data?.data?.hotels || [];
        if (list.length) {
          return list.slice(0, 5).map(h => {
            const perNight = Math.round(h.property?.priceBreakdown?.grossPrice?.value || 0);
            return {
              name:               h.property?.name,
              stars:              Math.round(h.property?.propertyClass || 3),
              pricePerNight:      perNight,
              totalPrice:         perNight * nights,
              price:              perNight,
              currency:           'INR',
              rating:             h.property?.reviewScore,
              reviewWord:         h.property?.reviewScoreWord,
              reviewCount:        h.property?.reviewCount,
              distanceFromCenter: h.property?.distanceTocc ? `${h.property.distanceTocc} km from centre` : null,
              address:            h.property?.wishlistName || city
            };
          });
        }
      }
    } catch (_) { /* fall through to Claude */ }
  }

  // 2. Claude fallback — always works, realistic pricing
  try {
    const raw    = await askClaude(`List 5 real hotels in ${city}, India for business travel. Return ONLY a JSON array. Each object: { "name": "string", "stars": number, "pricePerNight": number (INR), "rating": number (6-9.5), "distanceFromCenter": "X km from centre", "address": "short address" }. Mix budget (₹1500-3000), mid-range (₹3000-7000) and premium (₹7000+).`);
    const hotels = JSON.parse(raw);
    if (!Array.isArray(hotels) || !hotels.length)
      return { available: false, reason: `No hotels found in "${city}".` };
    return hotels.slice(0, 5).map(h => ({
      name:               h.name,
      stars:              h.stars || 3,
      pricePerNight:      Math.round(h.pricePerNight || 3500),
      totalPrice:         Math.round((h.pricePerNight || 3500) * nights),
      price:              Math.round(h.pricePerNight || 3500),
      currency:           'INR',
      rating:             h.rating,
      distanceFromCenter: h.distanceFromCenter,
      address:            h.address
    }));
  } catch {
    return { available: false, reason: `Hotel search unavailable for "${city}". Check Booking.com or MakeMyTrip.` };
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
