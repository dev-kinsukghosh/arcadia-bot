const { db } = require('./db.js');
const { guildOptions } = require('../db/schema.js');
const { eq, and } = require('drizzle-orm');
const logger = require('./logger.js');

// In-memory cache for guild options: guildId -> Set of enabled option IDs
const guildOptionsCache = new Map();

const POKEMON_COMMANDS = ['pokemon'];

/**
 * Warm up the guild options cache by loading all rows from the database.
 * This is called once at bot startup to prevent any initial query latencies.
 */
async function loadGuildOptions() {
  if (!db) return;
  try {
    const records = await db.select().from(guildOptions);
    guildOptionsCache.clear();
    for (const record of records) {
      if (record.guildId && record.optionId) {
        const guildId = record.guildId;
        const optionId = record.optionId.toLowerCase();
        if (!guildOptionsCache.has(guildId)) {
          guildOptionsCache.set(guildId, new Set());
        }
        guildOptionsCache.get(guildId).add(optionId);
      }
    }
    logger.info(`Loaded ${guildOptionsCache.size} guild options configurations into cache.`);
  } catch (error) {
    logger.error('Failed to load guild options into cache:', error);
  }
}

/**
 * Checks if a specific option is enabled for a guild.
 * @param {string} guildId - The Discord guild ID.
 * @param {string} optionId - The option ID (e.g. 'cstock').
 * @returns {boolean} - True if enabled.
 */
function isOptionEnabled(guildId, optionId) {
  if (!guildId) return false;
  const cleanOption = optionId.toLowerCase().trim();
  const guildSet = guildOptionsCache.get(guildId);
  if (!guildSet) return false;
  if (POKEMON_COMMANDS.includes(cleanOption)) {
    return guildSet.has('pokemon') || guildSet.has(cleanOption);
  }
  return guildSet.has(cleanOption);
}

/**
 * Enables an option for a guild in both cache and database.
 * @param {string} guildId - The Discord guild ID.
 * @param {string} optionId - The option ID to set.
 * @returns {Promise<boolean>}
 */
async function enableOption(guildId, optionId) {
  if (!guildId || !optionId) return false;
  const cleanOption = optionId.toLowerCase().trim();

  // Update memory cache
  if (!guildOptionsCache.has(guildId)) {
    guildOptionsCache.set(guildId, new Set());
  }
  guildOptionsCache.get(guildId).add(cleanOption);

  if (!db) return true;

  try {
    const existing = await db
      .select()
      .from(guildOptions)
      .where(and(eq(guildOptions.guildId, guildId), eq(guildOptions.optionId, cleanOption)));

    if (existing.length === 0) {
      await db.insert(guildOptions).values({
        guildId,
        optionId: cleanOption,
      });
    }
    return true;
  } catch (error) {
    logger.error(`Failed to enable option ${cleanOption} for guild ${guildId} in database:`, error);
    throw error;
  }
}

/**
 * Disables an option for a guild in both cache and database.
 * @param {string} guildId - The Discord guild ID.
 * @param {string} optionId - The option ID to remove.
 * @returns {Promise<boolean>}
 */
async function disableOption(guildId, optionId) {
  if (!guildId || !optionId) return false;
  const cleanOption = optionId.toLowerCase().trim();

  // Update memory cache
  const guildSet = guildOptionsCache.get(guildId);
  if (guildSet) {
    guildSet.delete(cleanOption);
    if (guildSet.size === 0) {
      guildOptionsCache.delete(guildId);
    }
  }

  if (!db) return true;

  try {
    await db
      .delete(guildOptions)
      .where(and(eq(guildOptions.guildId, guildId), eq(guildOptions.optionId, cleanOption)));
    return true;
  } catch (error) {
    logger.error(
      `Failed to disable option ${cleanOption} for guild ${guildId} in database:`,
      error
    );
    throw error;
  }
}

/**
 * Gets all enabled option IDs for a guild.
 * @param {string} guildId - The Discord guild ID.
 * @returns {string[]} - Array of enabled option IDs.
 */
function getEnabledOptions(guildId) {
  if (!guildId) return [];
  const guildSet = guildOptionsCache.get(guildId);
  return guildSet ? Array.from(guildSet) : [];
}

/**
 * Synchronizes the guild-specific command registrations for a specific guild.
 * @param {import('discord.js').Client} client - The Discord client.
 * @param {string} guildId - The Discord guild ID.
 */
async function syncGuildCommands(client, guildId) {
  try {
    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn(`[Command Sync] Guild ${guildId} not found in cache, skipping.`);
      return;
    }

    const enabled = getEnabledOptions(guildId);
    const DYNAMIC_COMMAND_NAMES = [
      'pemoji',
      'al-nadd',
      'al-nrm',
      'al-setseat',
      'al-seatcalc',
      'pokemon',
    ];

    const targetPayloads = [];
    for (const cmdName of DYNAMIC_COMMAND_NAMES) {
      const isCmdEnabled =
        enabled.includes(cmdName) ||
        (POKEMON_COMMANDS.includes(cmdName) && enabled.includes('pokemon'));
      if (isCmdEnabled) {
        const commandObj = client.commands.get(cmdName);
        if (commandObj && commandObj.data) {
          targetPayloads.push(commandObj.data.toJSON());
        }
      }
    }

    // Fetch existing guild commands to check if update is needed
    const existingGuildCommands = await guild.commands.fetch();

    const existingNames = Array.from(existingGuildCommands.values())
      .map((c) => c.name)
      .sort();
    const targetNames = targetPayloads.map((c) => c.name).sort();

    const needsSync =
      existingNames.length !== targetNames.length ||
      existingNames.some((val, idx) => val !== targetNames[idx]);

    if (needsSync) {
      logger.info(
        `[Command Sync] Updating guild-specific commands for ${guild.name} (${guildId}) -> [${targetNames.join(', ')}]`
      );
      await guild.commands.set(targetPayloads);
      logger.success(`[Command Sync] Successfully updated guild commands for ${guild.name}`);
    }
  } catch (error) {
    logger.error(`Failed to sync guild-specific commands for guild ${guildId}:`, error);
  }
}

/**
 * Synchronizes all guilds command registrations on startup.
 * @param {import('discord.js').Client} client - The Discord client.
 */
async function syncAllGuildsCommands(client) {
  logger.info('Starting sync of guild-specific commands for all guilds...');
  const guilds = Array.from(client.guilds.cache.values());
  for (const guild of guilds) {
    await syncGuildCommands(client, guild.id);
  }
  logger.info('Guild-specific command sync completed.');
}

module.exports = {
  loadGuildOptions,
  isOptionEnabled,
  enableOption,
  disableOption,
  getEnabledOptions,
  syncGuildCommands,
  syncAllGuildsCommands,
};
