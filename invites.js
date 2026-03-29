const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const UserDB = require('../models/User');
const FocusDayDB = require('../models/FocusDay');

const CANAL_COMANDOS_ID = process.env.CANAL_COMANDOS_ID;

function canalPermitido(interaction) {
    const canalExiste = interaction.guild.channels.cache.has(CANAL_COMANDOS_ID);
    if (!canalExiste) return true;
    return interaction.channelId === CANAL_COMANDOS_ID;
}

function tienePermisoAdmin(interaction) {
    const esOwner = interaction.guild.ownerId === interaction.user.id;
    const esAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    return esOwner || esAdmin;
}

async function resolverJugador(interaction, input) {
    const mentionMatch = input.match(/^<@!?(\d+)>$/);
    if (mentionMatch) return mentionMatch[1];
    if (/^\d+$/.test(input)) return input;

    await interaction.guild.members.fetch();
    const matches = interaction.guild.members.cache.filter(
        m => m.user.username.toLowerCase() === input.toLowerCase() ||
             m.displayName.toLowerCase() === input.toLowerCase()
    );
    if (matches.size > 1) {
        await interaction.reply({ content: '❌ Hay más de 1 jugador con ese nombre, prueba usando el ID.', ephemeral: true });
        return null;
    }
    if (matches.size === 1) return matches.first().id;
    await interaction.reply({ content: '❌ Usuario no encontrado.', ephemeral: true });
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invites')
        .setDescription('Gestión de invitaciones')
        .addSubcommand(sub => sub.setName('top').setDescription('Ranking global de invites totales'))
        .addSubcommand(sub =>
            sub.setName('check')
                .setDescription('Revisa los invites de un usuario')
                .addStringOption(opt => opt.setName('usuario').setDescription('Mención, ID o nombre exacto').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Resta 1 invite a un jugador [Admin]')
                .addStringOption(opt => opt.setName('usuario').setDescription('Mención, ID o nombre exacto').setRequired(true))
        ),

    async execute(interaction) {
        if (!canalPermitido(interaction)) {
            return interaction.reply({ content: `❌ Los comandos solo se pueden usar en <#${CANAL_COMANDOS_ID}>.`, ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'top') {
            const top = await UserDB.find({ guildId, totalInvites: { $gt: 0 } }).sort({ totalInvites: -1 }).limit(10);

            const embed = new EmbedBuilder()
                .setTitle('🌍 Ranking Global de Invitaciones')
                .setColor('Gold')
                .setDescription(
                    top.length
                        ? top.map((u, i) => `**${i + 1}.** <@${u.userId}> - ${u.totalInvites} invites`).join('\n')
                        : 'Aún no hay invitaciones.'
                );

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'check') {
            const input = interaction.options.getString('usuario').trim();
            const targetId = await resolverJugador(interaction, input);
            if (!targetId) return;

            const userData = await UserDB.findOne({ guildId, userId: targetId });
            const focus = await FocusDayDB.findOne({ guildId, active: true });

            const totales = userData ? userData.totalInvites : 0;
            const focusInvites = userData ? userData.focusInvites : 0;
            const invitados = userData ? userData.invitedUsers : [];

            let desc = `**Invites Totales:** ${totales}`;
            if (focus) desc += `\n**Invites FocusDay (Activo):** ${focusInvites}`;

            if (invitados.length > 0) {
                const MAX = 25;
                const mencionados = invitados.slice(0, MAX).map(id => `<@${id}>`).join(', ');
                const extra = invitados.length > MAX ? ` y ${invitados.length - MAX} más` : '';
                desc += `\n\n**Jugadores invitados:** ${mencionados}${extra}`;
            } else {
                desc += '\n\n**Jugadores invitados:** ninguno aún';
            }

            const embed = new EmbedBuilder()
                .setTitle('Estadísticas de Invitación')
                .setDescription(`Datos para <@${targetId}>\n\n${desc}`)
                .setColor('Blurple');

            return interaction.reply({ embeds: [embed] });
        }

        if (sub === 'delete') {
            if (!tienePermisoAdmin(interaction)) {
                return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', ephemeral: true });
            }

            const input = interaction.options.getString('usuario').trim();
            const targetId = await resolverJugador(interaction, input);
            if (!targetId) return;

            const userData = await UserDB.findOne({ guildId, userId: targetId });
            if (!userData || userData.totalInvites === 0) {
                return interaction.reply({ content: `❌ <@${targetId}> no tiene invites para borrar.`, ephemeral: true });
            }

            const focus = await FocusDayDB.findOne({ guildId, active: true });

            if (userData.totalInvites > 0) userData.totalInvites -= 1;
            if (focus && userData.focusInvites > 0) userData.focusInvites -= 1;
            await userData.save();

            let respuesta = `✅ Se restó 1 invite a <@${targetId}>.\n**Global:** ${userData.totalInvites}`;
            if (focus) respuesta += `\n**FocusDay:** ${userData.focusInvites}`;

            return interaction.reply({ content: respuesta, ephemeral: true });
        }
    }
};
