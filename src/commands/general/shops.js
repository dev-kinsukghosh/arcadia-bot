const {
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { arcadiaApi } = require('../../utils/apiClient.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');

const userLastAutocomplete = new Map();

// Local cache for shops data during autocomplete to prevent excessive API requests
let shopsCache = null;
let lastCacheFetch = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds TTL

async function fetchShopsData() {
  const now = Date.now();
  if (shopsCache && now - lastCacheFetch < CACHE_TTL) {
    return shopsCache;
  }
  try {
    const data = await arcadiaApi.getShops();
    if (data && Array.isArray(data.shops)) {
      shopsCache = data.shops;
      lastCacheFetch = now;
      return shopsCache;
    }
  } catch {
    if (shopsCache) return shopsCache;
    return [];
  }
  return [];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shops')
    .setDescription('Explore Arcadia player shops, search item listings, and find coordinates')
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List all registered player shops and locations')
    )
    .addSubcommand((sub) =>
      sub
        .setName('info')
        .setDescription('View detailed listings and balances of a specific player shop')
        .addStringOption((opt) =>
          opt
            .setName('shop')
            .setDescription('Name of the player shop')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('search')
        .setDescription('Search for selling or buying listings of a specific item')
        .addStringOption((opt) =>
          opt
            .setName('item')
            .setDescription('Name of the item (e.g. STONE, WHEAT, ENCHANTED_BOOK)')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value ? focusedOption.value.toLowerCase().trim() : '';

    // Debounce: Wait 500ms after user stops typing
    if (focusedValue !== '') {
      const userId = interaction.user.id;
      const currentInteractionId = interaction.id;
      userLastAutocomplete.set(userId, currentInteractionId);

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (userLastAutocomplete.get(userId) !== currentInteractionId) {
        return; // Ignore older keystrokes
      }
    }

    const shops = await fetchShopsData();
    if (!shops || shops.length === 0) {
      return interaction.respond([]).catch(() => {});
    }

    let choices = [];

    if (focusedOption.name === 'shop') {
      const filtered = shops.filter((s) => {
        const name = s.name ? s.name.toLowerCase() : '';
        const nameClean = s.name ? s.name.toLowerCase().replace(/_/g, ' ') : '';
        return name.includes(focusedValue) || nameClean.includes(focusedValue);
      });

      choices = filtered.slice(0, 25).map((s) => ({
        name: s.name.replace(/_/g, ' '),
        value: s.key || s.name.toLowerCase(),
      }));
    } else if (focusedOption.name === 'item') {
      const allItems = new Set();
      for (const s of shops) {
        if (Array.isArray(s.sellListings)) {
          s.sellListings.forEach((l) => {
            if (l.item) allItems.add(l.item.toUpperCase());
          });
        }
        if (Array.isArray(s.buyListings)) {
          s.buyListings.forEach((l) => {
            if (l.item) allItems.add(l.item.toUpperCase());
          });
        }
      }

      const filtered = Array.from(allItems).filter((item) =>
        item.toLowerCase().includes(focusedValue)
      );

      choices = filtered.slice(0, 25).map((item) => ({
        name: item.replace(/_/g, ' '),
        value: item,
      }));
    }

    await interaction.respond(choices).catch(() => {});
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    await interaction.deferReply();

    const shops = await fetchShopsData();
    if (!shops || shops.length === 0) {
      return interaction.editReply({
        embeds: [
          errorEmbed('No Shops Found', 'Could not retrieve player shops data. Try again later.'),
        ],
      });
    }

    // Fetch Application Emojis to map block/item textures
    const appEmojis = await interaction.client.application.emojis.fetch().catch(() => null);

    // Helper to format currency values
    const formatPrice = (val, currencyName = '₳') => {
      const parsed = parseFloat(val);
      if (isNaN(parsed)) return '0';
      return `${parsed.toLocaleString('en-US', { maximumFractionDigits: 3 })} ${currencyName.toUpperCase()}`;
    };

    // ── Subcommand: List ──────────────────────────────────────────────
    if (subcommand === 'list') {
      // Sort shops alphabetically
      const sortedShops = [...shops].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      const ITEMS_PER_PAGE = 5;
      const totalPages = Math.ceil(sortedShops.length / ITEMS_PER_PAGE);
      let currentPage = 0;

      const buildEmbed = (pageIdx) => {
        const start = pageIdx * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const chunk = sortedShops.slice(start, end);

        const embed = createBaseEmbed()
          .setColor(EMBED_COLORS.CYBER)
          .setTitle('🛒 Registered Player Shops')
          .setDescription(
            `Page ${pageIdx + 1} of ${totalPages} · Active player shops listed on ArcadiaMC.`
          );

        const listLines = chunk.map((s) => {
          const shopName = s.name.replace(/_/g, ' ');
          const coords = `(X: ${s.plotX ?? 0}, Z: ${s.plotZ ?? 0})`;
          const sellsCount = Array.isArray(s.sellListings) ? s.sellListings.length : 0;
          const buysCount = Array.isArray(s.buyListings) ? s.buyListings.length : 0;
          const currency = s.currency ? s.currency.toUpperCase() : 'N/A';

          const sellItems = Array.isArray(s.sellListings)
            ? s.sellListings.map((l) => (l.item ? l.item.toUpperCase() : 'UNKNOWN'))
            : [];

          const sellItemsFormatted = [];
          if (sellItems.length > 0) {
            const uniqueSellItems = Array.from(new Set(sellItems));
            const limit = 4;
            const sliced = uniqueSellItems.slice(0, limit);
            for (const rawItem of sliced) {
              const cleanName = rawItem.replace(/_/g, ' ');
              const targetEmojiName = rawItem.substring(0, 32);
              const appEmoji = appEmojis ? appEmojis.find((e) => e.name === targetEmojiName) : null;
              const emojiStr = appEmoji ? appEmoji.toString() : '📦';
              const formattedName = cleanName
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase());
              sellItemsFormatted.push(`${emojiStr} ${formattedName}`);
            }
          }

          let sellingStr = 'None';
          if (sellItemsFormatted.length > 0) {
            sellingStr = sellItemsFormatted.join(', ');
            if (sellItems.length > 4) {
              const remaining = Array.from(new Set(sellItems)).length - 4;
              if (remaining > 0) {
                sellingStr += ` (+${remaining} more)`;
              }
            }
          }

          return (
            `🔹 **${shopName}**\n` +
            `• **Location:** \`${coords}\` in \`${s.world || 'currentarc'}\`\n` +
            `• **Currency:** \`${currency}\`\n` +
            `• **Selling:** *${sellingStr}*\n` +
            `• **Listings:** \`${sellsCount} Selling\` · \`${buysCount} Buying\`\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━`
          );
        });

        embed.setDescription(embed.data.description + '\n\n' + listLines.join('\n\n'));
        return embed;
      };

      const buildButtons = (pageIdx) => {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`shops_prev_${interaction.id}`)
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIdx === 0),
          new ButtonBuilder()
            .setCustomId(`shops_page_${interaction.id}`)
            .setLabel(`${pageIdx + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`shops_next_${interaction.id}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageIdx === totalPages - 1)
        );
      };

      const message = await interaction.editReply({
        embeds: [buildEmbed(currentPage)],
        components: totalPages > 1 ? [buildButtons(currentPage)] : [],
      });

      if (totalPages > 1) {
        const collector = message.createMessageComponentCollector({
          time: 3 * 60 * 1000,
        });

        collector.on('collect', async (btn) => {
          if (btn.user.id !== interaction.user.id) {
            return btn.reply({
              content: '❌ Only the command invoker can use these buttons.',
              flags: MessageFlags.Ephemeral,
            });
          }

          if (btn.customId === `shops_prev_${interaction.id}`) {
            currentPage = Math.max(0, currentPage - 1);
            await btn.update({
              embeds: [buildEmbed(currentPage)],
              components: [buildButtons(currentPage)],
            });
          } else if (btn.customId === `shops_next_${interaction.id}`) {
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
                .setCustomId('shops_prev_done')
                .setLabel('◀ Prev')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('shops_page_done')
                .setLabel(`${currentPage + 1} / ${totalPages}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId('shops_next_done')
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
      }
      return;
    }

    // ── Subcommand: Info ──────────────────────────────────────────────
    if (subcommand === 'info') {
      const query = interaction.options.getString('shop').trim().toLowerCase();
      const shop = shops.find(
        (s) => s.key?.toLowerCase() === query || s.name?.toLowerCase() === query
      );

      if (!shop) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Shop Not Found',
              `No shop named \`${query}\` could be found. Please use autocomplete.`
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const shopName = shop.name.replace(/_/g, ' ');
      const worldName = shop.world || 'currentarc';
      const coords = `X: ${shop.plotX ?? 0}, Z: ${shop.plotZ ?? 0}`;
      const ownerUuid = shop.owner || 'Unknown';
      const shopCurrency = shop.currency ? shop.currency.toUpperCase() : 'N/A';

      // Balances
      const balanceLines = [];
      if (shop.balances && Object.keys(shop.balances).length > 0) {
        for (const [curr, bal] of Object.entries(shop.balances)) {
          balanceLines.push(`• **${curr.toUpperCase()}:** \`${parseFloat(bal).toFixed(2)}\``);
        }
      } else {
        balanceLines.push('• *No balances loaded*');
      }

      // Sell listings
      const sellLines = [];
      if (Array.isArray(shop.sellListings) && shop.sellListings.length > 0) {
        for (const list of shop.sellListings) {
          const rawItem = list.item || 'Unknown';
          const name = rawItem.replace(/_/g, ' ');
          const targetEmojiName = rawItem.substring(0, 32);
          const appEmoji = appEmojis ? appEmojis.find((e) => e.name === targetEmojiName) : null;
          const emojiStr = appEmoji ? appEmoji.toString() : '📦';
          sellLines.push(
            `${emojiStr} **${name}** — \`${list.amount} units\` @ \`${formatPrice(list.price, list.currency || shop.currency)}\``
          );
        }
      } else {
        sellLines.push('• *No active sell listings*');
      }

      // Buy listings
      const buyLines = [];
      if (Array.isArray(shop.buyListings) && shop.buyListings.length > 0) {
        for (const list of shop.buyListings) {
          const rawItem = list.item || 'Unknown';
          const name = rawItem.replace(/_/g, ' ');
          const targetEmojiName = rawItem.substring(0, 32);
          const appEmoji = appEmojis ? appEmojis.find((e) => e.name === targetEmojiName) : null;
          const emojiStr = appEmoji ? appEmoji.toString() : '📥';
          buyLines.push(
            `${emojiStr} **${name}** — Wants \`${list.amount} units\` @ \`${formatPrice(list.price, list.currency || shop.currency)}\``
          );
        }
      } else {
        buyLines.push('• *No active buy listings*');
      }

      // Limit lists to avoid embed limits (1024 chars per field)
      let sellsStr = sellLines.join('\n');
      if (sellsStr.length > 1000) {
        sellsStr = sellsStr.substring(0, 950) + `\n... (+ ${sellLines.length - 20} more listings)`;
      }
      let buysStr = buyLines.join('\n');
      if (buysStr.length > 1000) {
        buysStr = buysStr.substring(0, 950) + `\n... (+ ${buyLines.length - 20} more listings)`;
      }

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(`🛒 Shop Details: ${shopName}`)
        .setDescription(`Detailed inventory and profile telemetry for player shop **${shopName}**.`)
        .addFields(
          {
            name: '👑 Profile Metadata',
            value: `• **Owner UUID:** \`${ownerUuid}\`\n• **Location:** \`${coords}\` in \`${worldName}\`\n• **Primary Currency:** \`${shopCurrency}\``,
            inline: false,
          },
          {
            name: '💰 Currency Balances',
            value: balanceLines.join('\n'),
            inline: false,
          },
          {
            name: `🛒 Sell Listings (${Array.isArray(shop.sellListings) ? shop.sellListings.length : 0})`,
            value: sellsStr,
            inline: false,
          },
          {
            name: `📥 Buy Listings (${Array.isArray(shop.buyListings) ? shop.buyListings.length : 0})`,
            value: buysStr,
            inline: false,
          }
        );

      return interaction.editReply({ embeds: [embed] });
    }

    // ── Subcommand: Search ────────────────────────────────────────────
    if (subcommand === 'search') {
      const searchItem = interaction.options.getString('item').trim().toUpperCase();
      const searchItemClean = searchItem.replace(/_/g, ' ');

      const sellMatches = [];
      const buyMatches = [];

      for (const s of shops) {
        const shopLabel = s.name.replace(/_/g, ' ');
        const coordsStr = `[${s.plotX ?? 0}, ${s.plotZ ?? 0}]`;

        if (Array.isArray(s.sellListings)) {
          for (const listing of s.sellListings) {
            if (listing.item && listing.item.toUpperCase() === searchItem) {
              sellMatches.push({
                shopName: shopLabel,
                coords: coordsStr,
                price: parseFloat(listing.price),
                amount: parseInt(listing.amount, 10),
                currency: listing.currency || s.currency || '₳',
              });
            }
          }
        }

        if (Array.isArray(s.buyListings)) {
          for (const listing of s.buyListings) {
            if (listing.item && listing.item.toUpperCase() === searchItem) {
              buyMatches.push({
                shopName: shopLabel,
                coords: coordsStr,
                price: parseFloat(listing.price),
                amount: parseInt(listing.amount, 10),
                currency: listing.currency || s.currency || '₳',
              });
            }
          }
        }
      }

      // Sort sell listings: cheapest first
      sellMatches.sort((a, b) => a.price - b.price);
      // Sort buy listings: highest buyer price first
      buyMatches.sort((a, b) => b.price - a.price);

      const sellLines = sellMatches.map(
        (m) =>
          `• **${m.shopName}** \`${m.coords}\`: \`${m.amount} units\` @ \`${formatPrice(m.price, m.currency)}\``
      );
      const buyLines = buyMatches.map(
        (m) =>
          `• **${m.shopName}** \`${m.coords}\`: Wants \`${m.amount} units\` @ \`${formatPrice(m.price, m.currency)}\``
      );

      let sellsStr =
        sellLines.length > 0
          ? sellLines.join('\n')
          : '• *No shops are currently selling this item.*';
      if (sellsStr.length > 1000) {
        sellsStr = sellsStr.substring(0, 950) + `\n... (+ ${sellLines.length - 20} more listings)`;
      }

      let buysStr =
        buyLines.length > 0 ? buyLines.join('\n') : '• *No shops are currently buying this item.*';
      if (buysStr.length > 1000) {
        buysStr = buysStr.substring(0, 950) + `\n... (+ ${buyLines.length - 20} more listings)`;
      }

      // Fetch specific item emoji
      const targetEmojiName = searchItem.substring(0, 32);
      const appEmoji = appEmojis ? appEmojis.find((e) => e.name === targetEmojiName) : null;
      const emojiPrefix = appEmoji ? appEmoji.toString() + ' ' : '';

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle(`${emojiPrefix}Listings Search: ${searchItemClean}`)
        .setDescription(`Active player listings found for item **${searchItemClean}**.`)
        .addFields(
          {
            name: `🛒 Selling Offers (${sellMatches.length} total)`,
            value: sellsStr,
            inline: false,
          },
          {
            name: `📥 Buying Requests (${buyMatches.length} total)`,
            value: buysStr,
            inline: false,
          }
        );

      if (appEmoji) {
        embed.setThumbnail(appEmoji.imageURL());
      }

      return interaction.editReply({ embeds: [embed] });
    }
  },
};
