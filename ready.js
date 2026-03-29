const { Events, REST, Routes } = require('discord.js');
const InviteDB = require('../models/Invite');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`🤖 Logueado como ${client.user.tag}`);

        client.user.setPresence({ status: 'dnd' });

        for (const [guildId, guild] of client.guilds.cache) {
            try {
                const invites = await guild.invites.fetch();
                const codeUses = new Map();
                
                for (const [code, invite] of invites) {
                    codeUses.set(code, invite.uses || 0);
                    await InviteDB.findOneAndUpdate(
                        { code, guildId },
                        { uses: invite.uses || 0, inviterId: invite.inviterId || 'SYSTEM' },
                        { upsert: true }
                    );
                }
                client.inviteCache.set(guildId, codeUses);
            } catch (err) {
                console.log(`⚠️ No se pudieron obtener invites de ${guild.name} (Faltan permisos)`);
            }
        }

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const commands = client.commands.map(cmd => cmd.data.toJSON());
        try {
            await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
            console.log('✅ Slash commands registrados.');
        } catch (error) {
            console.error('❌ Error registrando comandos:', error);
        }
    }
};
