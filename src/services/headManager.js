const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');
const redisClient = require('../utils/redis.js');
const logger = require('../utils/logger.js');
const { db } = require('../utils/db.js');
const { playerHeads, playerProfiles } = require('../db/schema.js');
const { eq, sql } = require('drizzle-orm');

// In-flight deduplication map to prevent multiple upstream API calls for the same username
const inflightRequests = new Map();

const headsDir = path.join(process.cwd(), 'src', 'heads');
if (!fs.existsSync(headsDir)) {
  fs.mkdirSync(headsDir, { recursive: true });
}

// In-memory cache for UUID resolution
const uuidCache = new Map();
const nameCasingCache = new Map();

// Round-robin counter has been removed in favor of prioritized fallback fetching to ensure byte consistency

/**
 * Formats a 32-character dashless UUID into a standard 36-character dashed UUID.
 */
function formatUuid(dashless) {
  if (!dashless || dashless.length !== 32) return dashless;
  return [
    dashless.slice(0, 8),
    dashless.slice(8, 12),
    dashless.slice(12, 16),
    dashless.slice(16, 20),
    dashless.slice(20),
  ].join('-');
}

/**
 * Generates a deterministic offline UUID for a Minecraft username.
 */
function getOfflineUuid(username) {
  const hash = crypto
    .createHash('md5')
    .update('OfflinePlayer:' + username)
    .digest('hex');
  return formatUuid(hash);
}

/**
 * Resolves a Minecraft username to a UUID using caching and Mojang's API.
 */
async function resolveUsernameToUuid(username) {
  const lowerName = username.toLowerCase();

  // 1. Try memory cache
  if (uuidCache.has(lowerName)) {
    return uuidCache.get(lowerName);
  }

  // 2. Try Redis cache
  const redisKey = `uuid:by-name:${lowerName}`;
  if (redisClient && redisClient.status === 'ready') {
    try {
      const cachedUuid = await redisClient.get(redisKey);
      if (cachedUuid) {
        uuidCache.set(lowerName, cachedUuid);
        // Try to get casing too
        const cachedCasing = await redisClient.get(`name:by-lower:${lowerName}`);
        if (cachedCasing) {
          nameCasingCache.set(lowerName, cachedCasing);
        }
        return cachedUuid;
      }
    } catch {
      // ignore Redis read errors
    }
  }

  // 3. Try MySQL lookup (check player_heads table first, then player_profiles table)
  if (db) {
    try {
      const records = await db
        .select()
        .from(playerHeads)
        .where(sql`LOWER(${playerHeads.username}) = ${lowerName}`);
      if (records.length > 0) {
        const dbUuid = records[0].uuid;
        const dbUsername = records[0].username;
        uuidCache.set(lowerName, dbUuid);
        nameCasingCache.set(lowerName, dbUsername);
        if (redisClient && redisClient.status === 'ready') {
          await redisClient.setex(redisKey, 7 * 24 * 60 * 60, dbUuid);
          await redisClient.setex(`name:by-lower:${lowerName}`, 7 * 24 * 60 * 60, dbUsername);
        }
        return dbUuid;
      }

      // Fallback check in player_profiles table (for active/offline players fetched from /api/players)
      const profiles = await db
        .select()
        .from(playerProfiles)
        .where(sql`LOWER(${playerProfiles.name}) = ${lowerName}`);
      if (profiles.length > 0) {
        const dbUuid = profiles[0].uuid;
        const dbUsername = profiles[0].name;
        uuidCache.set(lowerName, dbUuid);
        nameCasingCache.set(lowerName, dbUsername);
        if (redisClient && redisClient.status === 'ready') {
          await redisClient.setex(redisKey, 7 * 24 * 60 * 60, dbUuid);
          await redisClient.setex(`name:by-lower:${lowerName}`, 7 * 24 * 60 * 60, dbUsername);
        }
        return dbUuid;
      }
    } catch {
      // ignore DB read errors
    }
  }

  // 4. Fetch from Mojang API
  try {
    const response = await axios.get(
      `https://api.mojang.com/users/profiles/minecraft/${username}`,
      {
        timeout: 3000,
      }
    );
    if (response.data && response.data.id) {
      const formatted = formatUuid(response.data.id);
      const correctName = response.data.name;
      uuidCache.set(lowerName, formatted);
      nameCasingCache.set(lowerName, correctName);
      if (redisClient && redisClient.status === 'ready') {
        await redisClient.setex(redisKey, 7 * 24 * 60 * 60, formatted);
        await redisClient.setex(`name:by-lower:${lowerName}`, 7 * 24 * 60 * 60, correctName);
        const cleanUuid = formatted.replace(/-/g, '').toLowerCase();
        await redisClient.setex(`uuid:name:${cleanUuid}`, 7 * 24 * 60 * 60, correctName);
      }
      return formatted;
    }
  } catch (err) {
    logger.warn(`Mojang lookup failed for username ${username}: ${err.message}`);
  }

  throw new Error(`Could not resolve username ${username} to UUID`);
}

