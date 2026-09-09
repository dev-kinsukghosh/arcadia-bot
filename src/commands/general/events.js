const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const { createBaseEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { getEventsCache } = require('../../services/emptyEndpointsSync.js');
const { db } = require('../../utils/db.js');
const { sEvents } = require('../../db/schema.js');
const { desc } = require('drizzle-orm');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription('View active or recent ArcadiaMC server events')
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
    const eventsList =
      data && Array.isArray(data.events) ? data.events : Array.isArray(data) ? data : [];

    if (eventsList.length > 0) {
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
    }

    // Fallback to recent events recorded in s_events DB table
    if (db) {
      try {
        const storedEvents = await db
          .select()
          .from(sEvents)
          .orderBy(desc(sEvents.timestamp))
          .limit(10);

        if (storedEvents.length > 0) {
          const embed = createBaseEmbed()
            .setColor(EMBED_COLORS.ROYAL_BLUE)
            .setTitle(`📜 Recent ArcadiaMC Server Events (${storedEvents.length})`)
            .setDescription(
              'No live event announcements currently active. Showing recent recorded server events (towns/nations activity).'
            );

          storedEvents.forEach((ev, idx) => {
            const timeFormatted = ev.timestamp
              ? `<t:${Math.floor(ev.timestamp / 1000)}:R>`
              : 'Unknown';
            const typeFormatted = ev.type ? `\`${ev.type}\`` : '`event`';

            embed.addFields({
              name: `🔹 #${idx + 1} ${ev.message || 'Server Event'}`,
              value: `• **Type:** ${typeFormatted}\n• **Time:** ${timeFormatted}`,
              inline: false,
            });
          });

          return interaction.editReply({ embeds: [embed] });
        }
      } catch {
        // Fallthrough to standard empty response
      }
    }

    const embed = createBaseEmbed()
      .setColor(EMBED_COLORS.ROYAL_BLUE)
      .setTitle('📅 ArcadiaMC Server Events')
      .setDescription(
        'There are currently **no active server events** listed on ArcadiaMC.\n\n*Our background sync worker scans every 2.5 minutes and will log & store server events in `s_events` as soon as they occur!*'
      );
    return interaction.editReply({ embeds: [embed] });
  },
};
