const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const {
  successEmbed,
  errorEmbed,
  createBaseEmbed,
  EMBED_COLORS,
} = require('../../utils/embedHelper.js');
const { blacklistUser, unblacklistUser } = require('../../utils/blacklistHelper.js');
const { db } = require('../../utils/db.js');
const { blacklist } = require('../../db/schema.js');
const logger = require('../../utils/logger.js');
const pc = require('picocolors');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Manage the user blacklist (Developer Only)')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a user to the blacklist')
        .addStringOption((option) =>
          option
            .setName('user')
            .setDescription('Specify a Discord User ID or @mention to blacklist')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('Reason for the blacklist').setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a user from the blacklist')
        .addStringOption((option) =>
          option
            .setName('user')
            .setDescription('Specify a Discord User ID or @mention to unblacklist')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('List all blacklisted users')
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Parse developer IDs from environment configuration
    const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());

    if (!devIds.includes(interaction.user.id)) {
      logger.warn(
        `Unauthorized user ${pc.bold(interaction.user.tag)} (${interaction.user.id}) attempted to run /blacklist`
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

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const userVal = interaction.options.getString('user');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      // Parse ID from value
      const match = userVal.match(/^<@!?(\d+)>$/) || userVal.match(/^(\d+)$/);
      if (!match) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Invalid User Argument',
              'Please supply a valid user @mention or a raw 17-20 digit Discord User ID.'
            ),
          ],
        });
      }

      const targetId = match[1];

      // Prevent developer blacklisting themselves
      if (targetId === interaction.user.id) {
        return interaction.editReply({
          embeds: [errorEmbed('Action Blocked', 'You cannot blacklist yourself.')],
        });
      }

      // Prevent blacklisting other developers
      if (devIds.includes(targetId)) {
        return interaction.editReply({
          embeds: [errorEmbed('Action Blocked', 'You cannot blacklist another developer.')],
        });
      }

      // Fetch user to validate they are real
      let targetUser;
      try {
        targetUser = await interaction.client.users.fetch(targetId);
      } catch {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'User Not Found',
              `Could not find a valid Discord user with ID \`${targetId}\`. Please check the ID and try again.`
            ),
          ],
        });
      }

      try {
        const added = await blacklistUser(targetId, reason, interaction.user.id);
        if (!added) {
          return interaction.editReply({
            embeds: [
              errorEmbed(
                'Already Blacklisted',
                `User **${targetUser.tag}** (\`${targetId}\`) is already on the blacklist.`
              ),
            ],
          });
        }

        return interaction.editReply({
          embeds: [
            successEmbed(
              'User Blacklisted',
              `Successfully added **${targetUser.tag}** (\`${targetId}\`) to the blacklist.\n\n` +
                `**Reason:** ${reason}`
            ),
          ],
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Blacklist Failed',
              `An error occurred while blacklisting the user:\n\`\`\`\n${err.message}\n\`\`\``
            ),
          ],
        });
      }
    }

    if (subcommand === 'remove') {
      const userVal = interaction.options.getString('user');

      // Parse ID from value
      const match = userVal.match(/^<@!?(\d+)>$/) || userVal.match(/^(\d+)$/);
      if (!match) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Invalid User Argument',
              'Please supply a valid user @mention or a raw 17-20 digit Discord User ID.'
            ),
          ],
        });
      }

      const targetId = match[1];

      // Try to fetch user (optional but nice for the tag)
      let userTag;
      try {
        const targetUser = await interaction.client.users.fetch(targetId);
        userTag = targetUser.tag;
      } catch {
        userTag = targetId;
      }

      try {
        const removed = await unblacklistUser(targetId);
        if (!removed) {
          return interaction.editReply({
            embeds: [
              errorEmbed(
                'Not Blacklisted',
                `User **${userTag}** (\`${targetId}\`) is not on the blacklist.`
              ),
            ],
          });
        }

        return interaction.editReply({
          embeds: [
            successEmbed(
              'User Unblacklisted',
              `Successfully removed **${userTag}** (\`${targetId}\`) from the blacklist.`
            ),
          ],
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Unblacklist Failed',
              `An error occurred while unblacklisting the user:\n\`\`\`\n${err.message}\n\`\`\``
            ),
          ],
        });
      }
    }

    if (subcommand === 'list') {
      try {
        if (!db) {
          return interaction.editReply({
            embeds: [
              errorEmbed(
                'Database Unavailable',
                'Could not retrieve the blacklist because the database is offline.'
              ),
            ],
          });
        }

        const listRecords = await db.select().from(blacklist);

        if (listRecords.length === 0) {
          return interaction.editReply({
            embeds: [
              createBaseEmbed()
                .setColor(EMBED_COLORS.INFO)
                .setTitle('📋 User Blacklist')
                .setDescription('The blacklist is currently empty.'),
            ],
          });
        }

        const userPromises = listRecords.map(async (record) => {
          let userTag;
          const cached = interaction.client.users.cache.get(record.userId);
          if (cached) {
            userTag = cached.tag;
          } else {
            try {
              const fetched = await interaction.client.users.fetch(record.userId);
              userTag = fetched.tag;
            } catch {
              userTag = 'Unknown User';
            }
          }

          let byTag;
          const cachedBy = interaction.client.users.cache.get(record.blacklistedBy);
          if (cachedBy) {
            byTag = cachedBy.tag;
          } else {
            try {
              const fetchedBy = await interaction.client.users.fetch(record.blacklistedBy);
              byTag = fetchedBy.tag;
            } catch {
              byTag = 'Unknown Dev';
            }
          }

          const dateStr = record.createdAt
            ? `<t:${Math.floor(record.createdAt.getTime() / 1000)}:R>`
            : 'Unknown';

          return (
            `• **${userTag}** (\`${record.userId}\`)\n` +
            `  └ **Reason:** ${record.reason || 'None'}\n` +
            `  └ **By:** **${byTag}** · ${dateStr}`
          );
        });

        const lines = await Promise.all(userPromises);

        const embed = createBaseEmbed()
          .setColor(EMBED_COLORS.WARNING)
          .setTitle('📋 Blacklisted Users List')
          .setDescription(lines.join('\n\n'));

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'List Fetch Failed',
              `An error occurred while fetching the blacklist:\n\`\`\`\n${err.message}\n\`\`\``
            ),
          ],
        });
      }
    }
  },
};
