const CITY_TO_IATA    = require('../../data/city-iata');
const CITY_TO_STATION = require('../../data/city-station');

// Reverse: station code → canonical city name (used for hotel search)
const STATION_TO_CITY = Object.fromEntries(
  Object.entries(CITY_TO_STATION)
    .filter(([cityName]) => ![
      'mfp','ltt','bandra terminus','bandra','lokmanya tilak terminus','kurla',
      'bombay','new delhi','calcutta','cochin','madras','bengaluru','vizag','madgaon','prayagraj',
      'tiruchirappalli','thiruvananthapuram','mangaluru'
    ].includes(cityName))
    .map(([cityName, code]) => [code, cityName.replace(/^\w/, c => c.toUpperCase())])
);

function resolveIATA(city) {
  const key = city.toLowerCase().trim();
  const code = CITY_TO_IATA[key];
  if (!code) throw new Error(`Airport not found for "${city}". Please use a city with an airport (e.g. Mumbai, Delhi, Patna).`);
  return code;
}

function resolveStation(city) {
  return CITY_TO_STATION[city.toLowerCase().trim()] || city.toUpperCase().slice(0, 4);
}

function resolveHotelCity(cityOrCode) {
  const key = (cityOrCode || '').trim();
  if (/^[A-Z]{2,6}$/.test(key)) {
    return STATION_TO_CITY[key] || key;
  }
  return key;
}

module.exports = { resolveIATA, resolveStation, resolveHotelCity, CITY_TO_IATA };
