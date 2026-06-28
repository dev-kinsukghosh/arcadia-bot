const { mysqlTable, varchar, decimal, int, timestamp, boolean } = require('drizzle-orm/mysql-core');

const convoyItems = mysqlTable('convoy_items', {
  item: varchar('item', { length: 255 }).primaryKey(),
  buyPrice: decimal('buy_price', { precision: 10, scale: 4 }).notNull(),
  sellPrice: decimal('sell_price', { precision: 10, scale: 4 }).notNull(),
  stock: int('stock').notNull(),
  maxStock: int('max_stock').notNull(),
  rarity: varchar('rarity', { length: 100 }).notNull(),
  timesSeen: int('times_seen').default(1).notNull(),
  current_p: boolean('current_p').default(false).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = {
  convoyItems,
};
