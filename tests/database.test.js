const { db, connection } = require('../src/utils/db.js');
const { convoyItems, playerShops } = require('../src/db/schema.js');
const { eq } = require('drizzle-orm');
const logger = require('../src/utils/logger.js');
const pc = require('picocolors');

describe('Database Query Suite', () => {
  afterAll(async () => {
    if (connection) {
      await connection.end();
    }
  });

  it('should successfully execute queries on the convoy_items table', async () => {
    expect(db).toBeDefined();
    expect(connection).toBeDefined();

    const activeItems = await db.select().from(convoyItems).where(eq(convoyItems.current_p, true));
    expect(activeItems).toBeInstanceOf(Array);

    logger.success(
      `MySQL Drizzle Query: ${pc.bold(
        pc.green('OK')
      )} (Found ${activeItems.length} active convoy items in DB)`
    );

    if (activeItems.length > 0) {
      const sample = activeItems[0];
      expect(sample.item).toBeDefined();
      expect(sample.buyPrice).toBeDefined();
      expect(sample.stock).toBeDefined();
      logger.success(
        `Sample DB Record Verified: ${pc.bold(sample.item)} | Buy: ₳${
          sample.buyPrice
        } | Stock: ${sample.stock}/${sample.maxStock}`
      );
    }
  });

  it('should successfully execute queries on the player_shops table', async () => {
    expect(db).toBeDefined();
    expect(connection).toBeDefined();

    const dbShops = await db.select().from(playerShops);
    expect(dbShops).toBeInstanceOf(Array);

    logger.success(
      `MySQL Drizzle Query: ${pc.bold(pc.green('OK'))} (Found ${dbShops.length} player shops in DB)`
    );

    if (dbShops.length > 0) {
      const sample = dbShops[0];
      expect(sample.key).toBeDefined();
      expect(sample.name).toBeDefined();
      logger.success(
        `Sample Player Shop DB Record Verified: ${pc.bold(sample.name)} | Key: ${sample.key} | Owner: ${sample.ownerName}`
      );
    }
  });
});
