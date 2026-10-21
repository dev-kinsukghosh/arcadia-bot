const { arcadiaApi } = require('./apiClient.js');
const { processTownyData, isNpcPlayer } = require('./townOwnerManager.js');
const { getPlayersCache } = require('../services/playerSync.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('./embedHelper.js');
const { db } = require('./db.js');
const { playerProfiles, playerShops } = require('../db/schema.js');
const { eq, or } = require('drizzle-orm');
const redisClient = require('./redis.js');
const { getAppEmojis } = require('./emojiCache.js');
const {
  createTownNavRow,
  createNationNavRow,
  createPlayerNavRow,
  createShopNavRow,
} = require('./discordNavHelper.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5173';

/**
 * Renders Town profile embed and navigation row
 * @param {string} townName
 * @param {object} [options={}]
 */
async function renderTownView(townName, options = {}) {
  const queryLower = String(townName).toLowerCase().trim();
  const queryClean = queryLower.replace(/_/g, ' ');

  const rawData = await arcadiaApi.getTowny().catch(() => null);
  const data = await processTownyData(rawData);
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
        value:
          `• **Mayor / Owner:** \`${mayorName}\`${town.ruined ? ' *(Preserved)*' : ''}\n` +
          (town.ruined ? `• **Status:** \`⚠️ Ruined (Fallen into ruin)\`\n` : '') +
          `• **Mayor UUID:** \`${mayorUuid.substring(0, 8)}...\`\n• **Nation:** \`${nationName}\``,
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
    nation?.name || null,
    options
  );

  return {
    embeds: [embed],
    components: navRow ? [navRow] : [],
  };
}

/**
 * Renders Nation profile embed and navigation row
 * @param {string} nationName
 * @param {object} [options={}]
 */
async function renderNationView(nationName, options = {}) {
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
    capital.name || null,
    options
  );

  return {
    embeds: [embed],
    components: navRow ? [navRow] : [],
  };
}

/**
 * Renders Player profile embed and navigation row
 * @param {string} playerName
 * @param {object} [options={}]
 */
async function renderPlayerView(playerName, options = {}) {
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
    true,
    options
  );

  return {
    embeds: [embed],
    components: navRow ? [navRow] : [],
  };
}

/**
 * Renders Player Shop profile embed and navigation row
 * @param {string} ownerOrShopName
 * @param {object} [options={}]
 */
async function renderShopView(ownerOrShopName, options = {}) {
  const query = String(ownerOrShopName).trim().toLowerCase();

  let shopsList = [];
  if (redisClient && redisClient.status === 'ready') {
    try {
      const cached = await redisClient.get('cache:shops');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Array.isArray(parsed.shops)) {
          shopsList = parsed.shops;
        }
      }
    } catch {
      // ignore
    }
  }

  if (shopsList.length === 0 && db) {
    try {
      shopsList = await db.select().from(playerShops);
    } catch {
      // ignore
    }
  }

  const shop = shopsList.find((s) => {
    if (!s) return false;
    const o = (s.ownerName || s.owner || '').toLowerCase();
    const n = (s.name || '').toLowerCase();
    const k = (s.key || '').toLowerCase();
    return o === query || n === query || k === query;
  });

  if (!shop) {
    return {
      embeds: [
        errorEmbed(
          'Shop Not Found',
          `No player shop found matching \`${ownerOrShopName}\`. The player may not own an active market stall.`
        ),
      ],
      components: [],
    };
  }

  const shopName = (shop.name || 'Player Shop').replace(/_/g, ' ');
  const worldName = shop.world || 'currentarc';
  const coords = `X: ${shop.plotX ?? 0}, Z: ${shop.plotZ ?? 0}`;
  const ownerUuid = shop.owner || 'Unknown';
  const shopCurrency = shop.currency ? shop.currency.toUpperCase() : 'N/A';

  const embed = createBaseEmbed()
    .setColor(EMBED_COLORS.CYBER)
    .setTitle(`🛒 Shop Details: ${shopName}`)
    .setDescription(`Detailed inventory and profile telemetry for player shop **${shopName}**.`)
    .addFields(
      {
        name: 'Profile Metadata',
        value: `• **Owner:** \`${shop.ownerName || 'Unknown'}\`\n• **Owner UUID:** \`${ownerUuid}\`\n• **Location:** \`${coords}\` in \`${worldName}\`\n• **Primary Currency:** \`${shopCurrency}\``,
        inline: false,
      },
      {
        name: 'Town Territory',
        value: `• **Town:** \`${shop.townName || 'Wilderness / None'}\``,
        inline: true,
      }
    );

  const navRow = createShopNavRow(shop.ownerName || shop.owner, shop.townName, options);

  return {
    embeds: [embed],
    components: navRow ? [navRow] : [],
  };
}

