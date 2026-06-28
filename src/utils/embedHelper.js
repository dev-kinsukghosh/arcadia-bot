const { EmbedBuilder } = require('discord.js');

// Brand Colors (Cyber theme matching the logger)
const EMBED_COLORS = {
  DEFAULT: 0x5865f2, // Discord Blurple
  SUCCESS: 0x2ecc71, // Cyber Green
  INFO: 0x3498db, // Cyber Blue
  WARNING: 0xf1c40f, // Amber Yellow
  ERROR: 0xe74c3c, // Crimson Red
  CYBER: 0xbb86fc, // Neon Purple
};

/**
 * Creates a base embed with default brand styling (timestamp, color)
 * @returns {EmbedBuilder}
 */
function createBaseEmbed() {
  return new EmbedBuilder()
    .setColor(EMBED_COLORS.CYBER)
    .setTimestamp()
    .setFooter({ text: 'ArcadiaMC Community Bot By _webdevkin' });
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
