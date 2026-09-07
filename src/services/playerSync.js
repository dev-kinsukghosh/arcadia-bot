const { arcadiaApi } = require('../utils/apiClient.js');
const redisClient = require('../utils/redis.js');
const { db } = require('../utils/db.js');
const { apiSnapshots, playerProfiles } = require('../db/schema.js');
const { eq } = require('drizzle-orm');
const logger = require('../utils/logger.js');
const { ActivityType } = require('discord.js');
const pc = require('picocolors');

const SYNC_INTERVAL = 60 * 1000; // 1 minute

let discordClient = null;
let lastPlayersState = null;
let syncTimer = null;

/**
 * Read cached players data (tries Redis -> MySQL -> Memory)
 */
async function getPlayersCache() {
  if (redisClient && redisClient.status === 'ready') {
    try {
      const cached = await redisClient.get('cache:players');
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  if (db) {
    try {
      const record = await db
        .select()
        .from(apiSnapshots)
        .where(eq(apiSnapshots.endpoint, 'players'));
      if (record.length > 0 && record[0].data) {
        return JSON.parse(record[0].data);
      }
    } catch {
      // ignore
    }
  }
  return lastPlayersState;
}

/**
 * Save payload to Redis & MySQL (and upsert player profiles)
 */
async function savePlayersData(payload) {
  const jsonStr = JSON.stringify(payload);

  if (redisClient && redisClient.status === 'ready') {
    try {
      await redisClient.set('cache:players', jsonStr);
    } catch (err) {
      logger.warn(`Failed to cache players in Redis: ${err.message}`);
    }
  }

  if (db) {
    try {
      await db
        .insert(apiSnapshots)
        .values({ endpoint: 'players', data: jsonStr })
        .onDuplicateKeyUpdate({ set: { data: jsonStr } });
    } catch (err) {
      logger.warn(`Failed to persist players snapshot in MySQL: ${err.message}`);
    }

    // Upsert static/rarely changing player metadata into player_profiles table
    if (Array.isArray(payload.players)) {
      for (const p of payload.players) {
        if (!p.uuid || !p.name) continue;
        try {
          await db
            .insert(playerProfiles)
            .values({
              uuid: p.uuid,
              name: p.name,
              displayName: p.displayName || p.name,
              rank: p.rank || 'PLAYER',
              townId: p.town?.id || null,
              townName: p.town?.name || null,
              nationId: p.nation?.id || null,
              nationName: p.nation?.name || null,
              empire: p.empire || null,
            })
            .onDuplicateKeyUpdate({
              set: {
                name: p.name,
                displayName: p.displayName || p.name,
                rank: p.rank || 'PLAYER',
                townId: p.town?.id || null,
                townName: p.town?.name || null,
                nationId: p.nation?.id || null,
                nationName: p.nation?.name || null,
                empire: p.empire || null,
                lastSeen: new Date(),
              },
            });
        } catch (err) {
          logger.warn(`Failed to upsert player profile for ${p.name}: ${err.message}`);
        }
      }
    }
  }
}

/**
 * Update Discord Bot Presence with live online players count
 */
function updateBotPresence(onlineCount) {
  if (!discordClient || !discordClient.user) return;
  try {
    const count = typeof onlineCount === 'number' ? onlineCount : 0;
    discordClient.user.setPresence({
      activities: [
        {
          name: `ArcadiaMC | ${count} Online`,
          type: ActivityType.Playing,
        },
      ],
      status: 'online',
    });
  } catch (err) {
    logger.warn(`Failed to update bot presence: ${err.message}`);
  }
}

/**
 * Sync routine for online players telemetry
 */
async function syncPlayers() {
  try {
    const data = await arcadiaApi.getPlayers();
    if (data) {
      await savePlayersData(data);
      lastPlayersState = data;

      const onlineCount =
        data.onlineCount ?? (Array.isArray(data.players) ? data.players.length : 0);
      updateBotPresence(onlineCount);

      logger.system(`Synced ${onlineCount} online player(s) from /api/players.`);
    }
  } catch (err) {
    logger.warn(`Player sync error (/api/players): ${err.message}`);
  }
}

/**
 * Start the player sync service
 */
function startPlayerSync(client) {
  discordClient = client;

  // Run immediately on boot
  syncPlayers().catch((err) => {
    logger.error('Initial player sync error:', err);
  });

  // Schedule to run every 1 minute
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    syncPlayers().catch((err) => {
      logger.error('Recurring player sync error:', err);
    });
  }, SYNC_INTERVAL);

  logger.info(pc.green('Started background player sync service (runs every 1 minute).'));
}

module.exports = {
  startPlayerSync,
  syncPlayers,
  getPlayersCache,
};
