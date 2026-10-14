const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5173';

/**
 * Builds interactive navigation buttons for a Town
 * @param {string} townName
 * @param {string|null} mayorName
 * @param {string|null} nationName
 * @param {object} [options={}]
 * @param {object|null} [options.back] - { type: 'player'|'nation'|'town', name: string }
 * @param {string|null} [options.ownerId] - Command invoker Discord user ID
 */
function createTownNavRow(townName, mayorName, nationName, options = {}) {
  const row = new ActionRowBuilder();
  const ownerSuffix = options?.ownerId ? `:u_${options.ownerId}` : '';
  const currentEncoded = encodeURIComponent(townName || '');

  // 1. Back button (if back target exists)
  if (options?.back && options.back.name) {
    const cleanBackName = options.back.name.replace(/_/g, ' ');
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_back:${options.back.type}:${encodeURIComponent(options.back.name)}${ownerSuffix}`
        )
        .setLabel(`Back: ${cleanBackName.slice(0, 16)}`)
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // 2. Mayor button (skip if back button already points to the Mayor)
  const isBackMayor =
    options?.back?.type === 'player' &&
    options?.back?.name?.toLowerCase() === mayorName?.toLowerCase();

  if (mayorName && !isBackMayor && row.components.length < 5) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_player:${encodeURIComponent(mayorName)}:from_town:${currentEncoded}${ownerSuffix}`
        )
        .setLabel(`Mayor: ${mayorName.slice(0, 16)}`)
        .setEmoji('👑')
        .setStyle(ButtonStyle.Primary)
    );
  }

  // 3. Town Players button
  if (townName && row.components.length < 5) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_ptown:${currentEncoded}:from_town:${currentEncoded}${ownerSuffix}`)
        .setLabel('Town Players')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // 4. Nation button (skip if back button already points to this Nation)
  const isBackNation =
    options?.back?.type === 'nation' &&
    options?.back?.name?.toLowerCase() === nationName?.toLowerCase();

  if (nationName && !isBackNation && row.components.length < 5) {
    const cleanNation = nationName.replace(/_/g, ' ');
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_nation:${encodeURIComponent(nationName)}:from_town:${currentEncoded}${ownerSuffix}`
        )
        .setLabel(`Nation: ${cleanNation.slice(0, 16)}`)
        .setEmoji('🚩')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // 5. Web Dashboard link
  if (townName && row.components.length < 5) {
    row.addComponents(
      new ButtonBuilder()
        .setURL(`${DASHBOARD_URL}/towny?tab=towns&search=${encodeURIComponent(townName)}`)
        .setLabel('Web Dashboard')
        .setEmoji('🌐')
        .setStyle(ButtonStyle.Link)
    );
  }

  return row.components.length > 0 ? row : null;
}

/**
 * Builds interactive navigation buttons for a Nation
 * @param {string} nationName
 * @param {string|null} kingName
 * @param {string|null} capitalName
 * @param {object} [options={}]
 * @param {object|null} [options.back] - { type: 'player'|'town'|'nation', name: string }
 * @param {string|null} [options.ownerId] - Command invoker Discord user ID
 */
function createNationNavRow(nationName, kingName, capitalName, options = {}) {
  const row = new ActionRowBuilder();
  const ownerSuffix = options?.ownerId ? `:u_${options.ownerId}` : '';
  const currentEncoded = encodeURIComponent(nationName || '');

  // 1. Back button (if back target exists)
  if (options?.back && options.back.name) {
    const cleanBackName = options.back.name.replace(/_/g, ' ');
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_back:${options.back.type}:${encodeURIComponent(options.back.name)}${ownerSuffix}`
        )
        .setLabel(`Back: ${cleanBackName.slice(0, 16)}`)
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // 2. King button (skip if back button already points to the King)
  const isBackKing =
    options?.back?.type === 'player' &&
    options?.back?.name?.toLowerCase() === kingName?.toLowerCase();

  if (kingName && !isBackKing && row.components.length < 5) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_player:${encodeURIComponent(kingName)}:from_nation:${currentEncoded}${ownerSuffix}`
        )
        .setLabel(`King: ${kingName.slice(0, 16)}`)
        .setEmoji('👑')
        .setStyle(ButtonStyle.Primary)
    );
  }

  // 3. Nation Players button
  if (nationName && row.components.length < 5) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_pnation:${currentEncoded}:from_nation:${currentEncoded}${ownerSuffix}`)
        .setLabel('Nation Players')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // 4. Capital button (skip if back button already points to the Capital)
  const isBackCapital =
    options?.back?.type === 'town' &&
    options?.back?.name?.toLowerCase() === capitalName?.toLowerCase();

  if (capitalName && !isBackCapital && row.components.length < 5) {
    const cleanCapital = capitalName.replace(/_/g, ' ');
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_town:${encodeURIComponent(capitalName)}:from_nation:${currentEncoded}${ownerSuffix}`
        )
        .setLabel(`Capital: ${cleanCapital.slice(0, 16)}`)
        .setEmoji('🏰')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // 5. Web Dashboard link
  if (nationName && row.components.length < 5) {
    row.addComponents(
      new ButtonBuilder()
        .setURL(`${DASHBOARD_URL}/towny?tab=nations&search=${encodeURIComponent(nationName)}`)
        .setLabel('Web Dashboard')
        .setEmoji('🌐')
        .setStyle(ButtonStyle.Link)
    );
  }

  return row.components.length > 0 ? row : null;
}

