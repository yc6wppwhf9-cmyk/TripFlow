const CITY_COORDS = require('../data/city-coords');

function getDistanceKm(c1, c2) {
  const coord1 = CITY_COORDS[c1.toLowerCase().trim()];
  const coord2 = CITY_COORDS[c2.toLowerCase().trim()];
  if (!coord1 || !coord2) throw new Error(`Unknown city pair: ${c1} / ${c2}`);

  const R    = 6371;
  const dLat = (coord2[0] - coord1[0]) * Math.PI / 180;
  const dLon = (coord2[1] - coord1[1]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
          + Math.cos(coord1[0] * Math.PI / 180) * Math.cos(coord2[0] * Math.PI / 180)
          * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1.3);
}

module.exports = { getDistanceKm };
