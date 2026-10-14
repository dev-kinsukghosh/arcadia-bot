const logger = require('../utils/logger.js');
const redis = require('../utils/redis.js');
const { MessageFlags } = require('discord.js');
const { isBlacklisted, getBlacklistReason } = require('../utils/blacklistHelper.js');
const { errorEmbed } = require('../utils/embedHelper.js');

const cooldowns = new Map();

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    // Check if the user is blacklisted
    if (isBlacklisted(interaction.user.id)) {
      if (interaction.isRepliable()) {
        try {
          const reason = getBlacklistReason(interaction.user.id);
          await interaction.reply({
            embeds: [
              errorEmbed(
                'Access Denied',
                `You are blacklisted from using this bot.\n\n**Reason:** ${reason}`
              ),
            ],
            flags: MessageFlags.Ephemeral,
          });
        } catch {
          // Ignore
        }
      }
      return;
    }

    // Handle autocomplete interactions
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (command && typeof command.autocomplete === 'function') {
        try {
          await command.autocomplete(interaction);
        } catch {
          // Silently ignore autocomplete errors
        }
      }
      return;
    }

    // Handle button navigation interactions
    if (interaction.isButton() && interaction.customId) {
      const customId = interaction.customId;
      if (
        customId.startsWith('nav_') ||
        customId.startsWith('player_view_') ||
        customId.startsWith('towny_view_')
      ) {
        const {
          getNavOwner,
          pushNavState,
          popNavState,
          parseNavCustomId,
        } = require('../utils/discordNavState.js');

        const parsed = parseNavCustomId(customId);
        const msgCmdUserId =
          interaction.message?.interactionMetadata?.user?.id ||
          interaction.message?.interaction?.user?.id;
        const cachedOwnerId = getNavOwner(interaction.message?.id);
        const authorizedUserId = parsed.ownerId || cachedOwnerId || msgCmdUserId;

        // Verify that only the user who created this command embed can interact with it
        if (authorizedUserId) {
          if (interaction.user.id !== authorizedUserId) {
            return interaction.reply({
              content: '❌ Only the user who ran this command can interact with this embed.',
              flags: MessageFlags.Ephemeral,
            });
          }
        } else {
          return interaction.reply({
            content: '❌ Only the user who ran this command can interact with this embed.',
            flags: MessageFlags.Ephemeral,
          });
        }

        try {
          await interaction.deferUpdate().catch(() => {});

          const {
            renderTownView,
            renderNationView,
            renderPlayerView,
            renderShopView,
            renderTownPlayersView,
            renderNationPlayersView,
          } = require('../utils/discordNavRouter.js');

          let result = null;

          if (parsed.action === 'nav_back') {
            const popResult = popNavState(interaction.message.id);
            const target = popResult?.target || {
              type: parsed.targetType,
              name: parsed.targetName,
            };
            const backOption = popResult?.previous || null;
            const options = { back: backOption, ownerId: authorizedUserId };

            if (target.type === 'player') {
              result = await renderPlayerView(target.name, options);
            } else if (target.type === 'town') {
              result = await renderTownView(target.name, options);
            } else if (target.type === 'nation') {
              result = await renderNationView(target.name, options);
            } else if (target.type === 'shop') {
              result = await renderShopView(target.name, options);
            } else if (target.type === 'ptown') {
              result = await renderTownPlayersView(target.name, options);
            } else if (target.type === 'pnation') {
              result = await renderNationPlayersView(target.name, options);
            }
          } else {
            let targetType = parsed.targetType;
            let targetName = parsed.targetName;

            // Handle legacy player_view_ and towny_view_ prefixes
            if (customId.startsWith('player_view_profile_')) {
              targetType = 'player';
              targetName = customId.replace('player_view_profile_', '');
            } else if (
              customId.startsWith('player_view_town_') ||
              customId.startsWith('towny_view_town_')
            ) {
              targetType = 'town';
              targetName = customId.replace(/^(player_view_town_|towny_view_town_)/, '');
            } else if (
              customId.startsWith('player_view_nation_') ||
              customId.startsWith('towny_view_nation_')
            ) {
              targetType = 'nation';
              targetName = customId.replace(/^(player_view_nation_|towny_view_nation_)/, '');
            }

            const fromTarget =
              parsed.fromType && parsed.fromName
                ? { type: parsed.fromType, name: parsed.fromName }
                : null;

            const pushResult = pushNavState(
              interaction.message.id,
              authorizedUserId,
              { type: targetType, name: targetName },
              fromTarget
            );

            const backTarget = pushResult?.previous || fromTarget || null;
            const options = { back: backTarget, ownerId: authorizedUserId };

            if (targetType === 'player') {
              result = await renderPlayerView(targetName, options);
            } else if (targetType === 'town') {
              result = await renderTownView(targetName, options);
            } else if (targetType === 'nation') {
              result = await renderNationView(targetName, options);
            } else if (targetType === 'shop') {
              result = await renderShopView(targetName, options);
            } else if (targetType === 'ptown') {
              result = await renderTownPlayersView(targetName, options);
            } else if (targetType === 'pnation') {
              result = await renderNationPlayersView(targetName, options);
            }
          }

          if (result) {
            await interaction.editReply({
              embeds: result.embeds,
              components: result.components,
              files: result.files || [],
            });
          }
        } catch (err) {
          logger.error(`Button navigation error (${customId}): ${err.message}`);
        }
        return;
      }
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    // Parse developer IDs from environment configuration
    const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());
    const isDev = devIds.includes(interaction.user.id);

    // Enforce server-specific command options for custom commands (disabled by default, enabled by dev)
    const CC_COMMANDS = ['pemoji', 'al-nadd', 'al-nrm', 'al-setseat', 'al-seatcalc'];
    if (interaction.guildId && CC_COMMANDS.includes(command.data.name)) {
      const { isOptionEnabled } = require('../utils/guildOptionsHelper.js');
      if (!isOptionEnabled(interaction.guildId, command.data.name)) {
        return interaction.reply({
          embeds: [
            errorEmbed(
              'Command Disabled',
              `The command \`/${command.data.name}\` is not enabled in this server.\n\n` +
                'Contact the bot developer to enable it.'
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    if (!isDev) {
      const now = Date.now();
      const cooldownAmount = (command.cooldown || 3) * 1000;

      if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Map());
      }

      const timestamps = cooldowns.get(command.data.name);
      const userId = interaction.user.id;

      if (timestamps.has(userId)) {
        const expirationTime = timestamps.get(userId) + cooldownAmount;

        if (now < expirationTime) {
          const timeLeft = ((expirationTime - now) / 1000).toFixed(1);
          return interaction.reply({
            content: `⚠️ Please wait **${timeLeft}s** before using the \`/${interaction.commandName}\` command again.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      timestamps.set(userId, now);
      setTimeout(() => timestamps.delete(userId), cooldownAmount);
    }

    // Track statistics in Redis (non-blocking)
    if (redis && redis.status === 'ready') {
      redis.incr('stats:commands:total').catch(() => {});
      redis.hincrby('stats:commands:usage', interaction.commandName, 1).catch(() => {});
    }

    try {
      logger.info(`[COMMAND RUN] User ${interaction.user.tag} invoked /${interaction.commandName}`);
      await command.execute(interaction);
    } catch (error) {
      try {
        const { reportError } = require('../utils/errorHandler.js');
        await reportError(error, `Slash Command Execution (/${interaction.commandName})`);
      } catch (logErr) {
        logger.error(`Failed to report command error: ${logErr.message}`);
      }

      try {
        const errorMessage = {
          content:
            '⚠️ An unexpected error occurred while executing this command. The developers have been notified.',
          flags: MessageFlags.Ephemeral,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage).catch(() => {
            return interaction.editReply(errorMessage).catch(() => {});
          });
        } else {
          await interaction.reply(errorMessage).catch(() => {});
        }
      } catch {
        // Silently ignore secondary interaction response failures
      }
    }
  },
};
