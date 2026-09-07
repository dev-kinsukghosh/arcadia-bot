const { db } = require('./db.js');
const { webyCustom } = require('../db/schema.js');
const { eq } = require('drizzle-orm');
const logger = require('./logger.js');

// In-memory cache for developer configurations: key (string) -> value (string)
const devConfigCache = new Map();

// Alias map to support intuitive feature names (e.g. suggestions, feedback, syslogs, fallback)
const ALIAS_MAP = {
  suggest_channel: [
    'suggest_channel',
    'suggest',
    'suggestions',
    'suggestion_channel',
    'suggestions_channel',
    'suggestions_output',
  ],
  suggest: [
    'suggest_channel',
    'suggest',
    'suggestions',
    'suggestion_channel',
    'suggestions_channel',
    'suggestions_output',
  ],
  suggestions: [
    'suggest_channel',
    'suggest',
    'suggestions',
    'suggestion_channel',
    'suggestions_channel',
    'suggestions_output',
  ],

  feedback_channel: [
    'feedback_channel',
    'feedback',
    'feedbacks',
    'feedback_channel',
    'feedbacks_channel',
    'feedback_output',
  ],
  feedback: [
    'feedback_channel',
    'feedback',
    'feedbacks',
    'feedback_channel',
    'feedbacks_channel',
    'feedback_output',
  ],
  feedbacks: [
    'feedback_channel',
    'feedback',
    'feedbacks',
    'feedback_channel',
    'feedbacks_channel',
    'feedback_output',
  ],

  syslogs_channel: [
    'syslogs_channel',
    'syslogs',
    'syslog',
    'error_channel',
    'errors_channel',
    'error',
    'errors',
    'logs_channel',
    'logs',
    'syslogs_output',
  ],
  syslogs: [
    'syslogs_channel',
    'syslogs',
    'syslog',
    'error_channel',
    'errors_channel',
    'error',
    'errors',
    'logs_channel',
    'logs',
    'syslogs_output',
  ],
  syslog: [
    'syslogs_channel',
    'syslogs',
    'syslog',
    'error_channel',
    'errors_channel',
    'error',
    'errors',
    'logs_channel',
    'logs',
    'syslogs_output',
  ],
  error_channel: [
    'syslogs_channel',
    'syslogs',
    'syslog',
    'error_channel',
    'errors_channel',
    'error',
    'errors',
    'logs_channel',
    'logs',
    'syslogs_output',
  ],
  logs_channel: [
    'syslogs_channel',
    'syslogs',
    'syslog',
    'error_channel',
    'errors_channel',
    'error',
    'errors',
    'logs_channel',
    'logs',
    'syslogs_output',
  ],

  fallback_channel: [
    'output_channel',
    'fallback',
    'fallback_channel',
    'output',
    'syslogs_channel',
    'suggest_channel',
    'feedback_channel',
  ],
  fallback: [
    'output_channel',
    'fallback',
    'fallback_channel',
    'output',
    'syslogs_channel',
    'suggest_channel',
    'feedback_channel',
  ],
  output_channel: ['output_channel', 'fallback', 'fallback_channel', 'output'],
  output: ['output_channel', 'fallback', 'fallback_channel', 'output'],
};

/**
 * Warm up developer configuration cache from database on startup
 */
async function loadDevConfig() {
  if (!db) return;
  try {
    const records = await db.select().from(webyCustom);
    devConfigCache.clear();
    for (const record of records) {
      if (record.id && record.value !== undefined) {
        devConfigCache.set(record.id.toLowerCase().trim(), record.value);
      }
    }
    logger.info(`Loaded ${devConfigCache.size} developer configuration entries into memory cache.`);
  } catch (error) {
    logger.error('Failed to load developer config cache:', error);
  }
}

/**
 * Check cache for a key in standard formats:
 * devconfig:feature:param, devconfig:feature, devconfig:feature:channel_id, devconfig:feature:value
 * @param {string} feat
 * @param {string} param
 * @returns {string|null}
 */
function searchCacheForKey(feat, param = '') {
  const f = feat.toLowerCase().trim();
  const p = param ? param.toLowerCase().trim() : '';

  if (p) {
    const key1 = `devconfig:${f}:${p}`;
    if (devConfigCache.has(key1)) return devConfigCache.get(key1);
  }

  const key2 = `devconfig:${f}`;
  if (devConfigCache.has(key2)) return devConfigCache.get(key2);

  const key3 = `devconfig:${f}:channel_id`;
  if (devConfigCache.has(key3)) return devConfigCache.get(key3);

  const key4 = `devconfig:${f}:value`;
  if (devConfigCache.has(key4)) return devConfigCache.get(key4);

  return null;
}

