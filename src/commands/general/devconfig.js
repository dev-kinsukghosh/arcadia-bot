const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createBaseEmbed, errorEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
const {
  setDevConfig,
  getSuggestChannel,
  getFeedbackChannel,
  streamPendingSubmissions,
} = require('../../utils/devConfigHelper.js');
const logger = require('../../utils/logger.js');
const pc = require('picocolors');
const { db } = require('../../utils/db.js');
const { internal } = require('../../db/schema.js');
const { like, eq } = require('drizzle-orm');

const FEATURE_CHOICES = [
  { name: '💡 Suggestions Channel (Output for /suggest)', value: 'suggest_channel' },
  { name: '💡 suggestions (Alias for /suggest channel)', value: 'suggestions' },
  { name: '💬 Feedback Channel (Output for /feedback)', value: 'feedback_channel' },
  { name: '💬 feedback (Alias for /feedback channel)', value: 'feedback' },
  { name: '🚨 Syslogs Channel (Output for system error logs)', value: 'syslogs_channel' },
  { name: '🚨 syslogs (Alias for system error logs channel)', value: 'syslogs' },
  { name: '📢 Fallback Channel (Universal output fallback)', value: 'fallback_channel' },
  { name: '📢 fallback (Alias for universal fallback channel)', value: 'fallback' },
  { name: '📋 View Saved Suggestions (From DB)', value: 'view_suggestions' },
  { name: '📋 View Saved Feedback (From DB)', value: 'view_feedback' },
  { name: '🚀 Flush Pending Submissions to Channel', value: 'flush_pending' },
];

const PARAMETER_CHOICES = [
  { name: 'Channel ID (Discord Channel ID)', value: 'channel_id' },
  { name: 'Enabled (true / false)', value: 'enabled' },
  { name: 'Role ID (Discord Role ID)', value: 'role_id' },
  { name: 'Value (Custom String Value)', value: 'value' },
];

