const { arcadiaApi } = require('../utils/apiClient.js');
const logger = require('../utils/logger.js');
const pc = require('picocolors');
const redis = require('../utils/redis.js');
const { db } = require('../utils/db.js');
const { currencies, currencyHistory, internal } = require('../db/schema.js');
const { and, eq, lt } = require('drizzle-orm');

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const HISTORY_RETENTION_DAYS = 120;
const REDIS_KEY = 'currencies:data';
const REDIS_UPDATED_KEY = 'currencies:last_updated_at';

/**
 * In-memory cache for currencies data
 * @type {{ updatedAt: number|null, currencies: Array<Object> }}
 */
let currencyCache = {
  updatedAt: null,
  currencies: [],
};

let syncInterval = null;
let discordClient = null;

/**
 * Get today's date string in UTC (YYYY-MM-DD)
 * @returns {string}
 */
function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Increment scan count in internal table with daily reset (stored as count|YYYY-MM-DD)
 * @returns {Promise<number>} The new scan count for today
 */
async function incrementScanCount() {
  if (!db) return 1;

  const today = getTodayUTC();
  const scanKey = 'currency_scans';

  try {
    const existing = await db.select().from(internal).where(eq(internal.id, scanKey));

    if (existing.length > 0) {
      const valStr = existing[0].value;
      const [countPart, datePart] = valStr.split('|');
      let newCount = 1;

      if (datePart === today) {
        newCount = (parseInt(countPart, 10) || 0) + 1;
      }

      await db
        .update(internal)
        .set({ value: `${newCount}|${today}` })
        .where(eq(internal.id, scanKey));

      return newCount;
    } else {
      await db.insert(internal).values({ id: scanKey, value: `1|${today}` });
      return 1;
    }
  } catch (err) {
    logger.warn(`Failed to update scan count: ${err.message}`);
    return 1;
  }
}

/**
 * Upsert all currencies into the currencies table (latest state)
 * @param {Array<Object>} currencyList - Array of currency objects from API
 */
async function upsertCurrencies(currencyList) {
  if (!db) return;

  const upsertPromises = currencyList.map(async (c) => {
    if (!c.id) return;

    try {
      const existing = await db.select().from(currencies).where(eq(currencies.id, c.id));

      if (existing.length > 0) {
        await db
          .update(currencies)
          .set({
            name: c.name || c.id,
            standardItem: c.standardItem || 'UNKNOWN',
            nation: c.nation || 'Unknown',
            creatorUuid: c.creator || '',
            arcPerUnitBase: String(parseFloat(c.arcPerUnitBase) || 0),
            arcPerUnitLive: String(parseFloat(c.arcPerUnitLive) || 0),
          })
          .where(eq(currencies.id, c.id));
      } else {
        await db.insert(currencies).values({
          id: c.id,
          name: c.name || c.id,
          standardItem: c.standardItem || 'UNKNOWN',
          nation: c.nation || 'Unknown',
          creatorUuid: c.creator || '',
          arcPerUnitBase: String(parseFloat(c.arcPerUnitBase) || 0),
          arcPerUnitLive: String(parseFloat(c.arcPerUnitLive) || 0),
        });
      }
    } catch (err) {
      logger.error(`Failed to upsert currency ${c.id}: ${err.message}`);
    }
  });

  await Promise.all(upsertPromises);
}

/**
 * Record daily currency history — running average + final scan values
 * Uses incremental average formula: new_avg = old_avg + (value - old_avg) / new_count
 * @param {Array<Object>} currencyList - Array of currency objects from API
 * @param {number} scanCount - Today's scan count (from currency_scans)
 */
async function recordDailyHistory(currencyList, scanCount) {
  if (!db) return;

  const today = getTodayUTC();

  const upsertPromises = currencyList.map(async (c) => {
    if (!c.id) return;

    const liveVal = parseFloat(c.arcPerUnitLive) || 0;
    const baseVal = parseFloat(c.arcPerUnitBase) || 0;

    try {
      const existing = await db
        .select()
        .from(currencyHistory)
        .where(and(eq(currencyHistory.currencyId, c.id), eq(currencyHistory.date, today)));

      if (existing.length > 0) {
        const row = existing[0];
        const oldAvgLive = parseFloat(row.avgArcPerUnitLive);
        const oldAvgBase = parseFloat(row.avgArcPerUnitBase);

        // Running average: new_avg = old_avg + (value - old_avg) / scan_count
        const newAvgLive = oldAvgLive + (liveVal - oldAvgLive) / scanCount;
        const newAvgBase = oldAvgBase + (baseVal - oldAvgBase) / scanCount;

        await db
          .update(currencyHistory)
          .set({
            arcPerUnitBase: String(baseVal),
            arcPerUnitLive: String(liveVal),
            avgArcPerUnitBase: String(newAvgBase),
            avgArcPerUnitLive: String(newAvgLive),
          })
          .where(and(eq(currencyHistory.currencyId, c.id), eq(currencyHistory.date, today)));
      } else {
        await db.insert(currencyHistory).values({
          currencyId: c.id,
          date: today,
          arcPerUnitBase: String(baseVal),
          arcPerUnitLive: String(liveVal),
          avgArcPerUnitBase: String(baseVal),
          avgArcPerUnitLive: String(liveVal),
        });
      }
    } catch (err) {
      logger.error(`Failed to record history for currency ${c.id}: ${err.message}`);
    }
  });

  await Promise.all(upsertPromises);
}

