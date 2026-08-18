const { arcadiaApi } = require('../utils/apiClient.js');
const logger = require('../utils/logger.js');
const pc = require('picocolors');

const redis = require('../utils/redis.js');
const { db } = require('../utils/db.js');
const { townyHistory } = require('../db/schema.js');
const { and, eq, lt, notInArray, sql } = require('drizzle-orm');

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const HISTORY_RETENTION_DAYS = 120;
const REDIS_KEY = 'cache:towny';

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
    return false;
  }

  logger.info(`Starting ${pc.cyan('Towny')} synchronization and history recording...`);
  try {
    const data = await arcadiaApi.getTowny();
    if (!data) {
      logger.error(`${pc.red('Failed')} to retrieve Towny data from API.`);
      return false;
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

    // 3. Bulk Upsert Town History snapshots
    const towns = Array.isArray(data.towns) ? data.towns : [];
    if (towns.length > 0) {
      const townRows = towns
        .filter((t) => t && t.name)
        .map((t) => ({
          name: t.name.toLowerCase(),
          type: 'town',
          date: today,
          residents: t.residents || 0,
          chunks: t.claims?.claimedChunks || 0,
          townsCount: 0,
        }));

      if (townRows.length > 0) {
        try {
          await db
            .insert(townyHistory)
            .values(townRows)
            .onDuplicateKeyUpdate({
              set: {
                residents: sql`VALUES(\`residents\`)`,
                chunks: sql`VALUES(\`chunks\`)`,
                updatedAt: sql`CURRENT_TIMESTAMP`,
              },
            });
        } catch (err) {
          logger.error(`Failed to record bulk history for towns: ${pc.red(err.message)}`, err);
        }
      }
    }

    // 4. Bulk Upsert Nation History snapshots
    const nations = Array.isArray(data.nations) ? data.nations : [];
    if (nations.length > 0) {
      const nationRows = nations
        .filter((n) => n && n.name)
        .map((n) => ({
          name: n.name.toLowerCase(),
          type: 'nation',
          date: today,
          residents: n.residents || 0,
          chunks: n.chunks || 0,
          townsCount: n.towns || 0,
        }));

      if (nationRows.length > 0) {
        try {
          await db
            .insert(townyHistory)
            .values(nationRows)
            .onDuplicateKeyUpdate({
              set: {
                residents: sql`VALUES(\`residents\`)`,
                chunks: sql`VALUES(\`chunks\`)`,
                townsCount: sql`VALUES(\`towns_count\`)`,
                updatedAt: sql`CURRENT_TIMESTAMP`,
              },
            });
        } catch (err) {
          logger.error(`Failed to record bulk history for nations: ${pc.red(err.message)}`, err);
        }
      }
    }
    logger.success(
      `Successfully updated daily Towny history for ${pc.bold(pc.green(towns.length))} towns and ${pc.bold(pc.green(nations.length))} nations.`
    );

    // 5. Prune history rows older than 120 days
    await pruneOldTownyHistory();

    // 6. Prune history rows for deleted towns and nations
    await pruneDeletedTownsNations(towns, nations);
    return true;
  } catch (error) {
    const { reportError } = require('../utils/errorHandler.js');
    await reportError(error, 'Towny Sync Service');
    return false;
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
 * Delete records for towns and nations that no longer exist in the active lists
 * @param {Array} currentTowns
 * @param {Array} currentNations
 */
async function pruneDeletedTownsNations(currentTowns, currentNations) {
  try {
    const activeTowns = currentTowns.map((t) => t?.name?.toLowerCase()).filter(Boolean);
    const activeNations = currentNations.map((n) => n?.name?.toLowerCase()).filter(Boolean);

    let deletedTownsCount = 0;
    let deletedNationsCount = 0;
    let obsoleteTowns = [];
    let obsoleteNations = [];

    // Safety guard: only prune if we received a non-empty active list to prevent accidental wipes on API failures
    if (activeTowns.length > 0) {
      obsoleteTowns = await db
        .select({ name: townyHistory.name })
        .from(townyHistory)
        .where(and(eq(townyHistory.type, 'town'), notInArray(townyHistory.name, activeTowns)))
        .groupBy(townyHistory.name);

      const deleteTownsRes = await db
        .delete(townyHistory)
        .where(and(eq(townyHistory.type, 'town'), notInArray(townyHistory.name, activeTowns)));
      deletedTownsCount = deleteTownsRes[0]?.affectedRows || 0;
    }

    if (activeNations.length > 0) {
      obsoleteNations = await db
        .select({ name: townyHistory.name })
        .from(townyHistory)
        .where(and(eq(townyHistory.type, 'nation'), notInArray(townyHistory.name, activeNations)))
        .groupBy(townyHistory.name);

      const deleteNationsRes = await db
        .delete(townyHistory)
        .where(and(eq(townyHistory.type, 'nation'), notInArray(townyHistory.name, activeNations)));
      deletedNationsCount = deleteNationsRes[0]?.affectedRows || 0;
    }

    if (deletedTownsCount > 0 || deletedNationsCount > 0) {
      const townNames =
        obsoleteTowns.length > 0 ? obsoleteTowns.map((t) => t.name).join(', ') : 'None';
      const nationNames =
        obsoleteNations.length > 0 ? obsoleteNations.map((n) => n.name).join(', ') : 'None';
      logger.info(
        `Pruned historical records for ${pc.bold(pc.cyan(deletedTownsCount))} deleted towns [${pc.cyan(townNames)}] and ${pc.bold(pc.cyan(deletedNationsCount))} deleted nations [${pc.cyan(nationNames)}].`
      );
    }
  } catch (err) {
    logger.warn(`Failed to prune deleted towns/nations: ${pc.yellow(err.message)}`);
  }
}

let syncTimeout = null;

function scheduleNextSync(delayMs) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    logger.info(`Executing scheduled ${pc.cyan('Towny')} sync...`);
    const success = await syncTowny();
    if (success) {
      scheduleNextSync(SYNC_INTERVAL_MS);
    } else {
      logger.warn(`Towny sync failed. Retrying in ${pc.yellow('10 minutes')}...`);
      scheduleNextSync(10 * 60 * 1000);
    }
  }, delayMs);
}

/**
 * Start the Towny sync scheduler
 * @param {Client} client - The Discord Client instance
 */
function startTownySync(_client) {
  logger.info(`Initializing Towny Sync scheduler (${pc.cyan('30-minute interval')})...`);

  // Run once immediately and schedule subsequent runs based on success
  (async () => {
    const success = await syncTowny();
    if (success) {
      scheduleNextSync(SYNC_INTERVAL_MS);
    } else {
      logger.warn(`Initial Towny sync failed. Retrying in ${pc.yellow('10 minutes')}...`);
      scheduleNextSync(10 * 60 * 1000);
    }
  })();
}

module.exports = {
  syncTowny,
  startTownySync,
};
