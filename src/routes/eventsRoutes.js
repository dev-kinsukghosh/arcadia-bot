const express = require('express');
const { getEventsCache } = require('../services/emptyEndpointsSync.js');
const { db } = require('../utils/db.js');
const { sEvents } = require('../db/schema.js');
const { desc } = require('drizzle-orm');
const logger = require('../utils/logger.js');
const { cacheEndpoint } = require('../middleware/cache.js');

const router = express.Router();

const handleEventsRequest = async (req, res) => {
  try {
    const data = await getEventsCache();
    let storedEvents = [];
    if (db) {
      try {
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

// Get cached events and stored historical events
router.get('/', cacheEndpoint(10), handleEventsRequest);

module.exports = router;
