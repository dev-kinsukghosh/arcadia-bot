const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { syncConvoy } = require('../../services/convoySync.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const logger = require('../../utils/logger.js');
const pc = require('picocolors');

module.exports = {
  cooldown: 60,
  data: new SlashCommandBuilder()
    .setName('forcesync')
    .setDescription('Force sync all Convoy shop items from the ArcadiaMC API (Developer Only)'),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Parse developer IDs from environment configuration
    const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());

    if (!devIds.includes(interaction.user.id)) {
      logger.warn(
        `Unauthorized user ${pc.bold(interaction.user.tag)} (${interaction.user.id}) attempted to run /forcesync`
      );
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Access Denied',
            'You do not have permission to execute this developer command.'
          ),
        ],
      });
    }

    logger.info(
      `Developer ${pc.bold(interaction.user.tag)} triggered manual forced synchronization...`
    );

    try {
      await syncConvoy();

      logger.success('Manual forced synchronization complete.');

      // Check for newly downloaded icons and upload them in the background
      const { checkAndUploadEmojis } = require('../../../scripts/upload-emojis.js');
      checkAndUploadEmojis(interaction.client).catch(() => {});

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Sync Complete',
            'Successfully forced synchronization of all Convoy shop items from the API.'
          ),
        ],
      });
    } catch (err) {
      logger.error('Failed manual forced synchronization:', err);
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Sync Failed',
            `An error occurred during synchronization:\n\`\`\`\n${err.message}\n\`\`\``
          ),
        ],
      });
    }
  },
};
