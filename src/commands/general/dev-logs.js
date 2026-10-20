const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const { logBuffer } = require('../../utils/logBuffer.js');

const LEVEL_ICONS = {
  DEBUG: '⚙️',
  INFO: '🔹',
  SYSTEM: '📡',
  SUCCESS: '✅',
  WARNING: '⚠️',
  ERROR: '❌',
  CRITICAL: '💀',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dev-logs')
    .setDescription('view recent system and bot logs')
    .addStringOption((opt) =>
      opt
        .setName('level')
        .setDescription('filter by log level')
        .setRequired(false)
        .addChoices(
          { name: 'All Levels', value: 'ALL' },
          { name: 'Errors & Criticals', value: 'ERROR,CRITICAL' },
          { name: 'Warnings', value: 'WARNING' },
          { name: 'Info & System', value: 'INFO,SYSTEM' },
          { name: 'Debug', value: 'DEBUG' }
        )
    )
    .addIntegerOption((opt) =>
      opt
        .setName('limit')
        .setDescription('number of log entries to retrieve')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(25)
    )
    .addStringOption((opt) =>
      opt.setName('search').setDescription('search query in log messages').setRequired(false)
    ),

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

    const levelOpt = interaction.options.getString('level');
    const limitOpt = interaction.options.getInteger('limit') || 10;
    const searchOpt = interaction.options.getString('search');

    const filterLevel = levelOpt && levelOpt !== 'ALL' ? levelOpt : null;

    const result = logBuffer.getLogs({
      level: filterLevel,
      search: searchOpt,
      limit: limitOpt,
      order: 'desc',
    });

    const stats = logBuffer.getStats();

    if (result.logs.length === 0) {
      return interaction.editReply({
        embeds: [
          successEmbed(
            'Application & System Logs',
            'No log entries found matching the specified filters.\n\n' +
              `*   **Buffered Logs:** \`${stats.bufferedCount} / ${stats.capacity}\`\n` +
              `*   **Lifetime Total:** \`${stats.total}\``
          ),
        ],
      });
    }

    let description = `### 📜 Application Logs (${result.logs.length} displayed)\n`;
    description += `*Stats: ❌ \`${stats.ERROR + stats.CRITICAL}\` errors, ⚠️ \`${stats.WARNING}\` warnings, 🔹 \`${stats.INFO}\` info*\n\n`;

    for (const log of result.logs) {
      const icon = LEVEL_ICONS[log.level] || '•';
      const timeStr = new Date(log.time).toLocaleTimeString('en-US', { hour12: false });
      const truncatedMsg =
        log.message.length > 100 ? `${log.message.slice(0, 97)}...` : log.message;

      description += `\`[${timeStr}]\` ${icon} **${log.level}**: ${truncatedMsg}\n`;
      if (log.details) {
        const detailStr =
          typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details);
        const cleanDetail = detailStr.length > 80 ? `${detailStr.slice(0, 77)}...` : detailStr;
        description += `> \`${cleanDetail}\`\n`;
      }
    }

    return interaction.editReply({
      embeds: [successEmbed('Application & System Logs', description)],
    });
  },
};
