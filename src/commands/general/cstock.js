const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require('discord.js');
const { db } = require('../../utils/db.js');
const { convoyItems } = require('../../db/schema.js');
const { eq } = require('drizzle-orm');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const path = require('path');
const fs = require('fs');

const ICONS_DIR = path.join(__dirname, '../../icons');

// Max items to show per page (keeps component count under Discord's limit of 40)
// Component budget per item with icon: SectionBuilder(1) + TextDisplay(1) + Thumbnail(1) + Separator(1) = 4
// Header: SectionBuilder(3) + Separator(1) = 4
// Footer: Separator(1) + TextDisplay(1) = 2
// Total for 5 items: 4 + (5×4) - 1(no final sep) + 2 = 25 ✅
const ITEMS_PER_PAGE = 5;

// Weighted pool of thematic Minecraft chest boat icons to use as page header thumbnails
const BOAT_POOL = [
  { name: 'OAK_CHEST_BOAT', weight: 45 },
  { name: 'SPRUCE_CHEST_BOAT', weight: 30 },
  { name: 'BIRCH_CHEST_BOAT', weight: 15 },
  { name: 'JUNGLE_CHEST_BOAT', weight: 7 },
  { name: 'ACACIA_CHEST_BOAT', weight: 2 },
  { name: 'MANGROVE_CHEST_BOAT', weight: 1 }, // Keep 1 rare one
];

function getRandomBoatIcon() {
  const totalWeight = BOAT_POOL.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of BOAT_POOL) {
    if (random < item.weight) {
      return item.name;
    }
    random -= item.weight;
  }
  return BOAT_POOL[0].name;
}

// Rarity display config
const RARITY_CONFIG = {
  LEGENDARY: { emoji: '🟨', color: 0xf1c40f, label: 'Legendary' },
  EPIC: { emoji: '🟪', color: 0xbb86fc, label: 'Epic' },
  RARE: { emoji: '🟦', color: 0x3498db, label: 'Rare' },
  UNCOMMON: { emoji: '🟩', color: 0x2ecc71, label: 'Uncommon' },
  COMMON: { emoji: '⬜', color: 0x95a5a6, label: 'Common' },
};
const RARITY_ORDER = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'];

function formatPrice(price) {
  const n = parseFloat(price);
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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

/**
 * Build a Components V2 container page for a chunk of items within a rarity group
 * @param {string} rarity - Rarity key (e.g. 'LEGENDARY')
 * @param {Array} items - Slice of items for this page
 * @param {number} pageIndex - Global page index (0-based)
 * @param {number} totalPages - Total page count
 * @param {number} subPage - Sub-page index within this rarity (0-based)
 * @param {number} subTotal - Total sub-pages for this rarity
 */
function buildPage(rarity, items, pageIndex, totalPages, subPage, subTotal, headerIconName) {
  const cfg = RARITY_CONFIG[rarity] || { emoji: '🔘', color: EMBED_COLORS.DEFAULT, label: rarity };

  // Deduplicate attachments by filename — Discord only needs each file once per message
  const attachments = [];
  const seenFilenames = new Set();
  const container = new ContainerBuilder().setAccentColor(cfg.color);

  // ── Header section with a thematic chest boat icon as thumbnail ──
  const headerIcon = getItemIcon(headerIconName);
  const rarityLabel =
    subTotal > 1 ? `${cfg.label} Items (${subPage + 1}/${subTotal})` : `${cfg.label} Items`;
  const headerText = new TextDisplayBuilder().setContent(
    `## ${cfg.emoji} ${rarityLabel}\n-# 🚚 Convoy Shop  ·  Page ${pageIndex + 1} of ${totalPages}`
  );

  if (headerIcon) {
    if (!seenFilenames.has(headerIcon.filename)) {
      seenFilenames.add(headerIcon.filename);
      attachments.push(headerIcon.attachment);
    }
    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(headerText)
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${headerIcon.filename}`))
    );
  } else {
    container.addTextDisplayComponents(headerText);
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  );

  // ── Items ──
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const stockBar = it.maxStock > 0 ? `${it.stock}/${it.maxStock}` : `${it.stock}`;
    const itemIcon = getItemIcon(it.item);

    const itemText = new TextDisplayBuilder().setContent(
      `### ${formatItemName(it.item)}\n` +
        `💰 **Buy** \`₳${formatPrice(it.buyPrice)}\`  ·  **Sell** \`₳${formatPrice(it.sellPrice)}\`\n` +
        `-# 📦 Stock: ${stockBar}`
    );

    if (itemIcon) {
      if (!seenFilenames.has(itemIcon.filename)) {
        seenFilenames.add(itemIcon.filename);
        attachments.push(itemIcon.attachment);
      }
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(itemText)
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(`attachment://${itemIcon.filename}`))
      );
    } else {
      container.addTextDisplayComponents(itemText);
    }

    // Separator between items (not after last)
    if (i < items.length - 1) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      );
    }
  }

  container.addSeparatorComponents(
    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      `-# Prices refresh every 5 minutes  ·  ArcadiaMC Community Bot By _webdevkin`
    )
  );

  return { container, attachments };
}

/**
 * Build navigation button row
 */