/**
 * Prune currency history + scan rows older than 120 days in batches of 5
 */
async function pruneOldHistory() {
  if (!db) return;

  try {
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - HISTORY_RETENTION_DAYS);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Prune currency_history in batches of 5
    let totalPruned = 0;
    let batchDeleted;

    do {
      const staleRows = await db
        .select({ currencyId: currencyHistory.currencyId, date: currencyHistory.date })
        .from(currencyHistory)
        .where(lt(currencyHistory.date, cutoffStr))
        .limit(5);

      if (staleRows.length === 0) break;

      await Promise.all(
        staleRows.map((row) =>
          db
            .delete(currencyHistory)
            .where(
              and(
                eq(currencyHistory.currencyId, row.currencyId),
                eq(currencyHistory.date, row.date)
              )
            )
        )
      );

      batchDeleted = staleRows.length;
      totalPruned += batchDeleted;
    } while (batchDeleted === 5);

    // No need to prune internal table as it only holds the daily counter row

    if (totalPruned > 0) {
      logger.info(
        `Pruned ${pc.bold(pc.yellow(totalPruned))} currency history rows older than ${HISTORY_RETENTION_DAYS} days.`
      );
    }
  } catch (err) {
    logger.warn(`Failed to prune old currency history: ${err.message}`);
  }
}

/**
 * Fetch currencies data from the ArcadiaMC API, cache it, and record daily history
 */
async function syncCurrencies() {
  logger.info('Starting currencies synchronization...');

  try {
    const data = await arcadiaApi.getCurrencies();

    if (!data || !Array.isArray(data.currencies)) {
      logger.error('Invalid currencies API response format (expected currencies array).');
      return;
    }

    // Update in-memory cache
    currencyCache = {
      updatedAt: data.updatedAt || null,
      currencies: data.currencies,
    };

    // Persist to Redis for cross-restart availability
    if (redis && redis.status === 'ready') {
      try {
        await redis.set(REDIS_KEY, JSON.stringify(currencyCache.currencies));
        if (currencyCache.updatedAt) {
          await redis.set(REDIS_UPDATED_KEY, String(currencyCache.updatedAt));
        }
      } catch (err) {
        logger.warn(`Failed to persist currencies to Redis: ${err.message}`);
      }
    }

    // 1. Increment today's scan count (1 row update)
    const scanCount = await incrementScanCount();

    // 2. Upsert currencies table (latest state)
    await upsertCurrencies(data.currencies);

    // 3. Record daily history (avg + final values)
    await recordDailyHistory(data.currencies, scanCount);

    // 4. Prune rows older than 120 days
    await pruneOldHistory();

    // 5. Download missing standardItem icons and upload as Discord emojis
    const standardItems = [...new Set(data.currencies.map((c) => c.standardItem).filter(Boolean))];
    if (standardItems.length > 0) {
      const { downloadMissingIcons } = require('../utils/iconDownloader.js');
      downloadMissingIcons(standardItems, discordClient);
    }

    logger.success(
      `Currencies sync complete: ${pc.bold(pc.green(currencyCache.currencies.length))} currencies cached & history recorded (scan #${pc.bold(pc.cyan(scanCount))}).`
    );
  } catch (error) {
    const { reportError } = require('../utils/errorHandler.js');
    await reportError(error, 'Currency Sync Service');
  }
}

/**
 * Retrieve the cached currencies data
 * @returns {{ updatedAt: number|null, currencies: Array<Object> }}
 */
function getCurrencyCache() {
  return currencyCache;
}

/**
 * Look up a single currency by its id (e.g. "ducat")
 * @param {string} id - Currency ID (case-insensitive)
 * @returns {Object|null}
 */
function getCurrencyById(id) {
  if (!id) return null;
  const lower = id.toLowerCase();
  return currencyCache.currencies.find((c) => c.id?.toLowerCase() === lower) || null;
}

/**
 * Look up currencies belonging to a specific nation
 * @param {string} nation - Nation name (case-insensitive)
 * @returns {Array<Object>}
 */
function getCurrenciesByNation(nation) {
  if (!nation) return [];
  const lower = nation.toLowerCase().replace(/ /g, '_');
  return currencyCache.currencies.filter((c) => c.nation?.toLowerCase() === lower);
}

/**
 * Start the currencies sync worker
 * - Fetches immediately on startup
 * - Repeats every 30 minutes
 * @param {Client} client - The Discord Client instance
 */
function startCurrencySync(client) {
  discordClient = client || null;
  logger.info('Initializing Currency Sync scheduler (30-minute interval)...');

  // Run once immediately
  syncCurrencies();

  // Recurring every 30 minutes
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(async () => {
    logger.info('Executing scheduled currency sync...');
    await syncCurrencies();
  }, SYNC_INTERVAL_MS);
}

module.exports = {
  syncCurrencies,
  startCurrencySync,
  getCurrencyCache,
  getCurrencyById,
  getCurrenciesByNation,
};
