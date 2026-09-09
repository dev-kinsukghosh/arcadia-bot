const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const { rateLimit } = require('express-rate-limit');
const { slowDown } = require('express-slow-down');
const { config } = require('./config.js');
const logger = require('./utils/logger.js');
const { db } = require('./utils/db.js');
const redisClient = require('./utils/redis.js');
const { currencies, currencyHistory, convoyItems, townyHistory } = require('./db/schema.js');
const { and, eq, gte, asc } = require('drizzle-orm');
const pc = require('picocolors');
const { WebSocketServer } = require('ws');

const app = express();
app.set('trust proxy', 1);

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

// Helper: Redis In-Memory API Cache & HTTP Cache-Control Middleware
function cacheEndpoint(ttlSeconds = 10) {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    // Attach Cache-Control header for client/CDN browser caching
    res.setHeader(
      'Cache-Control',
      `public, max-age=${ttlSeconds}, s-maxage=${ttlSeconds * 2}, stale-while-revalidate=30`
    );

    const cacheKey = `api_cache:${req.originalUrl || req.url}`;
    if (redisClient && redisClient.status === 'ready') {
      try {
        const cachedResponse = await redisClient.get(cacheKey);
        if (cachedResponse) {
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('Content-Type', 'application/json');
          return res.send(cachedResponse);
        }
      } catch {
        // Fallback to live route handling
      }
    }

    res.setHeader('X-Cache', 'MISS');
    const originalSend = res.send.bind(res);
    res.send = (body) => {
      if (
        res.statusCode === 200 &&
        redisClient &&
        redisClient.status === 'ready' &&
        typeof body === 'string'
      ) {
        redisClient.setex(cacheKey, ttlSeconds, body).catch(() => {});
      }
      return originalSend(body);
    };

    next();
  };
}

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

// Helper: skip rate limiting for static asset endpoints (heads, icons)
function isAssetRequest(req) {
  return req.path.startsWith('/heads/') || req.path.startsWith('/icons/');
}

