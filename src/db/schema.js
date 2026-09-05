const {
  mysqlTable,
  varchar,
  decimal,
  int,
  timestamp,
  boolean,
  primaryKey,
  date,
  customType,
  text,
  index,
} = require('drizzle-orm/mysql-core');

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

const blacklist = mysqlTable('blacklist', {
  userId: varchar('user_id', { length: 255 }).primaryKey(),
  reason: varchar('reason', { length: 255 }),
  blacklistedBy: varchar('blacklisted_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const itemNotifications = mysqlTable(
  'item_notifications',
  {
    userId: varchar('user_id', { length: 255 }).notNull(),
    item: varchar('item', { length: 255 }).notNull(),
    channelId: varchar('channel_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.item] })]
);

const nguildData = mysqlTable('nguild_data', {
  guildId: varchar('guild_id', { length: 255 }).primaryKey(),
  currency: varchar('currency', { length: 255 }).notNull(),
});

// Latest state per currency — upserted on every sync
const currencies = mysqlTable('currencies', {
  id: varchar('id', { length: 100 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  standardItem: varchar('standard_item', { length: 100 }).notNull(),
  nation: varchar('nation', { length: 255 }).notNull(),
  creatorUuid: varchar('creator_uuid', { length: 100 }).notNull(),
  creatorName: varchar('creator_name', { length: 255 }).default('Unknown').notNull(),
  arcPerUnitBase: decimal('arc_per_unit_base', { precision: 12, scale: 4 }).notNull(),
  arcPerUnitLive: decimal('arc_per_unit_live', { precision: 12, scale: 4 }).notNull(),
  active: boolean('active').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// Daily avg + final values per currency (no metadata duplication)
const currencyHistory = mysqlTable(
  'currency_history',
  {
    currencyId: varchar('currency_id', { length: 100 }).notNull(),
    date: date('date').notNull(),
    arcPerUnitBase: decimal('arc_per_unit_base', { precision: 12, scale: 4 }).notNull(),
    arcPerUnitLive: decimal('arc_per_unit_live', { precision: 12, scale: 4 }).notNull(),
    avgArcPerUnitBase: decimal('avg_arc_per_unit_base', { precision: 12, scale: 4 }).notNull(),
    avgArcPerUnitLive: decimal('avg_arc_per_unit_live', { precision: 12, scale: 4 }).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => [primaryKey({ columns: [table.currencyId, table.date] })]
);

// Generic internal key-value store for bot state (scan counters, flags, etc.)
const internal = mysqlTable('internal', {
  id: varchar('id', { length: 100 }).primaryKey(),
  value: varchar('value', { length: 500 }).notNull(),
});

const mediumBlob = customType({
  dataType() {
    return 'mediumblob';
  },
});

const playerHeads = mysqlTable('player_heads', {
  uuid: varchar('uuid', { length: 36 }).primaryKey(),
  username: varchar('username', { length: 255 }).notNull(),
  pngData: mediumBlob('png_data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

const playerShops = mysqlTable('player_shops', {
  key: varchar('key', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  owner: varchar('owner', { length: 255 }),
  ownerName: varchar('owner_name', { length: 255 }),
  world: varchar('world', { length: 255 }),
  plotX: int('plot_x'),
  plotZ: int('plot_z'),
  currency: varchar('currency', { length: 100 }),
  balances: text('balances'),
  sellListings: text('sell_listings'),
  buyListings: text('buy_listings'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

const townyHistory = mysqlTable(
  'towny_history',
  {
    name: varchar('name', { length: 255 }).notNull(), // town or nation slug/name
    type: varchar('type', { length: 50 }).notNull(), // 'town' or 'nation'
    date: date('date').notNull(),
    residents: int('residents').notNull(),
    chunks: int('chunks').notNull(), // claimed chunks for towns, total chunks for nations
    townsCount: int('towns_count').default(0).notNull(), // towns count for nations, 0 for towns
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => [
    primaryKey({ columns: [table.name, table.type, table.date] }),
    index('date_idx').on(table.date),
  ]
);

const guildOptions = mysqlTable(
  'guild_options',
  {
    guildId: varchar('guild_id', { length: 255 }).notNull(),
    optionId: varchar('option_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.guildId, table.optionId] })]
);

const alSam = mysqlTable('al_sam', {
  id: int('id').primaryKey().autoincrement(),
  nationName: varchar('nation_name', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const webyCustom = mysqlTable('weby_custom', {
  id: varchar('id', { length: 100 }).primaryKey(),
  value: varchar('value', { length: 255 }).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

module.exports = {
  convoyItems,
  blacklist,
  itemNotifications,
  nguildData,
  currencies,
  currencyHistory,
  internal,
  playerHeads,
  playerShops,
  townyHistory,
  guildOptions,
  alSam,
  webyCustom,
};
