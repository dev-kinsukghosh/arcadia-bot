const { rateLimit } = require('express-rate-limit');
const { slowDown } = require('express-slow-down');

// IP-Based Rate Limiting (Defaults to safe IP-based keys)
const ipRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Disable validations to avoid IP/proxy checks on startup
  message: { error: 'Too many requests from this IP. Please try again in a minute.' },
});

// Device-Fingerprint-Based Rate Limiting
const deviceRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each device fingerprint to 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Disable validations to avoid custom key IP checks on startup
  message: {
    error: 'Too many requests from this device fingerprint. Please try again in a minute.',
  },
  keyGenerator: (req) => {
    // Client sends device fingerprint header. If missing, fallback to IP+UA hash.
    const headerFingerprint = req.headers['x-device-fingerprint'];
    if (headerFingerprint) return headerFingerprint;

    // Fallback device fingerprinting
    const userAgent = req.headers['user-agent'] || '';
    const acceptLang = req.headers['accept-language'] || '';
    return `${req.ip}_${userAgent}_${acceptLang}`;
  },
});

// Tarpitting (Slow Down) to defend against DDoS/brute forcing
const speedLimiter = slowDown({
  windowMs: 1 * 60 * 1000, // 1 minute
  delayAfter: 30, // Begin slowing down after 30 requests per minute
  delayMs: (hits) => (hits - 30) * 150, // Add 150ms delay per hit above 30
  maxDelayMs: 3000, // Cap delay at 3 seconds
});

// Helper: skip rate limiting for static asset endpoints (heads, icons)
function isAssetRequest(req) {
  const p = req.path || '';
  return (
    p.startsWith('/heads/') ||
    p.startsWith('/icons/') ||
    p.startsWith('/api/heads/') ||
    p.startsWith('/api/icons/')
  );
}

/**
 * Attaches rate limiters and tarpitting middlewares to the Express app.
 * @param {import('express').Application} app
 */
function applyRateLimiters(app) {
  app.use((req, res, next) => {
    if (isAssetRequest(req)) return next();
    ipRateLimiter(req, res, next);
  });
  app.use((req, res, next) => {
    if (isAssetRequest(req)) return next();
    deviceRateLimiter(req, res, next);
  });
  app.use((req, res, next) => {
    if (isAssetRequest(req)) return next();
    speedLimiter(req, res, next);
  });
}

module.exports = {
  ipRateLimiter,
  deviceRateLimiter,
  speedLimiter,
  isAssetRequest,
  applyRateLimiters,
};
