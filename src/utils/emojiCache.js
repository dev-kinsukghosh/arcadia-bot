const logger = require('./logger.js');

let cachedEmojis = null;
let lastEmojiFetch = 0;
const EMOJI_CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache lifetime

/**
 * Gets application emojis cached in memory, falling back to client cache or fetching if expired.
 * @param {Client} client - The Discord Client instance.
 * @returns {Promise<Collection<string, ApplicationEmoji>>}
 */
async function getAppEmojis(client) {
  if (!client || !client.application) {
    return null;
  }

  const now = Date.now();
  if (cachedEmojis && now - lastEmojiFetch < EMOJI_CACHE_TTL) {
    return cachedEmojis;
  }

  // If client application cache has emojis, use them
  if (client.application.emojis.cache && client.application.emojis.cache.size > 0) {
    cachedEmojis = client.application.emojis.cache;
    lastEmojiFetch = now;
    return cachedEmojis;
  }

  try {
    logger.debug('Fetching application emojis from Discord API...');
    const fetched = await client.application.emojis.fetch();
    cachedEmojis = fetched;
    lastEmojiFetch = now;
    return fetched;
  } catch (error) {
    logger.error('Failed to fetch application emojis:', error);
    return client.application.emojis.cache || null;
  }
}

/**
 * Force refresh the application emoji cache.
 * @param {Client} client - The Discord Client instance.
 * @returns {Promise<Collection<string, ApplicationEmoji>>}
 */
async function refreshEmojiCache(client) {
  if (!client || !client.application) return null;
  try {
    const fetched = await client.application.emojis.fetch();
    cachedEmojis = fetched;
    lastEmojiFetch = Date.now();
    return fetched;
  } catch (error) {
    logger.error('Failed to force refresh application emojis:', error);
    return client.application.emojis.cache;
  }
}

module.exports = {
  getAppEmojis,
  refreshEmojiCache,
};
