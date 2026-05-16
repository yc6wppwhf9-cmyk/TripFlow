const Redis = require('redis');
const Bull = require('bull');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const redisClient = Redis.createClient({
  url: redisUrl
});

redisClient.on('error', (err) => console.log('Redis Client Error: Redis might not be running. Queues will not work.'));

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

// Bull queues (wrapped to handle errors)
let emailQueue, whatsappQueue;

try {
  emailQueue = new Bull('email-notifications', redisUrl);
  whatsappQueue = new Bull('whatsapp-notifications', redisUrl);
  
  emailQueue.on('error', (err) => console.log('Email Queue Error: Redis required for Bull.'));
  whatsappQueue.on('error', (err) => console.log('WhatsApp Queue Error: Redis required for Bull.'));
} catch (err) {
  console.log('Could not initialize Bull queues. Redis might be missing.');
}

module.exports = {
  redisClient,
  connectRedis,
  emailQueue,
  whatsappQueue
};
