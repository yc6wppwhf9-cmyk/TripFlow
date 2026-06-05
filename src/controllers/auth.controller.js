const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/db');
const { userSelect } = require('../config/selects');
const { redisClient } = require('../config/redis');
const emailService = require('../services/email.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECS = 15 * 60;

async function getFailCount(email) {
  try { return parseInt(await redisClient.get(`login:fail:${email}`)) || 0; } catch { return 0; }
}
async function incrementFail(email) {
  try {
    const n = await redisClient.incr(`login:fail:${email}`);
    if (n === 1) await redisClient.expire(`login:fail:${email}`, LOCKOUT_SECS);
    return n;
  } catch { return 0; }
}
async function lockAccount(email) {
  try {
    await redisClient.set(`login:locked:${email}`, '1', { EX: LOCKOUT_SECS });
    await redisClient.del(`login:fail:${email}`);
  } catch { /* Redis unavailable — skip lockout */ }
}
async function clearFailCount(email) {
  try {
    await redisClient.del(`login:fail:${email}`);
    await redisClient.del(`login:locked:${email}`);
  } catch { /* ignore */ }
}
async function getLockTTL(email) {
  try { return await redisClient.ttl(`login:locked:${email}`); } catch { return 0; }
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d', jwtid: crypto.randomUUID() }
  );
}

async function isTokenRevoked(token, decoded) {
  try {
    const key = `token:revoked:${decoded.jti || token.slice(-16)}`;
    return !!(await redisClient.get(key));
  } catch {
    return false;
  }
}

exports.register = asyncHandler(async (req, res) => {
  const { email, password, name, phone, department, managerId } = req.body;
  // role is intentionally excluded — public registration always creates EMPLOYEE accounts.
  // Admin creates elevated roles via POST /api/admin/users.

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) throw new AppError('Email already exists', 400);

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: 'EMPLOYEE',
      phone,
      employee: {
        create: { department: department || 'General', managerId: managerId || null }
      }
    },
    include: { employee: true }
  });

  res.status(201).json({ message: 'User registered successfully', userId: user.id });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const ttl = await getLockTTL(email);
  if (ttl > 0) {
    return res.status(429).json({
      error: `Account locked due to too many failed attempts. Try again in ${Math.ceil(ttl / 60)} minute(s).`,
      lockedForSeconds: ttl
    });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { employee: true, vendor: true }
  });

  const validPassword = user && await bcrypt.compare(password, user.password);

  if (!user || !validPassword) {
    const attempts = await incrementFail(email);
    const remaining = MAX_ATTEMPTS - attempts;
    if (remaining <= 0) {
      await lockAccount(email);
      return res.status(429).json({
        error: `Too many failed attempts. Account locked for ${LOCKOUT_SECS / 60} minutes.`
      });
    }
    return res.status(401).json({
      error: 'Invalid credentials',
      attemptsRemaining: Math.max(0, remaining)
    });
  }

  await clearFailCount(email);
  const token = signAccessToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      employeeId: user.employee?.id,
      vendorId: user.vendor?.id
    }
  });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: {
      employee: {
        include: {
          manager: userSelect,  // manager IS a User — omit password directly
          policy: true
        }
      }
    }
  });
  if (!user) throw new AppError('User not found', 404);

  const bandMap = { ADMIN: 1, HR: 1, MANAGER: 2, EMPLOYEE: 3 };
  const policyRules = user.employee?.policy?.rules || {};
  const band = policyRules.band || bandMap[user.role] || 3;

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    band,
    department: user.employee?.department || null,
    manager: user.employee?.manager
      ? { name: user.employee.manager.name, email: user.employee.manager.email }
      : null,
    policyRules: Object.keys(policyRules).length ? policyRules : null
  });
});

exports.logout = asyncHandler(async (req, res) => {
  const token = req.token;
  const decoded = req.tokenDecoded;
  const ttl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 7 * 24 * 3600;
  if (ttl > 0) {
    const key = `token:revoked:${decoded.jti || token.slice(-16)}`;
    try { await redisClient.set(key, '1', { EX: ttl }); } catch { /* Redis unavailable */ }
    // Invalidate auth middleware user cache
    try { await redisClient.del(`user:${decoded.id}`); } catch { /* ignore */ }
  }
  res.json({ message: 'Logged out successfully' });
});

const RESET_TOKEN_TTL = 60 * 60;

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return success to prevent user enumeration
  if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenHash  = crypto.createHash('sha256').update(resetToken).digest('hex');

  await redisClient.set(`pwd:reset:${tokenHash}`, user.id, { EX: RESET_TOKEN_TTL });

  const appUrl   = process.env.APP_URL || 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password.html?token=${resetToken}`;

  const resetHtml = `<p>Hi ${user.name},</p>
    <p>You requested a password reset. Click the link below (valid for 1 hour):</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you did not request this, ignore this email.</p>`;
  const resetText = `Hi ${user.name},\n\nReset your password here (valid 1 hour):\n${resetUrl}\n\nIf you did not request this, ignore this email.`;

  await emailService.sendEmail(user.email, 'TripFlow — Password Reset Request', resetText, resetHtml);

  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) throw new AppError('Token and new password are required', 400);
  if (password.length < 8) throw new AppError('Password must be at least 8 characters', 400);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const userId    = await redisClient.get(`pwd:reset:${tokenHash}`);

  if (!userId) throw new AppError('Reset link is invalid or has expired', 400);

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  await redisClient.del(`pwd:reset:${tokenHash}`);

  res.json({ message: 'Password updated successfully. You can now log in.' });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError('Token is required', 400);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError('Invalid or expired token', 401);
  }

  if (await isTokenRevoked(token, decoded)) {
    throw new AppError('Token has been revoked. Please log in again.', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) throw new AppError('User not found', 401);

  res.json({ token: signAccessToken(user) });
});
