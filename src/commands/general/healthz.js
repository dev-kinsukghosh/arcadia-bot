const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const os = require('os');
const { connection } = require('../../utils/db.js');
const redis = require('../../utils/redis.js');
const { getIsOmReady } = require('../../utils/redisOm.js');

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

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

    // Server memory/usage
    const memory = process.memoryUsage();
    const rssMB = (memory.rss / 1024 / 1024).toFixed(1);
    const heapMB = (memory.heapUsed / 1024 / 1024).toFixed(1);

    const osFreeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
    const osTotalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);

    const description =
      `### 📊 System Health\n` +
      `*   **Bot Uptime:** \`${formatUptime(process.uptime())}\`\n` +
      `*   **OS Platform:** \`${os.platform()} (${os.arch()})\`\n` +
      `*   **System CPU Cores:** \`${os.cpus().length}\`\n` +
      `*   **System Load (1m):** \`${os.loadavg()[0].toFixed(2)}\`\n` +
      `*   **System Memory:** \`${osFreeMem}GB / ${osTotalMem}GB\` free\n\n` +
      `### 🖥️ Process Usage\n` +
      `*   **Resident Set Size (RSS):** \`${rssMB} MB\`\n` +
      `*   **Heap Used:** \`${heapMB} MB\`\n\n` +
      `### 🔌 Service Connections\n` +
      `*   **MySQL (Drizzle):** ${dbStatus}\n` +
      `*   **Redis Cache:** ${redisStatus}`;

    return interaction.editReply({
      embeds: [successEmbed('Health & Resource Usage Status', description)],
    });
  },
};
