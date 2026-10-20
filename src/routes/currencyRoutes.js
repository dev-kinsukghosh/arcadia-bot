const express = require('express');
const { db } = require('../utils/db.js');
const redisClient = require('../utils/redis.js');
const logger = require('../utils/logger.js');
const { currencies, currencyHistory, convoyItems } = require('../db/schema.js');
const { and, eq, gte, asc } = require('drizzle-orm');
const { cacheEndpoint } = require('../middleware/cache.js');

const router = express.Router();

// 1. Get list of latest currencies
router.get('/', cacheEndpoint(10), async (req, res) => {
  if (!db) {
    return res.status(503).json({ error: 'Database connection not available.' });
  }

  try {
    // Fetch previous rates from Redis if available
    let previousRates = {};
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

// 2. Get latest active convoy items
router.get('/convoy', cacheEndpoint(10), async (req, res) => {
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

// 3. Get all convoy items tracked historically
router.get('/convoy/all', cacheEndpoint(10), async (req, res) => {
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

// 4. Get historical rates for a currency
router.get('/history', cacheEndpoint(30), async (req, res) => {
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

// 5. Get stability indices & performance metrics
router.get('/stats', cacheEndpoint(15), async (req, res) => {
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

module.exports = router;
