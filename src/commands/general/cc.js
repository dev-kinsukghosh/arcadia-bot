const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/embedHelper.js');
const logger = require('../../utils/logger.js');

const ALL_OPTIONS = [
  { name: 'Player Emoji Uploader (/pemoji)', value: 'pemoji' },
  { name: 'Al-Sam Nation Add (/al-nadd)', value: 'al-nadd' },
  { name: 'Al-Sam Nation Remove (/al-nrm)', value: 'al-nrm' },
  { name: 'Al-Sam Set Seats (/al-setseat)', value: 'al-setseat' },
  { name: 'Al-Sam Seat Calculator (/al-seatcalc)', value: 'al-seatcalc' },
];

module.exports = {
  cooldown: 2,
  data: new SlashCommandBuilder()
    .setName('cc')
    .setDescription(
      'Configure/Enable custom commands or events for a specific server (Developer Only)'
    )
    .addStringOption((option) =>
      option
        .setName('serverid')
        .setDescription('The server/guild ID to configure')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('id')
        .setDescription('The option ID to enable (suggests options not currently enabled)')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    try {
      const focusedOption = interaction.options.getFocused(true);
      const focusedValue = focusedOption.value.toLowerCase().trim();

      if (focusedOption.name === 'serverid') {
        const guilds = Array.from(interaction.client.guilds.cache.values());
        const filtered = guilds.filter(
          (g) => g.name.toLowerCase().includes(focusedValue) || g.id.includes(focusedValue)
        );
        const choices = filtered.slice(0, 25).map((g) => ({
          name: `${g.name} (${g.id})`,
          value: g.id,
        }));
        await interaction.respond(choices);
      } else if (focusedOption.name === 'id') {
        const serverId = interaction.options.getString('serverid');
        let optionsToSuggest = ALL_OPTIONS;

        if (serverId) {
          const { getEnabledOptions } = require('../../utils/guildOptionsHelper.js');
          const enabled = getEnabledOptions(serverId);
          optionsToSuggest = ALL_OPTIONS.filter((opt) => !enabled.includes(opt.value));
        }

        const filtered = optionsToSuggest.filter(
          (opt) =>
            opt.name.toLowerCase().includes(focusedValue) ||
            opt.value.toLowerCase().includes(focusedValue)
        );
        const choices = filtered.slice(0, 25).map((opt) => ({
          name: opt.name,
          value: opt.value,
        }));
        await interaction.respond(choices);
      }
    } catch (err) {
      logger.error('Autocomplete error in /cc:', err);
    }
  },

  async execute(interaction) {
    // Validate developer access
    const devIds = (process.env.DEV_ID || '').split(',').map((id) => id.trim());
    if (!devIds.includes(interaction.user.id)) {
      return interaction.reply({
        embeds: [
          errorEmbed(
            'Access Denied',
            'You do not have permission to execute this developer command.'
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const serverId = interaction.options.getString('serverid').trim();
    const id = interaction.options.getString('id').toLowerCase().trim();

    // Verify the server exists in client guilds cache
    const guild = interaction.client.guilds.cache.get(serverId);
    if (!guild) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Server Not Found',
            `The server ID \`${serverId}\` was not found in the bot's cache. Make sure the bot is in that server.`
          ),
        ],
      });
    }

    // Verify the option id is valid
    const validOption = ALL_OPTIONS.find((opt) => opt.value === id);
    if (!validOption) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Invalid Option',
            `The option ID \`${id}\` is not valid. Please select one of the suggested options from the list.`
          ),
        ],
      });
    }

    const {
      isOptionEnabled,
      enableOption,
      syncGuildCommands,
    } = require('../../utils/guildOptionsHelper.js');

    // Check if the option is already enabled for the guild
    if (isOptionEnabled(serverId, id)) {
      return interaction.editReply({
        embeds: [
          errorEmbed(
            'Already Enabled',
            `The option **${validOption.name}** is already enabled for the server **${guild.name}** (\`${serverId}\`).`
          ),
        ],
      });
    }

    try {
      await enableOption(serverId, id);

      // Perform dynamic registration
      if (syncGuildCommands) {
        await syncGuildCommands(interaction.client, serverId);
      } else {
        const pemojiCommand = interaction.client.commands.get('pemoji');
        if (pemojiCommand) {
          logger.info(`Registering /pemoji command for guild: ${guild.name} (${serverId})`);
          await guild.commands.create(pemojiCommand.data.toJSON());
        }
      }

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Option Enabled',
            `Successfully enabled **${validOption.name}** and registered the slash command for server **${guild.name}** (\`${serverId}\`).`
          ),
        ],
      });
    } catch (err) {
      logger.error(`Error enabling option ${id} for guild ${serverId}:`, err);
      return interaction.editReply({
        embeds: [
          errorEmbed('Error Enabling Option', `An unexpected error occurred: ${err.message}`),
        ],
      });
    }
  },
};
