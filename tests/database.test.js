const { db, connection } = require('../src/utils/db.js');
const { convoyItems } = require('../src/db/schema.js');
const { eq } = require('drizzle-orm');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');

async function testDatabase() {
  logger.info(pc.bold(pc.cyan('=== DATABASE QUERY TEST RUN ===')));

  if (!db || !connection) {
    logger.error('Database client not initialized!');
    process.exit(1);
  }

  try {
    logger.info('Querying active items from MySQL convoy_items table using Drizzle...');
    const activeItems = await db.select().from(convoyItems).where(eq(convoyItems.current_p, true));

    logger.success(
      `MySQL Drizzle Query: ${pc.bold(pc.green('OK'))} (Found ${activeItems.length} active convoy items in DB)`
    );

    if (activeItems.length > 0) {
      const sample = activeItems[0];
      logger.info(
        `Sample DB Record: ${pc.bold(sample.item)} | Buy: ₳${sample.buyPrice} | Stock: ${sample.stock}/${sample.maxStock} | Times Seen: ${sample.timesSeen}`
      );
    }
  } catch (err) {
    logger.error(`Database query execution failed: ${err.message}`);
  }

  // Close database connections
  logger.info('Closing database pool...');
  await connection.end();

  logger.info(pc.bold(pc.cyan('=== DATABASE TEST COMPLETE ===')));
}

testDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    logger.critical('Unexpected Database testing error occurred:', err);
    process.exit(1);
  });
