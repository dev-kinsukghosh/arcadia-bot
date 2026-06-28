const { db } = require('../utils/db.js');
const { convoyItems } = require('../db/schema.js');
const { eq, notInArray } = require('drizzle-orm');
const { arcadiaApi } = require('../utils/apiClient.js');
const logger = require('../utils/logger.js');
const pc = require('picocolors');

/**
 * Fetch convoy data from API and sync with the MySQL database
 */
async function syncConvoy() {
  if (!db) {
    logger.warn('Database is not active. Skipping convoy sync.');
    return;
  }

  logger.info('Starting convoy synchronization check...');
  try {
    const data = await arcadiaApi.getConvoy();

    if (!data || !Array.isArray(data.trades)) {
      logger.error('Invalid convoy API response format (expected trades array).');
      return;
    }

    const { convoyItemRepository } = require('../db/redisSchema.js');
    const { getIsOmReady } = require('../utils/redisOm.js');
    const isOmReady = getIsOmReady();

    let inserted = 0;
    let updatedPriceSeen = 0;
    let updatedStockOnly = 0;

    for (const trade of data.trades) {
      if (!trade.item) continue;

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
        // If it was not active before this sync started, it was absent last rotation -> new convoy rotation -> +1
        const wasAbsent = !existing.current_p;

        currentTimesSeen = wasAbsent ? existing.timesSeen + 1 : existing.timesSeen;

        const oldBuy = parseFloat(existing.buyPrice);
        const oldSell = parseFloat(existing.sellPrice);
        const newBuy = parseFloat(trade.buyPrice);
        const newSell = parseFloat(trade.sellPrice);
        const priceOrRarityChanged =
          oldBuy !== newBuy || oldSell !== newSell || existing.rarity !== trade.rarity;

        if (wasAbsent || priceOrRarityChanged) {
          // Full update: price/rarity may have changed, or item is back after being absent
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
    }

    // 3. Mark items not present in this API response as inactive (current_p = false)
    const activeItemNames = data.trades.map((t) => t.item).filter(Boolean);

    if (activeItemNames.length > 0) {
      await db
        .update(convoyItems)
        .set({ current_p: false })
        .where(notInArray(convoyItems.item, activeItemNames));
    } else {
      await db.update(convoyItems).set({ current_p: false });
    }

    // 4. Mark items not present in this API response as inactive in Redis-OM
    if (isOmReady) {
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
    downloadMissingIcons(activeItemNames);

    logger.success(
      `Convoy sync complete: ${pc.bold(pc.green(inserted))} inserted, ` +
        `${pc.bold(pc.yellow(updatedPriceSeen))} returned in new rotation (+1 timesSeen), ` +
        `${pc.bold(pc.cyan(updatedStockOnly))} updated with stock changes only.`
    );
  } catch (error) {
    const { reportError } = require('../utils/errorHandler.js');
    await reportError(error, 'Convoy Sync Service');
  }
}

/**
 * Start the recurring convoy synchronization job (every 5 minutes)
 */
function startConvoySync() {
  // 1. Run immediately on bot startup
  syncConvoy();

  // 2. Set interval for every 5 minutes (5 * 60 * 1000 ms)
  const INTERVAL_MS = 5 * 60 * 1000;
  setInterval(() => {
    syncConvoy();
  }, INTERVAL_MS);

  logger.info('Scheduled Convoy Sync job to run every 5 minutes.');
}

module.exports = {
  syncConvoy,
  startConvoySync,
};
