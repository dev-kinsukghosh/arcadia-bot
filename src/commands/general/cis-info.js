const {
  SlashCommandBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const { db } = require('../../utils/db.js');
const { convoyItems } = require('../../db/schema.js');
const {
  createBaseEmbed,
  errorEmbed,
  formatUtcTime,
  EMBED_COLORS,
} = require('../../utils/embedHelper.js');
const { getCurrencyCache } = require('../../services/currencySync.js');
const { getAppEmojis } = require('../../utils/emojiCache.js');
const { getGuildCurrency } = require('../../utils/guildConfigHelper.js');
const { getAllItemsCache } = require('../../services/convoySync.js');
const path = require('path');
const fs = require('fs');
const redis = require('../../utils/redis.js');
const logger = require('../../utils/logger.js');

let cachedAutocompleteItems = [];
let cacheInitialized = false;

const ICONS_DIR = path.join(process.cwd(), 'src', 'icons');

// Rarity display config
const RARITY_CONFIG = {
  LEGENDARY: { emoji: '🟨', color: 0xf1c40f, label: 'Legendary' },
  EPIC: { emoji: '🟪', color: 0xbb86fc, label: 'Epic' },
  RARE: { emoji: '🟦', color: 0x3498db, label: 'Rare' },
  UNCOMMON: { emoji: '🟩', color: 0x2ecc71, label: 'Uncommon' },
  COMMON: { emoji: '⬜', color: 0x95a5a6, label: 'Common' },
};
const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'];

async function updateAutocompleteCache() {
  if (!db) return;
  try {
    const items = await db
      .select({ item: convoyItems.item, rarity: convoyItems.rarity })
      .from(convoyItems);

    let searchCounts = {};
    if (redis && redis.status === 'ready') {
      try {
        searchCounts = await redis.hgetall('stats:items:searched');
      } catch {
        // Ignore
      }
    }

    const getSearchCount = (itemName) => {
      const val = searchCounts[itemName.toUpperCase()];
      return val ? parseInt(val, 10) : 0;
    };

    cachedAutocompleteItems = items.map((choice) => {
      const searches = getSearchCount(choice.item);
      const rarity = choice.rarity ? choice.rarity.toUpperCase() : 'COMMON';
      const isRare = ['LEGENDARY', 'EPIC', 'RARE'].includes(rarity);
      const isRegular = ['UNCOMMON', 'COMMON'].includes(rarity);

      const score = searches * 2 + (isRare ? 2 : 0) + (isRegular ? 1 : 0);

      return {
        ...choice,
        score,
      };
    });

    logger.info('Successfully updated cis-info autocomplete suggestion score cache.');
  } catch (err) {
    logger.error('Failed to update autocomplete suggestion cache:', err);
  }
}

function ensureCacheInitialized() {
  if (cacheInitialized) return;
  cacheInitialized = true;

  // Run immediately
  updateAutocompleteCache();

  // Schedule every 1 hour
  setInterval(
    () => {
      updateAutocompleteCache();
    },
    60 * 60 * 1000
  );
}

function formatPrice(price) {
  const n = parseFloat(price);
  if (isNaN(n)) return '0.00';
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatItemName(name) {
  return name
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getItemIcon(itemName) {
  const iconPath = path.join(ICONS_DIR, `${itemName.toUpperCase()}.png`);
  if (fs.existsSync(iconPath)) {
    const filename = `${itemName.toUpperCase()}.png`;
    return { attachment: new AttachmentBuilder(iconPath, { name: filename }), filename };
  }
  return null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cis-info')
    .setDescription('View detailed convoy rotation information for items')
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
        .setName('item')
        .setDescription('Select an item to view details')
        .setRequired(false)
        .setAutocomplete(true)
    ),

  initCache() {
    ensureCacheInitialized();
  },

  getCache() {
    ensureCacheInitialized();
    return cachedAutocompleteItems;
  },

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();

      // Ensure cache is initialized and scheduled
      ensureCacheInitialized();

      // Filter and sort cached items by score descending
      let filtered = cachedAutocompleteItems;
      if (focusedValue !== '') {
        filtered = cachedAutocompleteItems.filter((choice) =>
          choice.item.toLowerCase().includes(focusedValue)
        );
      }

      const topChoices = filtered.sort((a, b) => b.score - a.score).slice(0, 10);

      await interaction.respond(
        topChoices.map((choice) => {
          const rarityLabel = choice.rarity ? choice.rarity.toUpperCase() : 'COMMON';
          const cfg = RARITY_CONFIG[rarityLabel] || { label: choice.rarity };

          return {
            name: `${formatItemName(choice.item)} (${cfg.label})`,
            value: choice.item,
          };
        })
      );
    } catch {
      // Silently ignore autocomplete failures
    }
  },

  async execute(interaction) {
    await interaction.deferReply();

    if (!db) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Database Unavailable',
            'Could not connect to the database. Please try again later.'
          ),
        ],
      });
    }

    // Load guild's configured currency
    let activeCurrency = 'arc';
    let conversion = { prefix: '₳', suffix: '', rate: 1.0 };

    if (interaction.guildId) {
      activeCurrency = await getGuildCurrency(interaction.guildId);
    }

    if (activeCurrency !== 'arc') {
      const cache = getCurrencyCache();
      const currenciesList = cache.currencies || [];
      const matched = currenciesList.find((c) => c.id?.toLowerCase() === activeCurrency);
      if (matched) {
        const rate = parseFloat(matched.arcPerUnitLive) || 1.0;
        conversion = {
          prefix: '',
          suffix: ` ${matched.name || matched.id}`,
          rate,
        };
      }
    }

    const itemArg = interaction.options.getString('item');

    // Fetch application emojis from cache
    const appEmojis = await getAppEmojis(interaction.client);

    // Fetch all items from cache
    let allItems = getAllItemsCache();
    if (!allItems || allItems.length === 0) {
      allItems = await db.select().from(convoyItems);
    }

    if (!allItems || allItems.length === 0) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'No History Found',
            'No convoy items have been synchronized yet. Try running /forcesync first.'
          ),
        ],
      });
    }

    if (itemArg) {
      const targetItemName = itemArg.toUpperCase().trim();
      const itemRecord = allItems.find((i) => i.item === targetItemName);

      if (itemRecord) {
        // Increment search count in Redis
        if (redis && redis.status === 'ready') {
          try {
            await redis.hincrby('stats:items:searched', targetItemName, 1);
          } catch {
            // Ignore stats errors
          }
        }

        // Instant update in memory cache to reflect search immediately
        const cachedItem = cachedAutocompleteItems.find((i) => i.item === targetItemName);
        if (cachedItem) {
          cachedItem.score += 2;
        }
      }

      if (!itemRecord) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Item Not Found',
              `The item \`${itemArg}\` could not be found in the convoy history.\n` +
                'Make sure to select one of the suggested items from the autocomplete list.'
            ),
          ],
        });
      }

      // Check if we have an application emoji for this item
      const targetEmojiName = itemRecord.item.substring(0, 32);
      const appEmoji = appEmojis ? appEmojis.find((e) => e.name === targetEmojiName) : null;
      let thumbnailUrl = null;
      const files = [];

      if (appEmoji) {
        thumbnailUrl = appEmoji.imageURL();
      } else {
        // Fallback to local files
        const { downloadItemIcon } = require('../../utils/iconDownloader.js');
        let icon = getItemIcon(itemRecord.item);
        if (!icon) {
          try {
            await downloadItemIcon(itemRecord.item);
            icon = getItemIcon(itemRecord.item);
          } catch {
            // Ignore downloader failures
          }
        }
        if (icon) {
          thumbnailUrl = `attachment://${icon.filename}`;
          files.push(icon.attachment);
        }
      }

      // Calculate rank
      const sortedByFreq = [...allItems].sort((a, b) => b.timesSeen - a.timesSeen);
      const rankIndex = sortedByFreq.findIndex((i) => i.item === itemRecord.item);
      const rank = rankIndex !== -1 ? rankIndex + 1 : 'Unknown';

      const cfg = RARITY_CONFIG[itemRecord.rarity.toUpperCase()] || {
        emoji: '🔘',
        color: EMBED_COLORS.CYBER,
        label: itemRecord.rarity,
      };

      const titlePrefix = appEmoji ? `<:${appEmoji.name}:${appEmoji.id}> ` : `${cfg.emoji} `;

      const embed = createBaseEmbed()
        .setColor(cfg.color)
        .setTitle(`${titlePrefix}${formatItemName(itemRecord.item)}`)
        .setDescription(
          `Historical telemetry and pricing stats for **${formatItemName(itemRecord.item)}**.`
        )
        .addFields(
          { name: '✨ Rarity Tier', value: `${cfg.emoji} **${cfg.label}**`, inline: true },
          {
            name: '📊 Frequency Rank',
            value: `Rank **#${rank}** of **${allItems.length}**\n(Seen **${itemRecord.timesSeen}** times)`,
            inline: true,
          },
          {
            name: '🟢 Shop Status',
            value: itemRecord.current_p ? '🟢 **Active in Shop**' : '🔴 **Rotated Out**',
            inline: true,
          },
          {
            name: '💰 Buy Price',
            value: `\`${conversion.prefix}${formatPrice(parseFloat(itemRecord.buyPrice) / conversion.rate)}${conversion.suffix}\``,
            inline: true,
          },
          {
            name: '💰 Sell Price',
            value: `\`${conversion.prefix}${formatPrice(parseFloat(itemRecord.sellPrice) / conversion.rate)}${conversion.suffix}\``,
            inline: true,
          },
          {
            name: '📦 Stock Settings',
            value: `Stock: **${itemRecord.stock}** / **${itemRecord.maxStock}**`,
            inline: true,
          }
        );

      if (itemRecord.updatedAt) {
        embed.addFields({
          name: '⏱️ Last Rotated / Updated (UTC)',
          value: formatUtcTime(itemRecord.updatedAt),
          inline: false,
        });
      }

      if (thumbnailUrl) {
        embed.setThumbnail(thumbnailUrl);
      }

      return interaction.editReply({
        embeds: [embed],
        files,
      });
    }

    // No item argument — show stats overview
    const totalItems = allItems.length;
    const activeItemsCount = allItems.filter((i) => i.current_p).length;

    // Sort for top 5 / bottom 5
    const sortedByFreq = [...allItems].sort((a, b) => b.timesSeen - a.timesSeen);
    const top5 = sortedByFreq.slice(0, 5);
    const bottom5 = [...sortedByFreq].reverse().slice(0, 5);

    // Counts by rarity
    const rarityCounts = {};
    for (const it of allItems) {
      const r = (it.rarity || 'COMMON').toUpperCase();
      rarityCounts[r] = (rarityCounts[r] || 0) + 1;
    }

    const buildOverviewEmbed = (appEmojis) => {
      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle('🚚 Convoy Rotation Statistics')
        .setDescription(
          `Overall summary of all **${totalItems}** unique items currently recorded in the convoy rotations database.\n` +
            `Use \`/cis-info [item]\` to lookup detailed statistics for a specific item.`
        )
        .addFields({
          name: '📊 General Telemetry',
          value: `• Total Unique Items: **${totalItems}**\n• Currently Active: **${activeItemsCount}** in shop`,
          inline: false,
        });

      let rarityBreakdownStr = '';
      for (const r of RARITY_ORDER) {
        const count = rarityCounts[r] || 0;
        if (count > 0) {
          const cfg = RARITY_CONFIG[r];
          rarityBreakdownStr += `${cfg.emoji} **${cfg.label}**: **${count}** item(s)\n`;
        }
      }
      for (const r of Object.keys(rarityCounts)) {
        if (!RARITY_ORDER.includes(r)) {
          rarityBreakdownStr += `🔘 **${r}**: **${rarityCounts[r]}** item(s)\n`;
        }
      }

      if (rarityBreakdownStr) {
        embed.addFields({
          name: '📈 Rarity Distribution',
          value: rarityBreakdownStr,
          inline: false,
        });
      }

      const top5Str = top5
        .map((it, idx) => {
          const cfg = RARITY_CONFIG[(it.rarity || 'COMMON').toUpperCase()] || {
            emoji: '🔘',
            label: it.rarity,
          };
          const targetEmojiName = it.item.substring(0, 32);
          const appEmoji = appEmojis ? appEmojis.find((e) => e.name === targetEmojiName) : null;
          const emojiStr = appEmoji ? `<:${appEmoji.name}:${appEmoji.id}> ` : `${cfg.emoji} `;
          return `${idx + 1}. ${emojiStr}**${formatItemName(it.item)}** — seen **${it.timesSeen}** times (${cfg.label})`;
        })
        .join('\n');
      embed.addFields({
        name: '🔥 Most Frequent Items (Top 5)',
        value: top5Str || 'None recorded',
        inline: false,
      });

      const bottom5Str = bottom5
        .map((it, idx) => {
          const cfg = RARITY_CONFIG[(it.rarity || 'COMMON').toUpperCase()] || {
            emoji: '🔘',
            label: it.rarity,
          };
          const targetEmojiName = it.item.substring(0, 32);
          const appEmoji = appEmojis ? appEmojis.find((e) => e.name === targetEmojiName) : null;
          const emojiStr = appEmoji ? `<:${appEmoji.name}:${appEmoji.id}> ` : `${cfg.emoji} `;
          return `${idx + 1}. ${emojiStr}**${formatItemName(it.item)}** — seen **${it.timesSeen}** times (${cfg.label})`;
        })
        .join('\n');
      embed.addFields({
        name: '❄️ Rarest Items (Bottom 5)',
        value: bottom5Str || 'None recorded',
        inline: false,
      });

      const latestUpdated = allItems.reduce((max, it) => {
        if (!it.updatedAt) return max;
        const d = it.updatedAt instanceof Date ? it.updatedAt : new Date(it.updatedAt);
        const t = d.getTime();
        return !isNaN(t) && t > max ? t : max;
      }, 0);

      if (latestUpdated > 0) {
        embed.addFields({
          name: '⏱️ Last Rotated / Updated (UTC)',
          value: formatUtcTime(latestUpdated),
          inline: false,
        });
      }

      return embed;
    };

    const overviewEmbed = buildOverviewEmbed(appEmojis);

    const overviewRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`cisinfo_list_${interaction.id}`)
        .setLabel('📋 View All Items')
        .setStyle(ButtonStyle.Primary)
    );

    const message = await interaction.editReply({
      embeds: [overviewEmbed],
      components: [overviewRow],
    });

    // Paginated list settings
    const ITEMS_PER_PAGE = 8;
    const sortedListItems = [...allItems].sort((a, b) => {
      const rA = (a.rarity || 'COMMON').toUpperCase();
      const rB = (b.rarity || 'COMMON').toUpperCase();
      const idxA = RARITY_ORDER.indexOf(rA);
      const idxB = RARITY_ORDER.indexOf(rB);

      if (idxA !== idxB) {
        const actualIdxA = idxA === -1 ? 99 : idxA;
        const actualIdxB = idxB === -1 ? 99 : idxB;
        return actualIdxA - actualIdxB;
      }
      if (b.timesSeen !== a.timesSeen) {
        return b.timesSeen - a.timesSeen;
      }
      return a.item.localeCompare(b.item);
    });

    const pages = [];
    for (let i = 0; i < sortedListItems.length; i += ITEMS_PER_PAGE) {
      pages.push(sortedListItems.slice(i, i + ITEMS_PER_PAGE));
    }

    const totalPages = pages.length;
    let currentPage = 0;
    let viewMode = 'OVERVIEW';

    const buildListPageEmbed = (pageIdx) => {
      const chunk = pages[pageIdx];
      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.CYBER)
        .setTitle('📋 Convoy Rotating Items List')
        .setDescription(`Page ${pageIdx + 1} of ${totalPages} · Sorted by rarity & frequency.`);

      const listLines = chunk.map((it) => {
        const cfg = RARITY_CONFIG[(it.rarity || 'COMMON').toUpperCase()] || {
          emoji: '🔘',
          label: it.rarity,
        };
        const statusStr = it.current_p ? '🟢' : '🔴';
        const targetEmojiName = it.item.substring(0, 32);
        const appEmoji = appEmojis ? appEmojis.find((e) => e.name === targetEmojiName) : null;
        const emojiStr = appEmoji ? `<:${appEmoji.name}:${appEmoji.id}> ` : '';
        const convertedBuy = parseFloat(it.buyPrice) / conversion.rate;
        const convertedSell = parseFloat(it.sellPrice) / conversion.rate;
        return (
          `${statusStr} ${emojiStr}**${formatItemName(it.item)}** (${cfg.emoji} ${cfg.label})\n` +
          `└ Seen **${it.timesSeen}** times · Buy: \`${conversion.prefix}${formatPrice(convertedBuy)}${conversion.suffix}\` · Sell: \`${conversion.prefix}${formatPrice(convertedSell)}${conversion.suffix}\``
        );
      });

      embed.setDescription(embed.data.description + '\n\n' + listLines.join('\n\n'));
      return embed;
    };

    const buildListButtonsRow = (pageIdx) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`cisinfo_prev_${interaction.id}`)
          .setLabel('◀ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === 0),
        new ButtonBuilder()
          .setCustomId(`cisinfo_page_${interaction.id}`)
          .setLabel(`${pageIdx + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`cisinfo_next_${interaction.id}`)
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === totalPages - 1),
        new ButtonBuilder()
          .setCustomId(`cisinfo_home_${interaction.id}`)
          .setLabel('🏠 Home')
          .setStyle(ButtonStyle.Secondary)
      );
    };

    const collector = message.createMessageComponentCollector({ time: 5 * 60 * 1000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({
          content: '❌ Only the command invoker can use these buttons.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (btn.customId === `cisinfo_list_${interaction.id}`) {
        viewMode = 'LIST';
        currentPage = 0;
        await btn.update({
          embeds: [buildListPageEmbed(0)],
          components: [buildListButtonsRow(0)],
        });
      } else if (btn.customId === `cisinfo_home_${interaction.id}`) {
        viewMode = 'OVERVIEW';
        await btn.update({
          embeds: [buildOverviewEmbed(appEmojis)],
          components: [overviewRow],
        });
      } else if (btn.customId === `cisinfo_prev_${interaction.id}`) {
        currentPage = Math.max(0, currentPage - 1);
        await btn.update({
          embeds: [buildListPageEmbed(currentPage)],
          components: [buildListButtonsRow(currentPage)],
        });
      } else if (btn.customId === `cisinfo_next_${interaction.id}`) {
        currentPage = Math.min(totalPages - 1, currentPage + 1);
        await btn.update({
          embeds: [buildListPageEmbed(currentPage)],
          components: [buildListButtonsRow(currentPage)],
        });
      }
    });

    collector.on('end', async () => {
      try {
        if (viewMode === 'OVERVIEW') {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('cisinfo_list_done')
              .setLabel('📋 View All Items')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true)
          );
          await interaction.editReply({
            embeds: [buildOverviewEmbed(appEmojis)],
            components: [disabledRow],
          });
        } else {
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('cisinfo_prev_done')
              .setLabel('◀ Prev')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('cisinfo_page_done')
              .setLabel(`${currentPage + 1} / ${totalPages}`)
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('cisinfo_next_done')
              .setLabel('Next ▶')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId('cisinfo_home_done')
              .setLabel('🏠 Home')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );
          await interaction.editReply({
            embeds: [buildListPageEmbed(currentPage)],
            components: [disabledRow],
          });
        }
      } catch {
        // Message deleted — ignore
      }
    });
  },
};
