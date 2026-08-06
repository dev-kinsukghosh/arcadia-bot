const { arcadiaApi } = require('../utils/apiClient.js');
const logger = require('../utils/logger.js');
const pc = require('picocolors');

const redis = require('../utils/redis.js');
const { db } = require('../utils/db.js');
const { townyHistory } = require('../db/schema.js');
const { and, eq, lt } = require('drizzle-orm');

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const HISTORY_RETENTION_DAYS = 120;
const REDIS_KEY = 'cache:towny';

let syncInterval = null;

/**
 * Get today's date string in UTC (YYYY-MM-DD)
 * @returns {string}
 */
function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Syncs towny data:
 * - Fetches from Arcadia API
 * - Saves snapshot to Redis
 * - Upserts daily history records for each town and nation
 * - Prunes old history records
 */
async function syncTowny() {
  if (!db) {
    logger.warn(`${pc.yellow('Database is not active.')} Skipping Towny sync.`);
    return;
  }

  logger.info(`Starting ${pc.cyan('Towny')} synchronization and history recording...`);
  try {
    const data = await arcadiaApi.getTowny();
    if (!data) {
      logger.error(`${pc.red('Failed')} to retrieve Towny data from API.`);
      return;
    }

    // 1. Save to Redis cache for dashboard webserver use
    if (redis && redis.status === 'ready') {
      try {
        await redis.setex(REDIS_KEY, 1800, JSON.stringify(data)); // 30 minutes TTL
        logger.debug(`Cached Towny data in ${pc.red('Redis')}.`);
      } catch (err) {
        logger.warn(`Failed to save Towny data to ${pc.red('Redis')}: ${pc.yellow(err.message)}`);
      }
    }

    // 2. Trigger heads background check if any mayors/kings need skin download
    try {
      const { checkScheduleAndRunBatch } = require('./headManager.js');
      checkScheduleAndRunBatch(data);
    } catch (err) {
      logger.warn(`Failed to trigger headManager seeding: ${pc.yellow(err.message)}`);
    }

    const today = getTodayUTC();

    // 3. Upsert Town History snapshots
    const towns = Array.isArray(data.towns) ? data.towns : [];
    const townPromises = towns.map(async (t) => {
      if (!t || !t.name) return;

      const nameLower = t.name.toLowerCase();
      const residents = t.residents || 0;
      const chunks = t.claims?.claimedChunks || 0;

      try {
        await db
          .insert(townyHistory)
          .values({
            name: nameLower,
            type: 'town',
            date: today,
            residents,
            chunks,
            townsCount: 0,
          })
          .onDuplicateKeyUpdate({
            set: {
              residents,
              chunks,
              updatedAt: new Date(),
            },
          });
      } catch (err) {
        logger.error(
          `Failed to record history for town ${pc.bold(t.name)}: ${pc.red(err.message)}`
        );
      }
    });

    // 4. Upsert Nation History snapshots
    const nations = Array.isArray(data.nations) ? data.nations : [];
    const nationPromises = nations.map(async (n) => {
      if (!n || !n.name) return;

      const nameLower = n.name.toLowerCase();
      const residents = n.residents || 0;
      const chunks = n.chunks || 0; // Total claimed chunks in the nation
      const townsCount = n.towns || 0;

      try {
        await db
          .insert(townyHistory)
          .values({
            name: nameLower,
            type: 'nation',
            date: today,
            residents,
            chunks,
            townsCount,
          })
          .onDuplicateKeyUpdate({
            set: {
              residents,
              chunks,
              townsCount,
              updatedAt: new Date(),
            },
          });
      } catch (err) {
        logger.error(
          `Failed to record history for nation ${pc.bold(n.name)}: ${pc.red(err.message)}`
        );
      }
    });

    await Promise.all([...townPromises, ...nationPromises]);
    logger.success(
      `Successfully updated daily Towny history for ${pc.bold(pc.green(towns.length))} towns and ${pc.bold(pc.green(nations.length))} nations.`
    );

    // 5. Prune history rows older than 120 days
    await pruneOldTownyHistory();
  } catch (error) {
    const { reportError } = require('../utils/errorHandler.js');
    await reportError(error, 'Towny Sync Service');
  }
}

/**
 * Delete records older than 120 days in batches
 */
async function pruneOldTownyHistory() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - HISTORY_RETENTION_DAYS);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    let totalPruned = 0;
    let staleRows;

    do {
      staleRows = await db
        .select({ name: townyHistory.name, type: townyHistory.type, date: townyHistory.date })
        .from(townyHistory)
        .where(lt(townyHistory.date, cutoffStr))
        .limit(5);

      if (staleRows.length === 0) break;

      await Promise.all(
        staleRows.map((row) =>
          db
            .delete(townyHistory)
            .where(
              and(
                eq(townyHistory.name, row.name),
                eq(townyHistory.type, row.type),
                eq(townyHistory.date, row.date)
              )
            )
        )
      );

      totalPruned += staleRows.length;
    } while (staleRows.length > 0);

    if (totalPruned > 0) {
      logger.info(
        `Pruned ${pc.bold(pc.cyan(totalPruned))} expired Towny history records (older than ${pc.bold(HISTORY_RETENTION_DAYS)} days).`
      );
    }
  } catch (err) {
    logger.warn(`Failed to prune old Towny history records: ${pc.yellow(err.message)}`);
  }
}

/**
 * Start the Towny sync scheduler
 * @param {Client} client - The Discord Client instance
 */
function startTownySync(_client) {
  logger.info(`Initializing Towny Sync scheduler (${pc.cyan('30-minute interval')})...`);

  // Run once immediately
  syncTowny();

  // Run every 30 minutes
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(async () => {
    logger.info(`Executing scheduled ${pc.cyan('Towny')} sync...`);
    await syncTowny();
  }, SYNC_INTERVAL_MS);
}

module.exports = {
  syncTowny,
  startTownySync,
};
