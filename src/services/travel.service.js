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
  'muzaffarpur': 'MFP', 'mfp': 'MFP',
  'darbhanga': 'DBG',
  'samastipur': 'SPJ',
  'hajipur': 'HJP',
  'chapra': 'CPR',
  'motihari': 'MTA',
  'sitamarhi': 'SMI',
  'gaya': 'GAYA',
  'bhagalpur': 'BGP',
  'dhanbad': 'DHN',
  'jamshedpur': 'TATA',
  'gorakhpur': 'GKP',
  'kanpur': 'CNB',
  'allahabad': 'ALD', 'prayagraj': 'ALD',
  'gwalior': 'GWL',
  'jammu': 'JAT',
  'dehradun': 'DDN',
  'ajmer': 'AII',
  'jodhpur': 'JU',
  'udaipur': 'UDZ',
  'aurangabad': 'AWB',
  'nashik': 'NK',
  'kolhapur': 'KOP',
  'solapur': 'SUR',
  'vijayawada': 'BZA',
  'rajahmundry': 'RJY',
  'tirupati': 'TPTY',
  'trichy': 'TPJ', 'tiruchirappalli': 'TPJ',
  'salem': 'CLT',
  'trivandrum': 'TVC', 'thiruvananthapuram': 'TVC',
  'mangalore': 'MAQ', 'mangaluru': 'MAQ',
  'hubli': 'UBL',
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

    return all.map(it => {
      const seg  = it.flights?.[0];
      const last = it.flights?.[it.flights.length - 1];
      return {
        airline:      seg?.airline || 'Unknown',
        flightNumber: seg?.flight_number || '',
        aircraft:     seg?.aircraft || '',
        departure:    seg?.departure_airport?.time,
        arrival:      last?.arrival_airport?.time,
        duration:     it.duration?.text,
        stops:        it.stops ?? 0,
        price:        Math.round(it.price || 0),
        currency:     'INR'
      };
    }).filter(f => f.price > 0);
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
  // Mumbai ↔ Bihar / East UP
  'CSTM-MFP':  ['12141','11061'],         'MFP-CSTM':  ['12142','11062'],
  'CSTM-PNBE': ['12141','11061'],         'PNBE-CSTM': ['12142','11062'],
  'CSTM-DBG':  ['22945','15069'],         'DBG-CSTM':  ['22946','15070'],
  'CSTM-GKP':  ['15018','11016'],         'GKP-CSTM':  ['15017','11015'],
  'CSTM-BSB':  ['15018','12168'],         'BSB-CSTM':  ['15017','12167'],
  // Delhi ↔ Bihar / East
  'NDLS-MFP':  ['12557','12569'],         'MFP-NDLS':  ['12558','12570'],
  'NDLS-PNBE': ['12310','12302'],         'PNBE-NDLS': ['12309','12301'],
  'NDLS-GKP':  ['12555','12541'],         'GKP-NDLS':  ['12556','12542'],
  // Mumbai ↔ South
  'CSTM-MAS':  ['11041','12164'],         'MAS-CSTM':  ['11042','12163'],
  // Delhi ↔ Punjab
  'NDLS-ASR':  ['12014','12030'],         'ASR-NDLS':  ['12013','12029'],
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
  // Mumbai ↔ Bihar/East
  '12141':'Mumbai LTT Muzaffarpur SF Express','12142':'Muzaffarpur Mumbai LTT SF Express',
  '11061':'LTT Darbhanga Express','11062':'Darbhanga LTT Express',
  '22945':'Mumbai Darbhanga SF Express','22946':'Darbhanga Mumbai SF Express',
  '15069':'LTT Darbhanga Express (via Patna)','15070':'Darbhanga LTT Express (via Patna)',
  '15018':'LTT Gorakhpur Express','15017':'Gorakhpur LTT Express',
  '11016':'LTT Kushinagar Express','11015':'Kushinagar LTT Express',
  '12167':'LTT Varanasi SF Express','12168':'Varanasi LTT SF Express',
  // Delhi ↔ Bihar
  '12557':'Sapt Kranti Express (Delhi-MFP)','12558':'Sapt Kranti Express (MFP-Delhi)',
  '12569':'Jansadharan Express','12570':'Jansadharan Express',
  '12310':'Rajdhani Express (Patna)','12309':'Rajdhani Express (Patna)',
  '12555':'Gorakhdham Express','12556':'Gorakhdham Express',
  '12541':'Gorakhpur Shatabdi','12542':'Gorakhpur Shatabdi',
};