/**
 * Renders Town Residents roster embed and navigation row
 * @param {string} townName
 * @param {object} [options={}]
 */
async function renderTownPlayersView(townName, options = {}) {
  const queryLower = String(townName).toLowerCase().trim();
  const queryClean = queryLower.replace(/_/g, ' ');

  const rawData = await arcadiaApi.getTowny().catch(() => null);
  const data = await processTownyData(rawData);
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

  const formattedName = town.name ? town.name.replace(/_/g, ' ') : 'Unknown Town';
  const mayorName = town.mayor?.name || 'Unknown';

  const residentsMap = new Map();

  if (db) {
    try {
      const dbRes = await db
        .select()
        .from(playerProfiles)
        .where(or(eq(playerProfiles.townId, town.id), eq(playerProfiles.townName, town.name)));
      for (const r of dbRes) {
        if (isNpcPlayer(r.name)) continue;
        residentsMap.set(r.name.toLowerCase(), {
          name: r.name,
          displayName: r.displayName || r.name,
          rank: r.rank || 'PLAYER',
          isOnline: false,
          isMayor: r.name?.toLowerCase() === mayorName.toLowerCase(),
        });
      }
    } catch {
      // ignore
    }
  }

  const playersCache = await getPlayersCache();
  const onlineList = Array.isArray(playersCache?.players) ? playersCache.players : [];
  for (const p of onlineList) {
    if (isNpcPlayer(p.name)) continue;
    if (p.town?.id === town.id || p.town?.name?.toLowerCase() === town.name.toLowerCase()) {
      const existing = residentsMap.get(p.name.toLowerCase()) || {};
      residentsMap.set(p.name.toLowerCase(), {
        ...existing,
        name: p.name,
        displayName: p.displayName || p.name,
        rank: p.rank || 'PLAYER',
        isOnline: true,
        isMayor: p.name?.toLowerCase() === mayorName.toLowerCase(),
      });
    }
  }

  if (
    mayorName &&
    mayorName !== 'Unknown' &&
    !isNpcPlayer(mayorName) &&
    !residentsMap.has(mayorName.toLowerCase())
  ) {
    residentsMap.set(mayorName.toLowerCase(), {
      name: mayorName,
      displayName: mayorName,
      rank: town.ruined ? 'MAYOR / OWNER' : 'MAYOR',
      isOnline: false,
      isMayor: true,
    });
  }

  const allResidents = Array.from(residentsMap.values());
  allResidents.sort((a, b) => {
    if (a.isMayor) return -1;
    if (b.isMayor) return 1;
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return a.name.localeCompare(b.name);
  });

  const residentLines = allResidents.slice(0, 15).map((r, idx) => {
    const mayorBadge = r.isMayor
      ? town.ruined
        ? ' 👑 **[MAYOR / PRESERVED OWNER]**'
        : ' 👑 **[MAYOR]**'
      : '';
    const statusDot = r.isOnline ? '🟢' : '⚪';
    const nickStr = r.displayName && r.displayName !== r.name ? ` (${r.displayName})` : '';
    return `\`${idx + 1}.\` ${statusDot} **${r.name}**${nickStr}${mayorBadge} · \`${r.rank}\``;
  });

  const embed = createBaseEmbed()
    .setColor(EMBED_COLORS.CYBER)
    .setTitle(`👥 Residents Directory: ${formattedName}`)
    .setDescription(
      `Showing **${allResidents.length}** recorded resident(s) for town **${formattedName}**.\n\n` +
        (residentLines.length > 0
          ? residentLines.join('\n')
          : 'No resident telemetry recorded yet.') +
        (allResidents.length > 15 ? `\n\n*... and ${allResidents.length - 15} more.*` : '')
    );

  const row = new ActionRowBuilder();
  const ownerSuffix = options?.ownerId ? `:u_${options.ownerId}` : '';
  const currentEncoded = encodeURIComponent(town.name);

  // Back button to Town Overview
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`nav_town:${currentEncoded}:from_ptown:${currentEncoded}${ownerSuffix}`)
      .setLabel(`Back: ${formattedName.slice(0, 16)}`)
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary)
  );

  if (mayorName && mayorName !== 'Unknown') {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_player:${encodeURIComponent(mayorName)}:from_ptown:${currentEncoded}${ownerSuffix}`
        )
        .setLabel(`Mayor: ${mayorName.slice(0, 16)}`)
        .setEmoji('👑')
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (town.nation?.name) {
    const cleanNation = town.nation.name.replace(/_/g, ' ');
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_nation:${encodeURIComponent(town.nation.name)}:from_ptown:${currentEncoded}${ownerSuffix}`
        )
        .setLabel(`Nation: ${cleanNation.slice(0, 16)}`)
        .setEmoji('🚩')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setURL(`${DASHBOARD_URL}/towny?tab=towns&search=${encodeURIComponent(town.name)}`)
      .setLabel('Web Dashboard')
      .setEmoji('🌐')
      .setStyle(ButtonStyle.Link)
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

