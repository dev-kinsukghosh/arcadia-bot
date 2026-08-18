const { arcadiaApi } = require('../utils/apiClient.js');
const logger = require('../utils/logger.js');
const pc = require('picocolors');
const redis = require('../utils/redis.js');
const { db } = require('../utils/db.js');
const { currencies, currencyHistory, internal } = require('../db/schema.js');
const { and, eq, lt, notInArray } = require('drizzle-orm');
const axios = require('axios');

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
    logger.warn(`Failed Mojang profile lookup for clean UUID ${cleanUuid}: ${err.message}`);
  }

  return 'Unknown';
}

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
            creatorName: c.creatorName || 'Unknown',
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
          creatorName: c.creatorName || 'Unknown',
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
      return false;
    }

    // Resolve creator usernames in parallel
    await Promise.all(
      data.currencies.map(async (c) => {
        if (c.creator) {
          c.creatorName = await resolveUuidToUsername(c.creator);
        } else {
          c.creatorName = 'Unknown';
        }
      })
    );

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

    // Previous values tracking & Redis caching
    if (redis && redis.status === 'ready') {
      try {
        const lastRatesRaw = await redis.get('currencies:last_rates');
        const lastRates = lastRatesRaw ? JSON.parse(lastRatesRaw) : {};

        const previousRatesRaw = await redis.get('currencies:previous_rates');
        const previousRates = previousRatesRaw ? JSON.parse(previousRatesRaw) : {};

        // Query DB as fallback for missing items
        const dbCurrencies = db ? await db.select().from(currencies) : [];
        const dbMap = {};
        for (const curr of dbCurrencies) {
          dbMap[curr.id] = parseFloat(curr.arcPerUnitLive) || 0;
        }

        const newLastRates = {};
        for (const c of data.currencies) {
          if (!c.id) continue;

          const currentLive = parseFloat(c.arcPerUnitLive) || 0;
          newLastRates[c.id] = currentLive;

          // Determine previous value
          if (lastRates[c.id] !== undefined) {
            previousRates[c.id] = lastRates[c.id];
          } else if (dbMap[c.id] !== undefined) {
            previousRates[c.id] = dbMap[c.id];
          } else {
            // Newly created currency: assume previous value 0
            previousRates[c.id] = 0;
          }
        }

        // Cache both back to Redis
        await redis.set('currencies:previous_rates', JSON.stringify(previousRates));
        await redis.set('currencies:last_rates', JSON.stringify(newLastRates));
      } catch (err) {
        logger.warn(`Failed to track and cache previous rates in Redis: ${err.message}`);
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

    // 4.5. Prune deleted currencies from database
    const activeCurrencyIds = data.currencies.map((c) => c.id).filter(Boolean);
    if (activeCurrencyIds.length > 0) {
      // Find the names or IDs of the deleted currencies to log them
      const obsoleteCurrencies = await db
        .select({ id: currencies.id, name: currencies.name })
        .from(currencies)
        .where(notInArray(currencies.id, activeCurrencyIds));

      const deleteCurrenciesRes = await db
        .delete(currencies)
        .where(notInArray(currencies.id, activeCurrencyIds));
      const deletedCurrenciesCount = deleteCurrenciesRes[0]?.affectedRows || 0;

      const deleteHistoryRes = await db
        .delete(currencyHistory)
        .where(notInArray(currencyHistory.currencyId, activeCurrencyIds));
      const deletedHistoryCount = deleteHistoryRes[0]?.affectedRows || 0;

      if (deletedCurrenciesCount > 0 || deletedHistoryCount > 0) {
        const deletedNames =
          obsoleteCurrencies.length > 0
            ? obsoleteCurrencies.map((c) => `${c.name} (${c.id})`).join(', ')
            : 'None';
        logger.info(
          `Pruned ${pc.bold(pc.cyan(deletedCurrenciesCount))} deleted currencies [${pc.cyan(deletedNames)}] and ${pc.bold(pc.cyan(deletedHistoryCount))} historical rate records from DB.`
        );
      }
    } else {
      logger.warn(
        'Fetched 0 active currencies from API. Skipping pruning to prevent accidental database wipe.'
      );
    }

    // 5. Download missing standardItem icons and upload as Discord emojis
    const standardItems = [...new Set(data.currencies.map((c) => c.standardItem).filter(Boolean))];
    if (standardItems.length > 0) {
      const { downloadMissingIcons } = require('../utils/iconDownloader.js');
      downloadMissingIcons(standardItems, discordClient);
    }

    logger.success(
      `Currencies sync complete: ${pc.bold(pc.green(currencyCache.currencies.length))} currencies cached & history recorded (scan #${pc.bold(pc.cyan(scanCount))}).`
    );

    // Emit event for real-time WebSocket broadcast
    const eventEmitter = require('../utils/emitter.js');
    eventEmitter.emit('currencies:updated', currencyCache.currencies);
    return true;
  } catch (error) {
    const { reportError } = require('../utils/errorHandler.js');
    await reportError(error, 'Currency Sync Service');
    return false;
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
let syncTimeout = null;

function scheduleNextCurrencySync(delayMs) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    logger.info('Executing scheduled currency sync...');
    const success = await syncCurrencies();
    if (success) {
      scheduleNextCurrencySync(SYNC_INTERVAL_MS);
    } else {
      logger.warn(`Currency sync failed. Retrying in ${pc.yellow('10 minutes')}...`);
      scheduleNextCurrencySync(10 * 60 * 1000);
    }
  }, delayMs);
}

function startCurrencySync(client) {
  discordClient = client || null;
  logger.info(`Initializing Currency Sync scheduler (${pc.cyan('30-minute interval')})...`);

  (async () => {
    const success = await syncCurrencies();
    if (success) {
      scheduleNextCurrencySync(SYNC_INTERVAL_MS);
    } else {
      logger.warn(`Initial currency sync failed. Retrying in ${pc.yellow('10 minutes')}...`);
      scheduleNextCurrencySync(10 * 60 * 1000);
    }
  })();
}

module.exports = {
  syncCurrencies,
  startCurrencySync,
  getCurrencyCache,
  getCurrencyById,
  getCurrenciesByNation,
};
