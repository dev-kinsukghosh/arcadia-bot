const { db } = require('../utils/db.js');
const { convoyItems } = require('../db/schema.js');
const { eq, notInArray } = require('drizzle-orm');
const { arcadiaApi } = require('../utils/apiClient.js');
const logger = require('../utils/logger.js');
const pc = require('picocolors');
const redis = require('../utils/redis.js');

let lastApiUpdatedAt = null;
let discordClient = null;
let lastSyncTime = 0;
let cachedActiveItems = [];
let cachedAllItems = [];

/**
 * Fetch convoy data from API and sync with the MySQL database
 * @param {boolean} force - Whether to bypass the short-term rate limit check
 */
async function syncConvoy(force = false, isBackup = false) {
  if (!db) {
    logger.warn('Database is not active. Skipping convoy sync.');
    return;
  }

  const now = Date.now();
  if (!force && now - lastSyncTime < 10000) {
    logger.info('Convoy sync requested too recently. Skipping duplicate check.');
    return;
  }
  lastSyncTime = now;

  logger.info('Starting convoy synchronization check...');
  try {
    const data = await arcadiaApi.getConvoy();

    if (!data || !Array.isArray(data.trades)) {
      logger.error('Invalid convoy API response format (expected trades array).');
      return;
    }

    const apiUpdatedAt = data.updatedAt ? String(data.updatedAt) : null;
    if (apiUpdatedAt) {
      lastApiUpdatedAt = apiUpdatedAt;
      if (redis && redis.status === 'ready') {
        try {
          await redis.set('convoy:last_api_updated_at', apiUpdatedAt);
        } catch {
          // Ignore errors
        }
      }
    }

    // Determine if this is a new rotation by comparing items returned from API
    // with currently active items in the database.
    const currentlyActive = await db
      .select({ item: convoyItems.item })
      .from(convoyItems)
      .where(eq(convoyItems.current_p, true));
    const activeDbNames = currentlyActive.map((r) => r.item);

    const apiItemNames = data.trades.map((t) => t.item).filter(Boolean);

    let isNewRotation = false;
    if (activeDbNames.length > 0) {
      if (activeDbNames.length !== apiItemNames.length) {
        isNewRotation = true;
      } else {
        const activeDbSet = new Set(activeDbNames);
        for (const name of apiItemNames) {
          if (!activeDbSet.has(name)) {
            isNewRotation = true;
            break;
          }
        }
      }
    } else {
      // First sync / empty DB active state - treat as new rotation
      isNewRotation = true;
    }

    const { convoyItemRepository } = require('../db/redisSchema.js');
    const { getIsOmReady } = require('../utils/redisOm.js');
    const isOmReady = getIsOmReady();

    let inserted = 0;
    let updatedPriceSeen = 0;
    let updatedStockOnly = 0;

    const syncPromises = data.trades.map(async (trade) => {
      if (!trade.item) return;

      // Query database for existing item
      const existingRecords = await db
        .select()
        .from(convoyItems)
        .where(eq(convoyItems.item, trade.item));

      const existing = existingRecords[0];
      let currentTimesSeen = 1;

      if (!existing) {
        // Brand new item — insert with timesSeen = 1
        await db.insert(convoyItems).values({
          item: trade.item,
          buyPrice: String(trade.buyPrice),
          sellPrice: String(trade.sellPrice),
          stock: trade.stock,
          maxStock: trade.maxStock,
          rarity: trade.rarity,
          timesSeen: 1,
          current_p: true,
        });
        inserted++;
      } else {
        // If it's a new rotation OR was absent, increment timesSeen
        const shouldIncrement = isNewRotation || !existing.current_p;
        currentTimesSeen = shouldIncrement ? existing.timesSeen + 1 : existing.timesSeen;

        const oldBuy = parseFloat(existing.buyPrice);
        const oldSell = parseFloat(existing.sellPrice);
        const newBuy = parseFloat(trade.buyPrice);
        const newSell = parseFloat(trade.sellPrice);
        const priceOrRarityChanged =
          oldBuy !== newBuy || oldSell !== newSell || existing.rarity !== trade.rarity;

        if (shouldIncrement || priceOrRarityChanged) {
          // Full update: rotation occurred, price/rarity changed, or item returned from absence
          await db
            .update(convoyItems)
            .set({
              buyPrice: String(trade.buyPrice),
              sellPrice: String(trade.sellPrice),
              stock: trade.stock,
              maxStock: trade.maxStock,
              rarity: trade.rarity,
              timesSeen: currentTimesSeen,
              current_p: true,
            })
            .where(eq(convoyItems.item, trade.item));

          updatedPriceSeen++;
        } else {
          // Same rotation, same price/rarity — just update stock
          await db
            .update(convoyItems)
            .set({
              stock: trade.stock,
              maxStock: trade.maxStock,
              current_p: true,
            })
            .where(eq(convoyItems.item, trade.item));
          updatedStockOnly++;
        }
      }

      // Sync with Redis
      if (isOmReady) {
        try {
          let redisEntity = await convoyItemRepository.fetch(trade.item);

          if (!redisEntity) {
            redisEntity = {
              item: trade.item,
              buyPrice: Number(trade.buyPrice),
              sellPrice: Number(trade.sellPrice),
              stock: trade.stock,
              maxStock: trade.maxStock,
              rarity: trade.rarity,
              timesSeen: 1,
              current_p: true,
            };
          } else {
            redisEntity.buyPrice = Number(trade.buyPrice);
            redisEntity.sellPrice = Number(trade.sellPrice);
            redisEntity.stock = trade.stock;
            redisEntity.maxStock = trade.maxStock;
            redisEntity.rarity = trade.rarity;
            redisEntity.current_p = true;
            redisEntity.timesSeen = currentTimesSeen;
          }
          await convoyItemRepository.save(redisEntity);
        } catch (err) {
          logger.error(`Failed to sync item ${trade.item} to Redis:`, err);
        }
      }
    });

    await Promise.all(syncPromises);

    // 3. Mark items not present in this API response as inactive (current_p = false)
    const activeItemNames = data.trades.map((t) => t.item).filter(Boolean);

    if (activeItemNames.length > 0) {
      await db
        .update(convoyItems)
        .set({ current_p: false })
        .where(notInArray(convoyItems.item, activeItemNames));
    } else {
      logger.warn(
        'Fetched 0 active convoy items from API. Skipping update of current_p status to prevent marking all items as inactive.'
      );
    }

    // 4. Mark items not present in this API response as inactive in Redis-OM
    if (isOmReady && activeItemNames.length > 0) {
      try {
        const allRedisItems = await convoyItemRepository.fetchAll();
        for (const item of allRedisItems) {
          if (!activeItemNames.includes(item.item)) {
            item.current_p = false;
            await convoyItemRepository.save(item);
          }
        }
      } catch (err) {
        logger.error('Failed to reset current_p status in Redis:', err);
      }
    }

    // Scan and download missing block/item icons
    const { downloadMissingIcons } = require('../utils/iconDownloader.js');
    downloadMissingIcons(activeItemNames, discordClient);

    // Dispatch item stock notifications if this is a new rotation
    if (isNewRotation && discordClient && activeItemNames.length > 0) {
      try {
        const { itemNotifications } = require('../db/schema.js');
        const { inArray } = require('drizzle-orm');

        const matchedNotifications = await db
          .select()
          .from(itemNotifications)
          .where(inArray(itemNotifications.item, activeItemNames));

        if (matchedNotifications.length > 0) {
          logger.info(`Dispatching ${matchedNotifications.length} stock notifications...`);

          let appEmojis = null;
          try {
            appEmojis = await discordClient.application.emojis.fetch();
          } catch {
            // Ignore fetch errors
          }

          const { createBaseEmbed, EMBED_COLORS } = require('../utils/embedHelper.js');
          const { AttachmentBuilder } = require('discord.js');
          const fs = require('fs');
          const path = require('path');

          const ICONS_DIR = path.join(process.cwd(), 'src', 'icons');
          const RARITY_CONFIG = {
            LEGENDARY: { emoji: '🟨', color: 0xf1c40f, label: 'Legendary' },
            EPIC: { emoji: '🟪', color: 0xbb86fc, label: 'Epic' },
            RARE: { emoji: '🟦', color: 0x3498db, label: 'Rare' },
            UNCOMMON: { emoji: '🟩', color: 0x2ecc71, label: 'Uncommon' },
            COMMON: { emoji: '⬜', color: 0x95a5a6, label: 'Common' },
          };

          const formatItemNameLocal = (name) => {
            return name
              .toLowerCase()
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase());
          };

          const formatPriceLocal = (price) => {
            const n = parseFloat(price);
            if (isNaN(n)) return '0.00';
            const rounded = Math.round(n * 100) / 100;
            return rounded.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
          };

          for (const notif of matchedNotifications) {
            try {
              const channel = await discordClient.channels.fetch(notif.channelId);
              if (!channel || !channel.isTextBased()) continue;

              const tradeDetails = data.trades.find((t) => t.item === notif.item);
              if (!tradeDetails) continue;

              // Resolve guild currency for this channel
              const guildId = channel.guild?.id;
              let activeCurrency = 'arc';
              let conversion = { prefix: '₳', suffix: '', rate: 1.0 };

              if (guildId) {
                try {
                  const { nguildData } = require('../db/schema.js');
                  const { eq } = require('drizzle-orm');
                  const configRow = await db
                    .select()
                    .from(nguildData)
                    .where(eq(nguildData.guildId, guildId));

                  if (configRow.length > 0 && configRow[0].currency) {
                    activeCurrency = configRow[0].currency.toLowerCase();
                  }
                } catch (err) {
                  logger.debug(
                    `Failed to fetch guild currency config for notification: ${err.message}`
                  );
                }
              }

              if (activeCurrency !== 'arc') {
                const { getCurrencyCache } = require('./currencySync.js');
                const cache = getCurrencyCache();
                const currenciesList = cache.currencies || [];
                const matched = currenciesList.find((c) => c.id?.toLowerCase() === activeCurrency);
                if (matched) {
                  const rate = parseFloat(matched.arcPerUnitLive) || 1.0;
                  conversion = {
                    prefix: '',
                    suffix: ` ${matched.name || matched.id}`,
                    rate,
                  };
                }
              }

              const convertedBuy = parseFloat(tradeDetails.buyPrice) / conversion.rate;
              const convertedSell = parseFloat(tradeDetails.sellPrice) / conversion.rate;

              const targetEmojiName = notif.item.substring(0, 32);
              const appEmoji = appEmojis ? appEmojis.find((e) => e.name === targetEmojiName) : null;
              let thumbnailUrl = null;
              const files = [];

              if (appEmoji) {
                thumbnailUrl = appEmoji.imageURL();
              } else {
                const iconPath = path.join(ICONS_DIR, `${notif.item}.png`);
                if (fs.existsSync(iconPath)) {
                  thumbnailUrl = `attachment://${notif.item}.png`;
                  files.push(new AttachmentBuilder(iconPath, { name: `${notif.item}.png` }));
                }
              }

              const rKey = (tradeDetails.rarity || 'COMMON').toUpperCase();
              const cfg = RARITY_CONFIG[rKey] || {
                emoji: '🔘',
                color: EMBED_COLORS.CYBER,
                label: tradeDetails.rarity,
              };

              const titlePrefix = appEmoji
                ? `<:${appEmoji.name}:${appEmoji.id}> `
                : `${cfg.emoji} `;

              const embed = createBaseEmbed()
                .setColor(cfg.color)
                .setTitle(`${titlePrefix}${formatItemNameLocal(notif.item)} In Stock!`)
                .setDescription(
                  `The item **${formatItemNameLocal(notif.item)}** is now available in the Convoy shop!`
                )
                .addFields(
                  { name: '✨ Rarity Tier', value: `${cfg.emoji} **${cfg.label}**`, inline: true },
                  {
                    name: '📦 Current Stock',
                    value: `**${tradeDetails.stock}** / **${tradeDetails.maxStock}**`,
                    inline: true,
                  },
                  {
                    name: '💰 Buy Price',
                    value: `\`${conversion.prefix}${formatPriceLocal(convertedBuy)}${conversion.suffix}\``,
                    inline: true,
                  },
                  {
                    name: '💰 Sell Price',
                    value: `\`${conversion.prefix}${formatPriceLocal(convertedSell)}${conversion.suffix}\``,
                    inline: true,
                  }
                );

              if (thumbnailUrl) {
                embed.setThumbnail(thumbnailUrl);
              }

              await channel.send({
                content: `🔔 **Attention** <@${notif.userId}>! **${formatItemNameLocal(notif.item)}** is now in stock!`,
                embeds: [embed],
                files,
              });
            } catch (notifErr) {
              logger.error(
                `Failed to send stock notification to user ${notif.userId} in channel ${notif.channelId}:`,
                notifErr
              );
            }
          }
        }
      } catch (err) {
        logger.error('Failed to process stock notifications:', err);
      }
    }

    // Update local cache
    try {
      cachedAllItems = await db.select().from(convoyItems);
      cachedActiveItems = cachedAllItems.filter((i) => i.current_p);
    } catch (err) {
      logger.error('Failed to populate local convoy items cache:', err);
    }

    logger.success(
      `Convoy sync complete: ${pc.bold(pc.green(inserted))} inserted, ` +
        `${pc.bold(pc.yellow(updatedPriceSeen))} returned in new rotation (+1 timesSeen), ` +
        `${pc.bold(pc.cyan(updatedStockOnly))} updated with stock changes only.`
    );

    if (discordClient) {
      const shouldSchedule = !isBackup || isNewRotation || !syncTimeout;
      if (shouldSchedule) {
        const lastMs = parseUpdatedAtToMs(lastApiUpdatedAt) || Date.now();
        scheduleNextSync(discordClient, lastMs);
      }
    }
  } catch (error) {
    const { reportError } = require('../utils/errorHandler.js');
    await reportError(error, 'Convoy Sync Service');
  }
}

