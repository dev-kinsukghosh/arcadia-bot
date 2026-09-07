const { SlashCommandBuilder, MessageFlags, AttachmentBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const logger = require('../../utils/logger.js');
const { exec } = require('child_process');
const pc = require('picocolors');
const { db } = require('../../utils/db.js');

function formatItemName(name) {
  return name
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Run bot integration and connection test suites (Developer Only)')
    .addStringOption((option) =>
      option
        .setName('testid')
        .setDescription('Select a specific test suite to run (leave blank for all)')
        .setRequired(false)
        .addChoices(
          { name: 'Run All Test Suites', value: 'all' },
          { name: 'Environment Connection Suite', value: 'env' },
          { name: 'ArcadiaMC API Connection Suite', value: 'api' },
          { name: 'Database Query Suite', value: 'db' },
          { name: 'Blacklist Functionality Suite', value: 'blacklist' },
          { name: 'DevConfig Helper & Aliases Suite', value: 'devconfig' },
          { name: 'Al-Sam Role Authorization Suite', value: 'alauth' },
          { name: 'Suggest & Feedback Automation Suite', value: 'suggest' },
          { name: 'Item Notifications Suite', value: 'notify' },
          { name: 'Player Heads Manager Suite', value: 'heads' },
          { name: 'Embed Helper Unit Suite', value: 'embed' },
          { name: 'Player Shops Sync & Cache Suite', value: 'shops' },
          { name: 'Towny Sync & History Suite', value: 'towny' },
          { name: 'Trigger Mock Stock Notification', value: 'mock_notify' },
          { name: 'Trigger Mock Syslog Alert', value: 'mock_syslog' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Parse developer IDs from environment configuration
    const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());

    if (!devIds.includes(interaction.user.id)) {
      logger.warn(
        `Unauthorized user ${pc.bold(interaction.user.tag)} (${interaction.user.id}) attempted to run /test`
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

    const testId = interaction.options.getString('testid') || 'all';

    // Mock stock notification test logic
    if (testId === 'mock_notify') {
      try {
        if (!db) {
          return interaction.editReply({
            embeds: [
              errorEmbed(
                'Database Offline',
                'Could not query notifications since MySQL is offline.'
              ),
            ],
          });
        }

        const { itemNotifications, convoyItems } = require('../../db/schema.js');
        const { eq } = require('drizzle-orm');

        // Find user's subscriptions
        const userNotifs = await db
          .select()
          .from(itemNotifications)
          .where(eq(itemNotifications.userId, interaction.user.id));

        if (userNotifs.length === 0) {
          return interaction.editReply({
            embeds: [
              errorEmbed(
                'No Subscriptions Found',
                'You must subscribe to an item first using `/notifyiic add [item]` before running the mock notification test.'
              ),
            ],
          });
        }

        // Take the first subscription
        const notif = userNotifs[0];

        // Fetch item details (or fallback to dummy trade data if the item has never been synced)
        const itemRecord = await db
          .select()
          .from(convoyItems)
          .where(eq(convoyItems.item, notif.item));

        const tradeDetails = itemRecord[0] || {
          item: notif.item,
          buyPrice: '10.0000',
          sellPrice: '1.0000',
          stock: 100,
          maxStock: 500,
          rarity: 'COMMON',
        };

        // Fetch application emojis
        let appEmojis = null;
        try {
          appEmojis = await interaction.client.application.emojis.fetch();
        } catch {
          // Ignore
        }

        const { createBaseEmbed, EMBED_COLORS } = require('../../utils/embedHelper.js');
        const fs = require('fs');
        const path = require('path');

        const ICONS_DIR = path.join(process.cwd(), 'src', 'icons');
        const RARITY_CONFIG = {
          LEGENDARY: { emoji: '🟨', color: 0xf1c40f, label: 'Legendary' },
          EPIC: { emoji: '🟪', color: 0xbb86fc, label: 'Epic' },
          RARE: { emoji: '🟦', color: 0x3498db, label: 'Rare' },
          UNCOMMON: { emoji: '🟩', color: 0x2ecc71, label: 'Uncommon' },
          COMMON: { emoji: '⬜', color: 0x95a5a6, label: 'Common' },
        };

        const targetEmojiName = notif.item.substring(0, 32);
        const appEmoji = appEmojis ? appEmojis.find((e) => e.name === targetEmojiName) : null;
        let thumbnailUrl = null;
        const files = [];

        if (appEmoji) {
          thumbnailUrl = appEmoji.imageURL();
        } else {
          const iconPath = path.join(ICONS_DIR, `${notif.item}.png`);
          if (fs.existsSync(iconPath)) {
            thumbnailUrl = `attachment://${notif.item}.png`;
            files.push(new AttachmentBuilder(iconPath, { name: `${notif.item}.png` }));
          }
        }

        const rKey = (tradeDetails.rarity || 'COMMON').toUpperCase();
        const cfg = RARITY_CONFIG[rKey] || {
          emoji: '🔘',
          color: EMBED_COLORS.CYBER,
          label: tradeDetails.rarity,
        };

        const titlePrefix = appEmoji ? `<:${appEmoji.name}:${appEmoji.id}> ` : `${cfg.emoji} `;

        const embed = createBaseEmbed()
          .setColor(cfg.color)
          .setTitle(`[MOCK TEST] ${titlePrefix}${formatItemName(notif.item)} In Stock!`)
          .setDescription(
            `The item **${formatItemName(notif.item)}** is now available in the Convoy shop!\n\n` +
              `*This is a developer mock notification test run.*`
          )
          .addFields(
            { name: '✨ Rarity Tier', value: `${cfg.emoji} **${cfg.label}**`, inline: true },
            {
              name: '📦 Current Stock',
              value: `**${tradeDetails.stock}** / **${tradeDetails.maxStock}**`,
              inline: true,
            },
            {
              name: '💰 Buy Price',
              value: `\`₳${parseFloat(tradeDetails.buyPrice).toLocaleString('en-US')}\``,
              inline: true,
            },
            {
              name: '💰 Sell Price',
              value: `\`₳${parseFloat(tradeDetails.sellPrice).toLocaleString('en-US')}\``,
              inline: true,
            }
          );

        if (thumbnailUrl) {
          embed.setThumbnail(thumbnailUrl);
        }

        // Send mock notification to the channel (NOT silent)
        const channel = interaction.channel;
        await channel.send({
          content: `🔔 **Attention** <@${interaction.user.id}>! **${formatItemName(notif.item)}** is now in stock!`,
          embeds: [embed],
          files,
        });

        return interaction.editReply({
          embeds: [
            successEmbed(
              'Mock Notification Sent',
              `Successfully dispatched a mock stock alert for **${formatItemName(
                notif.item
              )}** to <#${interaction.channelId}>.`
            ),
          ],
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Mock Notification Failed',
              `An error occurred while running the mock notification test:\n\`\`\`\n${err.message}\n\`\`\``
            ),
          ],
        });
      }
    }

    // Mock syslog alert test logic
    if (testId === 'mock_syslog') {
      try {
        const { reportError } = require('../../utils/errorHandler.js');
        const { getSyslogsChannel } = require('../../utils/devConfigHelper.js');
        const syslogsChannelId = getSyslogsChannel();

        const testError = new Error('Test Syslog Alert triggered via /test command');
        await reportError(testError, 'Manual Syslog Diagnostic Test');

        return interaction.editReply({
          embeds: [
            successEmbed(
              'Mock Syslog Alert Dispatched',
              `Dispatched a test error alert embed.` +
                (syslogsChannelId
                  ? ` Target Channel: <#${syslogsChannelId}>`
                  : '\n⚠️ Note: No syslogs_channel or logs_channel is configured yet via /devconfig!')
            ),
          ],
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Mock Syslog Test Failed',
              `An error occurred while running the mock syslog test:\n\`\`\`\n${err.message}\n\`\`\``
            ),
          ],
        });
      }
    }

    let cmd = 'npx vitest run';
    let suiteName = 'All Test Suites';

    if (testId === 'env') {
      cmd = 'npx vitest run tests/env.test.js';
      suiteName = 'Environment Connection Suite';
    } else if (testId === 'api') {
      cmd = 'npx vitest run tests/api.test.js';
      suiteName = 'ArcadiaMC API Connection Suite';
    } else if (testId === 'db') {
      cmd = 'npx vitest run tests/database.test.js';
      suiteName = 'Database Query Suite';
    } else if (testId === 'blacklist') {
      cmd = 'npx vitest run tests/blacklist.test.js';
      suiteName = 'Blacklist Functionality Suite';
    } else if (testId === 'devconfig') {
      cmd = 'npx vitest run tests/devConfig.test.js';
      suiteName = 'DevConfig Helper & Aliases Suite';
    } else if (testId === 'alauth') {
      cmd = 'npx vitest run tests/alAuth.test.js';
      suiteName = 'Al-Sam Role Authorization Suite';
    } else if (testId === 'suggest') {
      cmd = 'npx vitest run tests/suggestFeedback.test.js';
      suiteName = 'Suggest & Feedback Automation Suite';
    } else if (testId === 'notify') {
      cmd = 'npx vitest run tests/notify.test.js';
      suiteName = 'Item Notifications Suite';
    } else if (testId === 'heads') {
      cmd = 'npx vitest run tests/heads.test.js';
      suiteName = 'Player Heads Manager Suite';
    } else if (testId === 'embed') {
      cmd = 'npx vitest run tests/embedHelper.test.js';
      suiteName = 'Embed Helper Unit Suite';
    } else if (testId === 'shops') {
      cmd = 'npx vitest run tests/shops.test.js';
      suiteName = 'Player Shops Sync & Cache Suite';
    } else if (testId === 'towny') {
      cmd = 'npx vitest run tests/towny.test.js';
      suiteName = 'Towny Sync & History Suite';
    }

    logger.info(`Developer ${interaction.user.tag} triggered execution of suite: ${suiteName}`);

    exec(cmd, { cwd: process.cwd() }, async (error, stdout, stderr) => {
      const fullOutput = `--- TEST EXECUTION LOGS (${suiteName.toUpperCase()}) ---\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}`;

      // Clean up ANSI escape color codes from console logs for cleaner discord reading
      const esc = String.fromCharCode(27);
      const ansiRegex = new RegExp(
        `[${esc}\\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]`,
        'g'
      );
      const cleanOutput = fullOutput.replace(ansiRegex, '');

      // Create an attachment containing the full output log
      const logBuffer = Buffer.from(cleanOutput, 'utf-8');
      const logAttachment = new AttachmentBuilder(logBuffer, { name: `test-${testId}-logs.txt` });

      if (error) {
        logger.error(`Suite "${suiteName}" failed during execution.`);

        // Take the last 15 lines of stdout/stderr for display in embed description
        const lines = cleanOutput.split('\n');
        const truncatedLog = lines.slice(-15).join('\n');

        const embed = errorEmbed(
          'Test Suite Failed',
          `An error occurred while running **${suiteName}**.\n` +
            `Review the attached log file or see snippet below:\n\n\`\`\`text\n${truncatedLog}\n\`\`\``
        );

        return interaction.editReply({
          embeds: [embed],
          files: [logAttachment],
        });
      }

      logger.success(`Suite "${suiteName}" executed successfully.`);

      const lines = cleanOutput.split('\n');
      const truncatedLog = lines.slice(-15).join('\n');

      const embed = successEmbed(
        'Test Suite Passed',
        `The test suite **${suiteName}** completed successfully.\n` +
          `Full logs are attached. Snippet of final results:\n\n\`\`\`text\n${truncatedLog}\n\`\`\``
      );

      return interaction.editReply({
        embeds: [embed],
        files: [logAttachment],
      });
    });
  },
};
