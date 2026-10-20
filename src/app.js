const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { telemetry } = require('./utils/telemetry.js');
const { applyRateLimiters } = require('./middleware/rateLimiter.js');
const { createHostRouter } = require('./middleware/hostRouter.js');
const { errorHandler } = require('./middleware/errorHandler.js');
const { apiRouter } = require('./routes/index.js');

const app = express();
app.set('trust proxy', 1);

// Attach Telemetry HTTP request monitoring
app.use(telemetry.apiMiddleware());

// 0. HTTP Gzip/Deflate Response Compression Middleware
app.use(
  compression({
    level: 6,
    threshold: 512, // Compress responses larger than 512 bytes
  })
);

// 1. Helmet to secure headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to allow standard Vue app imports
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. CORS configuration (allowing X-Device-Fingerprint header)
const isDev = process.env.NODE_ENV !== 'production';
app.use(
  cors({
    origin: isDev
      ? true
      : process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',')
        : '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Fingerprint'],
    credentials: true,
  })
);

// 3. Body payload limits to prevent buffer overflow/exhaustion attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// 4. Rate limiting and tarpitting middleware
applyRateLimiters(app);

// 5. Conditional host routing middleware (Dashboard SPA vs API router)
app.use(createHostRouter({ apiRouter }));

// 6. Global Express error handler middleware
app.use(errorHandler);

module.exports = {
  app,
  apiRouter,
};
