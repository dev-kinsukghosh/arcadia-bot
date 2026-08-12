const {
  SlashCommandBuilder,
  AttachmentBuilder,
  MessageFlags,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const { db } = require('../../utils/db.js');
const { currencyHistory } = require('../../db/schema.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { getCurrencyCache } = require('../../services/currencySync.js');
const { and, gte, eq, asc } = require('drizzle-orm');
const { drawHistoryLineChart } = require('../../utils/canvasGraph.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ccompare')
    .setDescription('Compare the exchange rates of up to 5 nation currencies with a graph')
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
        .setName('currency1')
        .setDescription('The first currency to compare')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('currency2')
        .setDescription('The second currency to compare')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('currency3')
        .setDescription('Optional third currency to compare')
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('currency4')
        .setDescription('Optional fourth currency to compare')
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('currency5')
        .setDescription('Optional fifth currency to compare')
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('days')
        .setDescription('Number of past days to view (default: 30)')
        .setRequired(false)
        .addChoices(
          { name: '7 Days', value: 7 },
          { name: '15 Days', value: 15 },
          { name: '30 Days', value: 30 },
          { name: '60 Days', value: 60 },
          { name: '90 Days', value: 90 },
          { name: '120 Days', value: 120 }
        )
    ),

  async autocomplete(interaction) {
    try {
      const focusedOption = interaction.options.getFocused(true);
      const focusedValue = focusedOption.value ? focusedOption.value.toLowerCase().trim() : '';

      const cache = getCurrencyCache();
      const currencies = cache.currencies || [];

      const filtered = currencies.filter(
        (c) =>
          c.id?.toLowerCase().includes(focusedValue) || c.name?.toLowerCase().includes(focusedValue)
      );

      const choices = filtered.slice(0, 25).map((c) => ({
        name: `${c.name} (${c.id.toUpperCase()})`,
        value: c.id,
      }));

      await interaction.respond(choices);
    } catch {
      // Silently ignore autocomplete errors
    }
  },

  async execute(interaction) {
    await interaction.deferReply();

    const limitDays = interaction.options.getInteger('days') || 30;

    // Gather inputs
    const idsRaw = [
      interaction.options.getString('currency1'),
      interaction.options.getString('currency2'),
      interaction.options.getString('currency3'),
      interaction.options.getString('currency4'),
      interaction.options.getString('currency5'),
    ];

    // Filter and sanitize selected IDs
    const ids = Array.from(new Set(idsRaw.filter((id) => id).map((id) => id.toLowerCase().trim())));

    if (ids.length < 2) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Invalid Inputs',
            'You must select at least two different currencies to compare.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const cache = getCurrencyCache();
    const currencies = cache.currencies || [];

    // Resolve currencies info
    const selectedCurrs = [];
    const invalidIds = [];

    for (const id of ids) {
      const found = currencies.find((c) => c.id?.toLowerCase() === id);
      if (found) {
        selectedCurrs.push(found);
      } else {
        invalidIds.push(id);
      }
    }

    if (invalidIds.length > 0) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Currencies Not Found',
            `The following currencies were invalid: \`${invalidIds.join(', ')}\`. Please choose from the autocomplete list.`
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Calculate cutoff date in UTC
    const cutoffDate = new Date();
    cutoffDate.setUTCDate(cutoffDate.getUTCDate() - limitDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    // Fetch history for all selected currencies
    const histories = {};
    const dateMaps = {};
    const allDatesSet = new Set();

    if (db) {
      try {
        await Promise.all(
          selectedCurrs.map(async (c) => {
            const history = await db
              .select()
              .from(currencyHistory)
              .where(
                and(gte(currencyHistory.date, cutoffStr), eq(currencyHistory.currencyId, c.id))
              )
              .orderBy(asc(currencyHistory.date));

            histories[c.id] = history;

            const map = new Map(
              history.map((h) => [
                h.date.toISOString().split('T')[0],
                parseFloat(h.avgArcPerUnitLive || h.arcPerUnitLive),
              ])
            );
            dateMaps[c.id] = map;

            for (const d of map.keys()) {
              allDatesSet.add(d);
            }
          })
        );
      } catch {
        // DB error handling
      }
    }

    // Align dates
    const allDates = Array.from(allDatesSet).sort();

    // If there is no historical data at all, populate with today
    if (allDates.length === 0) {
      const todayStr = new Date().toISOString().split('T')[0];
      allDates.push(todayStr);
      for (const c of selectedCurrs) {
        const map = new Map();
        map.set(todayStr, parseFloat(c.arcPerUnitLive));
        dateMaps[c.id] = map;
      }
    }

    // Build aligned datasets for line chart
    const datasets = [];
    const statsDetails = [];

    for (const c of selectedCurrs) {
      const map = dateMaps[c.id] || new Map();
      let lastVal = parseFloat(c.arcPerUnitLive) || 1.0;
      const rates = [];

      for (const dateVal of allDates) {
        const r = map.get(dateVal);
        if (r !== undefined) {
          lastVal = r;
        }
        rates.push(lastVal);
      }

      datasets.push({
        label: `${c.name} (${c.id.toUpperCase()})`,
        rates: rates,
      });

      // Calculate statistics
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      const max = Math.max(...rates);
      const min = Math.min(...rates);

      // Std Dev (volatility)
      const variance = rates.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / rates.length;
      const sd = Math.sqrt(variance);

      statsDetails.push({
        name: `🪙 ${c.name} (${c.id.toUpperCase()})`,
        value:
          `• **Live:** \`${parseFloat(c.arcPerUnitLive).toFixed(3)} ₳\`\n` +
          `• **Avg:** \`${avg.toFixed(3)} ₳\`\n` +
          `• **Peak:** \`${max.toFixed(3)} ₳\`\n` +
          `• **Low:** \`${min.toFixed(3)} ₳\`\n` +
          `• **Vol:** \`${sd.toFixed(3)}\``,
        inline: true,
      });
    }

    // Draw the comparison chart using generalized canvas helper
    let chartBuffer;
    try {
      chartBuffer = drawHistoryLineChart(
        allDates,
        datasets,
        `Rates Comparison: ${selectedCurrs.map((c) => c.name).join(' vs ')} (${limitDays}d)`
      );
    } catch (err) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Chart Generation Error',
            `Failed to render comparison line chart: ${err.message}`
          ),
        ],
      });
    }

    const file = new AttachmentBuilder(chartBuffer, { name: 'compare-history.png' });

    const embed = createBaseEmbed()
      .setColor(EMBED_COLORS.CYBER)
      .setTitle('📈 Multi-Currency Comparison')
      .setDescription(
        `Showing price history comparison of **${selectedCurrs.length} currencies** over the last **${limitDays} days**.`
      )
      .setImage('attachment://compare-history.png');

    for (const stat of statsDetails) {
      embed.addFields(stat);
    }

    return interaction.editReply({ embeds: [embed], files: [file] });
  },
};
