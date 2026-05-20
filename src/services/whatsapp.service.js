const axios = require('axios');

const INTERAKT_API_URL = 'https://api.interakt.ai/v1/public/message/';

const parsePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) {
    return {
      countryCode: '+' + digits.slice(0, digits.length - 10),
      phoneNumber: digits.slice(-10),
    };
  }
  return { countryCode: '+91', phoneNumber: digits };
};

exports.sendWhatsApp = async (to, message) => {
  const apiKey = process.env.INTERAKT_API_KEY;
  if (!apiKey) {
    console.log(`WhatsApp not configured. Would have sent to ${to}: ${message}`);
    return;
  }
  try {
    const { countryCode, phoneNumber } = parsePhone(to);
    await axios.post(
      INTERAKT_API_URL,
      {
        countryCode,
        phoneNumber,
        callbackData: 'TripFlow Notification',
        type: 'Text',
        data: { message },
      },
      {
        headers: {
          Authorization: `Basic ${Buffer.from(apiKey).toString('base64')}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`WhatsApp sent to ${countryCode}${phoneNumber}`);
  } catch (err) {
    console.error(`Failed to send WhatsApp to ${to}:`, err.message);
  }
};

exports.sendBookingConfirmed = async (phoneNumber, pnr) => {
  const message = `Your TripFlow booking is confirmed! PNR: ${pnr}. Safe travels!`;
  await exports.sendWhatsApp(phoneNumber, message);
};

exports.sendTicketUploaded = async (phoneNumber, pnr) => {
  const message = `Your ticket for PNR ${pnr} has been uploaded and is ready in your TripFlow dashboard.`;
  await exports.sendWhatsApp(phoneNumber, message);
};