/**
 * Get a developer configuration value from cache with fallback key and alias matching
 * @param {string} feature
 * @param {string} parameter
 * @param {string|null} defaultValue
 * @returns {string|null}
 */
function getDevConfig(feature, parameter = '', defaultValue = null) {
  if (!feature) return defaultValue;
  const f = feature.toLowerCase().trim();

  // 1. Direct key search
  const directMatch = searchCacheForKey(f, parameter);
  if (directMatch !== null) return directMatch;

  // 2. Alias candidate search
  const candidates = ALIAS_MAP[f] || [];
  for (const cand of candidates) {
    const candMatch = searchCacheForKey(cand, parameter);
    if (candMatch !== null) return candMatch;
  }

  return defaultValue;
}

/**
 * Dedicated helper to resolve Suggestion Output Channel ID
 * Checks: suggest_channel, suggestions, suggest, output_channel, fallback, env variables
 * @returns {string|null}
 */
function getSuggestChannel() {
  return (
    getDevConfig('suggest_channel', 'channel_id') ||
    getDevConfig('suggestions', 'channel_id') ||
    getDevConfig('suggest', 'channel_id') ||
    getDevConfig('output_channel', 'channel_id') ||
    getDevConfig('fallback', 'channel_id') ||
    getDevConfig('fallback_channel', 'channel_id') ||
    process.env.SUGGEST_CHANNEL_ID ||
    process.env.OUTPUT_CHANNEL_ID ||
    null
  );
}

/**
 * Dedicated helper to resolve Feedback Output Channel ID
 * Checks: feedback_channel, feedback, feedbacks, output_channel, fallback, env variables
 * @returns {string|null}
 */
function getFeedbackChannel() {
  return (
    getDevConfig('feedback_channel', 'channel_id') ||
    getDevConfig('feedback', 'channel_id') ||
    getDevConfig('feedbacks', 'channel_id') ||
    getDevConfig('output_channel', 'channel_id') ||
    getDevConfig('fallback', 'channel_id') ||
    getDevConfig('fallback_channel', 'channel_id') ||
    process.env.FEEDBACK_CHANNEL_ID ||
    process.env.OUTPUT_CHANNEL_ID ||
    null
  );
}

/**
 * Dedicated helper to resolve Syslogs / Error Output Channel ID
 * Checks: syslogs_channel, syslogs, syslog, error_channel, logs_channel, fallback, output_channel, env variables
 * @returns {string|null}
 */
function getSyslogsChannel() {
  return (
    getDevConfig('syslogs_channel', 'channel_id') ||
    getDevConfig('syslogs', 'channel_id') ||
    getDevConfig('syslog', 'channel_id') ||
    getDevConfig('error_channel', 'channel_id') ||
    getDevConfig('error', 'channel_id') ||
    getDevConfig('logs_channel', 'channel_id') ||
    getDevConfig('logs', 'channel_id') ||
    getDevConfig('fallback', 'channel_id') ||
    getDevConfig('fallback', 'value') ||
    getDevConfig('output_channel', 'channel_id') ||
    process.env.ERROR_CHANNEL_ID ||
    process.env.SYSLOGS_CHANNEL_ID ||
    process.env.OUTPUT_CHANNEL_ID ||
    null
  );
}

/**
 * Set a developer configuration value in both cache and MySQL (webyCustom)
 * Also auto-updates alias keys in memory cache for instant resolution
 * @param {string} feature
 * @param {string} parameter
 * @param {string} value
 * @returns {Promise<boolean>}
 */
