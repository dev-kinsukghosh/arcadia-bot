const { db } = require('./db.js');
const redisClient = require('./redis.js');
const { internal, sEvents, playerProfiles, playerHeads } = require('../db/schema.js');
const { eq, like, desc, inArray } = require('drizzle-orm');
const logger = require('./logger.js');
const pc = require('picocolors');

const REDIS_OWNERS_KEY = 'cache:town:owners';
const DB_INTERNAL_KEY = 'town_owners';

// In-memory cache for fast lookups
// townId / townNameLower / townSlug -> { name, uuid, displayName, townName }
const townOwnersMap = new Map();
let isInitialized = false;

/**
 * Checks if a given player name is a fake NPC name assigned during town ruin
 * Matches NPC0, NPC1, NPC2, NPC4, NPC555, etc. (case-insensitive)
 * @param {string|null|undefined} name
 * @returns {boolean}
 */
function isNpcPlayer(name) {
  if (!name || typeof name !== 'string') return false;
  return /^npc[-_]?\d+$/i.test(name.trim());
}

/**
 * Extracts and normalizes keys for town lookups
 * @param {object} town
 * @returns {string[]}
 */
function getTownLookupKeys(town) {
  if (!town) return [];
  const keys = [];
  if (town.id) keys.push(String(town.id).toLowerCase());
  if (town.name) {
    keys.push(String(town.name).toLowerCase());
    keys.push(String(town.name).toLowerCase().replace(/_/g, ' '));
  }
  if (town.slug) {
    keys.push(String(town.slug).toLowerCase());
    keys.push(String(town.slug).toLowerCase().replace(/-/g, '_'));
  }
  return [...new Set(keys)];
}

/**
 * Save current town owners map to Redis & MySQL
 */
async function persistTownOwners() {
  const serialized = {};
  for (const [key, val] of townOwnersMap.entries()) {
    serialized[key] = val;
  }
  const jsonStr = JSON.stringify(serialized);

  // 1. Redis
  if (redisClient && redisClient.status === 'ready') {
    try {
      await redisClient.set(REDIS_OWNERS_KEY, jsonStr);
    } catch {
      // ignore
    }
  }

  // 2. MySQL DB internal table
  if (db) {
    try {
      await db
        .insert(internal)
        .values({ id: DB_INTERNAL_KEY, value: jsonStr })
        .onDuplicateKeyUpdate({ set: { value: jsonStr } });
    } catch {
      // ignore
    }
  }
}

/**
 * Seed historical town owners from s_events (town_ruined events)
 */
async function seedFromEvents() {
  if (!db) return;
  try {
    const ruinedEvents = await db
      .select()
      .from(sEvents)
      .where(eq(sEvents.type, 'town_ruined'))
      .orderBy(desc(sEvents.timestamp))
      .limit(30);

    const oldMayors = new Set();
    const eventItems = [];

    for (const ev of ruinedEvents) {
      if (!ev.data) continue;
      try {
        const parsed = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        const oldMayor = parsed.oldMayorName;
        if (!oldMayor || isNpcPlayer(oldMayor)) continue;
        oldMayors.add(oldMayor);
        eventItems.push({ parsed, oldMayor });
      } catch {
        // ignore
      }
    }

    if (oldMayors.size === 0) return;

    // Batch query playerProfiles and playerHeads
    const mayorList = Array.from(oldMayors);
    const uuidMap = new Map();

    try {
      const pRows = await db
        .select({ name: playerProfiles.name, uuid: playerProfiles.uuid })
        .from(playerProfiles)
        .where(inArray(playerProfiles.name, mayorList));
      for (const p of pRows) {
        uuidMap.set(p.name.toLowerCase(), p.uuid);
      }

      const remaining = mayorList.filter((m) => !uuidMap.has(m.toLowerCase()));
      if (remaining.length > 0) {
        const hRows = await db
          .select({ username: playerHeads.username, uuid: playerHeads.uuid })
          .from(playerHeads)
          .where(inArray(playerHeads.username, remaining));
        for (const h of hRows) {
          uuidMap.set(h.username.toLowerCase(), h.uuid);
        }
      }
    } catch {
      // ignore
    }

    for (const item of eventItems) {
      const { parsed, oldMayor } = item;
      const town = parsed.town || {};
      const townId = town.id ? String(town.id).toLowerCase() : null;
      const townName = town.name ? String(town.name).toLowerCase() : null;
      const townSlug = town.slug ? String(town.slug).toLowerCase() : null;

      const resolvedUuid = uuidMap.get(oldMayor.toLowerCase()) || 'N/A';

      const record = {
        name: oldMayor,
        uuid: resolvedUuid,
        displayName: oldMayor,
        townName: town.name || oldMayor,
        preservedFrom: 's_events:town_ruined',
      };

      if (townId && !townOwnersMap.has(townId)) townOwnersMap.set(townId, record);
      if (townName && !townOwnersMap.has(townName)) townOwnersMap.set(townName, record);
      if (townSlug && !townOwnersMap.has(townSlug)) townOwnersMap.set(townSlug, record);
    }
  } catch (err) {
    logger.warn(`Failed to seed town owners from s_events: ${err.message}`);
  }
}