/**
 * Fetches a player head from the preferred API (Crafthead), falling back to Minotar if needed.
 * This ensures rendering consistency so that we can accurately detect true skin updates.
 */
async function fetchHeadFromApis(uuid, username) {
  const identifier = uuid || username;

  // 1. Try Crafthead (Primary)
  try {
    const url = `https://crafthead.net/avatar/${identifier}/48`;
    logger.debug(`Fetching player head from Crafthead: ${url}`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 4000,
    });
    if (response.data && response.data.length > 0) {
      return response.data;
    }
  } catch (err) {
    logger.warn(`Failed to fetch head from Crafthead for ${username}/${uuid}: ${err.message}`);
  }

  // 2. Try Minotar (Fallback)
  try {
    const url = `https://minotar.net/avatar/${identifier}/48.png`;
    logger.debug(`Fetching player head from Minotar: ${url}`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 4000,
    });
    if (response.data && response.data.length > 0) {
      return response.data;
    }
  } catch (err) {
    logger.warn(`Failed to fetch head from Minotar for ${username}/${uuid}: ${err.message}`);
  }

  throw new Error(`Failed to fetch player head for ${username}/${uuid} from all APIs`);
}

/**
 * Helper to run multiple async task functions with a concurrency limit.
 */
async function runWithConcurrency(tasks, concurrencyLimit) {
  const results = [];
  const executing = new Set();
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task());
    results.push(p);
    executing.add(p);
    const clean = () => executing.delete(p);
    p.then(clean, clean);
    if (executing.size >= concurrencyLimit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
}

/**
 * Retrieves the head image buffer, checking Redis (30-min cache) -> MySQL (Cache Forever) -> API.
 * Uses in-flight deduplication to prevent multiple upstream API calls for the same username.
 */
async function getHeadBuffer(username) {
  const dedupeKey = username.toLowerCase();

  // If there's already an in-flight request for this username, wait for it
  if (inflightRequests.has(dedupeKey)) {
    logger.debug(`Deduplicating in-flight head request for: ${username}`);
    return inflightRequests.get(dedupeKey);
  }

  const promise = _getHeadBufferInternal(username).finally(() => {
    inflightRequests.delete(dedupeKey);
  });
  inflightRequests.set(dedupeKey, promise);
  return promise;
}

/**
 * Internal implementation — always called through getHeadBuffer() for deduplication.
 */
