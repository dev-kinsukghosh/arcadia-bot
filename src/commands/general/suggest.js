const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { db } = require('../../utils/db.js');
const { internal } = require('../../db/schema.js');
const {
  createBaseEmbed,
  successEmbed,
  errorEmbed,
  EMBED_COLORS,
} = require('../../utils/embedHelper.js');
const { getSuggestChannel } = require('../../utils/devConfigHelper.js');
const logger = require('../../utils/logger.js');

module.exports = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Suggest a new feature or improvement for the ArcadiaMC Community Bot')
    .addStringOption((option) =>
      option
        .setName('suggestion')
        .setDescription(
          'Detailed explanation of the feature or improvement you would like to suggest'
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const suggestionText = interaction.options.getString('suggestion').trim();
      const user = interaction.user;
      const guild = interaction.guild;

      const userAvatar = user.displayAvatarURL({
        extension: 'png',
        size: 256,
      });

      // 1. Store suggestion record into internal MySQL database table safely
      const recordId = `suggest:${Date.now()}:${user.id}`;
      const payload = {
        userId: user.id,
        username: user.tag,
        userAvatar,
        suggestion: suggestionText.slice(0, 350),
        guildId: guild ? guild.id : null,
        guildName: guild ? guild.name : 'DM',
        createdAt: new Date().toISOString(),
      };

      if (db) {
        try {
          await db.insert(internal).values({
            id: recordId,
            value: JSON.stringify(payload),
          });
        } catch (err) {
          logger.warn(`Failed to store suggestion in internal table: ${err.message}`);
        }
      }

      // 2. Resolve output channel configured via /devconfig or dedicated env vars
      const targetChannelId = getSuggestChannel();

      let dispatched = false;
      let channelWarning = null;

      if (targetChannelId && interaction.client) {
        try {
          const channel = await interaction.client.channels
            .fetch(targetChannelId)
            .catch(() => null);
          if (channel && channel.isTextBased()) {
            const userAvatar = user.displayAvatarURL({
              extension: 'png',
              size: 256,
            });

            const suggestEmbed = createBaseEmbed()
              .setColor(EMBED_COLORS.NEON_CYAN)
              .setTitle('💡 New Feature Suggestion')
              .setAuthor({
                name: `${user.tag} (${user.id})`,
                iconURL: userAvatar,
              })
              .setThumbnail(userAvatar)
              .setDescription(`**Suggestion Context:**\n${suggestionText.slice(0, 3000)}`)
              .addFields(
                { name: '👤 Submitted By', value: `<@${user.id}> (\`${user.tag}\`)`, inline: true },
                { name: '🆔 Discord User ID', value: `\`${user.id}\``, inline: true },
                {
                  name: '🏰 Source Server',
                  value: guild ? `**${guild.name}** (\`${guild.id}\`)` : 'Direct Message (DM)',
                  inline: false,
                },
                {
                  name: '🕒 Timestamp',
                  value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                  inline: false,
                }
              );

            await channel.send({ embeds: [suggestEmbed] });
            dispatched = true;
          } else {
            logger.warn(
              `Configured suggest channel ${targetChannelId} was not found or is not text-based.`
            );
            channelWarning = 'The configured output channel could not be reached by the bot.';
          }
        } catch (sendErr) {
          logger.error(
            `Failed to dispatch suggestion embed to channel ${targetChannelId}:`,
            sendErr
          );
          channelWarning =
            'An error occurred while sending the suggestion to the developer output channel.';
        }
      } else {
        logger.info('No suggest_channel or output_channel configured via /devconfig yet.');
        channelWarning =
          'Note: The bot developers have not configured a live notification channel yet.';
      }

      // 3. Ephemeral response back to the user with failsafe notices
      const responseDesc = dispatched
        ? 'Thank you! Your feature suggestion has been logged and dispatched to the bot developers.'
        : `Thank you! Your feature suggestion has been saved in our database.\n\n*${channelWarning}*`;

      return interaction.reply({
        embeds: [successEmbed('Suggestion Submitted!', responseDesc)],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      logger.error('Error executing /suggest command:', error);
      const replyOptions = {
        embeds: [
          errorEmbed(
            'Submission Failed',
            'An unexpected error occurred while processing your suggestion. Please try again later.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      };
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp(replyOptions).catch(() => {});
      } else {
        return interaction.reply(replyOptions).catch(() => {});
      }
    }
  },
};