/**
 * Loads town owners into memory from Redis, MySQL, or historical events
 */
async function loadTownOwners() {
  if (isInitialized && townOwnersMap.size > 0) {
    return townOwnersMap;
  }

  // 1. Try Redis
  if (redisClient && redisClient.status === 'ready') {
    try {
      const cached = await redisClient.get(REDIS_OWNERS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        for (const [k, v] of Object.entries(parsed)) {
          townOwnersMap.set(k.toLowerCase(), v);
        }
        if (townOwnersMap.size > 0) {
          isInitialized = true;
          return townOwnersMap;
        }
      }
    } catch {
      // ignore
    }
  }

  // 2. Try MySQL internal table
  if (db) {
    try {
      const rows = await db
        .select()
        .from(internal)
        .where(eq(internal.id, DB_INTERNAL_KEY))
        .limit(1);
      if (rows.length > 0 && rows[0].value) {
        const parsed = JSON.parse(rows[0].value);
        for (const [k, v] of Object.entries(parsed)) {
          townOwnersMap.set(k.toLowerCase(), v);
        }
        if (townOwnersMap.size > 0) {
          isInitialized = true;
          return townOwnersMap;
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback: Seed from historical events
  await seedFromEvents();
  isInitialized = true;
  await persistTownOwners();
  return townOwnersMap;
}

/**
 * Record a valid, active town owner (mayor)
 * @param {string} townId
 * @param {string} townName
 * @param {string} mayorName
 * @param {string} mayorUuid
 * @param {string} [displayName]
 * @param {boolean} [skipPersist=false]
 */
async function recordTownOwner(
  townId,
  townName,
  mayorName,
  mayorUuid,
  displayName,
  skipPersist = false
) {
  if (!mayorName || isNpcPlayer(mayorName)) return false;

  const record = {
    name: mayorName,
    uuid: mayorUuid || 'N/A',
    displayName: displayName || mayorName,
    townName: townName || 'Unknown',
    updatedAt: Date.now(),
  };

  let hasChanged = false;
  const keys = getTownLookupKeys({ id: townId, name: townName });
  for (const k of keys) {
    const existing = townOwnersMap.get(k);
    if (!existing || existing.name !== mayorName) {
      townOwnersMap.set(k, record);
      hasChanged = true;
    }
  }

  if (hasChanged && !skipPersist) {
    await persistTownOwners();
  }
  return hasChanged;
}

/**
 * Record a ruined town's original mayor/owner when town_ruined event occurs
 * @param {string} townId
 * @param {string} townName
 * @param {string} oldMayorName
 */
async function recordRuinedTownOwner(townId, townName, oldMayorName) {
  if (!oldMayorName || isNpcPlayer(oldMayorName)) return;

  // Try to resolve UUID from player profiles or heads
  let resolvedUuid = 'N/A';
  if (db) {
    try {
      const pRow = await db
        .select({ uuid: playerProfiles.uuid })
        .from(playerProfiles)
        .where(eq(playerProfiles.name, oldMayorName))
        .limit(1);
      if (pRow.length > 0) {
        resolvedUuid = pRow[0].uuid;
      } else {
        const hRow = await db
          .select({ uuid: playerHeads.uuid })
          .from(playerHeads)
          .where(eq(playerHeads.username, oldMayorName))
          .limit(1);
        if (hRow.length > 0) {
          resolvedUuid = hRow[0].uuid;
        }
      }
    } catch {
      // ignore
    }
  }

  const record = {
    name: oldMayorName,
    uuid: resolvedUuid,
    displayName: oldMayorName,
    townName: townName || 'Unknown',
    ruined: true,
    updatedAt: Date.now(),
  };

  const keys = getTownLookupKeys({ id: townId, name: townName });
  for (const k of keys) {
    townOwnersMap.set(k, record);
  }

  await persistTownOwners();
  logger.info(
    pc.bold(
      pc.yellow(
        `🏛️ [TOWN RUIN PRESERVED] Preserved owner for town "${townName || townId}": ${oldMayorName} (UUID: ${resolvedUuid})`
      )
    )
  );
}

/**
 * Resolves the preserved owner for a ruined town
 * @param {object} town
 * @returns {Promise<{ name: string, uuid: string, displayName?: string }|null>}
 */
async function resolvePreservedOwner(town) {
  if (!town) return null;
  const keys = getTownLookupKeys(town);

  // 1. Check memory / cached map
  for (const k of keys) {
    if (townOwnersMap.has(k)) {
      return townOwnersMap.get(k);
    }
  }

  // 2. Query s_events for town_ruined event matching this town
  if (db && town.name) {
    try {
      const rows = await db
        .select()
        .from(sEvents)
        .where(like(sEvents.data, `%"name":"${town.name}"%`))
        .orderBy(desc(sEvents.timestamp))
        .limit(5);

      for (const r of rows) {
        if (!r.data) continue;
        const parsed = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        if (parsed.oldMayorName && !isNpcPlayer(parsed.oldMayorName)) {
          await recordRuinedTownOwner(town.id, town.name, parsed.oldMayorName);
          return townOwnersMap.get(town.name.toLowerCase()) || null;
        }
      }
    } catch {
      // ignore
    }
  }

  // 3. Fallback: Query player_profiles for any recorded resident of this town
  if (db && town.name) {
    try {
      const pRows = await db
        .select()
        .from(playerProfiles)
        .where(eq(playerProfiles.townName, town.name))
        .orderBy(desc(playerProfiles.lastSeen))
        .limit(1);

      if (pRows.length > 0 && !isNpcPlayer(pRows[0].name)) {
        const found = pRows[0];
        const record = {
          name: found.name,
          uuid: found.uuid,
          displayName: found.displayName || found.name,
          townName: town.name,
          preservedFrom: 'player_profiles:last_seen',
        };
        for (const k of keys) {
          townOwnersMap.set(k, record);
        }
        await persistTownOwners();
        return record;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Processes Towny API response payload:
 * - Checks each town: if mayor is a fake NPCX (e.g. NPC4, NPC5, NPC11, NPC555),
 *   does NOT change the mayor to NPCX, but preserves the original owner!
 * - Flags ruined towns with `ruined: true` and preserves raw NPC name in `npcMayor`.
 * - For active/healthy towns, stores the real mayor as the persistent owner.
 *
 * @param {object} townyData - The raw response from arcadiaApi.getTowny()
 * @returns {Promise<object>} - Processed townyData with preserved owners
 */
async function processTownyData(townyData) {
  if (!townyData || !Array.isArray(townyData.towns)) {
    return townyData;
  }

  await loadTownOwners();
  let hasBatchChanges = false;

  for (const town of townyData.towns) {
    if (!town) continue;
    const currentMayorName = town.mayor?.name;

    if (isNpcPlayer(currentMayorName)) {
      // Town has fallen into ruin and the server assigned it a fake NPC name (e.g. NPC4)
      town.ruined = true;
      town.isRuined = true;
      town.npcMayor = currentMayorName;

      const preservedOwner = await resolvePreservedOwner(town);
      if (preservedOwner) {
        town.mayor = {
          name: preservedOwner.name,
          uuid:
            preservedOwner.uuid && preservedOwner.uuid !== 'N/A'
              ? preservedOwner.uuid
              : town.mayor?.uuid,
          displayName: preservedOwner.displayName || preservedOwner.name,
          isPreservedOwner: true,
          ruined: true,
        };
      } else {
        // Fallback: If no owner was ever known, don't show fake NPC name
        town.mayor = {
          name: 'Unknown (Ruined)',
          uuid: 'N/A',
          displayName: 'Unknown',
          isPreservedOwner: false,
          ruined: true,
        };
      }
    } else {
      // Healthy town with active real player mayor
      town.ruined = false;
      town.isRuined = false;

      if (town.mayor && town.mayor.name) {
        const changed = await recordTownOwner(
          town.id,
          town.name,
          town.mayor.name,
          town.mayor.uuid,
          town.mayor.displayName,
          true // skip individual persist
        );
        if (changed) hasBatchChanges = true;
      }
    }
  }

  if (hasBatchChanges) {
    await persistTownOwners();
  }

  return townyData;
}

module.exports = {
  isNpcPlayer,
  loadTownOwners,
  recordTownOwner,
  recordRuinedTownOwner,
  resolvePreservedOwner,
  processTownyData,
};
