const express = require('express');
const { getWarsCache } = require('../services/emptyEndpointsSync.js');
const logger = require('../utils/logger.js');
const { cacheEndpoint } = require('../middleware/cache.js');

const router = express.Router();

const handleWarsRequest = async (req, res) => {
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

// Get cached wars status
router.get('/', cacheEndpoint(10), handleWarsRequest);

module.exports = router;
