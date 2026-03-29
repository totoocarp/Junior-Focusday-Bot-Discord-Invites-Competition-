const { Events } = require('discord.js');
const InviteDB = require('../models/Invite');

module.exports = {
    name: Events.InviteDelete,
    async execute(invite, client) {
        const cache = client.inviteCache.get(invite.guild.id);
        if (cache) cache.delete(invite.code);
        await InviteDB.deleteOne({ code: invite.code });
    }
};