let syncTimeout = null;

/**
 * Safely parse the api's updatedAt timestamp into milliseconds
 * @param {string|number} updatedAtStr
 * @returns {number|null}
 */
function parseUpdatedAtToMs(updatedAtStr) {
  if (!updatedAtStr) return null;
  const parsed = Number(updatedAtStr);
  if (!isNaN(parsed)) {
    // If it's a Unix timestamp in seconds (10 digits), convert to ms
    return parsed < 9999999999 ? parsed * 1000 : parsed;
  }
  const dateParsed = Date.parse(updatedAtStr);
  if (!isNaN(dateParsed)) {
    return dateParsed;
  }
  return null;
}

/**
 * Dynamically schedule the next synchronization execution based on last update timestamp
 * @param {Client} client
 * @param {number} lastUpdatedMs
 */
function scheduleNextSync(client, lastUpdatedMs) {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  const now = Date.now();
  // Next rotation is expected 1 hour after last updatedAt, plus 30 seconds buffer
  const nextExpectedRotation = lastUpdatedMs + 60 * 60 * 1000 + 30 * 1000;
  let delay = nextExpectedRotation - now;

  if (delay <= 0) {
    // If past due, wait 30 seconds to retry to avoid spamming the API if it hasn't updated its updatedAt timestamp yet
    logger.info(
      `Convoy rotation update is past due by ${pc.bold((Math.abs(delay) / 1000).toFixed(1))}s. Scheduling retry in 30 seconds...`
    );
    delay = 30000;
  } else {
    const delayMinutes = (delay / 60000).toFixed(1);
    logger.info(
      `Convoy rotation is scheduled to update in ${pc.bold(delayMinutes)} minutes. Next sync scheduled at: ${new Date(nextExpectedRotation).toLocaleTimeString()}`
    );
  }

  syncTimeout = setTimeout(async () => {
    logger.info('Executing scheduled convoy rotation check...');
    syncTimeout = null;
    await syncConvoy();
  }, delay);
}

/**
 * Start the convoy synchronization worker (run once on startup)
 * @param {Client} client - The Discord Client instance
 */
function startConvoySync(client) {
  discordClient = client;
  logger.info('Initializing Convoy Sync scheduler...');

  // Run once immediately on bot startup
  syncConvoy().then(async () => {
    if (cachedAllItems.length === 0 && db) {
      try {
        cachedAllItems = await db.select().from(convoyItems);
        cachedActiveItems = cachedAllItems.filter((i) => i.current_p);
      } catch (err) {
        logger.error('Failed to pre-populate convoy items cache:', err);
      }
    }
  });

  // Schedule a backup interval checker running every 2 minutes
  setInterval(
    async () => {
      logger.info('Executing backup 2-minute convoy sync check...');
      await syncConvoy(false, true);
    },
    2 * 60 * 1000
  );
}

module.exports = {
  syncConvoy,
  startConvoySync,
  getActiveItemsCache: () => cachedActiveItems,
  getAllItemsCache: () => cachedAllItems,
};
