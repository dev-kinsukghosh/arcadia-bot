const { EmbedBuilder } = require('discord.js');

// Brand Colors (Cyber theme matching the logger)
const EMBED_COLORS = {
  DEFAULT: 0x5865f2, // Discord Blurple
  SUCCESS: 0x2ecc71, // Cyber Green
  INFO: 0x3498db, // Cyber Blue
  WARNING: 0xf1c40f, // Amber Yellow
  ERROR: 0xe74c3c, // Crimson Red
  CYBER: 0x4f1f7d, // Neon Purple
  GOLD: 0xf1c40f, // Bright Gold
  NEON_CYAN: 0x00f3ff, // Electric Cyan
  HOT_PINK: 0xff007f, // Neon Pink
  ROYAL_BLUE: 0x4169e1, // Royal Blue
  EMERALD: 0x50c878, // Emerald Green
  ORANGE: 0xe67e22, // Sunset Orange
  OBSIDIAN: 0x111111, // Dark Obsidian
  WHITE: 0xffffff, // Pure White
};

/**
 * Creates a base embed with default brand styling (timestamp, color, global header/footer)
 * @returns {EmbedBuilder}
 */
function createBaseEmbed() {
  return new EmbedBuilder()
    .setColor(EMBED_COLORS.CYBER)
    .setTimestamp()
    .setAuthor({
      name: 'ArcadiaMC Network Bot',
    })
    .setFooter({
      text: 'ArcadiaMC Community bot By _webdevkin · play.arcadiamc.net',
    });
}

/**
 * Helper to build a standard success embed
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function successEmbed(title, description) {
  return createBaseEmbed()
    .setColor(EMBED_COLORS.SUCCESS)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
}

/**
 * Helper to build a standard error embed
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function errorEmbed(title, description) {
  return createBaseEmbed()
    .setColor(EMBED_COLORS.ERROR)
    .setTitle(`❌ ${title}`)
    .setDescription(description);
}

/**
 * Helper to build a standard info/system embed
 * @param {string} title
 * @param {string} description
 * @returns {EmbedBuilder}
 */
function infoEmbed(title, description) {
  return createBaseEmbed()
    .setColor(EMBED_COLORS.INFO)
    .setTitle(`🔹 ${title}`)
    .setDescription(description);
}

module.exports = {
  createBaseEmbed,
  successEmbed,
  errorEmbed,
  infoEmbed,
  EMBED_COLORS,
};
