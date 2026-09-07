const {
  SlashCommandBuilder,
  MessageFlags,
  ChannelType,
  PermissionFlagsBits,
} = require('discord.js');
const { db } = require('../../utils/db.js');
const { itemNotifications } = require('../../db/schema.js');
const {
  createBaseEmbed,
  EMBED_COLORS,
  successEmbed,
  errorEmbed,
} = require('../../utils/embedHelper.js');
const logger = require('../../utils/logger.js');
const pc = require('picocolors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('broadcast')
    .setDescription('Broadcast an announcement embed to all servers (Developer Only)')
    .addStringOption((option) =>
      option.setName('title').setDescription('The title of the broadcast embed').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('message')
        .setDescription(
          'The message description of the broadcast embed (supports markdown, use \\n for newlines)'
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('color')
        .setDescription('The theme color of the embed (Default: Cyber Purple)')
        .setRequired(false)
        .addChoices(
          { name: 'Cyber Purple (Default)', value: 'CYBER' },
          { name: 'Cyber Green', value: 'SUCCESS' },
          { name: 'Cyber Blue', value: 'INFO' },
          { name: 'Amber Yellow', value: 'WARNING' },
          { name: 'Crimson Red', value: 'ERROR' },
          { name: 'Electric Neon Cyan', value: 'NEON_CYAN' },
          { name: 'Hot Neon Pink', value: 'HOT_PINK' },
          { name: 'Bright Gold', value: 'GOLD' },
          { name: 'Royal Blue', value: 'ROYAL_BLUE' },
          { name: 'Emerald Green', value: 'EMERALD' },
          { name: 'Sunset Orange', value: 'ORANGE' },
          { name: 'Dark Obsidian', value: 'OBSIDIAN' },
          { name: 'Pure White', value: 'WHITE' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('image')
        .setDescription('Optional large image URL to attach to the embed')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('thumbnail')
        .setDescription('Optional thumbnail image URL to attach to the embed')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('target_guild')
        .setDescription('Target a specific Guild ID only')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('ping')
        .setDescription('Optionally tag @everyone or @here with the broadcast message')
        .setRequired(false)
        .addChoices(
          { name: '@everyone (Tag All)', value: 'everyone' },
          { name: '@here (Tag Online)', value: 'here' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Validate developer access
    const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());
    if (!devIds.includes(interaction.user.id)) {
      logger.warn(
        `Unauthorized user ${pc.bold(interaction.user.tag)} (${interaction.user.id}) attempted to run /broadcast`
      );
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Access Denied',
            'You do not have permission to execute this developer command.'
          ),
        ],
      });
    }

    const title = interaction.options.getString('title');
    const messageRaw = interaction.options.getString('message');
    const message = messageRaw.replace(/\\n/g, '\n');
    const colorKey = interaction.options.getString('color') || 'CYBER';
    const embedColor = EMBED_COLORS[colorKey] || EMBED_COLORS.CYBER;
    const imageUrl = interaction.options.getString('image');
    const thumbnailUrl = interaction.options.getString('thumbnail');
    const targetGuildId = interaction.options.getString('target_guild');
    const pingChoice = interaction.options.getString('ping');
    let pingTag = null;
    if (pingChoice === 'everyone') {
      pingTag = '@everyone';
    } else if (pingChoice === 'here') {
      pingTag = '@here';
    }

    // Build the broadcast embed
    const broadcastEmbed = createBaseEmbed()
      .setColor(embedColor)
      .setTitle(title)
      .setDescription(message);

    if (imageUrl) {
      broadcastEmbed.setImage(imageUrl);
    }
    if (thumbnailUrl) {
      broadcastEmbed.setThumbnail(thumbnailUrl);
    }

    // Retrieve notification channel IDs from DB as one fallback option
    let notificationChannels = [];
    if (db) {
      try {
        const notifs = await db
          .select({ channelId: itemNotifications.channelId })
          .from(itemNotifications);
        notificationChannels = Array.from(new Set(notifs.map((n) => n.channelId)));
      } catch (err) {
        logger.error('Error fetching notification channels for broadcast fallback:', err);
      }
    }

    // Helper to find the best channel in a guild
    const findBestChannel = (guild) => {
      const textChannels = Array.from(guild.channels.cache.values()).filter(
        (channel) =>
          channel.type === ChannelType.GuildText &&
          channel
            .permissionsFor(guild.members.me)
            ?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])
      );

      if (textChannels.length === 0) return null;

      const announcementNames = [
        'announcements',
        'announcement',
        'bot-announcements',
        'bot-updates',
        'updates',
        'news',
      ];
      const generalNames = ['general', 'chat', 'lobby', 'bot-spam', 'bot-commands'];

      // Priority 1: Check announcement channel names
      const announcementChannel = textChannels.find((ch) =>
        announcementNames.includes(ch.name.toLowerCase())
      );
      if (announcementChannel) return announcementChannel;

      // Priority 2: Check database active notification channels
      if (notificationChannels.length > 0) {
        const notifyChannel = textChannels.find((ch) => notificationChannels.includes(ch.id));
        if (notifyChannel) return notifyChannel;
      }

      // Priority 3: Check general chat names
      const generalChannel = textChannels.find((ch) =>
        generalNames.includes(ch.name.toLowerCase())
      );
      if (generalChannel) return generalChannel;

      // Priority 4: Guild's system channel
      if (guild.systemChannel && textChannels.some((ch) => ch.id === guild.systemChannel.id)) {
        return guild.systemChannel;
      }

      // Priority 5: Fallback to the first available text channel
      textChannels.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
      return textChannels[0];
    };

    // Determine guilds to send to
    let guilds;
    if (targetGuildId) {
      const targetGuild = interaction.client.guilds.cache.get(targetGuildId);
      if (!targetGuild) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Guild Not Found',
              `Could not find guild with ID \`${targetGuildId}\` in bot cache.`
            ),
          ],
        });
      }
      guilds = [targetGuild];
    } else {
      guilds = Array.from(interaction.client.guilds.cache.values());
    }

    if (guilds.length === 0) {
      return interaction.editReply({
        embeds: [errorEmbed('No Guilds Found', 'The bot is not currently in any servers.')],
      });
    }

    logger.info(`Starting announcement broadcast to ${guilds.length} guilds...`);
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const guild of guilds) {
      const channel = findBestChannel(guild);
      if (!channel) {
        failCount++;
        results.push(
          `❌ **${guild.name}** (\`${guild.id}\`): No suitable channel or permissions found.`
        );
        continue;
      }

      try {
        const sendOptions = { embeds: [broadcastEmbed] };
        if (pingTag) {
          sendOptions.content = pingTag;
        }
        await channel.send(sendOptions);
        successCount++;
        results.push(`✅ **${guild.name}** (\`${guild.id}\`): Sent in <#${channel.id}>`);
        // Small delay to prevent hitting Discord rate limit
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (err) {
        failCount++;
        results.push(
          `❌ **${guild.name}** (\`${guild.id}\`): Failed to send in <#${channel.id}> (${err.message})`
        );
      }
    }

    const summaryText =
      `Broadcast complete. Sent to **${successCount}** guild(s), failed for **${failCount}** guild(s).\n\n` +
      results.join('\n');
    const summaryEmbed = successEmbed('Broadcast Summary', summaryText);

    return interaction.editReply({ embeds: [summaryEmbed] });
  },
};
