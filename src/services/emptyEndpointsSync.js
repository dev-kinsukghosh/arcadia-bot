const { arcadiaApi } = require('../utils/apiClient.js');
const redisClient = require('../utils/redis.js');
const { db } = require('../utils/db.js');
const { apiSnapshots, eventsHistory, warsHistory } = require('../db/schema.js');
const { eq } = require('drizzle-orm');
const logger = require('../utils/logger.js');
const { getSyslogsChannel } = require('../utils/devConfigHelper.js');
const { createBaseEmbed, EMBED_COLORS } = require('../utils/embedHelper.js');
const pc = require('picocolors');

let discordClient = null;
let lastEventsState = null;
let lastWarsState = null;

/**
 * Read cached events data (tries Redis -> MySQL -> Memory)
 */
async function getEventsCache() {
  if (redisClient && redisClient.status === 'ready') {
    try {
      const cached = await redisClient.get('cache:events');
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
        .where(eq(apiSnapshots.endpoint, 'events'));
      if (record.length > 0 && record[0].data) {
        return JSON.parse(record[0].data);
      }
    } catch {
      // ignore
    }
  }
  return lastEventsState;
}

/**
 * Read cached wars data (tries Redis -> MySQL -> Memory)
 */
async function getWarsCache() {
  if (redisClient && redisClient.status === 'ready') {
    try {
      const cached = await redisClient.get('cache:wars');
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  if (db) {
    try {
      const record = await db.select().from(apiSnapshots).where(eq(apiSnapshots.endpoint, 'wars'));
      if (record.length > 0 && record[0].data) {
        return JSON.parse(record[0].data);
      }
    } catch {
      // ignore
    }
  }
  return lastWarsState;
}

/**
 * Save payload to Redis & MySQL
 */
async function saveEndpointData(key, payload) {
  const jsonStr = JSON.stringify(payload);

  // 1. Redis
  if (redisClient && redisClient.status === 'ready') {
    try {
      await redisClient.set(`cache:${key}`, jsonStr);
    } catch (err) {
      logger.warn(`Failed to cache ${key} in Redis: ${err.message}`);
    }
  }

  // 2. MySQL DB api_snapshots store
  if (db) {
    try {
      await db
        .insert(apiSnapshots)
        .values({ endpoint: key, data: jsonStr })
        .onDuplicateKeyUpdate({ set: { data: jsonStr } });
    } catch (err) {
      logger.warn(`Failed to persist ${key} snapshot in MySQL: ${err.message}`);
    }
  }
}

/**
 * Send an alert embed to the system log channel
 */
async function sendSyslogNotification(embed) {
  if (!discordClient || !discordClient.isReady()) return;
  const syslogsChannelId = getSyslogsChannel();
  if (!syslogsChannelId) return;

  try {
    const channel = await discordClient.channels.fetch(syslogsChannelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    logger.warn(`Failed to dispatch syslog notification: ${err.message}`);
  }
}

/**
 * Main routine to scan /api/events and /api/wars every 2.5 minutes
 */
async function scanEmptyEndpoints() {
  logger.info(pc.cyan('🔍 Scanning empty/dynamic endpoints (/api/events, /api/wars)...'));

  // 1. Scan /api/events
  try {
    const eventsData = await arcadiaApi.getEvents();
    if (eventsData) {
      const eventsList = Array.isArray(eventsData.events) ? eventsData.events : [];
      const hasEvents = eventsList.length > 0;

      // Always save data
      await saveEndpointData('events', eventsData);

      // Detect state transition (when new events appear)
      const prevCount = lastEventsState?.events?.length || 0;
      if (hasEvents) {
        // Save historical record to DB
        if (db) {
          try {
            await db.insert(eventsHistory).values({
              eventData: JSON.stringify(eventsData),
            });
          } catch (err) {
            logger.warn(`Failed to record eventsHistory in DB: ${err.message}`);
          }
        }

        if (prevCount === 0) {
          logger.info(
            pc.bold(
              pc.green(`🎉 [EVENTS DETECTED] Found ${eventsList.length} active server event(s)!`)
            )
          );

          const embed = createBaseEmbed()
            .setColor(EMBED_COLORS.SUCCESS)
            .setTitle('🎉 New Server Event(s) Detected!')
            .setDescription(
              `ArcadiaMC API \`/api/events\` returned **${eventsList.length}** active event(s).`
            )
            .addFields({
              name: '📋 Event Data',
              value: `\`\`\`json\n${JSON.stringify(eventsList, null, 2).slice(0, 900)}\n\`\`\``,
            });
          await sendSyslogNotification(embed);
        }
      }
      lastEventsState = eventsData;
    }
  } catch (err) {
    logger.warn(`Empty endpoint sync error (/api/events): ${err.message}`);
  }

  // 2. Scan /api/wars
  try {
    const warsData = await arcadiaApi.getWars();
    if (warsData) {
      const activeWars = Array.isArray(warsData.activeWars) ? warsData.activeWars : [];
      const recentEvents = Array.isArray(warsData.recentEvents) ? warsData.recentEvents : [];
      const isWarTime = !!warsData.warTime;
      const isEnabled = !!warsData.enabled;

      const hasWarActivity =
        activeWars.length > 0 || recentEvents.length > 0 || isWarTime || isEnabled;

      // Always save data
      await saveEndpointData('wars', warsData);

      // Save historical record when war activity occurs
      if (hasWarActivity && db) {
        try {
          await db.insert(warsHistory).values({
            warTime: isWarTime,
            activeWarsCount: activeWars.length,
            warData: JSON.stringify(warsData),
          });
        } catch (err) {
          logger.warn(`Failed to record warsHistory in DB: ${err.message}`);
        }
      }

      // Detect state change
      const prevWarTime = !!lastWarsState?.warTime;
      const prevActiveCount = lastWarsState?.activeWars?.length || 0;

      if (hasWarActivity && ((!prevWarTime && isWarTime) || activeWars.length > prevActiveCount)) {
        logger.info(
          pc.bold(
            pc.red(
              `⚔️ [WAR ACTIVITY DETECTED] War Time: ${isWarTime}, Active Wars: ${activeWars.length}`
            )
          )
        );

        const embed = createBaseEmbed()
          .setColor(EMBED_COLORS.ERROR)
          .setTitle('⚔️ War Activity Detected!')
          .setDescription(`ArcadiaMC API \`/api/wars\` reported live war status updates.`)
          .addFields(
            {
              name: '🛡️ War Time Status',
              value: isWarTime ? '🟢 Active' : '🔴 Inactive',
              inline: true,
            },
            { name: '⚔️ Active Wars', value: `\`${activeWars.length}\``, inline: true },
            { name: '📜 Recent Events', value: `\`${recentEvents.length}\``, inline: true }
          );

        if (activeWars.length > 0) {
          embed.addFields({
            name: '⚔️ Active Wars Data',
            value: `\`\`\`json\n${JSON.stringify(activeWars, null, 2).slice(0, 900)}\n\`\`\``,
          });
        }

        await sendSyslogNotification(embed);
      }
      lastWarsState = warsData;
    }
  } catch (err) {
    logger.warn(`Empty endpoint sync error (/api/wars): ${err.message}`);
  }
}

const { reportError } = require('../utils/errorHandler.js');
const { Cron } = require('croner');
let syncCron = null;

/**
 * Start the empty endpoints scanner service
 */
function startEmptyEndpointsSync(client) {
  discordClient = client;

  // Run immediately on boot
  scanEmptyEndpoints().catch((err) => {
    logger.error('Initial empty endpoints scan error:', err);
    reportError(err, 'Initial Empty Endpoints Scan');
  });

  // Schedule to run every 2.5 minutes (150 seconds) using Croner
  if (syncCron) syncCron.stop();
  syncCron = new Cron('* * * * *', { interval: 150 }, () => {
    scanEmptyEndpoints().catch((err) => {
      logger.error('Recurring empty endpoints scan error:', err);
      reportError(err, 'Recurring Empty Endpoints Scan');
    });
  });

  logger.info(
    pc.green('Started background empty endpoints scanner with Croner (runs every 2.5 minutes).')
  );
}

module.exports = {
  startEmptyEndpointsSync,
  scanEmptyEndpoints,
  getEventsCache,
  getWarsCache,
};
