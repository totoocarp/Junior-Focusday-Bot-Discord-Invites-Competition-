const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const FocusDayDB = require('../models/FocusDay');
const FocusHistoryDB = require('../models/FocusHistory');
const UserDB = require('../models/User');

const CANAL_COMANDOS_ID = process.env.CANAL_COMANDOS_ID;

function tienePermisoAdmin(interaction) {
    const esOwner = interaction.guild.ownerId === interaction.user.id;
    const esAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    return esOwner || esAdmin;
}

function canalPermitido(interaction) {
    const canalExiste = interaction.guild.channels.cache.has(CANAL_COMANDOS_ID);
    if (!canalExiste) return true;
    return interaction.channelId === CANAL_COMANDOS_ID;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('focusday')
        .setDescription('Sistema especial de FocusDay')
        .addSubcommand(sub =>
            sub.setName('init')
                .setDescription('Inicia un nuevo FocusDay')
                .addStringOption(opt => opt.setName('premio').setDescription('Premio para el ganador').setRequired(false))
        )
        .addSubcommand(sub => sub.setName('end').setDescription('Termina el FocusDay actual'))
        .addSubcommand(sub => sub.setName('top').setDescription('Muestra el ranking del FocusDay'))
        .addSubcommand(sub => sub.setName('history').setDescription('Historial de FocusDays pasados')),

    async execute(interaction) {
        if (!canalPermitido(interaction)) {
            return interaction.reply({ content: `❌ Los comandos solo se pueden usar en <#${CANAL_COMANDOS_ID}>.`, ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'init') {
            if (!tienePermisoAdmin(interaction)) {
                return interaction.reply({ content: '❌ Solo los administradores o el dueño del servidor pueden iniciar un FocusDay.', ephemeral: true });
            }

            const active = await FocusDayDB.findOne({ guildId, active: true });
            if (active) return interaction.reply({ content: 'Ya hay un FocusDay activo.', ephemeral: true });

            await UserDB.updateMany({ guildId }, { $set: { focusInvites: 0 } });
            
            const premio = interaction.options.getString('premio') || 'Honor y Gloria';
            await FocusDayDB.create({ guildId, active: true, startDate: new Date(), reward: premio });

            interaction.reply(`🎯 **FocusDay Iniciado!**\nPremio: \`${premio}\`\n¡Todos los contadores de FocusDay han sido reiniciados a 0!`);
        } 
        
        else if (sub === 'end') {
            if (!tienePermisoAdmin(interaction)) {
                return interaction.reply({ content: '❌ Solo los administradores o el dueño del servidor pueden finalizar un FocusDay.', ephemeral: true });
            }

            const focus = await FocusDayDB.findOne({ guildId, active: true });
            if (!focus) return interaction.reply({ content: 'No hay un FocusDay activo.', ephemeral: true });

            const topUsers = await UserDB.find({ guildId, focusInvites: { $gt: 0 } }).sort({ focusInvites: -1 }).limit(10);
            const winner = topUsers.length > 0 ? topUsers[0] : null;

            focus.active = false;
            focus.endDate = new Date();
            focus.results = topUsers;
            await focus.save();

            let history = await FocusHistoryDB.findOne({ guildId });
            if (!history) history = new FocusHistoryDB({ guildId });

            history.focusDays.push({
                startDate: focus.startDate,
                endDate: focus.endDate,
                winnerId: winner ? winner.userId : 'Nadie',
                invites: winner ? winner.focusInvites : 0,
                reward: focus.reward
            });
            await history.save();

            interaction.reply(`🏁 **FocusDay Finalizado**\nGanador: ${winner ? `<@${winner.userId}> con ${winner.focusInvites} invites!` : 'Ninguno.'}`);
        }

        else if (sub === 'top') {
            const focus = await FocusDayDB.findOne({ guildId }).sort({ startDate: -1 });
            if (!focus) return interaction.reply('No se han registrado FocusDays.');

            const isAct = focus.active;
            const users = isAct 
                ? await UserDB.find({ guildId, focusInvites: { $gt: 0 } }).sort({ focusInvites: -1 }).limit(10)
                : focus.results;

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Ranking FocusDay ${isAct ? '(ACTIVO)' : '(FINALIZADO)'}`)
                .setColor(isAct ? 'Green' : 'Red')
                .setDescription(users.length ? users.map((u, i) => `**${i + 1}.** <@${u.userId}> - ${u.focusInvites || u.invites} invites`).join('\n') : 'Sin datos.')
                .setFooter({ text: `Premio: ${focus.reward}` });

            interaction.reply({ embeds: [embed] });
        }

        else if (sub === 'history') {
            const history = await FocusHistoryDB.findOne({ guildId });
            if (!history || history.focusDays.length === 0) return interaction.reply('No han habido focusday aun.');

            const desc = history.focusDays.map((fd, i) => {
                const start = fd.startDate ? new Date(fd.startDate).toLocaleDateString() : '?';
                const end = fd.endDate ? new Date(fd.endDate).toLocaleDateString() : '?';
                const winner = fd.winnerId !== 'Nadie' ? `<@${fd.winnerId}>` : 'Nadie';
                return `**FocusDay ${i + 1}** (${start} - ${end}): ${winner} (Premio: ${fd.reward} | Invites: ${fd.invites})`;
            }).join('\n\n');

            const embed = new EmbedBuilder().setTitle('📜 Historial de FocusDays').setDescription(desc).setColor('Blue');
            interaction.reply({ embeds: [embed] });
        }
    }
};
