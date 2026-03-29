const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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
        .setName('purchase')
        .setDescription('Gestión de compras y bonuses')
        .addSubcommand(sub =>
            sub.setName('bonus')
                .setDescription('Da +1 invite de FocusDay al referidor del comprador [Admin]')
                .addStringOption(opt =>
                    opt.setName('jugador')
                        .setDescription('El jugador que realizó la compra (mención, ID o nombre)')
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        if (!canalPermitido(interaction)) {
            return interaction.reply({ content: `❌ Los comandos solo se pueden usar en <#${CANAL_COMANDOS_ID}>.`, ephemeral: true });
        }

        if (!tienePermisoAdmin(interaction)) {
            return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'bonus') {
            const input = interaction.options.getString('jugador').trim();
            const compradorId = await resolverJugador(interaction, input);
            if (!compradorId) return;

            const invitador = await UserDB.findOne({ guildId, invitedUsers: compradorId });
            if (!invitador) {
                return interaction.reply({ content: `ℹ️ <@${compradorId}> no fue invitado por nadie registrado en este servidor.`, ephemeral: true });
            }

            const focus = await FocusDayDB.findOne({ guildId, active: true });
            if (!focus) {
                return interaction.reply({ content: `ℹ️ No hay un FocusDay activo. El bonus solo se aplica durante un FocusDay.`, ephemeral: true });
            }

            invitador.focusInvites += 1;
            await invitador.save();

            return interaction.reply({
                content: `🛒 ¡Compra registrada! <@${compradorId}> fue invitado por <@${invitador.userId}>.\n+1 invite de FocusDay para <@${invitador.userId}> (**${invitador.focusInvites}** total en este FocusDay).`,
            });
        }
    }
};
