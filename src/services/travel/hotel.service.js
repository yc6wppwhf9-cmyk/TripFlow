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
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}

// In-process cache: Booking.com destination lookups are stable across requests
const _hotelDestCache = {};

async function searchHotels(city, checkIn, checkOut) {
  const nights = (() => {
    try {
      const d1 = new Date(checkIn), d2 = new Date(checkOut || checkIn);
      return Math.max(1, Math.round((d2 - d1) / 86400000));
    } catch { return 1; }
  })();

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

  // Claude fallback
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

module.exports = { searchHotels };