/**
 * Builds interactive navigation buttons for a Player Profile
 * @param {string} playerName
 * @param {string|null} townName
 * @param {string|null} nationName
 * @param {boolean|object} [hasShop=false]
 * @param {object} [options={}]
 * @param {object|null} [options.back] - { type: 'player'|'town'|'nation'|'shop', name: string }
 * @param {string|null} [options.ownerId] - Command invoker Discord user ID
 */
function createPlayerNavRow(playerName, townName, nationName, hasShop = false, options = {}) {
  if (typeof hasShop === 'object' && hasShop !== null) {
    options = hasShop;
    hasShop = false;
  }

  const row = new ActionRowBuilder();
  const ownerSuffix = options?.ownerId ? `:u_${options.ownerId}` : '';
  const currentEncoded = encodeURIComponent(playerName || '');

  // 1. Back button (if back target exists)
  if (options?.back && options.back.name) {
    const cleanBackName = options.back.name.replace(/_/g, ' ');
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_back:${options.back.type}:${encodeURIComponent(options.back.name)}${ownerSuffix}`
        )
        .setLabel(`Back: ${cleanBackName.slice(0, 16)}`)
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // 2. Town button (skip if back button already points to this Town)
  const isBackTown =
    options?.back?.type === 'town' &&
    options?.back?.name?.toLowerCase() === townName?.toLowerCase();

  if (townName && !isBackTown && row.components.length < 5) {
    const cleanTown = townName.replace(/_/g, ' ');
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_town:${encodeURIComponent(townName)}:from_player:${currentEncoded}${ownerSuffix}`
        )
        .setLabel(`Town: ${cleanTown.slice(0, 16)}`)
        .setEmoji('🏰')
        .setStyle(ButtonStyle.Primary)
    );
  }

  // 3. Nation button (skip if back button already points to this Nation)
  const isBackNation =
    options?.back?.type === 'nation' &&
    options?.back?.name?.toLowerCase() === nationName?.toLowerCase();

  if (nationName && !isBackNation && row.components.length < 5) {
    const cleanNation = nationName.replace(/_/g, ' ');
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_nation:${encodeURIComponent(nationName)}:from_player:${currentEncoded}${ownerSuffix}`
        )
        .setLabel(`Nation: ${cleanNation.slice(0, 16)}`)
        .setEmoji('🚩')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // 4. Shop button
  if (hasShop && playerName && row.components.length < 5) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_shop:${currentEncoded}:from_player:${currentEncoded}${ownerSuffix}`)
        .setLabel('Player Shop')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Success)
    );
  }

  // 5. Web Dashboard link
  if (playerName && row.components.length < 5) {
    row.addComponents(
      new ButtonBuilder()
        .setURL(`${DASHBOARD_URL}/players?search=${encodeURIComponent(playerName)}`)
        .setLabel('Web Dashboard')
        .setEmoji('🌐')
        .setStyle(ButtonStyle.Link)
    );
  }

  return row.components.length > 0 ? row : null;
}

/**
 * Builds interactive navigation buttons for a Shop Listing
 * @param {string} ownerName
 * @param {string|null} townName
 * @param {object} [options={}]
 * @param {object|null} [options.back] - { type: string, name: string }
 * @param {string|null} [options.ownerId] - Command invoker Discord user ID
 */
function createShopNavRow(ownerName, townName, options = {}) {
  const row = new ActionRowBuilder();
  const ownerSuffix = options?.ownerId ? `:u_${options.ownerId}` : '';
  const currentEncoded = encodeURIComponent(ownerName || 'shop');

  // 1. Back button (if back target exists)
  if (options?.back && options.back.name) {
    const cleanBackName = options.back.name.replace(/_/g, ' ');
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_back:${options.back.type}:${encodeURIComponent(options.back.name)}${ownerSuffix}`
        )
        .setLabel(`Back: ${cleanBackName.slice(0, 16)}`)
        .setEmoji('↩️')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // 2. Owner button (skip if back button already points to owner)
  const isBackOwner =
    options?.back?.type === 'player' &&
    options?.back?.name?.toLowerCase() === ownerName?.toLowerCase();

  if (ownerName && !isBackOwner && row.components.length < 5) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_player:${encodeURIComponent(ownerName)}:from_shop:${currentEncoded}${ownerSuffix}`
        )
        .setLabel(`Owner: ${ownerName.slice(0, 16)}`)
        .setEmoji('👤')
        .setStyle(ButtonStyle.Primary)
    );
  }

  // 3. Shop Town button (skip if back button already points to shop town)
  const isBackTown =
    options?.back?.type === 'town' &&
    options?.back?.name?.toLowerCase() === townName?.toLowerCase();

  if (townName && !isBackTown && row.components.length < 5) {
    const cleanTown = townName.replace(/_/g, ' ');
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `nav_town:${encodeURIComponent(townName)}:from_shop:${currentEncoded}${ownerSuffix}`
        )
        .setLabel(`Shop Town: ${cleanTown.slice(0, 16)}`)
        .setEmoji('🏰')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  // 4. Web Dashboard link
  if (ownerName && row.components.length < 5) {
    row.addComponents(
      new ButtonBuilder()
        .setURL(`${DASHBOARD_URL}/shops?search=${encodeURIComponent(ownerName)}`)
        .setLabel('Web Dashboard')
        .setEmoji('🌐')
        .setStyle(ButtonStyle.Link)
    );
  }

  return row.components.length > 0 ? row : null;
}

module.exports = {
  createTownNavRow,
  createNationNavRow,
  createPlayerNavRow,
  createShopNavRow,
};
