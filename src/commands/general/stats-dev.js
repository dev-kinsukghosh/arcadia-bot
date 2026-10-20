const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const { telemetry } = require('../../utils/telemetry.js');
const redis = require('../../utils/redis.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats-dev')
    .setDescription('view bot and web developer telemetry'),

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

    // Command metrics
    const totalCmds = snapshot.commands.total || 0;
    const successRate = snapshot.commands.successRate || 100;
    const avgDuration = snapshot.commands.avgDurationMs || 0;
    const topCmds = snapshot.commands.topCommands.slice(0, 3);
    const topCmdsStr =
      topCmds.length > 0
        ? topCmds.map((c) => `\`/${c.name}\` (${c.count})`).join(', ')
        : 'None recorded yet';

    // Web & HTTP metrics
    const httpTotal = snapshot.http.totalRequests || 0;
    const cacheHitRatio = snapshot.http.cacheHitRatioPercent || 0;
    const pageviews = snapshot.web.pageViewsTotal || 0;
    const activeVisitors = snapshot.web.activeVisitors || 0;

    // Recent command executions
    const recentCmds = snapshot.commands.recent.slice(0, 3);
    const recentStr =
      recentCmds.length > 0
        ? recentCmds
            .map(
              (r) =>
                `• \`/${r.command}\` by **${r.userTag}** (${r.durationMs}ms) ${r.success ? '✅' : '❌'}`
            )
            .join('\n')
        : 'No recent executions';

    let description = '### 🤖 Discord Bot Telemetry\n';
    description += `*   **Lifetime Commands Run:** \`${totalCmds}\`\n`;
    description += `*   **Command Success Rate:** \`${successRate}%\`\n`;
    description += `*   **Average Execution Time:** \`${avgDuration}ms\`\n`;
    description += `*   **Active Guilds:** \`${snapshot.discord.guildsCount}\` (WS Ping: \`${snapshot.discord.wsPingMs}ms\`)\n`;
    description += `*   **Top Commands:** ${topCmdsStr}\n\n`;

    description += '### 🌐 Web & Dashboard Telemetry\n';
    description += `*   **Total API Requests:** \`${httpTotal}\` (Avg Latency: \`${snapshot.http.avgDurationMs}ms\`)\n`;
    description += `*   **Cache Hit Ratio:** \`${cacheHitRatio}%\` (${snapshot.http.cacheHits} hits / ${snapshot.http.cacheMisses} misses)\n`;
    description += `*   **Web Page Views:** \`${pageviews}\`\n`;
    description += `*   **Active Web Visitors (5m):** \`${activeVisitors}\`\n\n`;

    description += '### ⏱️ Recent Command Activity\n';
    description += `${recentStr}\n`;

    return interaction.editReply({
      embeds: [successEmbed('Developer Telemetry (Bot & Web)', description)],
    });
  },
};

