const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { redisClient } = require('../config/redis');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token has been revoked (logout blacklist)
    try {
      const revoked = await redisClient.get(`token:revoked:${decoded.jti || token.slice(-16)}`);
      if (revoked) return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
    } catch { /* Redis unavailable — skip revocation check */ }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        employee: true,
        vendor: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    req.token = token;
    req.tokenDecoded = decoded;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
