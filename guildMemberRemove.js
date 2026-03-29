const { Events } = require('discord.js');
const UserDB = require('../models/User');

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const inviter = await UserDB.findOne({ guildId: member.guild.id, invitedUsers: member.id });
        if (inviter) {
            inviter.invitedUsers = inviter.invitedUsers.filter(id => id !== member.id);
            if (inviter.totalInvites > 0) inviter.totalInvites -= 1;
            if (inviter.focusInvites > 0) inviter.focusInvites -= 1;
            await inviter.save();
        }
    }
};