const { SlashCommandBuilder, Integration } = require('discord.js');
const permission = require('../permissions.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('terminate')
    .setDescription('terminates a user')
    .addUserOption(option =>
        option.setName('user')
        .setDescription('The user to terminate')
        .setRequired(true)
    ),
  async execute(interaction) {
    let roles = interaction.member.roles.cache.map(role => role.id);
    const targetUser = interaction.options.getMember('user');
    let AuthorID = interaction.user.id;
    const HIGHEST = 3;
    const QURANTINE_ROLE_ID = '1000408285821812896';

    if(permission(roles,AuthorID) == HIGHEST){
        if(targetUser.id == global.gglvxd){
            await interaction.reply({ content: 'no', ephemeral: true });
            return false;
        }

        if(targetUser.id == process.env.DISCORD_ID){
            await interaction.reply({content: `nope`, ephemeral: true,});
            return false;
        }


        if (targetUser.roles.cache.has(QURANTINE_ROLE_ID)) {
            await interaction.reply({content: `user ${targetUser.user.username} is already quarantined`, ephemeral: true,});
            return false;
        }

        await interaction.deferReply({ ephemeral: true });

        if(targetUser.id == AuthorID){
            targetUser.roles.add(QURANTINE_ROLE_ID);
            const deletedCount = await bulkDelete(targetUser.id, interaction);
            await interaction.editReply({ content: `well, sure, get qurantined lol\nuser id: ${targetUser.id}\nmessages deleted: ${deletedCount}` });
            console.log(`self terminated: ${targetUser.user.username}, ${targetUser.id}`)
            return true;
        }

        targetUser.roles.add(QURANTINE_ROLE_ID);
        const deletedCount = await bulkDelete(targetUser.id, interaction);
        await interaction.editReply({ content: `terminated ${targetUser.user.username}\nuser id: ${targetUser.id}\nmessages deleted: ${deletedCount}` });
        console.log(`terminated: ${targetUser.user.username}, ${targetUser.id}`)

    } else {
        await interaction.reply({ content: 'nah', ephemeral: true });
    }
  },
};

async function bulkDelete(targetId, interaction){
    const allChannels = interaction.guild.channels.cache.filter(channel => channel.isTextBased())
    let totalDeleted = 0;

    for(const channel of allChannels.values()){
        const messages = await channel.messages.fetch({ limit: 100 });
        const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const recentMessages = messages.filter(message => message.createdTimestamp > cutoff && message.author.id == targetId);

        const deletedMessages = await channel.bulkDelete(recentMessages).catch(console.error);
        if (deletedMessages) {
            totalDeleted += deletedMessages.size;
        }
    }

    return totalDeleted;
}
