const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dev-slist')
    .setDescription('server list with server id and name'),

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

    // Retrieve and convert guilds cache to array
    const allGuilds = Array.from(interaction.client.guilds.cache.values());

    if (allGuilds.length === 0) {
      return interaction.editReply({
        embeds: [successEmbed('Server List', 'The bot is not currently in any servers.')],
      });
    }

    // Limit to max 100 guilds (10 pages of 10 items)
    const limitedGuilds = allGuilds.slice(0, 100);
    const totalPages = Math.ceil(limitedGuilds.length / 10);

    let currentPageIndex = 0;

    // Helper function to build page content
    const buildEmbedPage = (pageIdx) => {
      const startIdx = pageIdx * 10;
      const pageItems = limitedGuilds.slice(startIdx, startIdx + 10);

      const itemsDesc = pageItems
        .map(
          (guild, idx) =>
            `**${startIdx + idx + 1}.** ${guild.name} - \`${guild.id}\` — <@${guild.ownerId}>`
        )
        .join('\n');

      return successEmbed(
        `Active Servers (Page ${pageIdx + 1} of ${totalPages})`,
        itemsDesc || 'No servers on this page.'
      );
    };

    // Helper function to build navigation button row
    const buildNavigationRow = (pageIdx) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`slist_prev_${interaction.id}`)
          .setLabel('◀️ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === 0),
        new ButtonBuilder()
          .setCustomId(`slist_next_${interaction.id}`)
          .setLabel('▶️ Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === totalPages - 1)
      );
    };

    // Initial render
    const message = await interaction.editReply({
      embeds: [buildEmbedPage(currentPageIndex)],
      components: totalPages > 1 ? [buildNavigationRow(currentPageIndex)] : [],
    });

    if (totalPages <= 1) return;

    // Collect button interactions (5-minute timeout)
    const collector = message.createMessageComponentCollector({
      filter: (btn) => btn.user.id === interaction.user.id,
      time: 5 * 60 * 1000,
    });

    collector.on('collect', async (btn) => {
      if (btn.customId === `slist_prev_${interaction.id}`) {
        currentPageIndex = Math.max(0, currentPageIndex - 1);
      } else if (btn.customId === `slist_next_${interaction.id}`) {
        currentPageIndex = Math.min(totalPages - 1, currentPageIndex + 1);
      }

      await btn.update({
        embeds: [buildEmbedPage(currentPageIndex)],
        components: [buildNavigationRow(currentPageIndex)],
      });
    });

    collector.on('end', async () => {
      // Disable buttons upon collector expiration
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`slist_prev_disabled`)
            .setLabel('◀️ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`slist_next_disabled`)
            .setLabel('▶️ Next')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        await interaction.editReply({
          components: [disabledRow],
        });
      } catch {
        // Ignore errors if message was deleted
      }
    });
  },
};
