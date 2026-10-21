const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const {
  handleCaptureFlow,
  handleSummonFlow,
  handleReleaseFlow,
  handleListFlow,
  autocompleteTrainerPokemon,
} = require('../../utils/pokemonHelper.js');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('pokemon')
    .setDescription('Capture wild Pokémon, summon companions, view party, or release them')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('capture')
        .setDescription('Attempt to capture a server member as your Pokémon')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Target user to capture (mention, user ID, or select)')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('View your captured Pokémon party or another trainer party')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('Optional user to check their Pokémon party')
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('summon')
        .setDescription('Summon one of your captured Pokémon into battle')
        .addStringOption((option) =>
          option
            .setName('pokemon')
            .setDescription('Select one of your captured Pokémon')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('release')
        .setDescription('Release a Pokémon from your party back to the wild')
        .addStringOption((option) =>
          option
            .setName('pokemon')
            .setDescription('Select a Pokémon from your party to release')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async autocomplete(interaction) {
    const subcommand = interaction.options.getSubcommand(false);
    if (subcommand === 'summon' || subcommand === 'release') {
      await autocompleteTrainerPokemon(interaction);
    }
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'capture') {
      const targetUser = interaction.options.getUser('user');
      await handleCaptureFlow(interaction, targetUser);
    } else if (subcommand === 'list') {
      const targetUser = interaction.options.getUser('user');
      await handleListFlow(interaction, targetUser);
    } else if (subcommand === 'summon') {
      const pokemonInput = interaction.options.getString('pokemon');
      await handleSummonFlow(interaction, pokemonInput);
    } else if (subcommand === 'release') {
      const pokemonInput = interaction.options.getString('pokemon');
      await handleReleaseFlow(interaction, pokemonInput);
    }
  },
};
