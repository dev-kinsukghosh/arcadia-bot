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
  uniqueIndex,
  bigint,
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

// Generic internal key-value store for bot state (scan counters, flags, snapshots, etc.)
const internal = mysqlTable('internal', {
  id: varchar('id', { length: 100 }).primaryKey(),
  value: text('value').notNull(),
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

const eventsHistory = mysqlTable('events_history', {
  id: int('id').primaryKey().autoincrement(),
  eventData: text('event_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const warsHistory = mysqlTable('wars_history', {
  id: int('id').primaryKey().autoincrement(),
  warTime: boolean('war_time').default(false).notNull(),
  activeWarsCount: int('active_wars_count').default(0).notNull(),
  warData: text('war_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const playerProfiles = mysqlTable('player_profiles', {
  uuid: varchar('uuid', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  rank: varchar('rank', { length: 100 }),
  townId: varchar('town_id', { length: 255 }),
  townName: varchar('town_name', { length: 255 }),
  nationId: varchar('nation_id', { length: 255 }),
  nationName: varchar('nation_name', { length: 255 }),
  empire: varchar('empire', { length: 255 }),
  firstSeen: timestamp('first_seen').defaultNow().notNull(),
  lastSeen: timestamp('last_seen').defaultNow().onUpdateNow().notNull(),
});

// Dedicated API endpoint snapshots store
const apiSnapshots = mysqlTable('api_snapshots', {
  endpoint: varchar('endpoint', { length: 100 }).primaryKey(),
  data: text('data').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// Dedicated API /api/events store (max 200 events, 3 months retention)
const sEvents = mysqlTable(
  's_events',
  {
    id: int('id').primaryKey().autoincrement(),
    timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
    type: varchar('type', { length: 100 }).notNull(),
    message: text('message'),
    data: text('data'),
    eventHash: varchar('event_hash', { length: 64 }).notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('timestamp_idx').on(table.timestamp), index('type_idx').on(table.type)]
);

// Event Notification Subscriptions Table
const eventNotifications = mysqlTable(
  'event_notifications',
  {
    id: int('id').primaryKey().autoincrement(),
    guildId: varchar('guild_id', { length: 255 }).notNull(),
    channelId: varchar('channel_id', { length: 255 }).notNull(),
    eventType: varchar('event_type', { length: 100 }).default('all').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('guild_channel_idx').on(table.guildId, table.channelId)]
);

// Discovered API Endpoints Table
const apiEndpoints = mysqlTable('api_endpoints', {
  endpoint: varchar('endpoint', { length: 255 }).primaryKey(),
  statusCode: int('status_code').notNull(),
  sampleResponse: text('sample_response'),
  discoveredAt: timestamp('discovered_at').defaultNow().notNull(),
});

// Pokemon Captures Table (Custom Command CC Feature)
const pokemonCaptures = mysqlTable(
  'pokemon_captures',
  {
    id: int('id').primaryKey().autoincrement(),
    guildId: varchar('guild_id', { length: 255 }).notNull(),
    trainerId: varchar('trainer_id', { length: 255 }).notNull(),
    pokemonId: varchar('pokemon_id', { length: 255 }).notNull(),
    pokemonName: varchar('pokemon_name', { length: 255 }).notNull(),
    capturedAt: timestamp('captured_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
  },
  (table) => [
    index('guild_trainer_idx').on(table.guildId, table.trainerId),
    uniqueIndex('guild_pokemon_unique_idx').on(table.guildId, table.pokemonId),
  ]
);

// Pokemon Opt-Outs Table (Custom Command CC Feature)
const pokemonOptOuts = mysqlTable(
  'pokemon_opt_outs',
  {
    id: int('id').primaryKey().autoincrement(),
    guildId: varchar('guild_id', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_opt_out_idx').on(table.userId),
    uniqueIndex('guild_user_opt_out_unique_idx').on(table.guildId, table.userId),
  ]
);

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
  eventsHistory,
  warsHistory,
  playerProfiles,
  apiSnapshots,
  sEvents,
  eventNotifications,
  apiEndpoints,
  pokemonCaptures,
  pokemonOptOuts,
};
