// Barrel export — re-exports all travel service functions.
// Existing code that does require('../services/travel.service') can switch to
// require('../services/travel') with no further changes.
const { searchFlights }              = require('./flight.service');
const { searchTrains, getTrainFares } = require('./train.service');
const { searchHotels }               = require('./hotel.service');
const { planTrip, getDistanceKm, getNearestAirports } = require('./trip.service');
const { resolveIATA, resolveStation, resolveHotelCity } = require('./resolvers');

module.exports = {
  searchFlights,
  searchTrains,
  getTrainFares,
  searchHotels,
  planTrip,
  getDistanceKm,
  getNearestAirports,
  resolveIATA,
  resolveStation,
  resolveHotelCity,
};
