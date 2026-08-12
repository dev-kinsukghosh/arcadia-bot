const { db } = require('./db.js');
const { nguildData } = require('../db/schema.js');
const { eq } = require('drizzle-orm');
const logger = require('./logger.js');

// In-memory cache for guild currencies: guildId -> currency (string)
const guildCurrencyCache = new Map();

/**
 * Gets the configured currency for a guild.
 * Uses the memory cache for instant lookup, falling back to database query.
 * @param {string} guildId - The Discord guild ID.
 * @returns {Promise<string>} - The currency ID (e.g. 'arc').
 */
async function getGuildCurrency(guildId) {
  if (!guildId) return 'arc';

  const cached = guildCurrencyCache.get(guildId);
  if (cached) {
    return cached;
  }

  if (!db) return 'arc';

  try {
    const configRow = await db.select().from(nguildData).where(eq(nguildData.guildId, guildId));

    const currency =
      configRow.length > 0 && configRow[0].currency ? configRow[0].currency.toLowerCase() : 'arc';

    guildCurrencyCache.set(guildId, currency);
    return currency;
  } catch (error) {
    logger.error(`Failed to fetch guild currency config for ${guildId}:`, error);
    return 'arc';
  }
}

/**
 * Updates the configured currency for a guild in both cache and database.
 * @param {string} guildId - The Discord guild ID.
 * @param {string} currencyId - The currency ID to set.
 * @returns {Promise<void>}
 */
async function setGuildCurrency(guildId, currencyId) {
  if (!guildId) return;

  const cleanCurrencyId = currencyId.toLowerCase().trim();

  // Update memory cache
  guildCurrencyCache.set(guildId, cleanCurrencyId);

  if (!db) return;

  try {
    // Insert or update in database
    const existing = await db.select().from(nguildData).where(eq(nguildData.guildId, guildId));

    if (existing.length > 0) {
      await db
        .update(nguildData)
        .set({ currency: cleanCurrencyId })
        .where(eq(nguildData.guildId, guildId));
    } else {
      await db.insert(nguildData).values({
        guildId,
        currency: cleanCurrencyId,
      });
    }
  } catch (error) {
    logger.error(`Failed to update guild currency config in database for ${guildId}:`, error);
    throw error;
  }
}

/**
 * Warm up the guild config cache by loading all rows from the database.
 * This is called once at bot startup to prevent any initial query latencies.
 */
async function loadGuildConfigs() {
  if (!db) return;
  try {
    const records = await db.select().from(nguildData);
    guildCurrencyCache.clear();
    for (const record of records) {
      if (record.guildId && record.currency) {
        guildCurrencyCache.set(record.guildId, record.currency.toLowerCase());
      }
    }
    logger.info(`Loaded ${guildCurrencyCache.size} guild currency configuration(s) into cache.`);
  } catch (error) {
    logger.error('Failed to load guild configs into cache:', error);
  }
}

module.exports = {
  getGuildCurrency,
  setGuildCurrency,
  loadGuildConfigs,
};
