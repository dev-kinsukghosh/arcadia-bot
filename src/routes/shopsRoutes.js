const express = require('express');
const axios = require('axios');
const { arcadiaApi } = require('../utils/apiClient.js');
const redisClient = require('../utils/redis.js');
const { db } = require('../utils/db.js');
const { playerShops } = require('../db/schema.js');
const logger = require('../utils/logger.js');
const { cacheEndpoint } = require('../middleware/cache.js');

const router = express.Router();

// Local cache for Mojang username resolutions to minimize external API hits
const resolvedUsernames = new Map();

async function resolveUuidToUsername(uuid) {
  if (!uuid) return 'Unknown';
  const cleanUuid = uuid.replace(/-/g, '').toLowerCase();

  if (resolvedUsernames.has(cleanUuid)) {
    return resolvedUsernames.get(cleanUuid);
  }

  // Try Redis first if available
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

// Get cached player shops
router.get('/', cacheEndpoint(15), handleShopsRequest);

module.exports = router;
module.exports.resolveUuidToUsername = resolveUuidToUsername;
