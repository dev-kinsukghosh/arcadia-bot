const redis = require('../utils/redis.js');

/**
 * Custom ORM-like repository wrapper for Redis using standard Hash commands.
 * This is used instead of Redis-OM to prevent crashes on Redis servers
 * that do not have the RediSearch extension (FT.* commands) installed.
 */
const convoyItemRepository = {
  /**
   * Save a convoy item entity to the Redis hash map
   * @param {Object} entity - The convoy item data object
   */
  async save(entity) {
    if (!redis || redis.status !== 'ready') return;
    await redis.hset('convoy:items', entity.item, JSON.stringify(entity));
  },

  /**
   * Fetch a single convoy item by its item name key
   * @param {string} item - The uppercase Minecraft item name (e.g. "DIAMOND")
   * @returns {Promise<Object|null>}
   */
  async fetch(item) {
    if (!redis || redis.status !== 'ready') return null;
    const data = await redis.hget('convoy:items', item);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Fetch all convoy items stored in the Redis hash map
   * @returns {Promise<Array<Object>>}
   */
  async fetchAll() {
    if (!redis || redis.status !== 'ready') return [];
    const all = await redis.hgetall('convoy:items');
    return Object.keys(all).map((key) => JSON.parse(all[key]));
  },
};

module.exports = {
  convoyItemRepository,
};
