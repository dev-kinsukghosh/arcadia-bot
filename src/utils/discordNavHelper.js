const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5173';

/**
 * Builds interactive navigation buttons for a Town
 */
function createTownNavRow(townName, mayorName, nationName) {
  const row = new ActionRowBuilder();

  if (mayorName) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_player:${mayorName}`)
        .setLabel(`Mayor: ${mayorName}`)
        .setEmoji('👑')
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (townName) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_ptown:${townName}`)
        .setLabel('Town Players')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (nationName) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_nation:${nationName}`)
        .setLabel(`Nation: ${nationName}`)
        .setEmoji('🚩')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (townName) {
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
 */
function createNationNavRow(nationName, kingName, capitalName) {
  const row = new ActionRowBuilder();

  if (kingName) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_player:${kingName}`)
        .setLabel(`King: ${kingName}`)
        .setEmoji('👑')
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (nationName) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_pnation:${nationName}`)
        .setLabel('Nation Players')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (capitalName) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_town:${capitalName}`)
        .setLabel(`Capital: ${capitalName}`)
        .setEmoji('🏰')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (nationName) {
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
 */
function createPlayerNavRow(playerName, townName, nationName, hasShop = false) {
  const row = new ActionRowBuilder();

  if (townName) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_town:${townName}`)
        .setLabel(`Town: ${townName}`)
        .setEmoji('🏰')
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (nationName) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_nation:${nationName}`)
        .setLabel(`Nation: ${nationName}`)
        .setEmoji('🚩')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (hasShop && playerName) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_shop:${playerName}`)
        .setLabel('Player Shop')
        .setEmoji('🛒')
        .setStyle(ButtonStyle.Success)
    );
  }

  if (playerName) {
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
 */
function createShopNavRow(ownerName, townName) {
  const row = new ActionRowBuilder();

  if (ownerName) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_player:${ownerName}`)
        .setLabel(`Owner: ${ownerName}`)
        .setEmoji('👤')
        .setStyle(ButtonStyle.Primary)
    );
  }

  if (townName) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`nav_town:${townName}`)
        .setLabel(`Shop Town: ${townName}`)
        .setEmoji('🏰')
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (ownerName) {
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
