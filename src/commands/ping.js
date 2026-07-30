const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Shows the bot latency in ms.'),
  async execute(interaction) {
    await interaction.deferReply();

    const latency = Date.now() - interaction.createdTimestamp;
    const wsLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply(`${latency}ms (WS: ${wsLatency}ms)`);
  },
};