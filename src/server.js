const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { rateLimit } = require('express-rate-limit');
const { slowDown } = require('express-slow-down');
const { config } = require('./config.js');
const logger = require('./utils/logger.js');
const { db } = require('./utils/db.js');
const { currencies, currencyHistory, convoyItems } = require('./db/schema.js');
const { and, eq, gte, asc } = require('drizzle-orm');
const pc = require('picocolors');
const { WebSocketServer } = require('ws');

const app = express();

// --- SECURITY & DOS/DDOS DEFENSE ---

// 1. Helmet to secure headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to allow standard Vue app imports
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. CORS configuration (allowing X-Device-Fingerprint header)
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Fingerprint'],
    credentials: true,
  })
);

// 3. Body payload limits to prevent buffer overflow/exhaustion attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// 4. IP-Based Rate Limiting (Defaults to safe IP-based keys)
const ipRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Disable validations to avoid IP/proxy checks on startup
  message: { error: 'Too many requests from this IP. Please try again in a minute.' },
});

// 5. Device-Fingerprint-Based Rate Limiting
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

// 6. Tarpitting (Slow Down) to defend against DDoS/brute forcing
const speedLimiter = slowDown({
  windowMs: 1 * 60 * 1000, // 1 minute
  delayAfter: 30, // Begin slowing down after 30 requests per minute
  delayMs: (hits) => (hits - 30) * 150, // Add 150ms delay per hit above 30
  maxDelayMs: 3000, // Cap delay at 3 seconds
});

// Apply rate limiting & tarpitting globally
app.use(ipRateLimiter);
app.use(deviceRateLimiter);
app.use(speedLimiter);

const apiRouter = express.Router();

// 0. Base API info route
apiRouter.get('/', (req, res) => {
  res.json({
    name: 'ArcadiaMC Community Currency API',
    status: 'online',
    version: '1.1.5',
    endpoints: {
      status: '/status',
      currencies: '/currencies',
      stats: '/currencies/stats',
      history: '/currencies/history',
      towny: '/towny',
    },
  });
});