// Apply rate limiting & tarpitting globally (skip cached asset endpoints)
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
apiRouter.get('/currencies', cacheEndpoint(10), async (req, res) => {
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

    const list = await db.select().from(currencies).where(eq(currencies.active, true));
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
apiRouter.get('/currencies/convoy', cacheEndpoint(10), async (req, res) => {
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
apiRouter.get('/currencies/convoy/all', cacheEndpoint(10), async (req, res) => {
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
apiRouter.get('/currencies/history', cacheEndpoint(30), async (req, res) => {
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
apiRouter.get('/currencies/stats', cacheEndpoint(15), async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database connection not available.' });
  }

  try {
    const { days } = req.query;
    const limitDays = parseInt(days || '30', 10);
    const retentionDays = Math.min(Math.max(limitDays, 7), 120);

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
    const latestCurrencies = await db.select().from(currencies).where(eq(currencies.active, true));

    // Group historical rates by currencyId
    const historyMap = {};
    historyData.forEach((row) => {
      if (!historyMap[row.currencyId]) {
        historyMap[row.currencyId] = [];
      }
      historyMap[row.currencyId].push({
        date: row.date,
        liveRate: parseFloat(row.arcPerUnitLive) || 0,
      });
    });

    // Calculate metrics for each currency
    const statsList = latestCurrencies.map((curr) => {
      const historyRows = historyMap[curr.id] || [];
      const rates = historyRows.map((r) => r.liveRate);
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
          change24h: 0,
          change7d: 0,
          sparkline: [currentLive, currentLive],
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

      // Helper function to find the rate closest to N days ago
      const getRateNDaysAgo = (n) => {
        if (historyRows.length === 0) return currentLive;

        // Target date relative to current UTC date
        const targetDate = new Date();
        targetDate.setUTCDate(targetDate.getUTCDate() - n);
        const targetStr = targetDate.toISOString().split('T')[0];

        // Try to find exact match
        const exact = historyRows.find((r) => r.date === targetStr);
        if (exact) return exact.liveRate;

        // Find closest date before or equal to targetStr
        let closest = null;
        for (const r of historyRows) {
          if (r.date <= targetStr) {
            if (!closest || r.date > closest.date) {
              closest = r;
            }
          }
        }
        if (closest) return closest.liveRate;

        // Fallback to oldest available record
        return historyRows[0].liveRate;
      };

      const rate24h = getRateNDaysAgo(1);
      const rate7d = getRateNDaysAgo(7);

      const change24h = rate24h > 0 ? ((currentLive - rate24h) / rate24h) * 100 : 0;
      const change7d = rate7d > 0 ? ((currentLive - rate7d) / rate7d) * 100 : 0;

      const sparklineData = rates.length > 0 ? rates : [currentLive, currentLive];

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
        change24h: change24h,
        change7d: change7d,
        sparkline: sparklineData,
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

apiRouter.get('/towny', cacheEndpoint(10), handleTownyRequest);
apiRouter.get('/api/towny', cacheEndpoint(10), handleTownyRequest);

apiRouter.get('/towny/history', cacheEndpoint(30), async (req, res) => {
  const name = req.query.name?.trim().toLowerCase();
  const type = req.query.type || 'town'; // 'town' or 'nation'
  const days = parseInt(req.query.days) || 30;

  if (!name) {
    return res.status(400).json({ error: 'Missing name parameter' });
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const historyData = await db
      .select()
      .from(townyHistory)
      .where(
        and(
          eq(townyHistory.name, name),
          eq(townyHistory.type, type),
          gte(townyHistory.date, cutoffStr)
        )
      )
      .orderBy(asc(townyHistory.date));

    res.json(historyData);
  } catch (err) {
    logger.error(`API Error fetching Towny history: ${err.message}`);
    res.status(500).json({ error: 'Database error fetching Towny history' });
  }
});

// 5. Get cached events and stored historical events
const handleEventsRequest = async (req, res) => {
  const { getEventsCache } = require('./services/emptyEndpointsSync.js');
  try {
    const data = await getEventsCache();
    let storedEvents = [];
    if (db) {
      try {
        const { sEvents } = require('./db/schema.js');
        const { desc } = require('drizzle-orm');
        const rows = await db.select().from(sEvents).orderBy(desc(sEvents.timestamp)).limit(200);
        storedEvents = rows.map((r) => {
          let parsedData = null;
          if (r.data) {
            try {
              parsedData = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
            } catch {
              parsedData = r.data;
            }
          }
          return {
            id: r.id,
            timestamp: r.timestamp,
            type: r.type,
            message: r.message,
            data: parsedData,
            createdAt: r.createdAt,
          };
        });
      } catch (err) {
        logger.warn(`Failed to fetch s_events for API: ${err.message}`);
      }
    }
    const liveEvents = Array.isArray(data?.events) ? data.events : Array.isArray(data) ? data : [];
    res.json({
      ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
      updatedAt: Date.now(),
      events: liveEvents,
      storedEvents,
    });
  } catch (err) {
    logger.error(`API Error fetching events: ${err.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

apiRouter.get('/events', cacheEndpoint(10), handleEventsRequest);
apiRouter.get('/api/events', cacheEndpoint(10), handleEventsRequest);

// 6. Get cached wars status
const handleWarsRequest = async (req, res) => {
  const { getWarsCache } = require('./services/emptyEndpointsSync.js');
  try {
    const data = await getWarsCache();
    res.json(
      data || {
        updatedAt: Date.now(),
        enabled: false,
        warTime: false,
        activeWars: [],
        recentEvents: [],
      }
    );
  } catch (err) {
    logger.error(`API Error fetching wars: ${err.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

apiRouter.get('/wars', cacheEndpoint(10), handleWarsRequest);
apiRouter.get('/api/wars', cacheEndpoint(10), handleWarsRequest);

// 7. Get cached online players
const handlePlayersRequest = async (req, res) => {
  const { getPlayersCache } = require('./services/playerSync.js');
  try {
    const data = (await getPlayersCache()) || {
      updatedAt: Date.now(),
      onlineCount: 0,
      players: [],
    };
    let profiles = [];
    if (db) {
      try {
        const { playerProfiles } = require('./db/schema.js');
        profiles = await db.select().from(playerProfiles);
      } catch (err) {
        logger.warn(`Failed to fetch database player profiles: ${err.message}`);
      }
    }
    res.json({
      ...data,
      profiles,
    });
  } catch (err) {
    logger.error(`API Error fetching players: ${err.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

apiRouter.get('/players', cacheEndpoint(5), handlePlayersRequest);
apiRouter.get('/api/players', cacheEndpoint(5), handlePlayersRequest);

apiRouter.get('/players/profile/:name', async (req, res) => {
  const query = req.params.name?.trim().toLowerCase();
  if (!query) {
    return res.status(400).json({ error: 'Missing player name' });
  }

  if (!db) {
    return res.status(503).json({ error: 'Database connection unavailable' });
  }

  try {
    const { playerProfiles } = require('./db/schema.js');
    const { or, eq } = require('drizzle-orm');

    const records = await db
      .select()
      .from(playerProfiles)
      .where(
        or(
          eq(playerProfiles.name, query),
          eq(playerProfiles.displayName, query),
          eq(playerProfiles.uuid, query)
        )
      );

    if (records.length === 0) {
      return res.status(404).json({ error: 'Player profile not found in database' });
    }

    res.json(records[0]);
  } catch (err) {
    logger.error(`API Error fetching player profile: ${err.message}`);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// Local cache for Mojang username resolutions to minimize external API hits
const resolvedUsernames = new Map();

async function resolveUuidToUsername(uuid) {
  if (!uuid) return 'Unknown';
  const cleanUuid = uuid.replace(/-/g, '').toLowerCase();

  if (resolvedUsernames.has(cleanUuid)) {
    return resolvedUsernames.get(cleanUuid);
  }

  // Try Redis first if available
  const redisClient = require('./utils/redis.js');
  if (redisClient && redisClient.status === 'ready') {
    try {
      const cachedName = await redisClient.get(`uuid:name:${cleanUuid}`);
      if (cachedName) {
        resolvedUsernames.set(cleanUuid, cachedName);
        return cachedName;
      }
    } catch {
      // ignore
    }
  }

  try {
    const axios = require('axios');
    const res = await axios.get(
      `https://sessionserver.mojang.com/session/minecraft/profile/${cleanUuid}`,
      { timeout: 3000 }
    );
    if (res.data && res.data.name) {
      const username = res.data.name;
      resolvedUsernames.set(cleanUuid, username);

      // Cache in Redis for 7 days
      if (redisClient && redisClient.status === 'ready') {
        await redisClient.setex(`uuid:name:${cleanUuid}`, 7 * 24 * 60 * 60, username);
      }
      return username;
    }
  } catch (err) {
    logger.warn(`Failed to resolve username for UUID ${uuid}: ${err.message}`);
  }

  return 'Unknown';
}

// Cache variables for shops fallback when Redis is offline
let localShopsCache = null;
let localShopsCacheTime = 0;
const SHOPS_CACHE_TTL = 25 * 60 * 1000; // 25 minutes cache

const handleShopsRequest = async (req, res) => {
  const { arcadiaApi } = require('./utils/apiClient.js');
  const redisClient = require('./utils/redis.js');
  const { db } = require('./utils/db.js');
  const { playerShops } = require('./db/schema.js');
  const now = Date.now();

  // Try Redis first (CACHE TTL for shop is 25min Redis)
  if (redisClient && redisClient.status === 'ready') {
    try {
      const cached = await redisClient.get('cache:shops');
      if (cached) {
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      logger.warn(`Failed to fetch Shops data from Redis: ${err.message}`);
    }
  } else if (localShopsCache && now - localShopsCacheTime < SHOPS_CACHE_TTL) {
    return res.json(localShopsCache);
  }

  // If Redis cache misses, query MySQL Database
  if (db) {
    try {
      const dbShops = await db.select().from(playerShops);
      const shopsList = dbShops.map((shop) => {
        return {
          key: shop.key,
          name: shop.name,
          owner: shop.owner,
          ownerName: shop.ownerName || 'Unknown',
          world: shop.world,
          plotX: shop.plotX,
          plotZ: shop.plotZ,
          currency: shop.currency,
          balances: shop.balances ? JSON.parse(shop.balances) : {},
          sellListings: shop.sellListings ? JSON.parse(shop.sellListings) : [],
          buyListings: shop.buyListings ? JSON.parse(shop.buyListings) : [],
        };
      });

      const payload = {
        updatedAt: now,
        shops: shopsList,
      };

      // Save to Redis (CACHE TTL is 25 minutes)
      if (redisClient && redisClient.status === 'ready') {
        try {
          await redisClient.setex('cache:shops', 25 * 60, JSON.stringify(payload));
        } catch (err) {
          logger.warn(`Failed to save Shops data to Redis: ${err.message}`);
        }
      }

      // Save to local cache
      localShopsCache = payload;
      localShopsCacheTime = now;

      return res.json(payload);
    } catch (err) {
      logger.error(`Database Error fetching Shops: ${err.message}`);
    }
  }

  // Fallback to API if both Redis and MySQL fail/empty
  try {
    const data = await arcadiaApi.getShops();
    const shopsList = Array.isArray(data.shops) ? data.shops : [];

    // Resolve owner usernames in parallel
    await Promise.all(
      shopsList.map(async (shop) => {
        if (shop.owner) {
          shop.ownerName = await resolveUuidToUsername(shop.owner);
        } else {
          shop.ownerName = 'Unknown';
        }
      })
    );

    const payload = {
      updatedAt: data.updatedAt || now,
      shops: shopsList,
    };

    // Save to Redis
    if (redisClient && redisClient.status === 'ready') {
      try {
        await redisClient.setex('cache:shops', 25 * 60, JSON.stringify(payload));
      } catch (err) {
        logger.warn(`Failed to save Shops data to Redis: ${err.message}`);
      }
    }

    localShopsCache = payload;
    localShopsCacheTime = now;

    res.json(payload);
  } catch (err) {
    logger.error(`API Error fetching Shops fallback: ${err.message}`);
    // If external call fails, serve stale local cache if exists
    if (localShopsCache) {
      return res.json(localShopsCache);
    }
    res.status(502).json({ error: 'Failed to fetch Shops data from external API.' });
  }
};

apiRouter.get('/shops', cacheEndpoint(15), handleShopsRequest);
apiRouter.get('/api/shops', cacheEndpoint(15), handleShopsRequest);

// Local player heads cache serving and downloader proxy
apiRouter.get('/heads/:username.png', async (req, res) => {
  // Explicit cross-origin headers to bypass helmet CORP restrictions
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { getHeadBuffer } = require('./services/headManager.js');
  const username = req.params.username;

  try {
    const buffer = await getHeadBuffer(username);
    if (buffer) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=1800');
      return res.send(buffer);
    }
  } catch (err) {
    logger.error(`Error serving head for ${username}: ${err.message}`);
  }

  res.status(404).send('Not Found');
});

// Static serving for icons on the API router
apiRouter.use('/icons', express.static(path.join(process.cwd(), 'src', 'icons')));

// Conditional host routing middleware
app.use((req, res, _next) => {
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

  // 7. Global Express error handler middleware (prevents webserver endpoints from crashing process)
  app.use((err, req, res, _next) => {
    logger.error(`[API Server Error] ${req.method} ${req.path}:`, err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
  });

  return server;
}

module.exports = {
  app,
  startServer,
};

if (require.main === module) {
  startServer();
}