async function setDevConfig(feature, parameter, value) {
  if (!feature || value === undefined) return false;
  const f = feature.toLowerCase().trim();
  const p = parameter ? parameter.toLowerCase().trim() : '';
  const cleanVal = String(value).trim();

  const primaryKey = p ? `devconfig:${f}:${p}` : `devconfig:${f}`;

  // Update primary memory cache entries
  devConfigCache.set(primaryKey, cleanVal);
  devConfigCache.set(`devconfig:${f}`, cleanVal);
  if (p === 'channel_id' || f.endsWith('_channel') || /^\d{17,20}$/.test(cleanVal)) {
    devConfigCache.set(`devconfig:${f}:channel_id`, cleanVal);
  }

  // Also populate alias cache entries for instant O(1) resolution across feature synonyms
  const aliases = ALIAS_MAP[f] || [];
  for (const alias of aliases) {
    const aliasKey = p ? `devconfig:${alias}:${p}` : `devconfig:${alias}`;
    devConfigCache.set(aliasKey, cleanVal);
    devConfigCache.set(`devconfig:${alias}`, cleanVal);
    if (p === 'channel_id' || alias.endsWith('_channel') || /^\d{17,20}$/.test(cleanVal)) {
      devConfigCache.set(`devconfig:${alias}:channel_id`, cleanVal);
    }
  }

  if (!db) return true;

  try {
    const existing = await db.select().from(webyCustom).where(eq(webyCustom.id, primaryKey));
    if (existing.length === 0) {
      await db.insert(webyCustom).values({
        id: primaryKey,
        value: cleanVal,
      });
    } else {
      await db.update(webyCustom).set({ value: cleanVal }).where(eq(webyCustom.id, primaryKey));
    }

    // Also persist canonical primary key if user used a short alias (e.g. user typed 'suggestions' -> also set 'devconfig:suggest_channel:channel_id')
    if (['suggest', 'suggestions', 'suggest_channel'].includes(f)) {
      const canonicalKey = `devconfig:suggest_channel:${p || 'channel_id'}`;
      await db
        .insert(webyCustom)
        .values({ id: canonicalKey, value: cleanVal })
        .onDuplicateKeyUpdate({ set: { value: cleanVal } })
        .catch(() => {});
    } else if (['feedback', 'feedbacks', 'feedback_channel'].includes(f)) {
      const canonicalKey = `devconfig:feedback_channel:${p || 'channel_id'}`;
      await db
        .insert(webyCustom)
        .values({ id: canonicalKey, value: cleanVal })
        .onDuplicateKeyUpdate({ set: { value: cleanVal } })
        .catch(() => {});
    } else if (
      ['syslogs', 'syslog', 'syslogs_channel', 'error_channel', 'logs', 'logs_channel'].includes(f)
    ) {
      const canonicalKey = `devconfig:syslogs_channel:${p || 'channel_id'}`;
      await db
        .insert(webyCustom)
        .values({ id: canonicalKey, value: cleanVal })
        .onDuplicateKeyUpdate({ set: { value: cleanVal } })
        .catch(() => {});
    }

    return true;
  } catch (error) {
    logger.error(`Failed to persist devconfig key ${primaryKey} in database:`, error);
    throw error;
  }
}

/**
 * Automatically streams pending stored DB submissions (suggestions, feedback, error logs) to configured channels
 * @param {Client} client
 */