async function _getHeadBufferInternal(username) {
  const lowerName = username.toLowerCase();
  const redisKey = `cache:head:username:${lowerName}`;

  // Helper to fetch the correct case-sensitive name from cache or Redis
  const getCorrectCasing = async () => {
    if (nameCasingCache.has(lowerName)) {
      return nameCasingCache.get(lowerName);
    }
    if (redisClient && redisClient.status === 'ready') {
      try {
        const cachedCasing = await redisClient.get(`name:by-lower:${lowerName}`);
        if (cachedCasing) {
          nameCasingCache.set(lowerName, cachedCasing);
          return cachedCasing;
        }
      } catch {
        // ignore
      }
    }
    return username;
  };

  // 1. Try Redis cache
  if (redisClient && redisClient.status === 'ready') {
    try {
      const cached = await redisClient.getBuffer(redisKey);
      if (cached) {
        const loggedName = await getCorrectCasing();
        logger.debug(`Redis hit for player head: ${loggedName}`);
        return cached;
      }
    } catch (err) {
      logger.warn(`Redis getBuffer error for player head ${username}: ${err.message}`);
    }
  }

  // 2. Try MySQL cache (case-insensitive to match lowercased frontend requests)
  if (db) {
    try {
      const records = await db
        .select()
        .from(playerHeads)
        .where(sql`LOWER(${playerHeads.username}) = ${lowerName}`);

      if (records.length > 0) {
        const buffer = records[0].pngData;
        const dbUsername = records[0].username;
        nameCasingCache.set(lowerName, dbUsername);
        if (redisClient && redisClient.status === 'ready') {
          try {
            await redisClient.setex(`name:by-lower:${lowerName}`, 7 * 24 * 60 * 60, dbUsername);
          } catch {
            // ignore
          }
        }

        // Save to Redis for 30 minutes
        if (redisClient && redisClient.status === 'ready') {
          try {
            await redisClient.setex(redisKey, 1800, buffer);
          } catch (err) {
            logger.warn(`Failed to cache player head ${dbUsername} in Redis: ${err.message}`);
          }
        }
        logger.debug(`MySQL hit for player head: ${dbUsername}`);
        return buffer;
      }
    } catch (err) {
      logger.error(`MySQL query error for player head ${username}: ${err.message}`);
    }
  }

  let uuid;
  let resolvedName;
  try {
    if (uuidCache.has(lowerName)) {
      uuid = uuidCache.get(lowerName);
      resolvedName = nameCasingCache.get(lowerName) || username;
    } else {
      uuid = await resolveUsernameToUuid(username);
      resolvedName = nameCasingCache.get(lowerName) || username;
    }
  } catch (err) {
    logger.warn(`Failed to resolve UUID for ${username}: ${err.message}. Using offline-mode UUID.`);
    uuid = getOfflineUuid(username);
    resolvedName = username;
  }

  try {
    const buffer = await fetchHeadFromApis(uuid, resolvedName);

    // Save in MySQL (Cache Forever) using correctly cased username
    if (db) {
      await db
        .insert(playerHeads)
        .values({
          uuid,
          username: resolvedName,
          pngData: buffer,
          updatedAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            username: resolvedName,
            pngData: buffer,
            updatedAt: new Date(),
          },
        });
    }

    // Save in Redis for 30 minutes
    if (redisClient && redisClient.status === 'ready') {
      try {
        await redisClient.setex(redisKey, 1800, buffer);
      } catch (err) {
        logger.warn(`Failed to cache new player head ${resolvedName} in Redis: ${err.message}`);
      }
    }

    logger.debug(`Seeded player head for ${resolvedName} (UUID: ${uuid})`);
    return buffer;
  } catch (err) {
    logger.error(`Failed to download and save head for ${username}: ${err.message}`);
    return null;
  }
}

/**
 * Legacy downloadHead wrapper. Downloads skin and returns true/false.
 */
async function downloadHead(username) {
  try {
    const buffer = await getHeadBuffer(username);
    return !!buffer;
  } catch {
    return false;
  }
}

/**
 * Check schedule and seed player heads for mayors and kings.
 */
