const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const { db } = require('../../utils/db.js');
const { currencies: currenciesTable, currencyHistory } = require('../../db/schema.js');
const { gte, asc } = require('drizzle-orm');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { getAppEmojis } = require('../../utils/emojiCache.js');
const { getCurrencyCache } = require('../../services/currencySync.js');

function formatPrice(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function formatPct(pct) {
  const n = parseFloat(pct);
  if (isNaN(n)) return '0.00%';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function getItemEmoji(standardItem, appEmojis) {
  if (!standardItem) return '🪙';
  const itemEmojiName = standardItem.substring(0, 32);
  const appEmoji = appEmojis ? appEmojis.find((e) => e.name === itemEmojiName) : null;
  return appEmoji ? `<:${appEmoji.name}:${appEmoji.id}>` : '🪙';
}

function getSteadinessTier(curr) {
  const max = curr.maxRate || 0;
  const live = curr.liveRate || 0;
  const min = curr.minRate || 0;

  if (max > 0) {
    const dropFromMax = ((max - live) / max) * 100;
    if (dropFromMax >= 20) {
      const range = max - min;
      const recoveryRatio = range > 0 ? (live - min) / range : 0;
      if (recoveryRatio < 0.3) {
        return 'risky';
      }
    }
  }

  const score = curr.stabilityScore || 0;
  if (score >= 85) return 'steady';
  if (score >= 65) return 'mixed';
  return 'risky';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cstats')
    .setDescription('View currency market stability, performers, and statistical metrics')
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .addIntegerOption((option) =>
      option
        .setName('days')
        .setDescription('Historical timeframe in days (default: 30)')
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

  async execute(interaction) {
    await interaction.deferReply();

    if (!db) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Database Unavailable',
            'Database connection is currently unavailable. Please try again later.'
          ),
        ],
      });
    }

    const daysOption = interaction.options.getInteger('days');
    const validDays = [7, 15, 30, 60, 90, 120];
    const retentionDays = validDays.includes(daysOption) ? daysOption : 30;

    try {
      const cutoffDate = new Date();
      cutoffDate.setUTCDate(cutoffDate.getUTCDate() - retentionDays);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      const cache = getCurrencyCache();
      let latestCurrencies = cache.currencies || [];

      if (latestCurrencies.length === 0 && db) {
        latestCurrencies = await db.select().from(currenciesTable);
      }

      if (!latestCurrencies || latestCurrencies.length === 0) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'No Currencies Found',
              'No currencies data has been synchronized yet. Try running /forcesync first.'
            ),
          ],
        });
      }

      const historyData = await db
        .select()
        .from(currencyHistory)
        .where(gte(currencyHistory.date, cutoffStr))
        .orderBy(asc(currencyHistory.date));

      // Group historical rates by currencyId
      const historyMap = {};
      historyData.forEach((row) => {
        if (!historyMap[row.currencyId]) {
          historyMap[row.currencyId] = [];
        }
        historyMap[row.currencyId].push(parseFloat(row.arcPerUnitLive) || 0);
      });

      // Calculate metrics for each currency
      const statsList = latestCurrencies.map((curr) => {
        const rates = historyMap[curr.id] || [];
        const currentLive = parseFloat(curr.arcPerUnitLive) || 0;
        const base = parseFloat(curr.arcPerUnitBase) || 0;

        if (rates.length === 0) {
          return {
            id: curr.id,
            name: curr.name || curr.id,
            nation: curr.nation || 'None',
            standardItem: curr.standardItem,
            baseRate: base,
            liveRate: currentLive,
            avgLiveRate: currentLive,
            minRate: currentLive,
            maxRate: currentLive,
            spread: 0,
            stdDev: 0,
            stabilityScore: 100,
            percentageChange: base > 0 ? ((currentLive - base) / base) * 100 : 0,
          };
        }

        const count = rates.length;
        const sum = rates.reduce((a, b) => a + b, 0);
        const avg = sum / count;
        const min = Math.min(...rates);
        const max = Math.max(...rates);
        const spread = max - min;

        const variance = rates.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count;
        const stdDev = Math.sqrt(variance);

        const cv = avg > 0 ? stdDev / avg : 0;
        const stabilityScore = Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));
        const percentageChange = base > 0 ? ((currentLive - base) / base) * 100 : 0;

        return {
          id: curr.id,
          name: curr.name || curr.id,
          nation: curr.nation || 'None',
          standardItem: curr.standardItem,
          baseRate: base,
          liveRate: currentLive,
          avgLiveRate: avg,
          minRate: min,
          maxRate: max,
          spread: spread,
          stdDev: stdDev,
          stabilityScore: stabilityScore,
          percentageChange: percentageChange,
        };
      });

      // Composite score & normalization: stabilityScore * 1.0 + (normalizedLiveRate * 50.0)
      const maxLiveRate = Math.max(...statsList.map((c) => c.liveRate || 0), 0.0001);
      statsList.forEach((c) => {
        const normalizedLiveRate = (c.liveRate || 0) / maxLiveRate;
        c.normalizedLiveRate = normalizedLiveRate;
        c.compositeScore = c.stabilityScore * 1.0 + normalizedLiveRate * 50.0;
      });

      // Grouping by steadiness tier
      let steadyCount = 0;
      let mixedCount = 0;
      let riskyCount = 0;

      statsList.forEach((c) => {
        const tier = getSteadinessTier(c);
        c.tier = tier;
        if (tier === 'steady') steadyCount++;
        else if (tier === 'mixed') mixedCount++;
        else if (tier === 'risky') riskyCount++;
      });

      const appEmojis = await getAppEmojis(interaction.client);

      // Top 5 Performers
      const performers = [...statsList]
        .sort((a, b) => b.compositeScore - a.compositeScore)
        .slice(0, 5);

      // Gainers & Losers
      const gainers = [...statsList]
        .sort((a, b) => b.percentageChange - a.percentageChange)
        .slice(0, 5);

      const losers = [...statsList]
        .sort((a, b) => a.percentageChange - b.percentageChange)
        .slice(0, 5);

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(`📊 Currency Market Stats (Past ${retentionDays} Days)`)
        .setDescription(
          `Comprehensive market health & stability analysis for the past **${retentionDays} days**.`
        );

      embed.addFields(
        {
          name: '📈 Market Health Overview',
          value:
            `🟢 **Steady** (≥85): \`${steadyCount}\`  |  ` +
            `🟡 **Mixed** (65-84): \`${mixedCount}\`  |  ` +
            `🔴 **Risky** (<65): \`${riskyCount}\`\n` +
            `Total Monitored Currencies: **${statsList.length}**`,
          inline: false,
        },
        {
          name: '🏆 Top Performers (Composite Rank)',
          value:
            performers.length > 0
              ? performers
                  .map((c, i) => {
                    const emoji = getItemEmoji(c.standardItem, appEmojis);
                    return (
                      `${i + 1}. ${emoji} **${c.name}** (\`${c.id.toUpperCase()}\`)\n` +
                      `└ Score: \`${c.compositeScore.toFixed(1)}\` | Stability: \`${c.stabilityScore}/100\` | Live: \`${formatPrice(c.liveRate)} ARC\``
                    );
                  })
                  .join('\n')
              : 'No data available',
          inline: false,
        },
        {
          name: '🚀 Top Gainers',
          value:
            gainers.filter((c) => c.percentageChange > 0).length > 0
              ? gainers
                  .filter((c) => c.percentageChange > 0)
                  .slice(0, 3)
                  .map((c) => {
                    const emoji = getItemEmoji(c.standardItem, appEmojis);
                    return `${emoji} **${c.name}**: \`${formatPct(c.percentageChange)}\` (\`${formatPrice(c.liveRate)} ARC\`)`;
                  })
                  .join('\n')
              : 'None (>0%)',
          inline: true,
        },
        {
          name: '📉 Top Losers',
          value:
            losers.filter((c) => c.percentageChange < 0).length > 0
              ? losers
                  .filter((c) => c.percentageChange < 0)
                  .slice(0, 3)
                  .map((c) => {
                    const emoji = getItemEmoji(c.standardItem, appEmojis);
                    return `${emoji} **${c.name}**: \`${formatPct(c.percentageChange)}\` (\`${formatPrice(c.liveRate)} ARC\`)`;
                  })
                  .join('\n')
              : 'None (<0%)',
          inline: true,
        }
      );

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Stats Calculation Error',
            `An error occurred while calculating statistics: ${err.message}`
          ),
        ],
      });
    }
  },
};
