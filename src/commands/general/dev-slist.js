const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const { createBaseEmbed, errorEmbed, formatUtcTime } = require('../../utils/embedHelper.js');
const { isDevUser } = require('../../utils/maintenanceHelper.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dev-slist')
    .setDescription('view bot server roster with detailed network statistics & server inspection')
    .addStringOption((opt) =>
      opt
        .setName('server')
        .setDescription('inspect a specific server by name or ID')
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    if (!isDevUser(interaction.user.id)) {
      return interaction.respond([]).catch(() => {});
    }

    const focusedValue = (interaction.options.getFocused() || '').toLowerCase();
    const guilds = Array.from(interaction.client.guilds.cache.values());

    const filtered = guilds
      .filter((g) => g.name.toLowerCase().includes(focusedValue) || g.id.includes(focusedValue))
      .slice(0, 25)
      .map((g) => {
        const count = (g.memberCount || 0).toLocaleString();
        let name = `${g.name} (${count} members)`;
        if (name.length > 100) {
          name = name.slice(0, 97) + '...';
        }
        return {
          name,
          value: g.id,
        };
      });

    await interaction.respond(filtered).catch(() => {});
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Validate developer access
    if (!isDevUser(interaction.user.id)) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Access Denied',
            'You do not have permission to execute this developer command.'
          ),
        ],
      });
    }

    const serverQuery = interaction.options.getString('server');

    // Case 1: Specific Server Inspection Embed
    if (serverQuery) {
      const targetGuild =
        interaction.client.guilds.cache.get(serverQuery) ||
        interaction.client.guilds.cache.find(
          (g) => g.name.toLowerCase() === serverQuery.toLowerCase()
        );

      if (!targetGuild) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Server Not Found',
              `Could not locate any cached server matching \`${serverQuery}\`.\n\nPlease check the ID or select a server from the autocomplete list.`
            ),
          ],
        });
      }

      const embed = createBaseEmbed()
        .setTitle(`🛡️ Server Profile: ${targetGuild.name}`)
        .setDescription(targetGuild.description ? `> *${targetGuild.description}*\n` : null);

      const iconUrl = targetGuild.iconURL({ size: 256 });
      if (iconUrl) {
        embed.setThumbnail(iconUrl);
      }

      const bannerUrl = targetGuild.bannerURL({ size: 1024 });
      if (bannerUrl) {
        embed.setImage(bannerUrl);
      }

      const ownerMention = targetGuild.ownerId
        ? `<@${targetGuild.ownerId}> (\`${targetGuild.ownerId}\`)`
        : 'Unknown';

      const fields = [
        { name: '🆔 Server ID', value: `\`${targetGuild.id}\``, inline: true },
        { name: '👑 Server Owner', value: ownerMention, inline: true },
        {
          name: '👥 Total Members',
          value: `**${(targetGuild.memberCount || 0).toLocaleString()}**`,
          inline: true,
        },
        {
          name: '💬 Cached Channels',
          value: `**${targetGuild.channels?.cache?.size || 0}** channels`,
          inline: true,
        },
        {
          name: '🎭 Cached Roles',
          value: `**${targetGuild.roles?.cache?.size || 0}** roles`,
          inline: true,
        },
        {
          name: '🚀 Server Boosts',
          value: `Tier ${targetGuild.premiumTier || 0} (${targetGuild.premiumSubscriptionCount || 0} boosts)`,
          inline: true,
        },
        {
          name: '📅 Server Created (UTC)',
          value: formatUtcTime(targetGuild.createdAt),
          inline: false,
        },
        {
          name: '📥 Bot Joined (UTC)',
          value: formatUtcTime(targetGuild.joinedAt),
          inline: false,
        },
      ];

      if (targetGuild.vanityURLCode) {
        fields.push({
          name: '🔗 Vanity URL',
          value: `https://discord.gg/${targetGuild.vanityURLCode}`,
          inline: true,
        });
      }

      if (targetGuild.features && targetGuild.features.length > 0) {
        const featuresStr = targetGuild.features
          .slice(0, 10)
          .map((f) => `\`${f}\``)
          .join(', ');
        fields.push({
          name: `🌟 Key Features (${targetGuild.features.length})`,
          value:
            featuresStr +
            (targetGuild.features.length > 10 ? ` +${targetGuild.features.length - 10} more` : ''),
          inline: false,
        });
      }

      embed.addFields(fields);

      return interaction.editReply({
        embeds: [embed],
      });
    }

    // Case 2: Overall Server Roster with Network Statistics
    const allGuilds = Array.from(interaction.client.guilds.cache.values());

    if (allGuilds.length === 0) {
      return interaction.editReply({
        embeds: [createBaseEmbed().setTitle('Server List').setDescription('The bot is not currently in any servers.')],
      });
    }

    // Sort guilds by member count descending
    const sortedGuilds = [...allGuilds].sort(
      (a, b) => (b.memberCount || 0) - (a.memberCount || 0)
    );

    const totalGuilds = sortedGuilds.length;
    const totalMembers = sortedGuilds.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    const avgMembers = Math.round(totalMembers / totalGuilds);
    const largestGuild = sortedGuilds[0];

    const pageSize = 8;
    const totalPages = Math.ceil(sortedGuilds.length / pageSize);
    let currentPageIndex = 0;

    // Helper function to build page embed
    const buildEmbedPage = (pageIdx) => {
      const startIdx = pageIdx * pageSize;
      const pageItems = sortedGuilds.slice(startIdx, startIdx + pageSize);

      const itemsDesc = pageItems
        .map((g, idx) => {
          const rank = startIdx + idx + 1;
          const members = (g.memberCount || 0).toLocaleString();
          const joinedTag = g.joinedTimestamp
            ? `<t:${Math.floor(g.joinedTimestamp / 1000)}:R>`
            : 'Unknown';
          const ownerTag = g.ownerId ? `<@${g.ownerId}>` : 'Unknown';

          return (
            `\`#${rank.toString().padStart(2, '0')}\` **${g.name}**\n` +
            `┣ 🆔 \`${g.id}\`\n` +
            `┣ 👥 **${members}** members • 👑 ${ownerTag}\n` +
            `┗ 📥 Joined: ${joinedTag}`
          );
        })
        .join('\n\n');

      const overviewHeader =
        `### 🌐 Network Statistics Overview\n` +
        `*   **Total Servers:** \`${totalGuilds}\`\n` +
        `*   **Total Members Reached:** \`${totalMembers.toLocaleString()}\`\n` +
        `*   **Average Members/Server:** \`${avgMembers.toLocaleString()}\`\n` +
        `*   **Top Server:** **${largestGuild.name}** (\`${(largestGuild.memberCount || 0).toLocaleString()}\` members)\n\n` +
        `---\n` +
        `### 📋 Server Roster (Page ${pageIdx + 1} of ${totalPages})\n` +
        `*Tip: Use \`/dev-slist server:<name|id>\` to inspect detailed server metadata.*\n\n`;

      return createBaseEmbed()
        .setTitle('🌐 Arcadia Bot Active Server Roster')
        .setDescription(overviewHeader + itemsDesc);
    };

    // Helper function to build navigation button row
    const buildNavigationRow = (pageIdx) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`slist_prev_${interaction.id}`)
          .setLabel('◀️ Prev')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === 0),
        new ButtonBuilder()
          .setCustomId(`slist_next_${interaction.id}`)
          .setLabel('▶️ Next')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(pageIdx === totalPages - 1)
      );
    };

    // Initial render
    const message = await interaction.editReply({
      embeds: [buildEmbedPage(currentPageIndex)],
      components: totalPages > 1 ? [buildNavigationRow(currentPageIndex)] : [],
    });

    if (totalPages <= 1) return;

    // Collect button interactions (5-minute timeout)
    const collector = message.createMessageComponentCollector({
      filter: (btn) => btn.user.id === interaction.user.id,
      time: 5 * 60 * 1000,
    });

    collector.on('collect', async (btn) => {
      if (btn.customId === `slist_prev_${interaction.id}`) {
        currentPageIndex = Math.max(0, currentPageIndex - 1);
      } else if (btn.customId === `slist_next_${interaction.id}`) {
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
            .setCustomId('slist_prev_disabled')
            .setLabel('◀️ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('slist_next_disabled')
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
