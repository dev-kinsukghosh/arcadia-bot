const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ApplicationIntegrationType,
  InteractionContextType,
  ComponentType,
} = require('discord.js');
const { createBaseEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const { getEventsCache } = require('../../services/emptyEndpointsSync.js');
const { db } = require('../../utils/db.js');
const { sEvents } = require('../../db/schema.js');
const { desc } = require('drizzle-orm');
const { config } = require('../../config.js');
const { isNpcPlayer } = require('../../utils/townOwnerManager.js');

const PAGE_SIZE = 5;

/**
 * Maps event types to friendly badge labels and emojis
 */
const EVENT_BADGES = {
  town_created: { label: 'Town Founded', emoji: '🏙️' },
  town_ruined: { label: 'Town Ruined', emoji: '🏛️' },
  town_deleted: { label: 'Town Deleted', emoji: '💥' },
  nation_created: { label: 'Nation Founded', emoji: '🚩' },
  nation_deleted: { label: 'Nation Disbanded', emoji: '⚔️' },
  empire_created: { label: 'Empire Founded', emoji: '👑' },
  war_started: { label: 'War Declared', emoji: '🛡️' },
  war_ended: { label: 'War Ended', emoji: '🏆' },
  siege_started: { label: 'Siege Begun', emoji: '⚔️' },
  siege_ended: { label: 'Siege Ended', emoji: '🏳️' },
};

/**
 * Formats machine cause codes into clean human-readable strings
 */
function formatCause(cause) {
  if (!cause) return null;
  const map = {
    RUINED: 'Fell into Ruin',
    NO_RESIDENTS: 'No Residents Remaining',
    UPKEEP: 'Unpaid Upkeep',
    BANKRUPT: 'Bankruptcy',
  };
  return map[cause.toUpperCase()] || cause.replace(/_/g, ' ');
}

/**
 * Extracts mayor/owner safely, ignoring fake NPC names and prioritizing oldMayorName
 */
function getEventMayor(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.oldMayorName && !isNpcPlayer(data.oldMayorName)) return data.oldMayorName;
  const mayorName = data.mayor?.name;
  if (mayorName && !isNpcPlayer(mayorName)) return mayorName;
  return null;
}

/**
 * Parses event payload object and extracts clean metadata
 */
function parseEventDetails(ev) {
  let data = ev.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }

  const mayor = getEventMayor(data);
  const cause = data?.cause || null;
  const king = data?.king?.name || data?.nation?.king?.name || null;

  let townName = null;
  if (typeof data?.town === 'string') townName = data.town;
  else if (typeof data?.town === 'object' && data?.town?.name) townName = data.town.name;
  else if (data?.townName) townName = data.townName;

  let nationName = null;
  if (typeof data?.nation === 'string') nationName = data.nation;
  else if (typeof data?.nation === 'object' && data?.nation?.name) nationName = data.nation.name;
  else if (data?.nationName) nationName = data.nationName;

  const residents = data?.town?.residents ?? data?.nation?.residents ?? null;
  const chunks = data?.town?.claimedChunks ?? null;

  return {
    mayor,
    cause,
    king,
    townName,
    nationName,
    residents,
    chunks,
  };
}

/**
 * Builds the page embed for a specific page of events
 */
function buildEventsEmbed(events, page, totalPages, filterType) {
  const startIdx = page * PAGE_SIZE;
  const pageEvents = events.slice(startIdx, startIdx + PAGE_SIZE);

  const filterNames = {
    all: 'All Events',
    towns: 'Towns Activity',
    nations: 'Nations Activity',
    wars: 'War Telemetry',
  };

  const embed = createBaseEmbed()
    .setColor(EMBED_COLORS.ROYAL_BLUE)
    .setTitle('📜 Server Events')
    .setDescription(
      `Showing **${filterNames[filterType] || 'All Events'}** · Page **${page + 1}** of **${totalPages}** (${events.length} total)`
    );

  pageEvents.forEach((ev) => {
    const badge = EVENT_BADGES[ev.type] || {
      label: (ev.type || 'Event').replace(/_/g, ' '),
      emoji: '🔹',
    };
    const ts = ev.timestamp ? Math.floor(Number(ev.timestamp) / 1000) : null;
    const timeRel = ts ? `<t:${ts}:R>` : 'Recently';

    const { mayor, cause, king, townName, nationName, residents, chunks } = parseEventDetails(ev);

    // Clean human title without trailing periods
    const title = (ev.message || ev.title || badge.label).replace(/\.$/, '').trim();
    const fieldName = `${badge.emoji} ${title}`;

    // Meta details formatted in an elegant blockquote
    const meta = [];
    if (mayor) {
      const isRuined = ev.type === 'town_ruined';
      meta.push(`👑 Mayor: **${mayor}**${isRuined ? ' *(Preserved)*' : ''}`);
    }
    if (king) {
      meta.push(`👑 King: **${king}**`);
    }
    if (residents !== null && residents !== undefined) {
      meta.push(`👥 Residents: **${residents}**`);
    }
    if (chunks) {
      meta.push(`📦 Chunks: **${chunks}**`);
    }
    if (cause) {
      meta.push(`⚠️ Cause: *${formatCause(cause)}*`);
    }
    // Only display nation/town if not already stated in title
    if (nationName && !title.toLowerCase().includes(nationName.toLowerCase())) {
      meta.push(`🚩 Nation: **${nationName}**`);
    }
    if (townName && !title.toLowerCase().includes(townName.toLowerCase())) {
      meta.push(`🏙️ Town: **${townName}**`);
    }

    const metaBlock = meta.length > 0 ? `\n> ${meta.join('  •  ')}` : '';
    const fieldValue = `${timeRel} · \`${badge.label}\`${metaBlock}`;

    embed.addFields({
      name: fieldName,
      value: fieldValue,
      inline: false,
    });
  });

  return embed;
}

