const { Events } = require('discord.js');
const { recordUserMessageActivity } = require('../utils/pokemonHelper.js');

module.exports = {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (!message || !message.guild || message.author?.bot) return;
    recordUserMessageActivity(
      message.guild.id,
      message.author.id,
      message.createdTimestamp || Date.now()
    );
  },
};