async function checkScheduleAndRunBatch(townyData) {
  if (!townyData || !db) return;

  try {
    const players = new Map();
    if (townyData.towns) {
      townyData.towns.forEach((t) => {
        if (t.mayor && t.mayor.name && t.mayor.uuid) {
          players.set(t.mayor.uuid, t.mayor.name);
        }
      });
    }
    if (townyData.nations) {
      townyData.nations.forEach((n) => {
        if (n.king && n.king.name && n.king.uuid) {
          players.set(n.king.uuid, n.king.name);
        }
      });
    }

    if (players.size === 0) return;

    // Query existing UUIDs to prevent unnecessary downloads
    const existing = await db.select({ uuid: playerHeads.uuid }).from(playerHeads);
    const existingUuids = new Set(existing.map((r) => r.uuid));

    const playersToSeed = [];
    for (const [uuid, username] of players.entries()) {
      if (!existingUuids.has(uuid)) {
        playersToSeed.push({ uuid, username });
      }
    }

    if (playersToSeed.length > 0) {
      logger.system(`Seeding ${playersToSeed.length} new player heads to database...`);
      const tasks = playersToSeed.map((player) => async () => {
        try {
          const buffer = await fetchHeadFromApis(player.uuid, player.username);
          await db
            .insert(playerHeads)
            .values({
              uuid: player.uuid,
              username: player.username,
              pngData: buffer,
              updatedAt: new Date(),
            })
            .onDuplicateKeyUpdate({
              set: {
                username: player.username,
                pngData: buffer,
                updatedAt: new Date(),
              },
            });
          logger.info(`Successfully seeded head for ${player.username} (UUID: ${player.uuid})`);
        } catch (err) {
          logger.warn(`Failed to seed head for ${player.username}: ${err.message}`);
        }
      });
      await runWithConcurrency(tasks, 5);
    }
  } catch (err) {
    logger.error(`Error in checkScheduleAndRunBatch: ${err.message}`);
  }
}

/**
 * Concurrency update job run every 6 hours.
 * Fetches player heads using prioritized consistency lookup to check for changes.
 */
async function updateAllHeadsConcurrencyJob() {
  if (!db) {
    logger.warn('Database is not configured. Skipping player heads update job.');
    return;
  }

  logger.system('Executing 6-hour player heads concurrent update job...');

  try {
    const records = await db.select().from(playerHeads);
    if (records.length === 0) {
      logger.info('No player heads found in MySQL database to update.');
      return;
    }

    logger.info(`Found ${records.length} player heads to check. Starting updates concurrently...`);

    const tasks = records.map((record) => async () => {
      const { uuid, username, pngData: oldPng } = record;

      try {
        const newPng = await fetchHeadFromApis(uuid, username);
        const hasChanged = !oldPng || Buffer.compare(oldPng, newPng) !== 0;

        if (hasChanged) {
          // Update MySQL
          await db
            .update(playerHeads)
            .set({ pngData: newPng, updatedAt: new Date() })
            .where(eq(playerHeads.uuid, uuid));

          // Evict Redis Cache
          if (redisClient && redisClient.status === 'ready') {
            const redisKey = `cache:head:username:${username.toLowerCase()}`;
            await redisClient.del(redisKey);
          }

          logger.info(`Updated player head for ${username} (UUID: ${uuid}) - skin updated.`);
        }
      } catch (err) {
        logger.warn(`Failed to update player head for ${username} (UUID: ${uuid}): ${err.message}`);
      }
    });

    // Run up to 5 concurrent updates to respect API rate limits
    await runWithConcurrency(tasks, 5);
    logger.success('Player heads 6-hour concurrent update job completed.');
  } catch (err) {
    logger.error(`Error in updateAllHeadsConcurrencyJob: ${err.message}`);
  }
}

// Scheduled interval instance
let headsSyncInterval = null;

/**
 * Initializes the scheduling for player heads updates.
 */
function startHeadsSync(_client) {
  logger.info('Starting Player Heads 6-hour update scheduler...');

  // Run once on startup in background
  updateAllHeadsConcurrencyJob().catch((err) => {
    logger.error(`Initial player heads update failed: ${err.message}`);
  });

  if (headsSyncInterval) clearInterval(headsSyncInterval);
  headsSyncInterval = setInterval(
    () => {
      updateAllHeadsConcurrencyJob().catch((err) => {
        logger.error(`Scheduled player heads update failed: ${err.message}`);
      });
    },
    6 * 60 * 60 * 1000
  ); // 6 hours
}

module.exports = {
  headsDir,
  downloadHead,
  checkScheduleAndRunBatch,
  updateAllHeadsBatch: updateAllHeadsConcurrencyJob,
  getHeadBuffer,
  startHeadsSync,
  resolveUsernameToUuid,
};
