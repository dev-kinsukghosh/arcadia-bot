const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');

module.exports = {
  cooldown: 2,
  data: new SlashCommandBuilder()
    .setName('ccl')
    .setDescription(
      'List all guilds the bot is in along with their enabled options (Developer Only)'
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

    const { getEnabledOptions } = require('../../utils/guildOptionsHelper.js');
    const allGuilds = Array.from(interaction.client.guilds.cache.values());

    if (allGuilds.length === 0) {
      return interaction.editReply({
        embeds: [successEmbed('Server List', 'The bot is not currently in any servers.')],
      });
    }

    const limitedGuilds = allGuilds.slice(0, 100);
    const totalPages = Math.ceil(limitedGuilds.length / 10);
    let currentPageIndex = 0;

    const buildEmbedPage = (pageIdx) => {
      const startIdx = pageIdx * 10;
      const pageItems = limitedGuilds.slice(startIdx, startIdx + 10);

      const itemsDesc = pageItems
        .map((guild, idx) => {
          const enabled = getEnabledOptions(guild.id);
          const enabledStr =
            enabled.length > 0 ? enabled.map((opt) => `\`${opt}\``).join(', ') : '_None_';
          return `**${startIdx + idx + 1}.** **${guild.name}**\n   ├ **ID:** \`${guild.id}\` · **Members:** ${guild.memberCount}\n   └ **Custom Options:** ${enabledStr}`;
        })
        .join('\n\n');

      return successEmbed(
        `Active Guilds & Options (Page ${pageIdx + 1} of ${totalPages})`,
        itemsDesc || 'No servers on this page.'
      );
    };

    const buildNavigationRow = (pageIdx) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ccl_prev_${interaction.id}`)
          .setLabel('◀️ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === 0),
        new ButtonBuilder()
          .setCustomId(`ccl_next_${interaction.id}`)
          .setLabel('▶️ Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === totalPages - 1)
      );
    };

    const message = await interaction.editReply({
      embeds: [buildEmbedPage(currentPageIndex)],
      components: totalPages > 1 ? [buildNavigationRow(currentPageIndex)] : [],
    });

    if (totalPages <= 1) return;

    const collector = message.createMessageComponentCollector({
      filter: (btn) => btn.user.id === interaction.user.id,
      time: 5 * 60 * 1000,
    });

    collector.on('collect', async (btn) => {
      if (btn.customId === `ccl_prev_${interaction.id}`) {
        currentPageIndex = Math.max(0, currentPageIndex - 1);
      } else if (btn.customId === `ccl_next_${interaction.id}`) {
        currentPageIndex = Math.min(totalPages - 1, currentPageIndex + 1);
      }

      await btn.update({
        embeds: [buildEmbedPage(currentPageIndex)],
        components: [buildNavigationRow(currentPageIndex)],
      });
    });

    collector.on('end', async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ccl_prev_disabled')
            .setLabel('◀️ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('ccl_next_disabled')
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
