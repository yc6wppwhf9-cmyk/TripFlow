require('dotenv').config();
const axios = require('axios');

const KEY = process.env.RAPIDAPI_KEY;

const log = (label, data) => {
  console.log('\n' + '─'.repeat(60));
  console.log(`✅ ${label}`);
  console.log('─'.repeat(60));
  console.log(JSON.stringify(data, null, 2));
};

const fail = (label, err) => {
  console.log('\n' + '─'.repeat(60));
  console.log(`❌ ${label}`);
  console.log('─'.repeat(60));
  console.log('Error:', err.response?.data || err.message);
};

// ── 1. Google Flights — search airport ───────────────────────────────────────
async function testFlightAirport() {
  const res = await axios.get('https://google-flights2.p.rapidapi.com/api/v1/searchAirport', {
    headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': 'google-flights2.p.rapidapi.com' },
    params: { query: 'Delhi', locale: 'en-US' }
  });
  const first = res.data?.data?.[0];
  log('Google Flights — Airport lookup (Delhi)', {
    skyId: first?.skyId,
    entityId: first?.entityId,
    name: first?.presentation?.title
  });
  return first;
}

// ── 2. Google Flights — search flights ──────────────────────────────────────
async function testFlights() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  const date = d.toISOString().split('T')[0];

  const res = await axios.get('https://google-flights2.p.rapidapi.com/api/v1/searchFlights', {
    headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': 'google-flights2.p.rapidapi.com' },
    params: { departure_id: 'DEL', arrival_id: 'BOM', outbound_date: date, currency: 'INR', adults: 1, language: 'en-US' }
  });

  const top = res.data?.data?.itineraries?.topFlights || [];
  const other = res.data?.data?.itineraries?.otherFlights || [];
  const all = [...top, ...other];

  log(`Google Flights — Delhi → Mumbai (${date}) — ${all.length} results`,
    all.slice(0, 3).map(it => ({
      airline: it.flights?.[0]?.airline,
      flightNumber: it.flights?.[0]?.flight_number,
      departure: it.flights?.[0]?.departure_airport?.time,
      arrival: it.flights?.[0]?.arrival_airport?.time,
      duration: it.duration?.text,
      stops: it.stops,
      price: `₹${it.price}`
    }))
  );
}

// ── 3. Trains via IRCTC Railway API1 (schedule lookup) ───────────────────────
async function testTrains() {
  const qs = require('querystring');

  // Mumbai Rajdhani — known NDLS→CSTM train
  const trainNo = '12952';
  const res = await axios.post(
    'https://irctc-railway-api1.p.rapidapi.com/train-schedule.php',
    qs.stringify({ train_no: trainNo }),
    { headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': 'irctc-railway-api1.p.rapidapi.com', 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  const stops = res.data?.schedule || [];
  const ndls = stops.find(s => s.station?.toUpperCase().includes('NDLS') || s.station?.toUpperCase().includes('NEW DELHI'));
  const cstm = stops.find(s => s.station?.toUpperCase().includes('CSTM') || s.station?.toUpperCase().includes('MUMBAI'));

  log(`IRCTC Railway API1 — Train ${trainNo} schedule (${stops.length} stops)`, {
    trainName: res.data?.train_name || '12952 Mumbai Rajdhani',
    totalStops: stops.length,
    sampleStops: stops.slice(0, 4).map(s => ({ station: s.station, arrives: s.arrives, departs: s.departs, day: s.day })),
    ndlsDeparture: ndls?.departs,
    cstmArrival: cstm?.arrives
  });
}

// ── 4. Booking.com — hotel location lookup ───────────────────────────────────
async function testHotelLocation() {
  const res = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/locations', {
    headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': 'booking-com.p.rapidapi.com' },
    params: { name: 'Mumbai', locale: 'en-gb' }
  });
  const first = res.data?.[0];
  log('Booking.com — Location lookup (Mumbai)', {
    dest_id: first?.dest_id,
    dest_type: first?.dest_type,
    name: first?.name,
    label: first?.label
  });
  return first;
}

// ── 5. Booking.com — hotel search ────────────────────────────────────────────
async function testHotels(dest) {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 7);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 1);

  const fmt = d => d.toISOString().split('T')[0];

  const res = await axios.get('https://booking-com.p.rapidapi.com/v1/hotels/search', {
    headers: { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': 'booking-com.p.rapidapi.com' },
    params: {
      dest_id: dest.dest_id,
      dest_type: dest.dest_type,
      checkin_date: fmt(checkIn),
      checkout_date: fmt(checkOut),
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
  log(`Booking.com — Hotels in Mumbai (${fmt(checkIn)}) — ${hotels.length} results`,
    hotels.slice(0, 3).map(h => ({
      name: h.hotel_name,
      stars: h.class,
      price: `₹${Math.round(h.min_total_price || 0)}`,
      rating: `${h.review_score} (${h.review_score_word})`,
      reviews: h.review_nr,
      address: h.address
    }))
  );
}

// ── Run all tests ─────────────────────────────────────────────────────────────
async function runAll() {
  console.log('\n🧪 TripFlow API Test Suite');
  console.log(`🔑 RapidAPI Key: ${KEY ? KEY.slice(0, 10) + '...' : 'NOT SET ❌'}\n`);

  if (!KEY) {
    console.log('Set RAPIDAPI_KEY in .env and try again.');
    process.exit(1);
  }

  // Flights
  try {
    await testFlightAirport();
    await testFlights();
  } catch (e) { fail('Google Flights', e); }

  // Trains
  try {
    await testTrains();
  } catch (e) { fail('Indian Railway IRCTC', e); }

  // Hotels
  try {
    const dest = await testHotelLocation();
    await testHotels(dest);
  } catch (e) { fail('Booking.com Hotels', e); }

  console.log('\n' + '═'.repeat(60));
  console.log('🏁 Tests complete');
  console.log('═'.repeat(60) + '\n');
}

runAll();
