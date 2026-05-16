const axios = require('axios');
const { whatsappQueue } = require('../config/redis');

const INTERAKT_API_URL = 'https://api.interakt.ai/v1/public/message/';

if (whatsappQueue) {
  whatsappQueue.process(async (job) => {
    const { countryCode, phoneNumber, message } = job.data;

    const apiKey = process.env.INTERAKT_API_KEY;
    if (!apiKey) {
      console.log(`Interakt not configured. Would have sent to ${countryCode}${phoneNumber}: ${message}`);
      return;
    }

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

    console.log(`WhatsApp message sent to ${countryCode}${phoneNumber}`);
  });

  whatsappQueue.on('failed', (job, err) => {
    console.error(`WhatsApp job failed for ${job.data.phoneNumber}:`, err.message);
  });
}

module.exports = whatsappQueue;