/**
 * Creates navigation buttons for pagination
 */
function buildNavButtons(page, totalPages) {
  const row = new ActionRowBuilder();

  row.addComponents(
    new ButtonBuilder()
      .setCustomId('events_prev')
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId('events_page_indicator')
      .setLabel(`${page + 1} / ${totalPages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId('events_next')
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );

  const dashboardUrl = config?.dashboard?.url || 'https://arcc.webdevkin.com';
  row.addComponents(
    new ButtonBuilder()
      .setLabel('🌐 Web Events')
      .setStyle(ButtonStyle.Link)
      .setURL(`${dashboardUrl}/events`)
  );

  return row;
}

module.exports = {
  summary: 'View live and recent server events',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('events')
    .setDescription('View live announcements and historical ArcadiaMC server events')
    .setIntegrationTypes(
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    )
    .setContexts(
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    )
    .addStringOption((opt) =>
      opt
        .setName('type')
        .setDescription('Filter events by category')
        .setRequired(false)
        .addChoices(
          { name: '🌐 All Events', value: 'all' },
          { name: '🏙️ Towns Activity', value: 'towns' },
          { name: '🚩 Nations Activity', value: 'nations' },
          { name: '⚔️ War Telemetry', value: 'wars' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const filterType = interaction.options.getString('type') || 'all';

    // 1. Fetch live events from cache / API
    const cacheData = await getEventsCache();
    const liveEvents =
      cacheData && Array.isArray(cacheData.events)
        ? cacheData.events
        : Array.isArray(cacheData)
          ? cacheData
          : [];

    // 2. Fetch stored events from database
    let storedEvents = [];
    if (db) {
      try {
        const rows = await db.select().from(sEvents).orderBy(desc(sEvents.timestamp)).limit(100);
        storedEvents = rows || [];
      } catch {
        // Fallback to live events only if DB query fails
      }
    }

    // 3. Combine, deduplicate, and sort (identical to website monitor)
    const combined = [];
    const seenHashes = new Set();

    const getTs = (item) =>
      Number(
        item.timestamp ||
          item.startTime ||
          (item.createdAt ? new Date(item.createdAt).getTime() : 0)
      );

    for (const ev of [...liveEvents, ...storedEvents]) {
      const ts = getTs(ev);
      const key = `${ts}_${ev.type || ev.name || ''}_${ev.message || ev.title || ''}`;
      if (!seenHashes.has(key)) {
        seenHashes.add(key);
        combined.push(ev);
      }
    }

    combined.sort((a, b) => getTs(b) - getTs(a));

    // 4. Apply category filter
    let filtered = combined;
    if (filterType === 'towns') {
      filtered = combined.filter((e) => (e.type || '').includes('town'));
    } else if (filterType === 'nations') {
      filtered = combined.filter((e) => (e.type || '').includes('nation'));
    } else if (filterType === 'wars') {
      filtered = combined.filter(
        (e) => (e.type || '').includes('war') || (e.type || '').includes('siege')
      );
    }

    if (filtered.length === 0) {
      const dashboardUrl = config?.dashboard?.url || 'https://arcc.webdevkin.com';
      const filterLabels = {
        all: 'All Events',
        towns: 'Towns Activity',
        nations: 'Nations Activity',
        wars: 'War Telemetry',
      };
      const emptyEmbed = createBaseEmbed()
        .setColor(EMBED_COLORS.ROYAL_BLUE)
        .setTitle('📜 Server Events')
        .setDescription(
          `No recorded events found under **${filterLabels[filterType] || filterType}**.\n\n` +
            `*New events will appear here automatically when recorded.*`
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('🌐 Web Events')
          .setStyle(ButtonStyle.Link)
          .setURL(`${dashboardUrl}/events`)
      );

      return interaction.editReply({ embeds: [emptyEmbed], components: [row] });
    }

    let currentPage = 0;
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

    const initialEmbed = buildEventsEmbed(filtered, currentPage, totalPages, filterType);
    const initialRow = buildNavButtons(currentPage, totalPages);

    const replyMsg = await interaction.editReply({
      embeds: [initialEmbed],
      components: [initialRow],
    });

    if (totalPages <= 1) return replyMsg;

    // 5. Setup interaction collector for pagination
    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 2 * 60 * 1000, // 2 minutes
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: '❌ Only the user who ran this command can paginate.',
          flags: 64, // MessageFlags.Ephemeral
        });
      }

      if (i.customId === 'events_prev' && currentPage > 0) {
        currentPage--;
      } else if (i.customId === 'events_next' && currentPage < totalPages - 1) {
        currentPage++;
      } else {
        return i.deferUpdate().catch(() => {});
      }

      const updatedEmbed = buildEventsEmbed(filtered, currentPage, totalPages, filterType);
      const updatedRow = buildNavButtons(currentPage, totalPages);

      await i
        .update({
          embeds: [updatedEmbed],
          components: [updatedRow],
        })
        .catch(() => {});
    });

    collector.on('end', async () => {
      try {
        const disabledRow = buildNavButtons(currentPage, totalPages);
        disabledRow.components.forEach((btn) => {
          if (btn.data.style !== ButtonStyle.Link) {
            btn.setDisabled(true);
          }
        });
        await interaction.editReply({ components: [disabledRow] }).catch(() => {});
      } catch {
        // ignore expired interaction edit
      }
    });

    return replyMsg;
  },
};
