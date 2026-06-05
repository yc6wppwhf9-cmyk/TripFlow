const axios = require('axios');
const { resolveIATA } = require('./resolvers');

const FLIGHT_HEADERS = () => ({
  'X-RapidAPI-Key':  process.env.RAPIDAPI_KEY,
  'X-RapidAPI-Host': 'google-flights2.p.rapidapi.com'
});

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
        arrival_id:   arrCode,
        outbound_date: date,
        currency:  'INR',
        adults:    1,
        language:  'en-US'
      }
    });

    const topFlights   = res.data?.data?.itineraries?.topFlights   || [];
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

module.exports = { searchFlights };
