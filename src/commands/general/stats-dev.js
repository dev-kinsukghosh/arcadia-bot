const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const redis = require('../../utils/redis.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats-dev')
    .setDescription('view bot developer statistics'),

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

    // Retrieve stats from Redis
    let totalCommands = 0;
    let mostUsedCommandStr = 'None';

    if (redis && redis.status === 'ready') {
      try {
        totalCommands = parseInt((await redis.get('stats:commands:total')) || '0', 10);
        const commandUsage = await redis.hgetall('stats:commands:usage');

        let maxCount = 0;
        let mostUsed = '';

        for (const [cmd, countStr] of Object.entries(commandUsage)) {
          const count = parseInt(countStr, 10);
          if (count > maxCount) {
            maxCount = count;
            mostUsed = cmd;
          }
        }

        if (mostUsed) {
          mostUsedCommandStr = `\`/${mostUsed}\` (used **${maxCount}** times)`;
        }
      } catch {
        // Ignore stats retrieval errors
      }
    }

    let description = '### 📊 Bot Statistics\n';
    description += `*   **Lifetime Commands Run:** \`${totalCommands}\`\n`;
    description += `*   **Guilds (Servers) Active:** \`${interaction.client.guilds.cache.size}\`\n`;
    description += `*   **Most Used Command:** ${mostUsedCommandStr}\n`;

    return interaction.editReply({
      embeds: [successEmbed('Developer Stats & Command Telemetry', description)],
    });
  },
};
