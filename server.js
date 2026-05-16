require('dotenv').config();
const app = require('./src/app');
const prisma = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');

// Start queue processors
require('./src/queues/email.queue');
require('./src/queues/whatsapp.queue');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectRedis();
    await prisma.$connect();
    console.log('Connected to Database via Prisma');

    app.listen(PORT, () => {
      console.log(`TripFlow running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
