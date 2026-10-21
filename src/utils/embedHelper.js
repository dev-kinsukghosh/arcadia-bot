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

/**
 * Formats a date, string, or epoch timestamp into an explicit UTC string with dynamic Discord relative timestamp.
 * Format: `YYYY-MM-DD HH:mm:ss UTC` (<t:epoch:R>)
 *
 * @param {Date|string|number} dateInput
 * @param {object} [options]
 * @param {boolean} [options.includeRelative=true]
 * @param {boolean} [options.includeSeconds=true]
 * @returns {string}
 */
function formatUtcTime(dateInput, options = {}) {
  if (!dateInput) return 'Unknown';

  const { includeRelative = true, includeSeconds = true } = options;

  let d;
  if (dateInput instanceof Date) {
    d = dateInput;
  } else if (typeof dateInput === 'number') {
    d = new Date(dateInput < 9999999999 ? dateInput * 1000 : dateInput);
  } else if (typeof dateInput === 'string') {
    const num = Number(dateInput);
    if (!isNaN(num) && num > 0) {
      d = new Date(num < 9999999999 ? num * 1000 : num);
    } else {
      const sanitized =
        dateInput.includes('Z') || dateInput.includes('+') || dateInput.includes('T')
          ? dateInput
          : `${dateInput.replace(' ', 'T')}Z`;
      d = new Date(sanitized);
    }
  } else {
    d = new Date(dateInput);
  }

  if (isNaN(d.getTime())) {
    return 'Unknown';
  }

  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const min = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());

  const timeStr = includeSeconds
    ? `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} UTC`
    : `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;

  const epochSec = Math.floor(d.getTime() / 1000);
  const nowSec = Math.floor(Date.now() / 1000);
  // Guard against minor clock skew showing "in a few seconds" for just-updated records
  const relativeSec = epochSec > nowSec && epochSec - nowSec <= 10 ? nowSec : epochSec;

  if (includeRelative) {
    return `\`${timeStr}\` (<t:${relativeSec}:R>)`;
  }
  return `\`${timeStr}\``;
}

module.exports = {
  createBaseEmbed,
  successEmbed,
  errorEmbed,
  infoEmbed,
  formatUtcTime,
  EMBED_COLORS,
};