module.exports = {
  cooldown: 2,
  data: new SlashCommandBuilder()
    .setName('devconfig')
    .setDescription(
      'Configure dynamic bot features, output channels, and parameters (Developer Only)'
    )
    .addStringOption((option) =>
      option
        .setName('feature')
        .setDescription(
          'The feature to configure, e.g. suggestions, feedback, syslogs, fallback, suggest_channel'
        )
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('parameter')
        .setDescription('The parameter name to modify (e.g. channel_id, enabled, role_id)')
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('value')
        .setDescription('The value to assign (e.g. Channel ID, true/false, user ID, text)')
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    // Only suggest options if the user is a verified bot developer
    const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());
    if (!devIds.includes(interaction.user.id)) {
      return interaction.respond([]);
    }

    try {
      const focusedOption = interaction.options.getFocused(true);
      const focusedValue = focusedOption.value.toLowerCase().trim();

      if (focusedOption.name === 'feature') {
        const filtered = FEATURE_CHOICES.filter(
          (choice) =>
            choice.name.toLowerCase().includes(focusedValue) ||
            choice.value.toLowerCase().includes(focusedValue)
        );
        const choices = filtered.slice(0, 25).map((choice) => ({
          name: choice.name,
          value: choice.value,
        }));
        if (focusedValue && !choices.some((c) => c.value.toLowerCase() === focusedValue)) {
          choices.unshift({ name: `Custom Feature: "${focusedValue}"`, value: focusedValue });
        }
        await interaction.respond(choices.slice(0, 25));
      } else if (focusedOption.name === 'parameter') {
        const filtered = PARAMETER_CHOICES.filter(
          (choice) =>
            choice.name.toLowerCase().includes(focusedValue) ||
            choice.value.toLowerCase().includes(focusedValue)
        );
        const choices = filtered.slice(0, 25).map((choice) => ({
          name: choice.name,
          value: choice.value,
        }));
        if (focusedValue && !choices.some((c) => c.value.toLowerCase() === focusedValue)) {
          choices.unshift({ name: `Custom Parameter: "${focusedValue}"`, value: focusedValue });
        }
        await interaction.respond(choices.slice(0, 25));
      } else if (focusedOption.name === 'value') {
        const choices = [];
        if (interaction.channelId) {
          choices.push({
            name: `Current Channel ID (${interaction.channelId})`,
            value: interaction.channelId,
          });
        }
        choices.push({ name: 'true (Enable)', value: 'true' });
        choices.push({ name: 'false (Disable)', value: 'false' });
        if (focusedValue) {
          choices.unshift({ name: `Use Value: "${focusedValue}"`, value: focusedValue });
        }
        await interaction.respond(choices.slice(0, 25));
      }
    } catch {
      // Ignore autocomplete errors
    }
  },

  async execute(interaction) {
    // Validate developer access
    const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());
    if (!devIds.includes(interaction.user.id)) {
      logger.warn(
        `Unauthorized user ${pc.bold(interaction.user.tag)} (${interaction.user.id}) attempted to run /devconfig`
      );
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Access Denied',
            'You do not have permission to execute this developer configuration command.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const feature = interaction.options.getString('feature').trim();
    const parameter = interaction.options.getString('parameter')?.trim() || '';
    const val = interaction.options.getString('value')?.trim() || '';

    // Special Developer Actions: view_suggestions, view_feedback, flush_pending
    if (['view_suggestions', 'view_feedback', 'flush_pending'].includes(feature.toLowerCase())) {
      if (!db) {
        return interaction.reply({
          embeds: [errorEmbed('Database Offline', 'MySQL database connection is not available.')],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (feature.toLowerCase() === 'view_suggestions') {
        const records = await db.select().from(internal).where(like(internal.id, 'suggest:%'));
        if (records.length === 0) {
          return interaction.reply({
            embeds: [
              createBaseEmbed()
                .setColor(EMBED_COLORS.INFO)
                .setTitle('💡 Saved Feature Suggestions')
                .setDescription(
                  'No pending or un-dispatched feature suggestions found in database.'
                ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        const lines = records.slice(0, 10).map((r, i) => {
          try {
            const p = JSON.parse(r.value);
            return `**${i + 1}.** <@${p.userId}> (\`${p.username}\` | ID: \`${p.userId}\`)\n  - **Server:** ${p.guildName}\n  - **Text:** ${p.suggestion.slice(0, 150)}\n  - **Date:** ${p.createdAt}`;
          } catch {
            return `**${i + 1}.** Raw record: \`${r.id}\``;
          }
        });

        const embed = createBaseEmbed()
          .setColor(EMBED_COLORS.NEON_CYAN)
          .setTitle(`💡 Saved Feature Suggestions (${records.length} Total)`)
          .setDescription(lines.join('\n\n'))
          .setFooter({
            text: 'Run /devconfig feature:flush_pending to dispatch them to your output channel.',
          });

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      if (feature.toLowerCase() === 'view_feedback') {
        const records = await db.select().from(internal).where(like(internal.id, 'feedback:%'));
        if (records.length === 0) {
          return interaction.reply({
            embeds: [
              createBaseEmbed()
                .setColor(EMBED_COLORS.INFO)
                .setTitle('💬 Saved User Feedback')
                .setDescription(
                  'No pending or un-dispatched user feedback entries found in database.'
                ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        const lines = records.slice(0, 10).map((r, i) => {
          try {
            const p = JSON.parse(r.value);
            return `**${i + 1}.** <@${p.userId}> (\`${p.username}\` | ID: \`${p.userId}\`)\n  - **Server:** ${p.guildName}\n  - **Feedback:** ${p.feedback.slice(0, 150)}\n  - **Date:** ${p.createdAt}`;
          } catch {
            return `**${i + 1}.** Raw record: \`${r.id}\``;
          }
        });

        const embed = createBaseEmbed()
          .setColor(EMBED_COLORS.SUCCESS)
          .setTitle(`💬 Saved User Feedback (${records.length} Total)`)
          .setDescription(lines.join('\n\n'))
          .setFooter({
            text: 'Run /devconfig feature:flush_pending to dispatch them to your output channel.',
          });

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      if (feature.toLowerCase() === 'flush_pending') {
        const suggestRecords = await db
          .select()
          .from(internal)
          .where(like(internal.id, 'suggest:%'));
        const feedbackRecords = await db
          .select()
          .from(internal)
          .where(like(internal.id, 'feedback:%'));

        let flushedCount = 0;
        let failedCount = 0;

        // Flush suggestions using alias-aware suggest channel helper
        const suggestChannelId = getSuggestChannel();
        if (suggestChannelId && interaction.client) {
          const channel = await interaction.client.channels
            .fetch(suggestChannelId)
            .catch(() => null);
          if (channel && channel.isTextBased()) {
            for (const r of suggestRecords) {
              try {
                const p = JSON.parse(r.value);
                const embed = createBaseEmbed()
                  .setColor(EMBED_COLORS.NEON_CYAN)
                  .setTitle('💡 Feature Suggestion (Flushed Entry)')
                  .setDescription(`**Suggestion Context:**\n${p.suggestion}`)
                  .addFields(
                    {
                      name: '👤 Submitted By',
                      value: `<@${p.userId}> (\`${p.username}\`)`,
                      inline: true,
                    },
                    { name: '🆔 Discord User ID', value: `\`${p.userId}\``, inline: true },
                    { name: '🏰 Source Server', value: p.guildName || 'DM', inline: false },
                    { name: '🕒 Submitted Date', value: p.createdAt, inline: false }
                  );
                await channel.send({ embeds: [embed] });
                await db.delete(internal).where(eq(internal.id, r.id));
                flushedCount++;
              } catch {
                failedCount++;
              }
            }
          }
        }

        // Flush feedback using alias-aware feedback channel helper
        const feedbackChannelId = getFeedbackChannel();
        if (feedbackChannelId && interaction.client) {
          const channel = await interaction.client.channels
            .fetch(feedbackChannelId)
            .catch(() => null);
          if (channel && channel.isTextBased()) {
            for (const r of feedbackRecords) {
              try {
                const p = JSON.parse(r.value);
                const embed = createBaseEmbed()
                  .setColor(EMBED_COLORS.SUCCESS)
                  .setTitle('💬 User Feedback (Flushed Entry)')
                  .setDescription(`**Feedback Message:**\n${p.feedback}`)
                  .addFields(
                    {
                      name: '👤 Submitted By',
                      value: `<@${p.userId}> (\`${p.username}\`)`,
                      inline: true,
                    },
                    { name: '🆔 Discord User ID', value: `\`${p.userId}\``, inline: true },
                    { name: '🏰 Source Server', value: p.guildName || 'DM', inline: false },
                    { name: '🕒 Submitted Date', value: p.createdAt, inline: false }
                  );
                await channel.send({ embeds: [embed] });
                await db.delete(internal).where(eq(internal.id, r.id));
                flushedCount++;
              } catch {
                failedCount++;
              }
            }
          }
        }

        const totalPending = suggestRecords.length + feedbackRecords.length;
        if (totalPending === 0) {
          return interaction.reply({
            embeds: [
              createBaseEmbed()
                .setColor(EMBED_COLORS.INFO)
                .setTitle('ℹ️ No Pending Submissions')
                .setDescription(
                  'There are no historical suggestions or feedback entries waiting to be flushed.'
                ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        }

        const embed = createBaseEmbed()
          .setColor(EMBED_COLORS.SUCCESS)
          .setTitle('🚀 Historical Submissions Flushed')
          .setDescription(
            `Flushed **${flushedCount}** out of **${totalPending}** pending historical entries to configured output channels.` +
              (failedCount > 0
                ? ` (${failedCount} entries failed or output channel was not accessible)`
                : '')
          );

        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    }

    if (!val) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Missing Value',
            'Please specify the `value` option when configuring a feature setting.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    let finalParameter = parameter;
    if (!finalParameter) {
      if (feature.toLowerCase().endsWith('_channel') || /^\d{17,20}$/.test(val)) {
        finalParameter = 'channel_id';
      } else {
        finalParameter = 'value';
      }
    }

    try {
      await setDevConfig(feature, finalParameter, val);

      const dbKey = `devconfig:${feature.toLowerCase()}:${finalParameter.toLowerCase()}`;
      let channelNote = null;
      let usageExplanation = null;

      const featLower = feature.toLowerCase();
      if (['suggest', 'suggestions', 'suggest_channel'].includes(featLower)) {
        usageExplanation =
          '💡 **Mapped Feature:** Feature suggestions submitted via `/suggest` will now be posted live to this channel!';
      } else if (['feedback', 'feedbacks', 'feedback_channel'].includes(featLower)) {
        usageExplanation =
          '💬 **Mapped Feature:** User feedback & reviews submitted via `/feedback` will now be posted live to this channel!';
      } else if (
        ['syslogs', 'syslog', 'syslogs_channel', 'error_channel', 'logs'].includes(featLower)
      ) {
        usageExplanation =
          '🚨 **Mapped Feature:** System error logs and crash alerts will now be posted live to this channel!';
      } else if (['fallback', 'fallback_channel', 'output', 'output_channel'].includes(featLower)) {
        usageExplanation =
          '📢 **Mapped Feature:** Universal fallback channel configured for suggestions, feedback, and system error alerts!';
      }

      // Channel Verification Failsafe
      if (
        finalParameter.toLowerCase() === 'channel_id' ||
        featLower.includes('channel') ||
        /^\d{17,20}$/.test(val)
      ) {
        const isSnowflake = /^\d{17,20}$/.test(val);
        if (!isSnowflake) {
          channelNote = `⚠️ **Format Warning:** \`${val}\` does not look like a valid numeric Discord Channel ID (snowflake).`;
        } else if (interaction.client) {
          try {
            const channel = await interaction.client.channels.fetch(val).catch(() => null);
            if (channel) {
              const guildName = channel.guild ? channel.guild.name : 'DM';
              channelNote = `✅ **Verified Channel:** <#${channel.id}> (\`#${channel.name || 'TextChannel'}\` in **${guildName}**)`;
            } else {
              channelNote = `⚠️ **Access Warning:** Key saved to DB, but bot cannot find or access Channel ID \`${val}\`. Ensure the bot is in that server with View Channel & Send Messages permissions!`;
            }
          } catch {
            channelNote = `⚠️ **Access Warning:** Key saved to DB, but error fetching Channel ID \`${val}\`.`;
          }
        }
      }

      const embed = createBaseEmbed()
        .setColor(EMBED_COLORS.SUCCESS)
        .setTitle('⚙️ Developer Configuration Updated')
        .setDescription(
          `Successfully updated developer configuration **\`${dbKey}\`** without needing a bot restart!`
        )
        .addFields(
          { name: '🔧 Feature', value: `\`${feature}\``, inline: true },
          { name: '📐 Parameter', value: `\`${finalParameter}\``, inline: true },
          { name: '📝 Assigned Value', value: `\`${val}\``, inline: false },
          { name: '💾 Persistent Key', value: `\`${dbKey}\``, inline: false }
        );

      if (usageExplanation) {
        embed.addFields({
          name: '🎯 Action & Automation Mapping',
          value: usageExplanation,
          inline: false,
        });
      }

      if (channelNote) {
        embed.addFields({
          name: '🔍 Channel Failsafe Verification',
          value: channelNote,
          inline: false,
        });
      }

      logger.info(`DevConfig updated by ${interaction.user.tag}: [${dbKey}] = "${val}"`);

      // Trigger automatic streaming of any pending historical DB records
      if (interaction.client) {
        streamPendingSubmissions(interaction.client).catch(() => {});
      }

      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      logger.error('Failed to update devconfig:', err);
      return interaction.reply({
        embeds: [
          errorEmbed('Configuration Error', `Failed to update configuration: ${err.message}`),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
