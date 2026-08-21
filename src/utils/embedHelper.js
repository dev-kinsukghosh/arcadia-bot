const { EmbedBuilder } = require('discord.js');

// Brand Colors (Cyber theme matching the logger)
const EMBED_COLORS = {
  DEFAULT: 0x5865f2, // Discord Blurple
  SUCCESS: 0x2ecc71, // Cyber Green
  INFO: 0x3498db, // Cyber Blue
  WARNING: 0xf1c40f, // Amber Yellow
  ERROR: 0xe74c3c, // Crimson Red
  CYBER: 0x4f1f7d, // Neon Purple
};

/**
 * Creates a base embed with default brand styling (timestamp, color, global header/footer)
 * @returns {EmbedBuilder}
 */
function createBaseEmbed() {
  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.CYBER)
    .setTimestamp()
    .setAuthor({
      name: 'ArcadiaMC Network Bot',
    })
    .setFooter({
      text: 'ArcadiaMC Community bot By _webdevkin · play.arcadiamc.net',
    });

  // TODO: Remove this warning prefix override when API issues are resolved
  const originalSetDescription = embed.setDescription.bind(embed);
  embed.setDescription = (description) => {
    const title = embed.data.title || '';
    const isStatsEmbed = /currency|market|convoy|towny|nation|town|shop|rotating|history/i.test(
      title
    );

    if (
      isStatsEmbed &&
      description &&
      !description.startsWith('✅') &&
      !description.startsWith('❌')
    ) {
      const warningPrefix = `⚠️ **API Outage / Maintenance Notice:** The live API is offline/glitched. Data shown below is frozen from a 7-day backup and is currently static.\n\n`;
      return originalSetDescription(warningPrefix + description);
    }
    return originalSetDescription(description);
  };

  return embed;
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
