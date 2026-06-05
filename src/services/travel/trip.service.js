const NEAREST_AIRPORTS = require('../../data/nearest-airports');
const { CITY_TO_IATA } = require('./resolvers');
const { getDistanceKm } = require('../../utils/distance');
const { searchFlights } = require('./flight.service');
const { searchTrains }  = require('./train.service');
const { searchHotels }  = require('./hotel.service');
const { resolveHotelCity } = require('./resolvers');

function getNearestAirports(city) {
  const key = city.toLowerCase().trim();
  if (CITY_TO_IATA[key]) return [{ city, code: CITY_TO_IATA[key], km: 0 }];
  return NEAREST_AIRPORTS[key] || [];
}

async function planTrip(from, to, fromDate, toDate) {
  const airports   = getNearestAirports(to);
  const hasAirport = airports.length > 0;

  const [outboundFlights, returnFlights, trains, hotels] = await Promise.all([
    hasAirport
      ? Promise.all(airports.slice(0, 2).map(ap =>
          searchFlights(from, ap.city, fromDate)
            .then(r => ({ via: ap.city, code: ap.code, km: ap.km, results: r }))
            .catch(() => ({ via: ap.city, code: ap.code, km: ap.km, results: { available: false } }))
        ))
      : Promise.resolve([]),

    hasAirport && toDate
      ? Promise.all(airports.slice(0, 2).map(ap =>
          searchFlights(ap.city, from, toDate)
            .then(r => ({ via: ap.city, code: ap.code, km: ap.km, results: r }))
            .catch(() => ({ via: ap.city, results: { available: false } }))
        ))
      : Promise.resolve([]),

    searchTrains(from, to, fromDate).catch(() => ({ available: false, reason: 'Train search failed.' })),

    searchHotels(resolveHotelCity(to), fromDate, toDate || fromDate)
      .catch(() => ({ available: false, reason: 'Hotel search failed.' }))
  ]);

  const distanceKm = getDistanceKm(from, to);

  return {
    destination: to,
    from,
    fromDate,
    toDate: toDate || null,
    distanceKm,
    nearestAirports: airports.map(ap => ({ city: ap.city, code: ap.code, distanceKm: ap.km })),
    outboundFlights,
    returnFlights,
    trains:    Array.isArray(trains) ? trains : (trains?.available === false ? [] : trains),
    trainNote: !Array.isArray(trains) ? trains?.reason : null,
    hotels:    Array.isArray(hotels) ? hotels : [],
    hotelNote: !Array.isArray(hotels) ? hotels?.reason : null,
  };
}

module.exports = { planTrip, getDistanceKm, getNearestAirports };
