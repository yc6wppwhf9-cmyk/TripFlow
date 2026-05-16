const Redis = require('redis');
const Bull = require('bull');

const redisUrl = (process.env.REDIS_URL || 'redis://127.0.0.1:6379').replace(/^"|"$/g, '');
const isTLS = redisUrl.startsWith('rediss://');

const redisClient = Redis.createClient({ url: redisUrl });

redisClient.on('error', (err) => console.log('Redis Client Error:', err.message));

async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('Connected to Redis');
    }
  } catch (err) {
    console.log('Failed to connect to Redis. Continuing without async queues.');
  }
}

const bullOptions = isTLS
  ? { redis: { tls: { rejectUnauthorized: false } } }
  : {};

let emailQueue, whatsappQueue;

try {
  emailQueue = new Bull('email-notifications', redisUrl, bullOptions);
  whatsappQueue = new Bull('whatsapp-notifications', redisUrl, bullOptions);

  emailQueue.on('error', (err) => console.log('Email Queue Error:', err.message));
  whatsappQueue.on('error', (err) => console.log('WhatsApp Queue Error:', err.message));
} catch (err) {
  console.log('Could not initialize Bull queues:', err.message);
}

module.exports = {
  redisClient,
  connectRedis,
  emailQueue,
  whatsappQueue
};
