const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { redisClient } = require('../config/redis');

const USER_CACHE_TTL = 300; // 5 minutes

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check token blacklist (logout revocation)
    try {
      const revoked = await redisClient.get(`token:revoked:${decoded.jti || token.slice(-16)}`);
      if (revoked) return res.status(401).json({ error: 'Token has been revoked. Please log in again.' });
    } catch { /* Redis unavailable — skip revocation check */ }

    // User cache — avoid a DB round-trip on every authenticated request
    const cacheKey = `user:${decoded.id}`;
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        req.user = JSON.parse(cached);
        req.token = token;
        req.tokenDecoded = decoded;
        return next();
      }
    } catch { /* Redis unavailable — fall through to DB */ }

    const user = await prisma.user.findUnique({
      where:   { id: decoded.id },
      include: { employee: true, vendor: true }
    });

    if (!user) return res.status(401).json({ error: 'User not found' });

    // Populate cache (omit password before storing)
    const { password: _pw, ...userForCache } = user;
    try { await redisClient.setEx(cacheKey, USER_CACHE_TTL, JSON.stringify(userForCache)); } catch { /* ignore */ }

    req.user = userForCache;
    req.token = token;
    req.tokenDecoded = decoded;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
