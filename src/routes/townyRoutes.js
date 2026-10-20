const express = require('express');
const { arcadiaApi } = require('../utils/apiClient.js');
const redisClient = require('../utils/redis.js');
const { db } = require('../utils/db.js');
const logger = require('../utils/logger.js');
const { townyHistory } = require('../db/schema.js');
const { and, eq, gte, asc } = require('drizzle-orm');
const { checkScheduleAndRunBatch } = require('../services/headManager.js');
const { cacheEndpoint } = require('../middleware/cache.js');

const router = express.Router();

// Cache variables for fallback when Redis is offline
let localTownyCache = null;
let localTownyCacheTime = 0;
const TOWNY_CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache

const handleTownyRequest = async (req, res) => {
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

// 1. Get real-time Towny data
router.get('/', cacheEndpoint(10), handleTownyRequest);

// 2. Get Towny historical resident/chunk logs
router.get('/history', cacheEndpoint(30), async (req, res) => {
  const name = req.query.name?.trim().toLowerCase();
  const type = req.query.type || 'town'; // 'town' or 'nation'
  const days = parseInt(req.query.days, 10) || 30;

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

module.exports = router;
