const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { db } = require('../../utils/db.js');
const { convoyItems, itemNotifications } = require('../../db/schema.js');
const {
  successEmbed,
  errorEmbed,
  createBaseEmbed,
  EMBED_COLORS,
} = require('../../utils/embedHelper.js');
const { eq, and } = require('drizzle-orm');

const userLastAutocomplete = new Map();

function formatItemName(name) {
  return name
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('notifyiic')
    .setDescription('Notify you when a specific item is in stock in the Convoy shop')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Subscribe to notifications for a specific item')
        .addStringOption((option) =>
          option
            .setName('item')
            .setDescription('Select the item to get notified for')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Unsubscribe from notifications for a specific item')
        .addStringOption((option) =>
          option
            .setName('item')
            .setDescription('Select the item to stop notifications for')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('List all your active item notifications')
    ),

  async autocomplete(interaction) {
    if (!db) return interaction.respond([]);
    try {
      const subcommand = interaction.options.getSubcommand();
      const focusedValue = interaction.options.getFocused().toLowerCase();

      // Debounce: Wait 150ms after user stops typing to reduce DB load
      if (focusedValue !== '') {
        const userId = interaction.user.id;
        const currentInteractionId = interaction.id;
        userLastAutocomplete.set(userId, currentInteractionId);

        await new Promise((resolve) => setTimeout(resolve, 150));

        if (userLastAutocomplete.get(userId) !== currentInteractionId) {
          return; // Ignore older keystrokes
        }
      }

      // Retrieve items from cis-info cache
      const cisInfoCmd = interaction.client.commands.get('cis-info');
      const items = cisInfoCmd ? cisInfoCmd.getCache() : [];

      if (subcommand === 'remove') {
        // Query only items this user is subscribed to
        const userNotifs = await db
          .select({ item: itemNotifications.item })
          .from(itemNotifications)
          .where(eq(itemNotifications.userId, interaction.user.id));

        const subbedItems = userNotifs.map((n) => n.item);

        if (subbedItems.length === 0) {
          return interaction.respond([]);
        }

        const filtered = items
          .filter(
            (choice) =>
              subbedItems.includes(choice.item) && choice.item.toLowerCase().includes(focusedValue)
          )
          .slice(0, 25);

        // Fallback for items that are subscribed but not present in convoyItems (e.g. legacy items)
        const handledItems = filtered.map((c) => c.item);
        const missingFiltered = subbedItems
          .filter(
            (item) => !handledItems.includes(item) && item.toLowerCase().includes(focusedValue)
          )
          .slice(0, 25 - filtered.length);

        const results = [
          ...filtered.map((choice) => ({
            name: `${formatItemName(choice.item)} (${choice.rarity ? choice.rarity.toUpperCase() : 'COMMON'})`,
            value: choice.item,
          })),
          ...missingFiltered.map((item) => ({
            name: formatItemName(item),
            value: item,
          })),
        ];

        return interaction.respond(results.slice(0, 25));
      }

      if (subcommand === 'add') {
        // Fetch user's current subscriptions to exclude them
        const userNotifs = await db
          .select({ item: itemNotifications.item })
          .from(itemNotifications)
          .where(eq(itemNotifications.userId, interaction.user.id));

        const subbedItems = userNotifs.map((n) => n.item);

        const filtered = items
          .filter(
            (choice) =>
              !subbedItems.includes(choice.item) && choice.item.toLowerCase().includes(focusedValue)
          )
          .slice(0, 25);

        return interaction.respond(
          filtered.map((choice) => ({
            name: `${formatItemName(choice.item)} (${choice.rarity ? choice.rarity.toUpperCase() : 'COMMON'})`,
            value: choice.item,
          }))
        );
      }

      return interaction.respond([]);
    } catch {
      return interaction.respond([]);
    }
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!db) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Database Offline',
            'Could not connect to the database. Please try again later.'
          ),
        ],
      });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const itemArg = interaction.options.getString('item').toUpperCase().trim();

      // Verify the item exists in the convoy database (using cache first)
      const { getAllItemsCache } = require('../../services/convoySync.js');
      const allCached = getAllItemsCache();
      let exists = allCached.some((i) => i.item === itemArg);

      if (!exists && db) {
        try {
          const itemExists = await db
            .select()
            .from(convoyItems)
            .where(eq(convoyItems.item, itemArg));
          exists = itemExists.length > 0;
        } catch {
          // ignore
        }
      }

      if (!exists) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Item Not Found',
              `The item \`${itemArg}\` is not tracked in the convoy database.\n` +
                'Please select one of the suggested items from the autocomplete list.'
            ),
          ],
        });
      }

      try {
        await db
          .insert(itemNotifications)
          .values({
            userId: interaction.user.id,
            item: itemArg,
            channelId: interaction.channelId,
          })
          .onDuplicateKeyUpdate({
            set: {
              channelId: interaction.channelId,
            },
          });

        return interaction.editReply({
          embeds: [
            successEmbed(
              'Notification Configured',
              `Successfully subscribed to notifications for **${formatItemName(itemArg)}**.\n\n` +
                `You will be pinged directly in <#${interaction.channelId}> when this item is in stock in the Convoy shop.`
            ),
          ],
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Subscription Failed',
              `An error occurred while creating your notification:\n\`\`\`\n${err.message}\n\`\`\``
            ),
          ],
        });
      }
    }

    if (subcommand === 'remove') {
      const itemArg = interaction.options.getString('item').toUpperCase().trim();

      try {
        await db
          .delete(itemNotifications)
          .where(
            and(
              eq(itemNotifications.userId, interaction.user.id),
              eq(itemNotifications.item, itemArg)
            )
          );

        return interaction.editReply({
          embeds: [
            successEmbed(
              'Notification Removed',
              `Successfully stopped notifications for **${formatItemName(itemArg)}**.`
            ),
          ],
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'Unsubscription Failed',
              `An error occurred while removing your notification:\n\`\`\`\n${err.message}\n\`\`\``
            ),
          ],
        });
      }
    }

    if (subcommand === 'list') {
      try {
        const listRecords = await db
          .select()
          .from(itemNotifications)
          .where(eq(itemNotifications.userId, interaction.user.id));

        if (listRecords.length === 0) {
          return interaction.editReply({
            embeds: [
              createBaseEmbed()
                .setColor(EMBED_COLORS.INFO)
                .setTitle('🔔 Your Item Notifications')
                .setDescription(
                  'You do not have any active item notifications. Use `/notifyiic add` to subscribe to one!'
                ),
            ],
          });
        }

        const lines = listRecords.map(
          (record) => `• **${formatItemName(record.item)}** — pinging in <#${record.channelId}>`
        );

        const embed = createBaseEmbed()
          .setColor(EMBED_COLORS.CYBER)
          .setTitle('🔔 Your Item Notifications')
          .setDescription(lines.join('\n'));

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({
          embeds: [
            errorEmbed(
              'List Fetch Failed',
              `An error occurred while fetching your notifications:\n\`\`\`\n${err.message}\n\`\`\``
            ),
          ],
        });
      }
    }
  },
};
