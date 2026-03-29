const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: 'Hubo un error al ejecutar este comando.' }).catch(() => {});
            } else {
                await interaction.reply({ content: 'Hubo un error al ejecutar este comando.', ephemeral: true }).catch(() => {});
            }
        }
    }
};
