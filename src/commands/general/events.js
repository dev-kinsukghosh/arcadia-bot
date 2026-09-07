const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const { createBaseEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { getEventsCache } = require('../../services/emptyEndpointsSync.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription('View active ArcadiaMC server events')
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

    const data = await getEventsCache();
    const eventsList = data && Array.isArray(data.events) ? data.events : [];

    if (eventsList.length === 0) {
      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.ROYAL_BLUE)
        .setTitle('📅 ArcadiaMC Server Events')
        .setDescription(
          'There are currently **no active server events** listed on ArcadiaMC.\n\n*Our background sync worker scans every 2.5 minutes and will log & alert system channels as soon as an event is announced!*'
        );
      return interaction.editReply({ embeds: [embed] });
    }

    const embed = createBaseEmbed()
      .setColor(EMBED_COLORS.SUCCESS)
      .setTitle(`🎉 Active ArcadiaMC Events (${eventsList.length})`)
      .setDescription('Live server events currently taking place or scheduled on ArcadiaMC.');

    eventsList.forEach((ev, idx) => {
      embed.addFields({
        name: `🔹 Event #${idx + 1}: ${ev.name || ev.title || 'Server Event'}`,
        value:
          `• **Description:** ${ev.description || 'No description provided'}\n` +
          `• **Status:** \`${ev.status || 'Active'}\`\n` +
          `• **Time:** ${ev.startTime ? `<t:${Math.floor(ev.startTime / 1000)}:R>` : 'Ongoing'}`,
        inline: false,
      });
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
