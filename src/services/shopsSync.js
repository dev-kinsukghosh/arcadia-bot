const { db } = require('../utils/db.js');
const { playerShops } = require('../db/schema.js');
const { notInArray } = require('drizzle-orm');
const { arcadiaApi } = require('../utils/apiClient.js');
const logger = require('../utils/logger.js');
const pc = require('picocolors');
const redis = require('../utils/redis.js');
const axios = require('axios');

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const REDIS_CACHE_KEY = 'cache:shops';
const REDIS_TTL_SEC = 25 * 60; // 25 minutes TTL

const resolvedUsernames = new Map();

async function resolveUuidToUsername(uuid) {
  if (!uuid) return 'Unknown';
  const cleanUuid = uuid.replace(/-/g, '').toLowerCase();

  if (resolvedUsernames.has(cleanUuid)) {
    return resolvedUsernames.get(cleanUuid);
  }

  if (redis && redis.status === 'ready') {
    try {
      const cachedName = await redis.get(`uuid:name:${cleanUuid}`);
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

      if (redis && redis.status === 'ready') {
        await redis.setex(`uuid:name:${cleanUuid}`, 7 * 24 * 60 * 60, username);
      }
      return username;
    }
  } catch (err) {
    logger.warn(`Failed to resolve username for UUID ${uuid} in shops sync: ${err.message}`);
  }

  return 'Unknown';
}

async function syncShops() {
  if (!db) {
    logger.warn('Database is not active. Skipping shops sync.');
    return;
  }

  logger.info('Starting player shops synchronization...');
  try {
    const data = await arcadiaApi.getShops();
    if (!data || !Array.isArray(data.shops)) {
      logger.error('Invalid shops API response format (expected shops array).');
      return;
    }

    const shopsList = data.shops;
    logger.info(`Fetched ${shopsList.length} shops from API. Resolving owners...`);

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

    // Deduplicate shops by key to prevent concurrent inserts of the same key
    const seenKeys = new Set();
    const uniqueShops = [];
    for (const shop of shopsList) {
      const key = shop.key || shop.name?.toLowerCase();
      if (!key) continue;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        uniqueShops.push(shop);
      }
    }

    // Save shops to DB using atomic ON DUPLICATE KEY UPDATE
    const activeKeys = [];
    const dbPromises = uniqueShops.map(async (shop) => {
      const key = shop.key || shop.name.toLowerCase();
      activeKeys.push(key);

      const balancesStr = JSON.stringify(shop.balances || {});
      const sellListingsStr = JSON.stringify(shop.sellListings || []);
      const buyListingsStr = JSON.stringify(shop.buyListings || []);

      await db
        .insert(playerShops)
        .values({
          key,
          name: shop.name,
          owner: shop.owner || null,
          ownerName: shop.ownerName || 'Unknown',
          world: shop.world || null,
          plotX: shop.plotX !== undefined ? shop.plotX : null,
          plotZ: shop.plotZ !== undefined ? shop.plotZ : null,
          currency: shop.currency || null,
          balances: balancesStr,
          sellListings: sellListingsStr,
          buyListings: buyListingsStr,
        })
        .onDuplicateKeyUpdate({
          set: {
            name: shop.name,
            owner: shop.owner || null,
            ownerName: shop.ownerName || 'Unknown',
            world: shop.world || null,
            plotX: shop.plotX !== undefined ? shop.plotX : null,
            plotZ: shop.plotZ !== undefined ? shop.plotZ : null,
            currency: shop.currency || null,
            balances: balancesStr,
            sellListings: sellListingsStr,
            buyListings: buyListingsStr,
          },
        });
    });

    await Promise.all(dbPromises);

    // Clean up shops not present anymore (with safety check to prevent wiping database on empty API response)
    if (activeKeys.length > 0) {
      // Find the names of the stale shops to log them
      const obsoleteShops = await db
        .select({ key: playerShops.key, name: playerShops.name })
        .from(playerShops)
        .where(notInArray(playerShops.key, activeKeys));

      const deleteRes = await db.delete(playerShops).where(notInArray(playerShops.key, activeKeys));
      const deletedShopsCount = deleteRes[0]?.affectedRows || 0;
      if (deletedShopsCount > 0) {
        const deletedNames =
          obsoleteShops.length > 0
            ? obsoleteShops.map((s) => `${s.name} (${s.key})`).join(', ')
            : 'None';
        logger.info(
          `Pruned ${pc.bold(pc.cyan(deletedShopsCount))} stale player shops [${pc.cyan(deletedNames)}] from DB.`
        );
      }
    } else {
      logger.warn(
        'Fetched 0 player shops from API. Skipping pruning to prevent accidental database wipe.'
      );
    }

    // Cache the resolved result to Redis with 25-minute TTL
    if (redis && redis.status === 'ready') {
      try {
        const payload = {
          updatedAt: Date.now(),
          shops: shopsList,
        };
        await redis.setex(REDIS_CACHE_KEY, REDIS_TTL_SEC, JSON.stringify(payload));
        logger.success(`Cached resolved shops in Redis with 25-minute TTL.`);
      } catch (err) {
        logger.warn(`Failed to save Shops data to Redis: ${err.message}`);
      }
    }

    logger.success(
      `Player shops synchronization complete: ${pc.bold(pc.green(shopsList.length))} shops updated in DB.`
    );
  } catch (error) {
    const { reportError } = require('../utils/errorHandler.js');
    await reportError(error, 'Shops Sync Service');
  }
}

let syncInterval = null;

function startShopsSync(_client) {
  logger.info('Initializing Shops Sync scheduler (30-minute interval)...');

  // Run once immediately
  syncShops();

  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(async () => {
    logger.info('Executing scheduled shops sync...');
    await syncShops();
  }, SYNC_INTERVAL_MS);
}

module.exports = {
  syncShops,
  startShopsSync,
};
