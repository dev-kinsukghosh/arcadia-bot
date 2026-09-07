const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const os = require('os');
const { connection } = require('../../utils/db.js');
const redis = require('../../utils/redis.js');
const { getIsOmReady } = require('../../utils/redisOm.js');
const prettyMs = require('pretty-ms');
const bytes = require('bytes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('healthz')
    .setDescription('let the bot dev see bot status server usuage etc'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Validate developer access
    const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());
    if (!devIds.includes(interaction.user.id)) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Access Denied',
            'You do not have permission to execute this developer command.'
          ),
        ],
      });
    }

    // Database Status
    let dbStatus = '🟢 Connected';
    try {
      await connection.execute('SELECT 1');
    } catch {
      dbStatus = '🔴 Disconnected';
    }

    // Redis Status
    let redisStatus = '🔴 Disconnected';
    if (redis && redis.status === 'ready') {
      redisStatus = `🟢 Connected (OM: ${getIsOmReady() ? 'Ready' : 'Not Active'})`;
    }

    // Server memory/usage with bytes utility
    const memory = process.memoryUsage();
    const rssFormatted = bytes(memory.rss);
    const heapFormatted = bytes(memory.heapUsed);

    const osFreeMemFormatted = bytes(os.freemem());
    const osTotalMemFormatted = bytes(os.totalmem());

    // Bot uptime formatted with pretty-ms
    const uptimeFormatted = prettyMs(process.uptime() * 1000, { compact: true });

    const description =
      `### 📊 System Health\n` +
      `*   **Bot Uptime:** \`${uptimeFormatted}\`\n` +
      `*   **OS Platform:** \`${os.platform()} (${os.arch()})\`\n` +
      `*   **System CPU Cores:** \`${os.cpus().length}\`\n` +
      `*   **System Load (1m):** \`${os.loadavg()[0].toFixed(2)}\`\n` +
      `*   **System Memory:** \`${osFreeMemFormatted} / ${osTotalMemFormatted}\` free\n\n` +
      `### 🖥️ Process Usage\n` +
      `*   **Resident Set Size (RSS):** \`${rssFormatted}\`\n` +
      `*   **Heap Used:** \`${heapFormatted}\`\n\n` +
      `### 🔌 Service Connections\n` +
      `*   **MySQL (Drizzle):** ${dbStatus}\n` +
      `*   **Redis Cache:** ${redisStatus}`;

    return interaction.editReply({
      embeds: [successEmbed('Health & Resource Usage Status', description)],
    });
  },
};
