const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {
  createBaseEmbed,
  successEmbed,
  errorEmbed,
  formatUtcTime,
  EMBED_COLORS,
} = require('../../utils/embedHelper.js');
const {
  isMaintenanceActive,
  setMaintenance,
  isDevUser,
} = require('../../utils/maintenanceHelper.js');
const logger = require('../../utils/logger.js');
const pc = require('picocolors');

module.exports = {
  cooldown: 3,
  summary: 'Toggle maintenance mode (Dev Only)',
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Toggle maintenance mode on or off (Developer Only)')
    .addStringOption((option) =>
      option
        .setName('r')
        .setDescription('Reason for maintenance mode (optional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    // Restrict access strictly to verified bot developers
    if (!isDevUser(interaction.user.id)) {
      logger.warn(
        `Unauthorized user ${pc.bold(interaction.user.tag)} (${interaction.user.id}) attempted to run /maintenance`
      );
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Access Denied',
            'You do not have permission to execute this developer command.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const currentStatus = isMaintenanceActive();
    const providedReason =
      interaction.options.getString('r')?.trim() ||
      interaction.options.getString('reason')?.trim() ||
      '';

    try {
      if (currentStatus) {
        // Toggle OFF (Deactivate)
        await setMaintenance(false, '', interaction.user.tag);

        const embed = successEmbed(
          'Maintenance Mode Deactivated',
          'System maintenance mode has been successfully **disabled**.\n\n' +
            `• **Status:** \`INACTIVE (Public Access Restored)\`\n` +
            `• **Updated (UTC):** ${formatUtcTime(new Date())}\n` +
            `• **Deactivated By:** <@${interaction.user.id}> (\`${interaction.user.tag}\`)\n` +
            `• **Discord:** All commands and interactions are now available to all users.\n` +
            `• **Website:** Normal public dashboard and REST API access has been restored.`
        );

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      } else {
        // Toggle ON (Activate)
        const activeReason =
          providedReason || 'Scheduled system maintenance in progress. Please check back later.';

        await setMaintenance(true, activeReason, interaction.user.tag);

        const embed = createBaseEmbed()
          .setColor(EMBED_COLORS.WARNING)
          .setTitle('🛠️ Maintenance Mode Activated')
          .setDescription(
            'System maintenance mode has been successfully **enabled**.\n\n' +
              `• **Status:** \`ACTIVE (Developer Only Mode)\`\n` +
              `• **Reason:** ${activeReason}\n` +
              `• **Updated (UTC):** ${formatUtcTime(new Date())}\n` +
              `• **Activated By:** <@${interaction.user.id}> (\`${interaction.user.tag}\`)\n` +
              `• **Discord:** All commands and button interactions are blocked for non-developers.\n` +
              `• **Website:** Public web dashboard and API endpoints return HTTP 403 Forbidden.\n\n` +
              `*To restore public access, run \`/maintenance\` again.*`
          );

        return interaction.reply({
          embeds: [embed],
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      logger.error(`Failed to toggle maintenance mode: ${err.message}`);
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Operation Failed',
            `An error occurred while toggling maintenance mode: ${err.message}`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
