const express = require('express');
const { getPlayersCache } = require('../services/playerSync.js');
const { db } = require('../utils/db.js');
const { playerProfiles } = require('../db/schema.js');
const { or, eq } = require('drizzle-orm');
const logger = require('../utils/logger.js');
const { cacheEndpoint } = require('../middleware/cache.js');

const router = express.Router();

// 1. Get cached online players & database player profiles
const handlePlayersRequest = async (req, res) => {
  try {
    const data = (await getPlayersCache()) || {
      updatedAt: Date.now(),
      onlineCount: 0,
      players: [],
    };
    let profiles = [];
    if (db) {
      try {
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

router.get('/', cacheEndpoint(5), handlePlayersRequest);

// 2. Lookup single player profile by username, display name, or UUID
router.get('/profile/:name', async (req, res) => {
  const query = req.params.name?.trim().toLowerCase();
  if (!query) {
    return res.status(400).json({ error: 'Missing player name' });
  }

  if (!db) {
    return res.status(503).json({ error: 'Database connection unavailable' });
  }

  try {
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

module.exports = router;