async function streamPendingSubmissions(client) {
  if (!db || !client || !client.isReady()) return;

  const { internal } = require('../db/schema.js');
  const { like, eq } = require('drizzle-orm');
  const { createBaseEmbed, EMBED_COLORS } = require('./embedHelper.js');

  try {
    // 1. Stream Suggestions
    const suggestChannelId = getSuggestChannel();
    if (suggestChannelId) {
      const channel = await client.channels.fetch(suggestChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const records = await db.select().from(internal).where(like(internal.id, 'suggest:%'));
        for (const r of records) {
          try {
            const p = JSON.parse(r.value);

            let userAvatar = p.userAvatar || null;
            if (!userAvatar && p.userId && client.users) {
              try {
                const u = await client.users.fetch(p.userId).catch(() => null);
                if (u) userAvatar = u.displayAvatarURL({ extension: 'png', size: 256 });
              } catch {
                // Ignore avatar fetch errors
              }
            }

            const embed = createBaseEmbed()
              .setColor(EMBED_COLORS.NEON_CYAN)
              .setTitle('💡 New Feature Suggestion')
              .setDescription(`**Suggestion Context:**\n${p.suggestion}`);

            if (userAvatar) {
              embed.setAuthor({
                name: `${p.username || 'User'} (${p.userId})`,
                iconURL: userAvatar,
              });
              embed.setThumbnail(userAvatar);
            } else if (p.username) {
              embed.setAuthor({ name: `${p.username} (${p.userId})` });
            }

            embed.addFields(
              {
                name: '👤 Submitted By',
                value: `<@${p.userId}> (\`${p.username || p.userId}\`)`,
                inline: true,
              },
              { name: '🆔 Discord User ID', value: `\`${p.userId}\``, inline: true },
              { name: '🏰 Source Server', value: p.guildName || 'DM', inline: false },
              { name: '🕒 Submitted Date', value: p.createdAt || 'Unknown', inline: false }
            );

            await channel.send({ embeds: [embed] });
            await db.delete(internal).where(eq(internal.id, r.id));
            logger.info(`Streamed historical suggestion [${r.id}] to channel #${channel.name}`);
          } catch (err) {
            logger.warn(`Failed to stream suggestion record ${r.id}: ${err.message}`);
          }
        }
      }
    }

    // 2. Stream Feedback
    const feedbackChannelId = getFeedbackChannel();
    if (feedbackChannelId) {
      const channel = await client.channels.fetch(feedbackChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const records = await db.select().from(internal).where(like(internal.id, 'feedback:%'));
        for (const r of records) {
          try {
            const p = JSON.parse(r.value);

            let userAvatar = p.userAvatar || null;
            if (!userAvatar && p.userId && client.users) {
              try {
                const u = await client.users.fetch(p.userId).catch(() => null);
                if (u) userAvatar = u.displayAvatarURL({ extension: 'png', size: 256 });
              } catch {
                // Ignore avatar fetch errors
              }
            }

            const embed = createBaseEmbed()
              .setColor(EMBED_COLORS.SUCCESS)
              .setTitle('💬 New User Feedback')
              .setDescription(`**Feedback Message:**\n${p.feedback}`);

            if (userAvatar) {
              embed.setAuthor({
                name: `${p.username || 'User'} (${p.userId})`,
                iconURL: userAvatar,
              });
              embed.setThumbnail(userAvatar);
            } else if (p.username) {
              embed.setAuthor({ name: `${p.username} (${p.userId})` });
            }

            embed.addFields(
              {
                name: '👤 Submitted By',
                value: `<@${p.userId}> (\`${p.username || p.userId}\`)`,
                inline: true,
              },
              { name: '🆔 Discord User ID', value: `\`${p.userId}\``, inline: true },
              { name: '🏰 Source Server', value: p.guildName || 'DM', inline: false },
              { name: '🕒 Submitted Date', value: p.createdAt || 'Unknown', inline: false }
            );

            await channel.send({ embeds: [embed] });
            await db.delete(internal).where(eq(internal.id, r.id));
            logger.info(`Streamed historical feedback [${r.id}] to channel #${channel.name}`);
          } catch (err) {
            logger.warn(`Failed to stream feedback record ${r.id}: ${err.message}`);
          }
        }
      }
    }

    // 3. Stream System Logs / Error Logs
    const syslogsChannelId = getSyslogsChannel();
    if (syslogsChannelId) {
      const channel = await client.channels.fetch(syslogsChannelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const records = await db.select().from(internal).where(like(internal.id, 'error:%'));
        for (const r of records) {
          try {
            const p = JSON.parse(r.value);
            const embed = createBaseEmbed()
              .setColor(EMBED_COLORS.ERROR)
              .setTitle(`🚨 System Error Log (Streamed Entry)`)
              .setDescription(
                `**Error Message:**\n\`\`\`ansi\n${p.message || p.error || 'System error'}\n\`\`\``
              )
              .addFields(
                { name: 'Context', value: p.context || 'System Alert', inline: true },
                { name: 'Timestamp', value: p.createdAt || 'Unknown', inline: true }
              );
            if (p.stack) {
              embed.addFields({
                name: 'Stack Trace',
                value: `\`\`\`js\n${String(p.stack).slice(0, 1000)}\n\`\`\``,
              });
            }
            await channel.send({ embeds: [embed] });
            await db.delete(internal).where(eq(internal.id, r.id));
            logger.info(
              `Streamed historical system error log [${r.id}] to syslogs channel #${channel.name}`
            );
          } catch (err) {
            logger.warn(`Failed to stream error record ${r.id}: ${err.message}`);
          }
        }

        // Send startup online notice embed to syslogs channel
        const onlineEmbed = createBaseEmbed()
          .setColor(EMBED_COLORS.ROYAL_BLUE)
          .setTitle('🟢 Bot System Online & Logs Connected')
          .setDescription(
            `Arcadia Community Bot has successfully booted up and connected to Discord API!`
          )
          .addFields(
            {
              name: '🤖 Bot User',
              value: `<@${client.user.id}> (\`${client.user.tag}\`)`,
              inline: true,
            },
            {
              name: '🏰 Connected Servers',
              value: `\`${client.guilds.cache.size}\``,
              inline: true,
            },
            {
              name: '🕒 Startup Time',
              value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
              inline: false,
            },
            {
              name: 'ENV',
              value: `\`${process.env.MODE || 'development'}\``,
              inline: true,
            }
          );
        await channel.send({ embeds: [onlineEmbed] }).catch(() => {});
      }
    }
  } catch (error) {
    logger.error('Error streaming pending submissions from database on startup:', error);
  }
}

module.exports = {
  loadDevConfig,
  getDevConfig,
  setDevConfig,
  getSuggestChannel,
  getFeedbackChannel,
  getSyslogsChannel,
  streamPendingSubmissions,
};
