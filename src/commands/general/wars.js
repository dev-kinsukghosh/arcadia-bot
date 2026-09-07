const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const { createBaseEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { getWarsCache } = require('../../services/emptyEndpointsSync.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wars')
    .setDescription('View active ArcadiaMC wars, war time status, and recent events')
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const data = await getWarsCache();
    const isEnabled = !!data?.enabled;
    const isWarTime = !!data?.warTime;
    const activeWars = Array.isArray(data?.activeWars) ? data.activeWars : [];
    const recentEvents = Array.isArray(data?.recentEvents) ? data.recentEvents : [];

    const embed = createBaseEmbed()
      .setColor(isWarTime ? EMBED_COLORS.ERROR : EMBED_COLORS.CYBER)
      .setTitle('⚔️ ArcadiaMC War & Siege Status')
      .setDescription(
        'Live telemetry on server war status, active sieges, and recent military events.'
      )
      .addFields(
        {
          name: '🛡️ War System Status',
          value: `• **Wars Enabled:** \`${isEnabled ? 'Yes' : 'No'}\`\n• **War Time Active:** \`${isWarTime ? '🟢 Active' : '🔴 Inactive'}\``,
          inline: true,
        },
        {
          name: '⚔️ Active Wars Count',
          value: `\`${activeWars.length}\` ongoing wars`,
          inline: true,
        },
        {
          name: '📜 Recent Events Count',
          value: `\`${recentEvents.length}\` recent events`,
          inline: true,
        }
      );

    if (activeWars.length > 0) {
      const warLines = activeWars.slice(0, 5).map((w, idx) => {
        return `**#${idx + 1}** \`${w.attacker || 'Attacker'}\` ⚔️ \`${w.defender || 'Defender'}\` — *Score: ${w.score || 0}*`;
      });
      embed.addFields({
        name: '🔥 Active Wars',
        value: warLines.join('\n'),
        inline: false,
      });
    }

    if (recentEvents.length > 0) {
      const eventLines = recentEvents.slice(0, 5).map((e) => {
        return `• **${e.type || 'Event'}:** ${e.message || e.description || 'War event record'}`;
      });
      embed.addFields({
        name: '📜 Recent War Log',
        value: eventLines.join('\n'),
        inline: false,
      });
    }

    if (activeWars.length === 0 && recentEvents.length === 0 && !isWarTime) {
      embed.addFields({
        name: '🕊️ Peace & Tranquility',
        value:
          '*There are currently no active wars or active war time on ArcadiaMC. Background checks update every 2.5 minutes!*',
        inline: false,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
