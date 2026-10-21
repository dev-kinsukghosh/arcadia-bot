const {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
} = require('discord.js');
const {
  handleCaptureFlow,
  handleSummonFlow,
  handleReleaseFlow,
  handleTransferFlow,
  handleFightBackCommand,
  handleListFlow,
  handleOptFlow,
  autocompleteTrainerPokemon,
} = require('../../utils/pokemonHelper.js');

module.exports = {
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('pokemon')
    .setDescription('Capture Pokémon, summon, transfer, break free, release, view party, or opt in/out')
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
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('transfer')
        .setDescription('Transfer ownership of one of your Pokémon to another trainer')
        .addStringOption((option) =>
          option
            .setName('pokemon')
            .setDescription('Select one of your captured Pokémon to transfer')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addUserOption((option) =>
          option
            .setName('to')
            .setDescription('The new trainer to receive this Pokémon')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('fightback')
        .setDescription('Attempt to break free from your trainer Pokéball (breakout battle)')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('opt')
        .setDescription('Configure whether you can be captured as a Pokémon')
        .addStringOption((option) =>
          option
            .setName('status')
            .setDescription('Choose whether to opt in or opt out (omit to view status)')
            .setRequired(false)
            .addChoices(
              { name: 'Opt Out (No one can capture you)', value: 'out' },
              { name: 'Opt In (Default - can be captured)', value: 'in' }
            )
        )
        .addStringOption((option) =>
          option
            .setName('scope')
            .setDescription('Scope for the opt setting (server or global)')
            .setRequired(false)
            .addChoices(
              { name: 'This Server Only (Default)', value: 'server' },
              { name: 'All Servers (Global)', value: 'global' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('opt-out')
        .setDescription('Opt out of being captured as a Pokémon (no one can capture you)')
        .addStringOption((option) =>
          option
            .setName('scope')
            .setDescription('Scope for the opt-out (server or global)')
            .setRequired(false)
            .addChoices(
              { name: 'This Server Only (Default)', value: 'server' },
              { name: 'All Servers (Global)', value: 'global' }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('opt-in')
        .setDescription('Opt in to Pokémon captures (default)')
        .addStringOption((option) =>
          option
            .setName('scope')
            .setDescription('Scope for the opt-in (server or global)')
            .setRequired(false)
            .addChoices(
              { name: 'This Server Only (Default)', value: 'server' },
              { name: 'All Servers (Global)', value: 'global' }
            )
        )
    ),

  async autocomplete(interaction) {
    const subcommand = interaction.options.getSubcommand(false);
    if (subcommand === 'summon' || subcommand === 'release' || subcommand === 'transfer') {
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
    } else if (subcommand === 'transfer') {
      const pokemonInput = interaction.options.getString('pokemon');
      const targetTrainer = interaction.options.getUser('to');
      await handleTransferFlow(interaction, pokemonInput, targetTrainer);
    } else if (subcommand === 'fightback') {
      await handleFightBackCommand(interaction);
    } else if (subcommand === 'opt') {
      const status = interaction.options.getString('status');
      const scope = interaction.options.getString('scope');
      await handleOptFlow(interaction, status, scope);
    } else if (subcommand === 'opt-out') {
      const scope = interaction.options.getString('scope');
      await handleOptFlow(interaction, 'out', scope);
    } else if (subcommand === 'opt-in') {
      const scope = interaction.options.getString('scope');
      await handleOptFlow(interaction, 'in', scope);
    }
  },
};
