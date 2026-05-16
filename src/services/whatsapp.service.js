const { whatsappQueue } = require('../config/redis');

const parsePhone = (phone) => {
  const digits = phone.replace(/\D/g, '');
  if (phone.startsWith('+')) {
    return {
      countryCode: '+' + digits.slice(0, digits.length - 10),
      phoneNumber: digits.slice(-10),
    };
  }
  // Default to India (+91) if no country code provided
  return { countryCode: '+91', phoneNumber: digits };
};

exports.sendWhatsApp = async (to, message) => {
  if (!whatsappQueue) {
    console.log(`WhatsApp Queue not available. Would have sent to ${to}: ${message}`);
    return;
  }
  const { countryCode, phoneNumber } = parsePhone(to);
  await whatsappQueue.add({ countryCode, phoneNumber, message });
};

exports.sendBookingConfirmed = async (phoneNumber, pnr) => {
  const message = `Your TripFlow booking is confirmed! PNR: ${pnr}. Safe travels!`;
  await exports.sendWhatsApp(phoneNumber, message);
};

exports.sendTicketUploaded = async (phoneNumber, pnr) => {
  const message = `Your ticket for PNR ${pnr} has been uploaded and is ready in your TripFlow dashboard.`;
  await exports.sendWhatsApp(phoneNumber, message);
};
