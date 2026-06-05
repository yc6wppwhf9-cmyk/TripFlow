const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const AppError = require('./utils/appError');

const app = express();

// Per-request correlation ID — set before any other middleware so it's available in logs
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

// Security headers
// index.html has no more inline scripts (moved to public/js/login.js).
// Other dashboard pages (admin, hr, employee, etc.) still contain inline scripts —
// keep CSP off until those are migrated to external files too.
app.use(helmet({ contentSecurityPolicy: false }));

// Global rate limiter — 200 req/15 min per IP (AI route keeps its own tighter 20 req/min)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', globalLimiter);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'https://tripflow-dqvp.onrender.com'];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth',          require('./routes/auth.routes'));
app.use('/api/bookings',      require('./routes/booking.routes'));
app.use('/api/approvals',     require('./routes/approval.routes'));
app.use('/api/vendor',        require('./routes/vendor.routes'));
app.use('/api/admin',         require('./routes/admin.routes'));
app.use('/api/ai',            require('./routes/ai.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/hr',            require('./routes/hr.routes'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// 404 — JSON for API calls, HTML for browser navigation
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
});

// Global error handler — never leaks raw error.message to clients
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  if (err.isOperational) {
    // AppError — safe to expose message (we wrote it)
    return res.status(statusCode).json({ error: err.message });
  }

  // Unexpected error — log full details server-side, send generic message to client
  console.error(`[${req.id}]`, err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
