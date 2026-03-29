const { Events } = require('discord.js');
const UserDB = require('../models/User');
const FocusDayDB = require('../models/FocusDay');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        const guild = member.guild;
        const cachedInvites = client.inviteCache.get(guild.id) || new Map();
        
        try {
            const newInvites = await guild.invites.fetch({ cache: false });
            let usedInvite = null;

            for (const [code, invite] of newInvites) {
                const oldUses = cachedInvites.get(code) || 0;
                if (invite.uses > oldUses) {
                    usedInvite = invite;
                    cachedInvites.set(code, invite.uses);
                    break;
                }
            }

            if (!usedInvite || !usedInvite.inviter) return;

            const inviterId = usedInvite.inviter.id;
            
            // Evitar conteo duplicado si ya lo había invitado antes
            let userRecord = await UserDB.findOne({ userId: inviterId, guildId: guild.id });
            if (!userRecord) {
                userRecord = new UserDB({ userId: inviterId, guildId: guild.id });
            }

            if (!userRecord.invitedUsers.includes(member.id)) {
                userRecord.invitedUsers.push(member.id);
                userRecord.totalInvites += 1;

                // Chequear FocusDay activo
                const focus = await FocusDayDB.findOne({ guildId: guild.id, active: true });
                if (focus) {
                    userRecord.focusInvites += 1;
                }
                
                await userRecord.save();
                console.log(`✅ [INVITE] ${usedInvite.inviter.tag} invitó a ${member.user.tag}`);
            }

        } catch (error) {
            console.error('❌ Error procesando guildMemberAdd:', error);
        }
    }
};