const { Events } = require('discord.js');
const InviteDB = require('../models/Invite');

module.exports = {
    name: Events.InviteCreate,
    async execute(invite, client) {
        const cache = client.inviteCache.get(invite.guild.id);
        if (cache) cache.set(invite.code, invite.uses || 0);
        
        await InviteDB.create({
            code: invite.code,
            guildId: invite.guild.id,
            uses: invite.uses || 0,
            inviterId: invite.inviterId
        });
    }
};