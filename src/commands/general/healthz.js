const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const os = require('os');
const { telemetry } = require('../../utils/telemetry.js');
const { getIsOmReady } = require('../../utils/redisOm.js');
const prettyMs = require('pretty-ms');
const bytes = require('bytes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('healthz')
    .setDescription('view bot health and resource metrics'),

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

    const snapshot = await telemetry.getSnapshot();

    // Database Status & Latency
    const dbStatus = snapshot.database.connected
      ? `🟢 Connected (\`${snapshot.database.latencyMs}ms\`)`
      : `🔴 Disconnected (${snapshot.database.error || 'Error'})`;

    // Redis Status & Latency
    let redisStatus = '🔴 Disconnected';
    if (snapshot.redis.connected) {
      redisStatus = `🟢 Connected (\`${snapshot.redis.latencyMs}ms\`, ${snapshot.redis.usedMemoryHuman}, OM: ${getIsOmReady() ? 'Ready' : 'Off'})`;
    }

    // Sync Services Overview
    const servicesList = Object.entries(snapshot.services);
    const healthyCount = servicesList.filter(([, s]) => s.status !== 'error').length;
    const servicesStatusStr = `🟢 ${healthyCount}/${servicesList.length} operational`;

    // Server memory & CPU
    const memory = process.memoryUsage();
    const rssFormatted = bytes(memory.rss);
    const heapFormatted = bytes(memory.heapUsed);
    const osFreeMemFormatted = bytes(os.freemem());
    const osTotalMemFormatted = bytes(os.totalmem());

    // Bot uptime
    const uptimeFormatted = prettyMs(process.uptime() * 1000, { compact: true });

    const description =
      `### 📊 System Health\n` +
      `*   **Bot Uptime:** \`${uptimeFormatted}\`\n` +
      `*   **Process CPU Usage:** \`${snapshot.system.cpuPercent}%\` (${os.cpus().length} Cores)\n` +
      `*   **Event Loop Lag:** \`${snapshot.system.eventLoopLagMs}ms\`\n` +
      `*   **System Load (1m):** \`${os.loadavg()[0].toFixed(2)}\`\n` +
      `*   **System RAM:** \`${osFreeMemFormatted} / ${osTotalMemFormatted}\` free\n\n` +
      `### 🖥️ Memory Footprint\n` +
      `*   **Resident Set Size (RSS):** \`${rssFormatted}\`\n` +
      `*   **Heap Used:** \`${heapFormatted}\` (Total: \`${bytes(memory.heapTotal)}\`)\n\n` +
      `### 🔌 Infrastructure & Services\n` +
      `*   **MySQL (Drizzle):** ${dbStatus}\n` +
      `*   **Redis Cache:** ${redisStatus}\n` +
      `*   **Background Sync Services:** ${servicesStatusStr}\n` +
      `*   **Discord Gateway WS Ping:** \`${snapshot.discord.wsPingMs}ms\``;

    return interaction.editReply({
      embeds: [successEmbed('Health & Resource Telemetry', description)],
    });
  },
};

