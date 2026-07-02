const { db } = require('./db.js');
const { blacklist } = require('../db/schema.js');
const redis = require('./redis.js');
const logger = require('./logger.js');
const { eq } = require('drizzle-orm');

// In-memory cache map for extremely fast checks (userId -> reason)
const blacklistedUsers = new Map();

/**
 * Loads all blacklisted user IDs from the database into the in-memory cache and Redis.
 */
async function loadBlacklist() {
  if (!db) {
    logger.warn('Database not available. Skipping blacklist cache load.');
    return;
  }

  try {
    const records = await db
      .select({ userId: blacklist.userId, reason: blacklist.reason })
      .from(blacklist);
    blacklistedUsers.clear();

    if (redis && redis.status === 'ready') {
      try {
        await redis.del('blacklist:users');
      } catch (err) {
        logger.error(`Failed to clear Redis blacklist set: ${err.message}`);
      }
    }

    for (const record of records) {
      blacklistedUsers.set(record.userId, record.reason || 'No reason provided');
      if (redis && redis.status === 'ready') {
        try {
          await redis.sadd('blacklist:users', record.userId);
        } catch {
          // Ignore individual Redis sadd errors
        }
      }
    }

    logger.info(`Loaded ${blacklistedUsers.size} blacklisted user(s) into cache.`);
  } catch (err) {
    logger.error(`Failed to load blacklist cache: ${err.message}`);
  }
}

/**
 * Checks if a user is blacklisted.
 * @param {string} userId - The Discord user ID.
 * @returns {boolean}
 */
function isBlacklisted(userId) {
  return blacklistedUsers.has(userId);
}

/**
 * Gets the blacklist reason for a user.
 * @param {string} userId - The Discord user ID.
 * @returns {string}
 */
function getBlacklistReason(userId) {
  return blacklistedUsers.get(userId) || 'No reason provided';
}

/**
 * Blacklists a user.
 * @param {string} userId - The Discord user ID.
 * @param {string} reason - The reason for blacklisting.
 * @param {string} blacklistedBy - The developer/moderator's user ID who blacklisted them.
 * @returns {Promise<boolean>} - True if successful, false if already blacklisted.
 */
async function blacklistUser(userId, reason, blacklistedBy) {
  if (blacklistedUsers.has(userId)) {
    // If already in memory, let's still ensure they're in db/redis if anything went out of sync,
    // but typically we can check and update
  }

  // Insert/Upsert into MySQL
  if (db) {
    try {
      await db
        .insert(blacklist)
        .values({
          userId,
          reason: reason || null,
          blacklistedBy,
        })
        .onDuplicateKeyUpdate({
          set: {
            reason: reason || null,
            blacklistedBy,
            createdAt: new Date(),
          },
        });
    } catch (err) {
      logger.error(`Failed to add user ${userId} to blacklist table: ${err.message}`);
      throw err;
    }
  }

  // Add to local memory cache
  blacklistedUsers.set(userId, reason || 'No reason provided');

  // Add to Redis set
  if (redis && redis.status === 'ready') {
    try {
      await redis.sadd('blacklist:users', userId);
    } catch (err) {
      logger.error(`Failed to add user ${userId} to Redis blacklist: ${err.message}`);
    }
  }

  logger.warn(
    `User ${userId} has been blacklisted by ${blacklistedBy}. Reason: ${reason || 'None'}`
  );
  return true;
}

/**
 * Removes a user from the blacklist.
 * @param {string} userId - The Discord user ID.
 * @returns {Promise<boolean>} - True if successfully removed, false if not blacklisted.
 */
async function unblacklistUser(userId) {
  // Delete from MySQL
  let deleted = false;
  if (db) {
    try {
      await db.delete(blacklist).where(eq(blacklist.userId, userId));
      deleted = true;
    } catch (err) {
      logger.error(`Failed to remove user ${userId} from blacklist table: ${err.message}`);
      throw err;
    }
  }

  // Remove from local memory cache
  const existed = blacklistedUsers.has(userId);
  blacklistedUsers.delete(userId);

  // Remove from Redis set
  if (redis && redis.status === 'ready') {
    try {
      await redis.srem('blacklist:users', userId);
    } catch (err) {
      logger.error(`Failed to remove user ${userId} from Redis blacklist: ${err.message}`);
    }
  }

  if (deleted || existed) {
    logger.info(`User ${userId} has been removed from the blacklist.`);
    return true;
  }
  return false;
}

module.exports = {
  loadBlacklist,
  isBlacklisted,
  getBlacklistReason,
  blacklistUser,
  unblacklistUser,
};
