const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  AttachmentBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const { db } = require('../../utils/db.js');
const { currencies: currenciesTable, currencyHistory } = require('../../db/schema.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { getCurrencyCache } = require('../../services/currencySync.js');
const { eq, gte, and, asc } = require('drizzle-orm');
const { drawHistoryLineChart } = require('../../utils/canvasGraph.js');

/**
 * Construct a text-based sparkline visualization using Unicode block elements.
 */
function generateSparkline(values) {
  if (!values || values.length === 0) return '[ No Data ]';
  const blocks = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
  if (values.length === 1) return `[ ${blocks[3]} ]`;

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return `[ ${blocks[3].repeat(values.length)} ]`;
  }

  const spark = values
    .map((v) => {
      const norm = (v - min) / (max - min);
      const idx = Math.min(7, Math.max(0, Math.round(norm * 7)));
      return blocks[idx];
    })
    .join('');

  return `[ ${spark} ]`;
}

/**
 * Format numerical value based on display mode.
 */
function formatValue(val, mode) {
  if (mode === 'percentage') {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toFixed(2)}%`;
  }
  return `${val.toFixed(4)} ₳`;
}

/**
 * Format tabular codeblock list of items for the embed.
 */
function buildTable(items, mode) {
  const headerDate = 'Date';
  const headerVal = mode === 'percentage' ? 'Change (%)' : 'Rate (₳)';
  const header = `${headerDate.padEnd(12)} ${headerVal}`;
  const separator = '─'.repeat(26);

  const rows = items.map((item) => {
    const dStr = item.dateStr.padEnd(12);
    const vStr = item.formattedVal;
    return `${dStr} ${vStr}`;
  });

  return '```text\n' + [header, separator, ...rows].join('\n') + '\n```';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('chistory')
    .setDescription('View price history, sparklines, and visual charts for a nation currency')
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .addStringOption((option) =>
      option
        .setName('currency')
        .setDescription('The currency to view price history for')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addNumberOption((option) =>
      option
        .setName('days')
        .setDescription('Number of past days to fetch history for (default: 30)')
        .setRequired(false)
        .addChoices(
          { name: '7 Days', value: 7 },
          { name: '15 Days', value: 15 },
          { name: '30 Days', value: 30 },
          { name: '60 Days', value: 60 },
          { name: '90 Days', value: 90 },
          { name: '120 Days', value: 120 }
        )
    )
    .addStringOption((option) =>
      option
        .setName('mode')
        .setDescription('Value display mode: Raw Rate (₳) or Compare to Base (%)')
        .setRequired(false)
        .addChoices(
          { name: 'Raw Rate (₳)', value: 'raw' },
          { name: 'Compare to Base (%)', value: 'percentage' }
        )
    ),

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const cache = getCurrencyCache();
      const currencies = cache.currencies || [];

      const filtered = currencies.filter(
        (c) =>
          c.id?.toLowerCase().includes(focusedValue) || c.name?.toLowerCase().includes(focusedValue)
      );

      const choices = filtered.slice(0, 25).map((c) => ({
        name: `${c.name || c.id} (${c.id.toUpperCase()})`,
        value: c.id,
      }));

      await interaction.respond(choices);
    } catch {
      // Silently ignore autocomplete errors
    }
  },

  async execute(interaction) {
    await interaction.deferReply();

    const currencyInput = interaction.options.getString('currency').toLowerCase().trim();
    const days = interaction.options.getNumber('days') ?? 30;
    const mode = interaction.options.getString('mode') || 'raw';

    // 1. Resolve Currency Metadata
    const cache = getCurrencyCache();
    const currencyList = cache.currencies || [];

    let currencyObj = currencyList.find((c) => c.id?.toLowerCase() === currencyInput);

    if (!currencyObj && db) {
      try {
        const dbRows = await db
          .select()
          .from(currenciesTable)
          .where(eq(currenciesTable.id, currencyInput));
        if (dbRows.length > 0) {
          currencyObj = dbRows[0];
        }
      } catch {
        // Fallback handled below
      }
    }

    if (!currencyObj) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Invalid Currency',
            `The currency \`${currencyInput}\` was not found. Please select a valid currency from the autocomplete list.`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const currencyName = currencyObj.name || currencyObj.id.toUpperCase();

    // 2. Fetch history from DB
    if (!db) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Database Unavailable',
            'Database connection is currently not available to fetch price history.'
          ),
        ],
      });
    }

    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    let historyData;
    try {
      historyData = await db
        .select()
        .from(currencyHistory)
        .where(
          and(eq(currencyHistory.currencyId, currencyObj.id), gte(currencyHistory.date, cutoffStr))
        )
        .orderBy(asc(currencyHistory.date));
    } catch (err) {
      return interaction.editReply({
        embeds: [errorEmbed('Database Error', `Failed to fetch currency history: ${err.message}`)],
      });
    }

    if (!historyData || historyData.length === 0) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'No History Found',
            `No price history recorded for **${currencyName}** (\`${currencyObj.id.toUpperCase()}\`) in the past **${days}** days.`
          ),
        ],
      });
    }

    // 3. Process records & mode calculations
    const records = historyData.map((row) => {
      const live = parseFloat(row.arcPerUnitLive) || 0;
      const base = parseFloat(row.arcPerUnitBase) || 1;
      const dateStr =
        typeof row.date === 'string'
          ? row.date.substring(0, 10)
          : new Date(row.date).toISOString().split('T')[0];

      let value = live;
      if (mode === 'percentage') {
        value = base > 0 ? ((live - base) / base) * 100 : 0;
      }

      const formattedVal = formatValue(value, mode);

      return {
        dateStr,
        live,
        base,
        value,
        formattedVal,
      };
    });

    // 4. Sparkline Visualization
    const values = records.map((r) => r.value);
    const sparklineStr = generateSparkline(values);

    // 5. Summary Statistics
    const startRecord = records[0];
    const endRecord = records[records.length - 1];
    const startVal = startRecord.value;
    const endVal = endRecord.value;
    const startLive = startRecord.live;
    const endLive = endRecord.live;
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const avgVal = values.reduce((sum, v) => sum + v, 0) / values.length;

    const pctChange = startLive > 0 ? ((endLive - startLive) / startLive) * 100 : 0;
    const pctChangeStr = `${pctChange >= 0 ? '+' : ''}${pctChange.toFixed(2)}%`;

    // 6. Generate the visual line chart
    let chartBuffer;
    try {
      const modeLabel = mode === 'percentage' ? ' (%)' : ' (₳)';
      chartBuffer = drawHistoryLineChart(
        records.map((r) => r.dateStr),
        [
          {
            label: `${currencyName} (${currencyObj.id.toUpperCase()})${modeLabel}`,
            rates: records.map((r) => r.value),
          },
        ],
        `${currencyName} Historical Rates (${days}d)`
      );
    } catch (err) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Chart Render Failure',
            `Failed to render price history line chart: ${err.message}`
          ),
        ],
      });
    }

    const file = new AttachmentBuilder(chartBuffer, { name: 'history-chart.png' });

    // 7. Pagination setup (newest records first for tabular view)
    const displayRecords = [...records].reverse();
    const ITEMS_PER_PAGE = 8; // Slightly smaller to leave room for graph
    const pages = [];
    for (let i = 0; i < displayRecords.length; i += ITEMS_PER_PAGE) {
      pages.push(displayRecords.slice(i, i + ITEMS_PER_PAGE));
    }
    const totalPages = pages.length;
    let currentPage = 0;

    const buildEmbed = (pageIdx) => {
      const chunk = pages[pageIdx];
      const modeLabel = mode === 'percentage' ? 'Compare to Base (%)' : 'Raw Rate (₳)';

      return createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(`📈 ${currencyName} Price History`)
        .setDescription(
          `**Nation:** ${currencyObj.nation || 'Unknown'} · **Mode:** ${modeLabel} · **Window:** Past ${days} Days`
        )
        .addFields(
          {
            name: `📊 ${days}-Day Trend (${mode === 'percentage' ? '%' : '₳'})`,
            value: `\`${sparklineStr}\``,
            inline: false,
          },
          {
            name: '▶️ Start Rate',
            value: `\`${formatValue(startVal, mode)}\``,
            inline: true,
          },
          {
            name: '⏹️ End Rate',
            value: `\`${formatValue(endVal, mode)}\``,
            inline: true,
          },
          {
            name: '📈 Total Change',
            value: `\`${pctChangeStr}\``,
            inline: true,
          },
          {
            name: '⬇️ Min Rate',
            value: `\`${formatValue(minVal, mode)}\``,
            inline: true,
          },
          {
            name: '⬆️ Max Rate',
            value: `\`${formatValue(maxVal, mode)}\``,
            inline: true,
          },
          {
            name: '⚖️ Average Rate',
            value: `\`${formatValue(avgVal, mode)}\``,
            inline: true,
          },
          {
            name: `📜 History Log (Page ${pageIdx + 1}/${totalPages})`,
            value: buildTable(chunk, mode),
            inline: false,
          }
        )
        .setImage('attachment://history-chart.png');
    };

    const buildButtons = (pageIdx) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`chist_prev_${interaction.id}`)
          .setLabel('◀ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === 0),
        new ButtonBuilder()
          .setCustomId(`chist_page_${interaction.id}`)
          .setLabel(`${pageIdx + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`chist_next_${interaction.id}`)
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === totalPages - 1)
      );
    };

    const message = await interaction.editReply({
      embeds: [buildEmbed(currentPage)],
      components: totalPages > 1 ? [buildButtons(currentPage)] : [],
      files: [file],
    });

    if (totalPages > 1) {
      const collector = message.createMessageComponentCollector({
        time: 5 * 60 * 1000,
      });

      collector.on('collect', async (btn) => {
        if (btn.user.id !== interaction.user.id) {
          return btn.reply({
            content: '❌ Only the command invoker can use these buttons.',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (btn.customId === `chist_prev_${interaction.id}`) {
          currentPage = Math.max(0, currentPage - 1);
          await btn.update({
            embeds: [buildEmbed(currentPage)],
            components: [buildButtons(currentPage)],
          });
        } else if (btn.customId === `chist_next_${interaction.id}`) {
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
              .setCustomId('chist_prev_done')
              .setLabel('◀ Prev')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('chist_page_done')
              .setLabel(`${currentPage + 1} / ${totalPages}`)
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('chist_next_done')
              .setLabel('Next ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );
          await interaction.editReply({
            embeds: [buildEmbed(currentPage)],
            components: [disabledRow],
          });
        } catch {
          // Message may have been deleted
        }
      });
    }
  },
};
