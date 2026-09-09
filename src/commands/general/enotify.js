const {
  SlashCommandBuilder,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { db } = require('../../utils/db.js');
const { config } = require('../../config.js');
const { eventNotifications } = require('../../db/schema.js');
const {
  successEmbed,
  errorEmbed,
  createBaseEmbed,
  EMBED_COLORS,
} = require('../../utils/embedHelper.js');
const { eq, and } = require('drizzle-orm');

const EVENT_TYPE_MAP = {
  all: { name: 'All Server Events (Towns, Nations, Wars)', emoji: '🌐' },
  town_created: { name: 'Town Founded / Created', emoji: '🏙️' },
  town_deleted: { name: 'Town Ruined / Deleted', emoji: '💥' },
  nation_created: { name: 'Nation Founded / Created', emoji: '🚩' },
  nation_deleted: { name: 'Nation Disbanded / Deleted', emoji: '⚔️' },
  war_started: { name: 'War Declared / Active Siege', emoji: '🛡️' },
  war_ended: { name: 'War Ended / Victory', emoji: '🏆' },
};

module.exports = {
  summary: 'Configure channel notifications for server events',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('enotify')
    .setDescription('Configure channel notifications for server events')
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels |
        PermissionFlagsBits.ManageGuild |
        PermissionFlagsBits.Administrator
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Subscribe a channel to server event notifications')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Select the type of server event to get notified for')
            .setRequired(true)
            .addChoices(
              { name: '🌐 All Server Events (Towns, Nations, Wars)', value: 'all' },
              { name: '🏙️ Town Founded / Created', value: 'town_created' },
              { name: '💥 Town Ruined / Deleted', value: 'town_deleted' },
              { name: '🚩 Nation Founded / Created', value: 'nation_created' },
              { name: '⚔️ Nation Disbanded / Deleted', value: 'nation_deleted' },
              { name: '🛡️ War Declared / Active Siege', value: 'war_started' },
              { name: '🏆 War Ended / Victory', value: 'war_ended' }
            )
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Select channel for notifications (defaults to current channel)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Unsubscribe a channel from server event notifications')
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Select event type to stop receiving notifications for')
            .setRequired(true)
            .addChoices(
              { name: '🌐 All Server Events', value: 'all' },
              { name: '🏙️ Town Founded / Created', value: 'town_created' },
              { name: '💥 Town Ruined / Deleted', value: 'town_deleted' },
              { name: '🚩 Nation Founded / Created', value: 'nation_created' },
              { name: '⚔️ Nation Disbanded / Deleted', value: 'nation_deleted' },
              { name: '🛡️ War Declared / Active Siege', value: 'war_started' },
              { name: '🏆 War Ended / Victory', value: 'war_ended' }
            )
        )
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Select target channel (defaults to current channel)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('List all active server event notification subscriptions for this server')
    ),

  async execute(interaction) {
    const isDev = interaction.user.id === config.DEV_ID;
    const hasPerms =
      isDev ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (!hasPerms) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'You require **Manage Channels**, **Manage Server**, or **Administrator** permissions to use `/enotify`.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!db) {
      return interaction.reply({
        embeds: [errorEmbed('Database connection unavailable.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (!guildId) {
      return interaction.reply({
        embeds: [errorEmbed('This command can only be used inside a server.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    // --- SUBCOMMAND: ADD ---
    if (subcommand === 'add') {
      const type = interaction.options.getString('type');
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

      const eventInfo = EVENT_TYPE_MAP[type] || { name: type, emoji: '🔔' };

      // Check if subscription already exists
      const existing = await db
        .select()
        .from(eventNotifications)
        .where(
          and(
            eq(eventNotifications.guildId, guildId),
            eq(eventNotifications.channelId, targetChannel.id),
            eq(eventNotifications.eventType, type)
          )
        );

      if (existing.length > 0) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              `Channel ${targetChannel} is already subscribed to **${eventInfo.emoji} ${eventInfo.name}** notifications.`
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      await db.insert(eventNotifications).values({
        guildId,
        channelId: targetChannel.id,
        eventType: type,
      });

      const embed = successEmbed(
        `Event Notifications Subscribed!`,
        `Channel ${targetChannel} will now receive real-time notifications for **${eventInfo.emoji} ${eventInfo.name}**.`
      );

      return interaction.reply({ embeds: [embed] });
    }

    // --- SUBCOMMAND: REMOVE ---
    if (subcommand === 'remove') {
      const type = interaction.options.getString('type');
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

      const eventInfo = EVENT_TYPE_MAP[type] || { name: type, emoji: '🔔' };

      const deleted = await db
        .delete(eventNotifications)
        .where(
          and(
            eq(eventNotifications.guildId, guildId),
            eq(eventNotifications.channelId, targetChannel.id),
            eq(eventNotifications.eventType, type)
          )
        );

      if (!deleted || deleted[0]?.affectedRows === 0) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              `Channel ${targetChannel} is not subscribed to **${eventInfo.emoji} ${eventInfo.name}** notifications.`
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const embed = successEmbed(
        `Event Notifications Unsubscribed`,
        `Channel ${targetChannel} will no longer receive **${eventInfo.emoji} ${eventInfo.name}** notifications.`
      );

      return interaction.reply({ embeds: [embed] });
    }

    // --- SUBCOMMAND: LIST ---
    if (subcommand === 'list') {
      const subs = await db
        .select()
        .from(eventNotifications)
        .where(eq(eventNotifications.guildId, guildId));

      if (subs.length === 0) {
        return interaction.reply({
          embeds: [
            createBaseEmbed(
              EMBED_COLORS.INFO,
              'Active Event Notifications',
              'No active server event notifications are configured for this server. Use `/enotify add` to subscribe a channel!'
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const grouped = {};
      for (const sub of subs) {
        if (!grouped[sub.channelId]) grouped[sub.channelId] = [];
        const info = EVENT_TYPE_MAP[sub.eventType] || { name: sub.eventType, emoji: '🔔' };
        grouped[sub.channelId].push(`${info.emoji} ${info.name}`);
      }

      const fields = Object.entries(grouped).map(([channelId, types]) => ({
        name: `📍 Channel: <#${channelId}>`,
        value: types.map((t) => `• ${t}`).join('\n'),
        inline: false,
      }));

      const embed = createBaseEmbed(
        EMBED_COLORS.BRAND,
        '📡 Server Event Notification Subscriptions',
        `Active event alerts for **${interaction.guild.name}**:`
      ).addFields(fields);

      return interaction.reply({ embeds: [embed] });
    }
  },
};