// ── Trains ────────────────────────────────────────────────────────────────────
// Primary:  irctc1.p.rapidapi.com  (REST GET — most reliable IRCTC wrapper on RapidAPI)
// Fallback: known-routes table, then Claude AI

const CITY_COORDS = {
  // Metro
  'delhi': [28.6139, 77.2090], 'new delhi': [28.6139, 77.2090],
  'mumbai': [19.0760, 72.8777], 'bombay': [19.0760, 72.8777],
  'bangalore': [12.9716, 77.5946], 'bengaluru': [12.9716, 77.5946],
  'hyderabad': [17.3850, 78.4867], 'secunderabad': [17.4399, 78.4983],
  'chennai': [13.0827, 80.2707], 'madras': [13.0827, 80.2707],
  'kolkata': [22.5726, 88.3639], 'calcutta': [22.5726, 88.3639],
  'howrah': [22.5958, 88.2636],
  // Uttar Pradesh
  'lucknow': [26.8467, 80.9462], 'kanpur': [26.4499, 80.3319],
  'agra': [27.1767, 78.0081], 'mathura': [27.4924, 77.6737],
  'varanasi': [25.3176, 82.9739], 'prayagraj': [25.4358, 81.8463], 'allahabad': [25.4358, 81.8463],
  'gorakhpur': [26.7606, 83.3732], 'gonda': [27.1300, 81.9600],
  'meerut': [28.9845, 77.7064], 'ghaziabad': [28.6692, 77.4538],
  'moradabad': [28.8386, 78.7733], 'bareilly': [28.3670, 79.4304],
  'aligarh': [27.8974, 78.0880], 'saharanpur': [29.9680, 77.5510],
  'jhansi': [25.4484, 78.5685], 'ayodhya': [26.7922, 82.1998], 'faizabad': [26.7922, 82.1998],
  'sultanpur': [26.2648, 82.0727], 'rae bareli': [26.2309, 81.2399],
  'basti': [26.7999, 82.7169], 'mau': [25.9403, 83.5611],
  'ballia': [25.7586, 84.1477], 'deoria': [26.5031, 83.7810],
  'sitapur': [27.5705, 80.6825], 'ghazipur': [25.5851, 83.5737],
  // Bihar
  'patna': [25.5941, 85.1376], 'gaya': [24.7914, 85.0002],
  'muzaffarpur': [26.1197, 85.3910], 'darbhanga': [26.1542, 85.8918],
  'bhagalpur': [25.2425, 87.0079], 'purnea': [25.7771, 87.4753],
  'katihar': [25.5411, 87.5747], 'samastipur': [25.8656, 85.7781],
  'hajipur': [25.6886, 85.2094], 'begusarai': [25.4182, 86.1272],
  'siwan': [26.2214, 84.3550], 'arrah': [25.5547, 84.6634],
  'sasaram': [24.9469, 84.0327], 'buxar': [25.5630, 83.9823],
  'motihari': [26.6549, 84.9173], 'muzaffarpur': [26.1197, 85.3910],
  // West Bengal
  'asansol': [23.6833, 86.9833], 'durgapur': [23.5204, 87.3119],
  'siliguri': [26.7271, 88.3953], 'new jalpaiguri': [26.7271, 88.3953],
  'kharagpur': [22.3460, 87.3196], 'malda': [25.0109, 88.1418],
  'burdwan': [23.2324, 87.8615], 'midnapore': [22.4256, 87.3217],
  'purulia': [23.3317, 86.3647], 'haldia': [22.0667, 88.0698],
  // Rajasthan
  'jaipur': [26.9124, 75.7873], 'jodhpur': [26.2389, 73.0243],
  'udaipur': [24.5854, 73.7125], 'ajmer': [26.4499, 74.6399],
  'bikaner': [28.0229, 73.3119], 'kota': [25.2138, 75.8648],
  'alwar': [27.5635, 76.6346], 'bharatpur': [27.2152, 77.4938],
  'bhilwara': [25.3478, 74.6313], 'sikar': [27.6094, 75.1399],
  // Madhya Pradesh
  'bhopal': [23.2599, 77.4126], 'indore': [22.7196, 75.8577],
  'jabalpur': [23.1815, 79.9864], 'gwalior': [26.2183, 78.1828],
  'ujjain': [23.1765, 75.7885], 'satna': [24.5631, 80.8322],
  'itarsi': [22.6196, 77.7700], 'katni': [23.8310, 80.3967],
  'rewa': [24.5362, 81.2995], 'sagar': [23.8388, 78.7378],
  // Maharashtra
  'pune': [18.5204, 73.8567], 'nagpur': [21.1458, 79.0882],
  'nashik': [19.9975, 73.7898], 'aurangabad': [19.8762, 75.3433],
  'solapur': [17.6805, 75.9064], 'kolhapur': [16.7050, 74.2433],
  'nanded': [19.1383, 77.3210], 'amravati': [20.9374, 77.7796],
  'akola': [20.7002, 77.0082], 'jalgaon': [21.0077, 75.5626],
  'wardha': [20.7453, 78.6022], 'latur': [18.4088, 76.5604],
  'bhusawal': [21.0436, 75.7906], 'chandrapur': [19.9615, 79.2961],
  // Gujarat
  'ahmedabad': [23.0225, 72.5714], 'surat': [21.1702, 72.8311],
  'vadodara': [22.3072, 73.1812], 'rajkot': [22.3039, 70.8022],
  'gandhinagar': [23.2156, 72.6369], 'anand': [22.5645, 72.9289],
  'bhavnagar': [21.7645, 72.1519], 'junagadh': [21.5222, 70.4579],
  'bharuch': [21.7051, 72.9959], 'mehsana': [23.6000, 72.3693],
  'gandhidham': [23.0753, 70.1338], 'bhuj': [23.2500, 69.6667],
  'porbandar': [21.6425, 69.6009],
  // Andhra Pradesh / Telangana
  'visakhapatnam': [17.6868, 83.2185], 'vizag': [17.6868, 83.2185],
  'vijayawada': [16.5062, 80.6480], 'guntur': [16.3067, 80.4365],
  'tirupati': [13.6288, 79.4192], 'nellore': [14.4426, 79.9865],
  'rajahmundry': [17.0005, 81.8040], 'kurnool': [15.8281, 78.0373],
  'kadapa': [14.4674, 78.8241], 'vizianagaram': [18.1066, 83.3956],
  'warangal': [17.9784, 79.5941], 'nizamabad': [18.6726, 78.0941],
  'karimnagar': [18.4386, 79.1288], 'khammam': [17.2473, 80.1514],
  // Karnataka
  'bangalore': [12.9716, 77.5946], 'bengaluru': [12.9716, 77.5946],
  'mysore': [12.2958, 76.6394], 'mysuru': [12.2958, 76.6394],
  'mangalore': [12.9141, 74.8560], 'hubli': [15.3647, 75.1240],
  'belagavi': [15.8497, 74.4977], 'belgaum': [15.8497, 74.4977],
  'davangere': [14.4644, 75.9218], 'bellary': [15.1394, 76.9214],
  'kalaburagi': [17.3297, 76.8343], 'gulbarga': [17.3297, 76.8343],
  'vijayapura': [16.8302, 75.7100], 'hospet': [15.2692, 76.3870],
  // Tamil Nadu
  'chennai': [13.0827, 80.2707], 'coimbatore': [11.0168, 76.9558],
  'madurai': [9.9252, 78.1198], 'trichy': [10.7905, 78.7047], 'tiruchirappalli': [10.7905, 78.7047],
  'salem': [11.6643, 78.1460], 'erode': [11.3410, 77.7172],
  'tirunelveli': [8.7139, 77.7567], 'thoothukudi': [8.7642, 78.1348],
  'nagercoil': [8.1833, 77.4119], 'vellore': [12.9165, 79.1325],
  'karur': [10.9601, 78.0766], 'dindigul': [10.3673, 77.9803],
  'thanjavur': [10.7870, 79.1378], 'tirupur': [11.1085, 77.3411],
  'villupuram': [11.9401, 79.4930], 'kumbakonam': [10.9617, 79.3788],
  // Kerala
  'kochi': [9.9312, 76.2673], 'ernakulam': [9.9312, 76.2673],
  'thiruvananthapuram': [8.5241, 76.9366], 'trivandrum': [8.5241, 76.9366],
  'kozhikode': [11.2588, 75.7804], 'calicut': [11.2588, 75.7804],
  'thrissur': [10.5276, 76.2144], 'kollam': [8.8932, 76.6141],
  'palakkad': [10.7867, 76.6548], 'alappuzha': [9.4981, 76.3388],
  'kannur': [11.8745, 75.3704], 'kottayam': [9.5916, 76.5222],
  // Odisha
  'bhubaneswar': [20.2961, 85.8245], 'cuttack': [20.4625, 85.8828],
  'berhampur': [19.3149, 84.7941], 'sambalpur': [21.4669, 83.9756],
  'rourkela': [22.2604, 84.8536], 'balasore': [21.4927, 86.9333],
  'puri': [19.8135, 85.8312], 'jharsuguda': [21.8518, 84.0060],
  // Jharkhand
  'ranchi': [23.3441, 85.3096], 'dhanbad': [23.7957, 86.4304],
  'jamshedpur': [22.8046, 86.2029], 'bokaro': [23.6693, 86.1511],
  // Chhattisgarh
  'raipur': [21.2514, 81.6296], 'bilaspur': [22.0797, 82.1391],
  'durg': [21.1904, 81.2849], 'bhilai': [21.2090, 81.3785],
  // Punjab / Haryana
  'amritsar': [31.6340, 74.8723], 'ludhiana': [30.9010, 75.8573],
  'jalandhar': [31.3260, 75.5762], 'patiala': [30.3398, 76.3869],
  'bathinda': [30.2110, 74.9455], 'chandigarh': [30.7333, 76.7794],
  'ambala': [30.3782, 76.7767], 'panipat': [29.3909, 76.9635],
  'faridabad': [28.4089, 77.3178], 'rohtak': [28.8955, 76.6066],
  'hisar': [29.1492, 75.7217], 'karnal': [29.6857, 76.9905],
  'rewari': [28.1942, 76.6193], 'sonipat': [28.9931, 77.0151],
  'kurukshetra': [29.9695, 76.8783],
  // Uttarakhand / HP / J&K
  'dehradun': [30.3165, 78.0322], 'haridwar': [29.9457, 78.1642],
  'rishikesh': [30.0869, 78.2676], 'roorkee': [29.8543, 77.8880],
  'haldwani': [29.2183, 79.5130], 'kathgodam': [29.2183, 79.5130],
  'shimla': [31.1048, 77.1734], 'kalka': [30.8393, 76.9476],
  'jammu': [32.7266, 74.8570], 'pathankot': [32.2643, 75.6421],
  // Assam / Northeast
  'guwahati': [26.1445, 91.7362], 'dibrugarh': [27.4728, 94.9120],
  'silchar': [24.8333, 92.7789], 'tinsukia': [27.4893, 95.3617],
  'lumding': [25.7472, 93.1639], 'agartala': [23.8315, 91.2868],
  'dimapur': [25.9065, 93.7228],
  // Goa
  'goa': [15.2993, 74.1240], 'madgaon': [15.2993, 74.1240], 'panaji': [15.4909, 73.8278],
};