function buildNavRow(pageIndex, totalPages, interactionId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`cstock_prev_${interactionId}`)
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageIndex === 0),
    new ButtonBuilder()
      .setCustomId(`cstock_page_${interactionId}`)
      .setLabel(`${pageIndex + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId(`cstock_next_${interactionId}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pageIndex === totalPages - 1)
  );
}

module.exports = {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('cstock')
    .setDescription('View the current Convoy shop stock and prices'),

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

    const items = await db.select().from(convoyItems).where(eq(convoyItems.current_p, true));

    if (!items || items.length === 0) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'No Active Stock',
            "The convoy shop is currently empty or hasn't been synced yet.\nTry again in a few minutes."
          ),
        ],
      });
    }

    // Check if any active items are missing icons from local cache
    const missingIcons = [];
    for (const it of items) {
      const iconPath = path.join(ICONS_DIR, `${it.item.toUpperCase()}.png`);
      if (!fs.existsSync(iconPath)) {
        missingIcons.push(it.item);
      }
    }

    if (missingIcons.length > 0) {
      const recoveryEmbed = createBaseEmbed()
        .setColor(EMBED_COLORS.WARNING)
        .setTitle('🔄 Asset Recovery In Progress')
        .setDescription(
          `Some item icons are missing from the local cache.\n` +
            `Automatically downloading and upscaling **${missingIcons.length}** asset(s)...\n\n` +
            `**Queue:** ${missingIcons.map((i) => `\`${i}\``).join(', ')}`
        )
        .setFooter({ text: 'This will take a few seconds.' });

      await interaction.editReply({ embeds: [recoveryEmbed], components: [] });

      const { downloadItemIcon } = require('../../utils/iconDownloader.js');
      for (const item of missingIcons) {
        try {
          await downloadItemIcon(item);
        } catch {
          // Ignore download error
        }
      }
    }

    // Group by rarity
    const grouped = {};
    for (const item of items) {
      const rarity = (item.rarity || 'COMMON').toUpperCase();
      if (!grouped[rarity]) grouped[rarity] = [];
      grouped[rarity].push(item);
    }

    // Build flat pages array — chunk large rarity groups into sub-pages of ITEMS_PER_PAGE
    const pages = [];

    const addRarity = (rarity) => {
      if (!grouped[rarity]) return;
      const rarityItems = grouped[rarity];
      const chunks = [];
      for (let i = 0; i < rarityItems.length; i += ITEMS_PER_PAGE) {
        chunks.push(rarityItems.slice(i, i + ITEMS_PER_PAGE));
      }
      chunks.forEach((chunk, subIdx) => {
        pages.push({
          rarity,
          items: chunk,
          subPage: subIdx,
          subTotal: chunks.length,
          headerIcon: getRandomBoatIcon(),
        });
      });
    };

    // Add rarities in defined order first
    RARITY_ORDER.forEach(addRarity);

    // Then any unknown rarities not in RARITY_ORDER
    for (const r of Object.keys(grouped)) {
      if (!RARITY_ORDER.includes(r)) addRarity(r);
    }

    const totalPages = pages.length;
    let currentPage = 0;

    const { container: firstContainer, attachments: firstAttachments } = buildPage(
      pages[0].rarity,
      pages[0].items,
      0,
      totalPages,
      pages[0].subPage,
      pages[0].subTotal,
      pages[0].headerIcon
    );

    const navRow = buildNavRow(0, totalPages, interaction.id);

    const message = await interaction.editReply({
      components: totalPages > 1 ? [firstContainer, navRow] : [firstContainer],
      flags: MessageFlags.IsComponentsV2,
      files: firstAttachments,
    });

    if (totalPages <= 1) return;

    // Collect button presses — 5 min timeout
    const collector = message.createMessageComponentCollector({ time: 5 * 60 * 1000 });

    collector.on('collect', async (btn) => {
      if (btn.user.id !== interaction.user.id) {
        return btn.reply({
          content: '❌ Only the command invoker can navigate these pages.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (btn.customId === `cstock_prev_${interaction.id}`) {
        currentPage = Math.max(0, currentPage - 1);
      } else if (btn.customId === `cstock_next_${interaction.id}`) {
        currentPage = Math.min(totalPages - 1, currentPage + 1);
      }

      const pg = pages[currentPage];
      const { container: pageContainer, attachments: pageAttachments } = buildPage(
        pg.rarity,
        pg.items,
        currentPage,
        totalPages,
        pg.subPage,
        pg.subTotal,
        pg.headerIcon
      );
      const newRow = buildNavRow(currentPage, totalPages, interaction.id);

      await btn.update({
        components: [pageContainer, newRow],
        flags: MessageFlags.IsComponentsV2,
        files: pageAttachments,
      });
    });

    collector.on('end', async () => {
      try {
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('cstock_prev_done')
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('cstock_page_done')
            .setLabel(`${currentPage + 1} / ${totalPages}`)
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('cstock_next_done')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
        );

        const pg = pages[currentPage];
        const { container: lastContainer, attachments: lastAttachments } = buildPage(
          pg.rarity,
          pg.items,
          currentPage,
          totalPages,
          pg.subPage,
          pg.subTotal,
          pg.headerIcon
        );

        await interaction.editReply({
          components: [lastContainer, disabledRow],
          flags: MessageFlags.IsComponentsV2,
          files: lastAttachments,
        });
      } catch {
        // Message deleted — ignore
      }
    });
  },
};
