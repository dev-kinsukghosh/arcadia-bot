const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { arcadiaApi } = require('../../utils/apiClient.js');
const { getAppEmojis } = require('../../utils/emojiCache.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dealfinder')
    .setDescription(
      'Find high-margin shop arbitrage & profit deals between Player Shops and Convoy Shop'
    )
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .addNumberOption((opt) =>
      opt
        .setName('min_profit')
        .setDescription('Minimum profit margin in ₳ per item (default: 0)')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName('item')
        .setDescription('Filter by specific Minecraft item name')
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase().trim();
      const choices = [];
      const seen = new Set();

      // Fetch active convoy trades to suggest items
      const convoyData = await arcadiaApi.getConvoy();
      const trades = Array.isArray(convoyData?.trades) ? convoyData.trades : [];

      for (const t of trades) {
        if (!t.item) continue;
        const norm = t.item.toLowerCase();
        if (norm.includes(focusedValue) && !seen.has(norm)) {
          seen.add(norm);
          const fmtName = t.item.replace(/_/g, ' ');
          choices.push({
            name: `📦 ${fmtName} (Convoy Buy: ₳${t.buyPrice} | Sell: ₳${t.sellPrice})`,
            value: t.item,
          });
        }
      }

      await interaction.respond(choices.slice(0, 25));
    } catch {
      // Silently ignore autocomplete errors
    }
  },

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const minProfit = interaction.options.getNumber('min_profit') ?? 0;
      const itemFilter = interaction.options.getString('item')?.trim()?.toLowerCase();

      // 1. Fetch live data from Convoy API and Player Shops API
      const [convoyRes, shopsRes, currenciesRes] = await Promise.all([
        arcadiaApi.getConvoy().catch(() => null),
        arcadiaApi.getShops().catch(() => null),
        arcadiaApi.getCurrencies().catch(() => null),
      ]);

      const convoyTrades = Array.isArray(convoyRes?.trades) ? convoyRes.trades : [];
      const playerShops = Array.isArray(shopsRes?.shops) ? shopsRes.shops : [];
      const currencyList = Array.isArray(currenciesRes?.currencies) ? currenciesRes.currencies : [];

      // Map currencies to ARC rates
      const currencyRates = new Map();
      currencyList.forEach((c) => {
        currencyRates.set(
          c.id.toLowerCase(),
          Number(c.arcPerUnitLive) || Number(c.arcPerUnitBase) || 1
        );
      });

      // Build Map of Convoy prices per item
      const convoyMap = new Map();
      convoyTrades.forEach((ct) => {
        convoyMap.set(ct.item.toUpperCase(), {
          buyPrice: Number(ct.buyPrice) || 0, // Convoy pays player
          sellPrice: Number(ct.sellPrice) || 0, // Convoy charges player
          stock: ct.stock || 0,
          maxStock: ct.maxStock || 0,
          rarity: ct.rarity || 'COMMON',
        });
      });

      const deals = [];

      // 2. Scan Player Shops for deals
      for (const shop of playerShops) {
        const rawListings = shop.sellListings;
        let listings = [];
        if (Array.isArray(rawListings)) {
          listings = rawListings;
        } else if (typeof rawListings === 'string') {
          try {
            listings = JSON.parse(rawListings);
          } catch {
            listings = [];
          }
        }

        const shopCurrencyRate = currencyRates.get((shop.currency || '').toLowerCase()) || 1;

        for (const itemListing of listings) {
          const itemName = (itemListing.item || itemListing.name || '').toUpperCase();
          if (!itemName) continue;

          if (itemFilter && !itemName.toLowerCase().includes(itemFilter)) {
            continue;
          }

          const rawPrice = Number(itemListing.price || itemListing.sellPrice || 0);
          const priceInArc = rawPrice * shopCurrencyRate;
          const stock = Number(itemListing.amount || itemListing.stock || 0);

          const convoyInfo = convoyMap.get(itemName);
          if (convoyInfo && convoyInfo.buyPrice > 0) {
            // Profit margin = Convoy Buy Price (what convoy pays you) minus Player Shop Price (what you pay player shop)
            const profitPerUnit = convoyInfo.buyPrice - priceInArc;

            if (profitPerUnit >= minProfit) {
              const maxUnits = Math.min(stock, convoyInfo.stock);
              const totalProfit = profitPerUnit * maxUnits;

              deals.push({
                item: itemName,
                shopName: shop.name || 'Unknown Shop',
                owner: shop.ownerName || shop.owner || 'Unknown',
                world: shop.world || 'currentarc',
                plotX: shop.plotX ?? 0,
                plotZ: shop.plotZ ?? 0,
                playerPriceArc: priceInArc,
                rawPlayerPrice: rawPrice,
                currency: shop.currency || 'ARC',
                convoyBuyPrice: convoyInfo.buyPrice,
                profitPerUnit,
                stock,
                convoyStock: convoyInfo.stock,
                maxUnits,
                totalProfit,
                rarity: convoyInfo.rarity,
              });
            }
          }
        }
      }

      // Sort deals by total profit descending
      deals.sort((a, b) => b.totalProfit - a.totalProfit);

      if (deals.length === 0) {
        const noDealsEmbed = createBaseEmbed()
          .setColor(EMBED_COLORS.CYBER)
          .setTitle('💰 Shop Deal Finder — Arbitrage Engine')
          .setDescription(
            `No profitable arbitrage deals found matching criteria (Min Profit: **₳${minProfit.toFixed(2)}**${itemFilter ? `, Item: \`${itemFilter}\`` : ''}).\n\n` +
              `*Tip: Check back when Convoy rotates stock or player shop prices update!*`
          );
        return interaction.editReply({ embeds: [noDealsEmbed] });
      }

      const emojis = getAppEmojis();
      const pageSize = 4;
      let currentPage = 0;
      const totalPages = Math.ceil(deals.length / pageSize);

      function renderPage(pageIdx) {
        const start = pageIdx * pageSize;
        const pageDeals = deals.slice(start, start + pageSize);

        const embed = createBaseEmbed()
          .setColor(EMBED_COLORS.SUCCESS)
          .setTitle(`💰 Arbitrage Deal Finder (Page ${pageIdx + 1}/${totalPages})`)
          .setDescription(
            `Found **${deals.length}** profitable deal(s) between Player Shops and Convoy Shop!\n` +
              `*Buy from Player Shop $\\rightarrow$ Sell to Convoy for instant profit.*`
          );

        pageDeals.forEach((d, idx) => {
          const itemKey = d.item.toLowerCase();
          const emojiStr = emojis[itemKey] || '📦';
          const fmtItem = d.item.replace(/_/g, ' ');

          embed.addFields({
            name: `${emojiStr} #${start + idx + 1}. ${fmtItem} (${d.rarity})`,
            value:
              `• **Shop:** \`${d.shopName}\` (by \`${d.owner}\`)\n` +
              `• **Location:** \`/tp ${d.world} ${d.plotX} ${d.plotZ}\` (Plot X: ${d.plotX}, Z: ${d.plotZ})\n` +
              `• **Player Price:** \`₳${d.playerPriceArc.toFixed(2)}\` per unit\n` +
              `• **Convoy Pays:** \`₳${d.convoyBuyPrice.toFixed(2)}\` per unit\n` +
              `• **Profit:** 🟢 **+₳${d.profitPerUnit.toFixed(2)}** / unit (Total Potential: **+₳${d.totalProfit.toFixed(2)}** across ${d.maxUnits} units)`,
            inline: false,
          });
        });

        const row = new ActionRowBuilder();

        if (totalPages > 1) {
          row.addComponents(
            new ButtonBuilder()
              .setCustomId('deal_prev')
              .setLabel('◀ Prev')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(pageIdx === 0),
            new ButtonBuilder()
              .setCustomId('deal_next')
              .setLabel('Next ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(pageIdx === totalPages - 1)
          );
        }

        // Add Quick Navigation Buttons to view Convoy Stock or Shops
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('deal_nav_cstock')
            .setLabel('📊 Convoy Stock')
            .setEmoji('📦')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('deal_nav_shops')
            .setLabel('🏬 Player Shops')
            .setEmoji('🛒')
            .setStyle(ButtonStyle.Primary)
        );

        return { embeds: [embed], components: [row] };
      }

      const initialPayload = renderPage(currentPage);
      const message = await interaction.editReply(initialPayload);

      const collector = message.createMessageComponentCollector({ time: 180000 });

      collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
          return i.reply({
            content: 'Only the command user can navigate pagination buttons.',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (i.customId === 'deal_prev') {
          currentPage = Math.max(0, currentPage - 1);
          await i.update(renderPage(currentPage));
        } else if (i.customId === 'deal_next') {
          currentPage = Math.min(totalPages - 1, currentPage + 1);
          await i.update(renderPage(currentPage));
        } else if (i.customId === 'deal_nav_cstock') {
          await i.reply({
            content: 'Use `/cstock` to view full Convoy Shop stock & rotation timings!',
            flags: MessageFlags.Ephemeral,
          });
        } else if (i.customId === 'deal_nav_shops') {
          await i.reply({
            content: 'Use `/shops` to browse player shop coordinates & item listings!',
            flags: MessageFlags.Ephemeral,
          });
        }
      });
    } catch (err) {
      await interaction.editReply({
        embeds: [
          errorEmbed('Deal Finder Error', `Failed to calculate arbitrage deals: ${err.message}`),
        ],
      });
    }
  },
};
