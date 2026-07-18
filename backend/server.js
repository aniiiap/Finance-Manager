const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

function requireEnv(name, { minLength } = {}) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  if (minLength && String(value).length < minLength) {
    console.error(`${name} must be at least ${minLength} characters`);
    process.exit(1);
  }
  return value;
}

const isProd = process.env.NODE_ENV === 'production';

requireEnv('DATABASE_URL');
requireEnv('JWT_SECRET', { minLength: isProd ? 32 : 8 });

if (isProd) {
  if (process.env.JWT_SECRET === 'super_secret_jwt_key_please_change_in_production') {
    console.error('Refusing to start: replace the default JWT_SECRET before production.');
    process.exit(1);
  }
}

const app = express();

if (isProd) {
  app.set('trust proxy', 1);
}

app.use(helmet({
  contentSecurityPolicy: false, // SPA + html2pdf need flexible CSP; tighten later if needed
  crossOriginEmbedderPolicy: false,
}));

// Comma-separated origins, e.g. https://app.com,https://www.app.com
// In development, localhost Vite is always allowed.
const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin(origin, callback) {
    // Same-origin / server-to-server / curl (no Origin header)
    if (!origin) return callback(null, true);

    const allowed = isProd
      ? configuredOrigins
      : [...new Set([...configuredOrigins, ...defaultDevOrigins])];

    // When frontend is served by this same Express app, browser Origin matches API host — allow
    if (allowed.length === 0 && isProd) {
      return callback(null, true);
    }
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '200kb' }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 30 : 100,
  message: { error: 'Too many auth attempts from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 50,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 2000 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/set-password', loginLimiter);
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/data', apiLimiter, require('./routes/api'));
app.use('/api/sales', apiLimiter, require('./routes/sales'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: process.env.NODE_ENV || 'development' });
});

// Production: serve Vite build from same origin so /api works without CORS headaches
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
const serveFrontend = process.env.SERVE_FRONTEND === 'true'
  || (isProd && process.env.SERVE_FRONTEND !== 'false' && fs.existsSync(frontendDist));

if (serveFrontend && fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { maxAge: isProd ? '1d' : 0, index: false }));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
  console.log(`Serving frontend from ${frontendDist}`);
}

app.use((err, req, res, next) => {
  if (err && err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error occurred.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