/**
 * Renders Nation Residents roster embed and navigation row
 * @param {string} nationName
 * @param {object} [options={}]
 */
async function renderNationPlayersView(nationName, options = {}) {
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
  const kingName = nation.king?.name || 'Unknown';

  const residentsMap = new Map();

  if (db) {
    try {
      const dbRes = await db
        .select()
        .from(playerProfiles)
        .where(
          or(eq(playerProfiles.nationId, nation.id), eq(playerProfiles.nationName, nation.name))
        );
      for (const r of dbRes) {
        residentsMap.set(r.name.toLowerCase(), {
          name: r.name,
          displayName: r.displayName || r.name,
          rank: r.rank || 'PLAYER',
          isOnline: false,
          isKing: r.name?.toLowerCase() === kingName.toLowerCase(),
        });
      }
    } catch {
      // ignore
    }
  }

  const playersCache = await getPlayersCache();
  const onlineList = Array.isArray(playersCache?.players) ? playersCache.players : [];
  for (const p of onlineList) {
    if (p.nation?.id === nation.id || p.nation?.name?.toLowerCase() === nation.name.toLowerCase()) {
      const existing = residentsMap.get(p.name.toLowerCase()) || {};
      residentsMap.set(p.name.toLowerCase(), {
        ...existing,
        name: p.name,
        displayName: p.displayName || p.name,
        rank: p.rank || 'PLAYER',
        isOnline: true,
        isKing: p.name?.toLowerCase() === kingName.toLowerCase(),
      });
    }
  }

  if (kingName && kingName !== 'Unknown' && !residentsMap.has(kingName.toLowerCase())) {
    residentsMap.set(kingName.toLowerCase(), {
      name: kingName,
      displayName: kingName,
      rank: 'KING',
      isOnline: false,
      isKing: true,
    });
  }

  const allResidents = Array.from(residentsMap.values());
  allResidents.sort((a, b) => {
    if (a.isKing) return -1;
    if (b.isKing) return 1;
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return a.name.localeCompare(b.name);
  });

  const residentLines = allResidents.slice(0, 15).map((r, idx) => {
    const kingBadge = r.isKing ? ' 👑 **[KING]**' : '';
    const statusDot = r.isOnline ? '🟢' : '⚪';
    const nickStr = r.displayName && r.displayName !== r.name ? ` (${r.displayName})` : '';
    return `\`${idx + 1}.\` ${statusDot} **${r.name}**${nickStr}${kingBadge} · \`${r.rank}\``;
  });

  const embed = createBaseEmbed()
    .setColor(EMBED_COLORS.CYBER)
    .setTitle(`👥 Nation Residents: ${formattedName}`)
    .setDescription(
      `Showing **${allResidents.length}** recorded resident(s) across federation **${formattedName}**.\n\n` +
        (residentLines.length > 0
          ? residentLines.join('\n')
          : 'No resident telemetry recorded yet.') +
        (allResidents.length > 15 ? `\n\n*... and ${allResidents.length - 15} more.*` : '')
    );

  const row = new ActionRowBuilder();
  const ownerSuffix = options?.ownerId ? `:u_${options.ownerId}` : '';
  const currentEncoded = encodeURIComponent(nation.name);

  // Back button to Nation Overview
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`nav_nation:${currentEncoded}:from_pnation:${currentEncoded}${ownerSuffix}`)
      .setLabel(`Back: ${formattedName.slice(0, 16)}`)
      .setEmoji('↩️')
      .setStyle(ButtonStyle.Secondary)
  );

  if (kingName && kingName !== 'Unknown') {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_player:${encodeURIComponent(kingName)}:from_pnation:${currentEncoded}${ownerSuffix}`
        )
        .setLabel(`King: ${kingName.slice(0, 16)}`)
        .setEmoji('👑')
        .setStyle(ButtonStyle.Primary)
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setURL(`${DASHBOARD_URL}/towny?tab=nations&search=${encodeURIComponent(nation.name)}`)
      .setLabel('Web Dashboard')
      .setEmoji('🌐')
      .setStyle(ButtonStyle.Link)
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

module.exports = {
  renderTownView,
  renderNationView,
  renderPlayerView,
  renderShopView,
  renderTownPlayersView,
  renderNationPlayersView,
};
