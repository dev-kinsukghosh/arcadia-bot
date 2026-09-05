const { db } = require('./db.js');
const { webyCustom } = require('../db/schema.js');
const { eq, sql } = require('drizzle-orm');
const logger = require('./logger.js');

const DEFAULT_ROLE_IDS = ['1545866847344267404', '1506494346885730335'];
let cachedRoleIds = [...DEFAULT_ROLE_IDS];
let lastCacheFetch = 0;
const CACHE_TTL = 60 * 1000; // 1 minute TTL

/**
 * Fetch authorized role IDs for Al-Sam commands from database
 * @returns {Promise<string[]>}
 */
async function getAlAuthorizedRoles() {
  const now = Date.now();
  if (now - lastCacheFetch < CACHE_TTL) {
    return cachedRoleIds;
  }

  if (!db) return DEFAULT_ROLE_IDS;

  try {
    const record = await db.select().from(webyCustom).where(eq(webyCustom.id, 'al-rolelock'));

    if (record.length > 0 && record[0].value) {
      cachedRoleIds = record[0].value
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      lastCacheFetch = now;
      return cachedRoleIds;
    } else {
      // Seed default role ID in DB
      await db
        .insert(webyCustom)
        .values({
          id: 'al-rolelock',
          value: DEFAULT_ROLE_IDS.join(','),
        })
        .onDuplicateKeyUpdate({
          set: {
            value: DEFAULT_ROLE_IDS.join(','),
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });
      cachedRoleIds = [...DEFAULT_ROLE_IDS];
      lastCacheFetch = now;
      return cachedRoleIds;
    }
  } catch (err) {
    logger.warn(`Failed to fetch al-rolelock configuration: ${err.message}`);
    return cachedRoleIds;
  }
}

/**
 * Verify if an interaction user is authorized to execute Al-* commands
 * @param {import('discord.js').Interaction} interaction
 * @returns {Promise<boolean>}
 */
async function isAlAuthorized(interaction) {
  // 1. Developer bypass check
  const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());
  if (devIds.includes(interaction.user.id)) {
    return true;
  }

  // 2. Member role check
  if (!interaction.member || !interaction.member.roles) {
    return false;
  }

  const allowedRoles = await getAlAuthorizedRoles();
  const userRoles = interaction.member.roles.cache;
  return allowedRoles.some((roleId) => userRoles.has(roleId));
}

module.exports = {
  getAlAuthorizedRoles,
  isAlAuthorized,
};