function getDistanceKm(c1, c2) {
  const coord1 = CITY_COORDS[c1.toLowerCase().trim()];
  const coord2 = CITY_COORDS[c2.toLowerCase().trim()];
  if (!coord1 || !coord2) throw new Error(`Unknown city pair: ${c1} / ${c2}`);
  
  // Haversine formula
  const R = 6371;
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  // Add a 30% winding factor since rail lines aren't straight
  return Math.round(R * c * 1.3);
}

function getTrainFares(origin, destination, classesList = ['SL', '3A', '2A', '1A']) {
  const distance = getDistanceKm(origin, destination);
  
  // Standard IRCTC grade rate multipliers
  const baseFares = {
    'SL': Math.max(175, Math.round(distance * 0.65 + 30)),
    '3A': Math.max(520, Math.round(distance * 1.65 + 60)),
    '2A': Math.max(760, Math.round(distance * 2.35 + 80)),
    '1A': Math.max(1250, Math.round(distance * 4.10 + 120))
  };

  const res = {};
  classesList.forEach(c => {
    const cls = c.toUpperCase();
    if (baseFares[cls]) {
      res[cls] = baseFares[cls];
    } else {
      res[cls] = Math.max(150, Math.round(distance * 0.5));
    }
  });
  return res;
}

async function searchTrains(origin, destination, date) {
  const fromCode = resolveStation(origin);
  const toCode   = resolveStation(destination);

  // 1. Try irctc1 REST API (returns live schedule data from IRCTC backend)
  if (process.env.RAPIDAPI_KEY) {
    try {
      const dateOfJourney = date.replace(/-/g, ''); // YYYYMMDD
      const res = await axios.get(
        'https://irctc1.p.rapidapi.com/api/v3/trainsBetweenStations',
        {
          headers: {
            'X-RapidAPI-Key':  process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'irctc1.p.rapidapi.com'
          },
          params: {
            fromStationCode: fromCode,
            toStationCode:   toCode,
            dateOfJourney
          },
          timeout: 10000
        }
      );

      const list = res.data?.data;
      if (Array.isArray(list) && list.length) {
        return list.slice(0, 5).map(t => {
          const availClasses = Array.isArray(t.classes) && t.classes.length ? t.classes : ['SL', '3A', '2A', '1A'];
          return {
            trainNumber: t.train_number,
            trainName:   t.train_name,
            departure:   t.from_sta,
            arrival:     t.to_sta,
            duration:    t.travel_time,
            classes:     availClasses,
            classFares:  getTrainFares(origin, destination, availClasses),
            runDays:     Array.isArray(t.run_days) ? t.run_days.join(', ') : null,
            note:        'Live IRCTC data — book at IRCTC.co.in'
          };
        });
      }
    } catch (err) {
      const status = err.response?.status;
      const msg    = err.response?.data?.message || err.message;
      if (status === 403 || status === 401) {
        console.warn(`[trains] irctc1 API: not subscribed or invalid key (${status}). Subscribe at rapidapi.com/nabeelp/api/irctc1`);
      } else {
        console.warn(`[trains] irctc1 API failed (${status || 'timeout'}): ${msg}`);
      }
    }
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
      classFares:  getTrainFares(origin, destination, ['1A', '2A', '3A', 'SL']),
      note:        'Fares vary by class — book at IRCTC.co.in'
    }));
  }

  // 3. Claude fallback for all other routes — clearly labelled as estimated
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

  const distanceKm = getDistanceKm(from, to);

  return {
    destination: to,
    from,
    fromDate,
    toDate: toDate || null,
    distanceKm,
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

module.exports = { searchFlights, searchTrains, searchHotels, planTrip, resolveIATA, resolveStation, getDistanceKm };
