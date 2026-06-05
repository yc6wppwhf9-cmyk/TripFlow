const express = require('express');
const router = express.Router();
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const aiController = require('../controllers/ai.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id ? String(req.user.id) : ipKeyGenerator(req),
  message: { error: 'Too many AI requests. Please wait a minute before trying again.' }
});

router.use(auth);
router.post('/chat', aiRateLimit, role('EMPLOYEE'), aiController.chat);

module.exports = router;
