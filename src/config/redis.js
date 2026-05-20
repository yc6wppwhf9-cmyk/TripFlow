const Redis = require('redis');

const redisUrl = (process.env.REDIS_URL || 'redis://127.0.0.1:6379').replace(/^"|"$/g, '');

const redisClient = Redis.createClient({ url: redisUrl });

redisClient.on('error', (err) => console.log('Redis Client Error:', err.message));

async function connectRedis() {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('Connected to Redis');
    }
  } catch (err) {
    console.log('Redis unavailable. Notifications will send directly.');
  }
}

// Queues removed — notifications send directly via email.service / whatsapp.service
const emailQueue = null;
const whatsappQueue = null;

module.exports = {
  redisClient,
  connectRedis,
  emailQueue,
  whatsappQueue
};
