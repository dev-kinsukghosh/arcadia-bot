const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const { db } = require('../../utils/db.js');
const { currencies: currenciesTable } = require('../../db/schema.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { getCurrencyCache } = require('../../services/currencySync.js');
const { getAppEmojis } = require('../../utils/emojiCache.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('currencies')
    .setDescription('View active list of nation currencies and their exchange rates')
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

    // Use memory cache directly for instant response (sync worker runs every 30min)
    const cache = getCurrencyCache();
    let currencyList = cache.currencies || [];

    // Fallback to database only if memory cache is empty
    if (currencyList.length === 0 && db) {
      try {
        currencyList = await db.select().from(currenciesTable);
      } catch {
        // Ignore DB error, empty list fallback handled below
      }
    }

    if (!currencyList || currencyList.length === 0) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'No Currencies Found',
            'No currencies data has been synchronized yet. Try running /forcesync first.'
          ),
        ],
      });
    }

    // Sort by name alphabetically
    currencyList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Fetch Discord Application Emojis from local TTL cache
    const appEmojis = await getAppEmojis(interaction.client);

    // Helper to format currency ID / name
    const formatName = (name) => name || 'Unknown';
    const formatItem = (item) => {
      if (!item) return 'UNKNOWN';
      return item
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const formatPrice = (price) => {
      const parsed = parseFloat(price);
      if (isNaN(parsed)) return '0';
      return parsed.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 4,
      });
    };

    // Pagination setup
    const ITEMS_PER_PAGE = 10;
    const pages = [];
    for (let i = 0; i < currencyList.length; i += ITEMS_PER_PAGE) {
      pages.push(currencyList.slice(i, i + ITEMS_PER_PAGE));
    }

    const totalPages = pages.length;
    let currentPage = 0;

    const buildEmbed = (pageIdx) => {
      const chunk = pages[pageIdx];
      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle('🪙 ArcadiaMC Currencies')
        .setDescription(`Page ${pageIdx + 1} of ${totalPages} · Rates are relative to ARC`);

      const listLines = chunk.map((c) => {
        const itemEmojiName = c.standardItem ? c.standardItem.substring(0, 32) : '';
        const appEmoji = appEmojis ? appEmojis.find((e) => e.name === itemEmojiName) : null;
        const iconStr = appEmoji ? `<:${appEmoji.name}:${appEmoji.id}>` : '🪙';

        return (
          `${iconStr} **${formatName(c.name)} (${c.id})**\n` +
          `• **Nation:** ${c.nation || 'None'}\n` +
          `• **Base:** \`${formatPrice(c.arcPerUnitBase)} ARC\`\n` +
          `• **Live:** \`${formatPrice(c.arcPerUnitLive)} ARC\`\n` +
          `• **Standard Item:** ${formatItem(c.standardItem)}\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━`
        );
      });

      embed.setDescription(embed.data.description + '\n\n' + listLines.join('\n\n'));
      return embed;
    };

    const buildButtons = (pageIdx) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`curr_prev_${interaction.id}`)
          .setLabel('◀ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === 0),
        new ButtonBuilder()
          .setCustomId(`curr_page_${interaction.id}`)
          .setLabel(`${pageIdx + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`curr_next_${interaction.id}`)
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === totalPages - 1)
      );
    };

    const message = await interaction.editReply({
      embeds: [buildEmbed(currentPage)],
      components: [buildButtons(currentPage)],
    });

    const collector = message.createMessageComponentCollector({ time: 5 * 60 * 1000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({
          content: '❌ Only the command invoker can use these buttons.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (btn.customId === `curr_prev_${interaction.id}`) {
        currentPage = Math.max(0, currentPage - 1);
        await btn.update({
          embeds: [buildEmbed(currentPage)],
          components: [buildButtons(currentPage)],
        });
      } else if (btn.customId === `curr_next_${interaction.id}`) {
        currentPage = Math.min(totalPages - 1, currentPage + 1);
        await btn.update({
          embeds: [buildEmbed(currentPage)],
          components: [buildButtons(currentPage)],
        });
      }
    });

    collector.on('end', async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('curr_prev_done')
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('curr_page_done')
            .setLabel(`${currentPage + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('curr_next_done')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );
        await interaction.editReply({
          embeds: [buildEmbed(currentPage)],
          components: [disabledRow],
        });
      } catch {
        // Message deleted
      }
    });
  },
};