// 1. Get status of server & bot
apiRouter.get('/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// 2. Get list of latest currencies
apiRouter.get('/currencies', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database connection not available.' });
  }

  try {
    // Fetch previous rates from Redis if available
    let previousRates = {};
    const redisClient = require('./utils/redis.js');
    if (redisClient && redisClient.status === 'ready') {
      try {
        const cached = await redisClient.get('currencies:previous_rates');
        if (cached) previousRates = JSON.parse(cached);
      } catch (err) {
        logger.warn(`Failed to fetch previous rates from Redis: ${err.message}`);
      }
    }

    const list = await db.select().from(currencies);
    const enrichedList = list.map((c) => ({
      ...c,
      previousRate: previousRates[c.id] !== undefined ? String(previousRates[c.id]) : '0.0000',
    }));
    res.json(enrichedList);
  } catch (err) {
    logger.error(`API Error fetching currencies: ${err.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2b. Get latest active convoy items
apiRouter.get('/currencies/convoy', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database connection not available.' });
  }

  try {
    const list = await db.select().from(convoyItems).where(eq(convoyItems.current_p, true));
    res.json(list);
  } catch (err) {
    logger.error(`API Error fetching convoy items: ${err.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 2c. Get all convoy items tracked historically
apiRouter.get('/currencies/convoy/all', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database connection not available.' });
  }

  try {
    const list = await db.select().from(convoyItems);
    res.json(list);
  } catch (err) {
    logger.error(`API Error fetching all convoy items: ${err.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 3. Get historical rates for a currency
apiRouter.get('/currencies/history', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database connection not available.' });
  }

  try {
    const { currencyId, days } = req.query;
    const limitDays = parseInt(days || '30', 10);
    const retentionDays = Math.min(Math.max(limitDays, 1), 120); // Clamp to max 120 days retention

    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    let query;
    if (currencyId) {
      query = db
        .select()
        .from(currencyHistory)
        .where(
          and(gte(currencyHistory.date, cutoffStr), eq(currencyHistory.currencyId, currencyId))
        );
    } else {
      query = db.select().from(currencyHistory).where(gte(currencyHistory.date, cutoffStr));
    }

    const historyData = await query.orderBy(asc(currencyHistory.date));
    res.json(historyData);
  } catch (err) {
    logger.error(`API Error fetching history: ${err.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// 4. Get stability indices & performance metrics
apiRouter.get('/currencies/stats', async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database connection not available.' });
  }

  try {
    const { days } = req.query;
    const limitDays = parseInt(days || '30', 10);
    const retentionDays = Math.min(Math.max(limitDays, 1), 120);

    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - retentionDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Fetch previous rates from Redis if available
    let previousRates = {};
    const redisClient = require('./utils/redis.js');
    if (redisClient && redisClient.status === 'ready') {
      try {
        const cached = await redisClient.get('currencies:previous_rates');
        if (cached) previousRates = JSON.parse(cached);
      } catch (err) {
        logger.warn(`Failed to fetch previous rates from Redis: ${err.message}`);
      }
    }

    // Fetch historical data for statistics calculations
    const historyData = await db
      .select()
      .from(currencyHistory)
      .where(gte(currencyHistory.date, cutoffStr))
      .orderBy(asc(currencyHistory.date));

    // Fetch latest currency metadata
    const latestCurrencies = await db.select().from(currencies);

    // Group historical rates by currencyId
    const historyMap = {};
    historyData.forEach((row) => {
      if (!historyMap[row.currencyId]) {
        historyMap[row.currencyId] = [];
      }
      historyMap[row.currencyId].push(parseFloat(row.arcPerUnitLive) || 0);
    });

    // Calculate metrics for each currency
    const statsList = latestCurrencies.map((curr) => {
      const rates = historyMap[curr.id] || [];
      const currentLive = parseFloat(curr.arcPerUnitLive) || 0;
      const base = parseFloat(curr.arcPerUnitBase) || 0;
      const previousRate =
        previousRates[curr.id] !== undefined ? parseFloat(previousRates[curr.id]) : 0;

      if (rates.length === 0) {
        return {
          id: curr.id,
          name: curr.name,
          nation: curr.nation,
          standardItem: curr.standardItem,
          baseRate: base,
          liveRate: currentLive,
          previousRate: previousRate,
          avgLiveRate: currentLive,
          minRate: currentLive,
          maxRate: currentLive,
          spread: 0,
          stdDev: 0,
          stabilityScore: 100, // Default stable if no history
          percentageChange: 0,
        };
      }

      // Calculations
      const count = rates.length;
      const sum = rates.reduce((a, b) => a + b, 0);
      const avg = sum / count;
      const min = Math.min(...rates);
      const max = Math.max(...rates);
      const spread = max - min;

      // Volatility (Standard Deviation)
      const variance = rates.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count;
      const stdDev = Math.sqrt(variance);

      // Coefficient of Variation (CV) & Stability Score
      const cv = avg > 0 ? stdDev / avg : 0;
      const stabilityScore = Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));

      // Percentage deviation from base
      const percentageChange = base > 0 ? ((currentLive - base) / base) * 100 : 0;

      return {
        id: curr.id,
        name: curr.name,
        nation: curr.nation,
        standardItem: curr.standardItem,
        baseRate: base,
        liveRate: currentLive,
        previousRate: previousRate,
        avgLiveRate: avg,
        minRate: min,
        maxRate: max,
        spread: spread,
        stdDev: stdDev,
        stabilityScore: stabilityScore,
        percentageChange: percentageChange,
      };
    });

    res.json(statsList);
  } catch (err) {
    logger.error(`API Error fetching stats: ${err.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Cache variables for fallback when Redis is offline
let localTownyCache = null;
let localTownyCacheTime = 0;
const TOWNY_CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache

const handleTownyRequest = async (req, res) => {
  const { arcadiaApi } = require('./utils/apiClient.js');
  const redisClient = require('./utils/redis.js');
  const now = Date.now();

  // Try Redis first
  if (redisClient && redisClient.status === 'ready') {
    try {
      const cached = await redisClient.get('cache:towny');
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      logger.warn(`Failed to fetch Towny data from Redis: ${err.message}`);
    }
  } else if (localTownyCache && now - localTownyCacheTime < TOWNY_CACHE_TTL) {
    return res.json(localTownyCache);
  }

  try {
    const data = await arcadiaApi.getTowny();

    // Save to Redis
    if (redisClient && redisClient.status === 'ready') {
      try {
        await redisClient.setex('cache:towny', 120, JSON.stringify(data)); // 2 minutes TTL
      } catch (err) {
        logger.warn(`Failed to save Towny data to Redis: ${err.message}`);
      }
    }

    // Save to local cache
    localTownyCache = data;
    localTownyCacheTime = now;

    // Trigger heads background schedule sync check
    const { checkScheduleAndRunBatch } = require('./services/headManager.js');
    checkScheduleAndRunBatch(data);

    res.json(data);
  } catch (err) {
    logger.error(`API Error fetching Towny: ${err.message}`);
    // If external call fails, serve stale local cache if exists
    if (localTownyCache) {
      return res.json(localTownyCache);
    }
    res.status(502).json({ error: 'Failed to fetch Towny data from external API.' });
  }
};

apiRouter.get('/towny', handleTownyRequest);
apiRouter.get('/api/towny', handleTownyRequest);

// Local player heads cache serving and downloader proxy
apiRouter.get('/heads/:username.png', async (req, res) => {
  // Explicit cross-origin headers to bypass helmet CORP restrictions
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { headsDir, downloadHead } = require('./services/headManager.js');
  const fs = require('fs');
  const path = require('path');
  const username = req.params.username.toLowerCase();
  const filePath = path.join(headsDir, `${username}.png`);

  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  // Download skin in-flight
  const success = await downloadHead(username);
  if (success && fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }

  res.status(404).send('Not Found');
});

// Static serving for icons on the API router
apiRouter.use('/icons', express.static(path.join(process.cwd(), 'src', 'icons')));

// Conditional host routing middleware
app.use((req, res, next) => {
  const hostname = req.hostname;

  if (hostname === 'arcc.webdevkin.com') {
    // Dashboard host: serve static files and SPA fallback
    express.static(path.join(__dirname, '../dashboard/dist'))(req, res, () => {
      if (req.method === 'GET') {
        return res.sendFile(path.join(__dirname, '../dashboard/dist/index.html'));
      }
      res.status(404).json({ error: 'Not Found' });
    });
  } else {
    // API host, localhost, or any other host: serve API router only
    apiRouter(req, res, () => {
      res.status(404).json({ error: 'Not Found' });
    });
  }
});

// Start Server helper
function startServer() {
  const server = app.listen(config.web.port, () => {
    logger.info(
      `Dashboard API running at ${pc.bold(pc.cyan(`http://localhost:${config.web.port}`))}`
    );
  });

  // Handle connection timeouts to prevent Slowloris DoS
  server.keepAliveTimeout = 10 * 1000; // 10 seconds timeout
  server.headersTimeout = 12 * 1000;

  // Initialize WebSocket server on the same port
  const wss = new WebSocketServer({ server });
  const clients = new Set();

  wss.on('connection', (ws) => {
    logger.info('WebSocket client connected to real-time currency updates.');
    clients.add(ws);

    // Send initial status message
    ws.send(JSON.stringify({ type: 'status', data: 'connected' }));

    ws.on('close', () => {
      logger.info('WebSocket client disconnected.');
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      logger.warn(`WebSocket error: ${err.message}`);
      clients.delete(ws);
    });
  });

  // Listen to currency sync updates and broadcast to connected WS clients
  const eventEmitter = require('./utils/emitter.js');
  eventEmitter.on('currencies:updated', async (updatedCurrencies) => {
    if (clients.size === 0) return;

    logger.info(
      `Broadcasting real-time currency updates to ${clients.size} client(s) via WebSockets.`
    );

    // Fetch previous rates from Redis to enrich the payload
    let previousRates = {};
    const redisClient = require('./utils/redis.js');
    if (redisClient && redisClient.status === 'ready') {
      try {
        const cached = await redisClient.get('currencies:previous_rates');
        if (cached) previousRates = JSON.parse(cached);
      } catch {
        // ignore
      }
    }

    const payload = updatedCurrencies.map((c) => ({
      ...c,
      previousRate: previousRates[c.id] !== undefined ? String(previousRates[c.id]) : '0.0000',
    }));

    const msg = JSON.stringify({ type: 'update', data: payload });
    for (const ws of clients) {
      if (ws.readyState === ws.OPEN) {
        ws.send(msg);
      }
    }
  });

  return server;
}

module.exports = {
  app,
  startServer,
};
