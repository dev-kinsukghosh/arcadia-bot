const { arcadiaApi } = require('./apiClient.js');
const { getPlayersCache } = require('../services/playerSync.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('./embedHelper.js');
const { db } = require('./db.js');
const { playerProfiles } = require('../db/schema.js');
const { eq, or } = require('drizzle-orm');
const {
  createTownNavRow,
  createNationNavRow,
  createPlayerNavRow,
} = require('./discordNavHelper.js');

/**
 * Renders Town profile embed and navigation row
 */
async function renderTownView(townName) {
  const queryLower = String(townName).toLowerCase().trim();
  const queryClean = queryLower.replace(/_/g, ' ');

  const data = await arcadiaApi.getTowny().catch(() => null);
  const towns = Array.isArray(data?.towns) ? data.towns : [];
  const town = towns.find((t) => {
    if (!t) return false;
    const nameLower = t.name ? t.name.toLowerCase() : '';
    const nameClean = nameLower.replace(/_/g, ' ');
    return nameLower === queryLower || nameClean === queryClean;
  });

  if (!town) {
    return {
      embeds: [
        errorEmbed('Town Not Found', `No active town matching \`${townName}\` could be found.`),
      ],
      components: [],
    };
  }

  const flags = town.flags || {};
  const claims = town.claims || {};
  const spawn = town.spawn || {};
  const home = town.homeblock || {};
  const mayor = town.mayor || {};
  const nation = town.nation || null;

  const formattedName = town.name ? town.name.replace(/_/g, ' ') : 'Unknown Town';
  const mayorName = mayor.name || 'Unknown';
  const mayorUuid = mayor.uuid || 'N/A';
  const nationName = nation?.name ? nation.name.replace(/_/g, ' ') : 'None (Neutral)';

  const flagsStr = [
    `${flags.pvp ? '🟢' : '🔴'} PVP`,
    `${flags.mobs ? '🟢' : '🔴'} Mobs`,
    `${flags.fire ? '🟢' : '🔴'} Fire`,
    `${flags.explosion ? '🟢' : '🔴'} Explosions`,
    `${flags.open ? '🟢' : '🔴'} Open`,
    `${flags.public ? '🟢' : '🔴'} Public`,
  ].join('  ·  ');

  const spawnLoc = spawn.world
    ? `\`${spawn.world}\` (X: ${Math.round(spawn.x ?? 0)}, Y: ${Math.round(spawn.y ?? 0)}, Z: ${Math.round(spawn.z ?? 0)})`
    : 'N/A';

  const homeLoc = home.world ? `\`${home.world}\` (X: ${home.x ?? 0}, Z: ${home.z ?? 0})` : 'N/A';

  const createdTs = town.createdAt ? Math.floor(town.createdAt / 1000) : null;
  const lastOnlineTs = town.lastOnlineAt ? Math.floor(town.lastOnlineAt / 1000) : null;
  const createdStr = createdTs ? `<t:${createdTs}:F> (<t:${createdTs}:R>)` : 'Unknown';
  const lastOnlineStr = lastOnlineTs ? `<t:${lastOnlineTs}:F> (<t:${lastOnlineTs}:R>)` : 'Unknown';

  const claimedVal = claims.claimedChunks ?? 0;
  const bonusVal = claims.bonusChunks ?? 0;
  const totalCapacity = claimedVal + bonusVal || 1;
  const claimedBarCount = Math.round((claimedVal / totalCapacity) * 10);
  const visualBar = '🟩'.repeat(claimedBarCount) + '⬜'.repeat(10 - claimedBarCount);

  const embed = createBaseEmbed()
    .setColor(EMBED_COLORS.CYBER)
    .setTitle(`🏘️ Town Profile: ${formattedName}`)
    .setDescription(`Detailed profile telemetry for town **${formattedName}**.`)
    .addFields(
      {
        name: '👑 Leadership & Nation',
        value: `• **Mayor:** \`${mayorName}\`\n• **Mayor UUID:** \`${mayorUuid.substring(0, 8)}...\`\n• **Nation:** \`${nationName}\``,
        inline: true,
      },
      {
        name: '👥 Population',
        value: `• **Online:** \`${town.onlineResidents ?? 0}\`\n• **Total Residents:** \`${town.residents ?? 0}\``,
        inline: true,
      },
      {
        name: '🚩 Town Permissions & Flags',
        value: flagsStr,
        inline: false,
      },
      {
        name: '📦 Chunks Capacity & Territory',
        value:
          `• **Claimed:** \`${Number(claims.claimedChunks ?? 0).toLocaleString()}\` chunks\n` +
          `• **Bonus:** \`${Number(claims.bonusChunks ?? 0).toLocaleString()}\` chunks\n` +
          `• **Outpost:** \`${Number(claims.outpostChunks ?? 0).toLocaleString()}\` chunks\n` +
          `• **Capacity Distribution:**\n${visualBar}`,
        inline: false,
      },
      {
        name: '📍 Coordinates & Telemetry',
        value: `• **Homeblock:** ${homeLoc}\n• **Spawn Location:** ${spawnLoc}`,
        inline: false,
      },
      {
        name: '📅 Timeline',
        value: `• **Created:** ${createdStr}\n• **Last Online Activity:** ${lastOnlineStr}`,
        inline: false,
      }
    );

  const navRow = createTownNavRow(
    town.name,
    mayorName !== 'Unknown' ? mayorName : null,
    nation?.name || null
  );

  return {
    embeds: [embed],
    components: navRow ? [navRow] : [],
  };
}

/**
 * Renders Nation profile embed and navigation row
 */
async function renderNationView(nationName) {
  const queryLower = String(nationName).toLowerCase().trim();
  const queryClean = queryLower.replace(/_/g, ' ');

  const data = await arcadiaApi.getTowny().catch(() => null);
  const nations = Array.isArray(data?.nations) ? data.nations : [];
  const nation = nations.find((n) => {
    if (!n) return false;
    const nameLower = n.name ? n.name.toLowerCase() : '';
    const nameClean = nameLower.replace(/_/g, ' ');
    return nameLower === queryLower || nameClean === queryClean;
  });

  if (!nation) {
    return {
      embeds: [
        errorEmbed(
          'Nation Not Found',
          `No active nation matching \`${nationName}\` could be found.`
        ),
      ],
      components: [],
    };
  }

  const formattedName = nation.name ? nation.name.replace(/_/g, ' ') : 'Unknown Nation';
  const king = nation.king || {};
  const kingName = king.name || 'Unknown';
  const capital = nation.capital || {};
  const capitalName = capital.name ? capital.name.replace(/_/g, ' ') : 'None';

  const createdTs = nation.createdAt ? Math.floor(nation.createdAt / 1000) : null;
  const createdStr = createdTs ? `<t:${createdTs}:F> (<t:${createdTs}:R>)` : 'Unknown';

  const embed = createBaseEmbed()
    .setColor(EMBED_COLORS.CYBER)
    .setTitle(`🚩 Nation Federation: ${formattedName}`)
    .setDescription(`Federation telemetry for nation **${formattedName}**.`)
    .addFields(
      {
        name: '👑 Leadership & Capital',
        value: `• **King:** \`${kingName}\`\n• **Capital Town:** \`${capitalName}\``,
        inline: true,
      },
      {
        name: '👥 Federation Size',
        value:
          `• **Towns Count:** \`${nation.towns ?? 0}\`\n` +
          `• **Total Residents:** \`${nation.residents ?? 0}\`\n` +
          `• **Online Residents:** \`${nation.onlineResidents ?? 0}\``,
        inline: true,
      },
      {
        name: '📅 Timeline',
        value: `• **Established:** ${createdStr}`,
        inline: false,
      }
    );

  const navRow = createNationNavRow(
    nation.name,
    kingName !== 'Unknown' ? kingName : null,
    capital.name || null
  );

  return {
    embeds: [embed],
    components: navRow ? [navRow] : [],
  };
}

/**
 * Renders Player profile embed and navigation row
 */
async function renderPlayerView(playerName) {
  const query = String(playerName).trim().toLowerCase();

  const data = await getPlayersCache().catch(() => null);
  const playersList = data && Array.isArray(data.players) ? data.players : [];

  const onlinePlayer = playersList.find(
    (p) =>
      p.name?.toLowerCase() === query ||
      p.displayName?.toLowerCase() === query ||
      p.uuid?.toLowerCase() === query
  );

  let dbProfile = null;
  if (db) {
    try {
      const records = await db
        .select()
        .from(playerProfiles)
        .where(
          or(
            eq(playerProfiles.name, query),
            eq(playerProfiles.displayName, query),
            eq(playerProfiles.uuid, query)
          )
        );
      if (records.length > 0) dbProfile = records[0];
    } catch {
      // ignore
    }
  }

  if (!onlinePlayer && !dbProfile) {
    return {
      embeds: [
        errorEmbed(
          'Player Not Found',
          `No player profile matching \`${playerName}\` could be found.`
        ),
      ],
      components: [],
    };
  }

  const name = onlinePlayer?.name || dbProfile?.name || query;
  const uuid = onlinePlayer?.uuid || dbProfile?.uuid || 'N/A';
  const rank = onlinePlayer?.rank || dbProfile?.rank || 'PLAYER';
  const displayName = onlinePlayer?.displayName || dbProfile?.displayName || name;
  const isOnline = !!onlinePlayer;

  const rawTownName = onlinePlayer?.town?.name || dbProfile?.townName;
  const rawNationName = onlinePlayer?.nation?.name || dbProfile?.nationName;

  const townName = (rawTownName || 'None').replace(/_/g, ' ');
  const nationName = (rawNationName || 'None').replace(/_/g, ' ');
  const empireName = onlinePlayer?.empire || dbProfile?.empire || 'None';

  const statusBadge = isOnline ? '🟢 **ONLINE**' : '⚪ **OFFLINE**';
  const titleLabel = displayName && displayName !== name ? `${name} [Nick: ${displayName}]` : name;

  const embed = createBaseEmbed()
    .setColor(isOnline ? EMBED_COLORS.SUCCESS : EMBED_COLORS.CYBER)
    .setTitle(`👤 Player Profile: ${titleLabel}`)
    .setDescription(`Telemetry and database profile record for **${name}**.`)
    .addFields(
      {
        name: 'Profile Metadata',
        value:
          `• **Status:** ${statusBadge}\n` +
          `• **Username:** \`${name}\`\n` +
          `• **Nickname:** \`${displayName}\`\n` +
          `• **UUID:** \`${uuid}\`\n` +
          `• **Rank:** \`${rank}\``,
        inline: true,
      },
      {
        name: '🏰 Affiliations',
        value:
          `• **Town:** \`${townName}\`\n` +
          `• **Nation:** \`${nationName}\`\n` +
          `• **Empire:** \`${empireName}\``,
        inline: true,
      }
    );

  if (isOnline) {
    const loc = onlinePlayer.location || {};
    const coordsStr = loc.world
      ? `\`${loc.world}\` (X: ${Math.round(loc.x ?? 0)}, Y: ${Math.round(loc.y ?? 0)}, Z: ${Math.round(loc.z ?? 0)})`
      : 'N/A';
    embed.addFields(
      {
        name: '📍 Live Location Coordinates',
        value: coordsStr,
        inline: false,
      },
      {
        name: '💬 Active Chat Channel',
        value: `\`${onlinePlayer.chatChannel || 'GLOBAL'}\``,
        inline: true,
      }
    );
  } else if (dbProfile) {
    const firstSeenTs = dbProfile.firstSeen
      ? Math.floor(new Date(dbProfile.firstSeen).getTime() / 1000)
      : null;
    const lastSeenTs = dbProfile.lastSeen
      ? Math.floor(new Date(dbProfile.lastSeen).getTime() / 1000)
      : null;

    const firstSeenStr = firstSeenTs ? `<t:${firstSeenTs}:F>` : 'Unknown';
    const lastSeenStr = lastSeenTs ? `<t:${lastSeenTs}:R> (<t:${lastSeenTs}:F>)` : 'Unknown';

    embed.addFields({
      name: '📅 History Timeline',
      value: `• **First Logged:** ${firstSeenStr}\n• **Last Online:** ${lastSeenStr}`,
      inline: false,
    });
  }

  const navRow = createPlayerNavRow(
    name,
    rawTownName && rawTownName !== 'None' ? rawTownName : null,
    rawNationName && rawNationName !== 'None' ? rawNationName : null,
    true
  );

  return {
    embeds: [embed],
    components: navRow ? [navRow] : [],
  };
}

module.exports = {
  renderTownView,
  renderNationView,
  renderPlayerView,
};
