const { 
    Client, GatewayIntentBits, Partials, REST, Routes, 
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, 
    StringSelectMenuBuilder, PermissionsBitField, ChannelType 
} = require('discord.js');

// METS TON NOUVEAU TOKEN ICI ENTRE LES GUILLEMETS
const TOKEN = 'MTUyNTg0MDUzNzQxNTA2MTUyNA.GEXuV1.oTjD7cmG2sTIBxrvTdS3SBviKbPIyWsoujh9lg'; 
const CLIENT_ID = '1525840537415061524'; // Ton ID de bot
const ROLE_MEMBER_ID = '1525526172493025412'; // ID de l'auto-role

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    partials: [Partials.GuildMember]
});

// --- CRÉATION DES SLASH COMMANDS ---
const commands = [
    new SlashCommandBuilder().setName('setup-ticket').setDescription('Installe le système de ticket').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder().setName('annonce').setDescription('Faire une annonce')
        .addChannelOption(opt => opt.setName('salon').setDescription('Où envoyer ?').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('Le texte').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder().setName('embed').setDescription('Créer un embed custom')
        .addStringOption(opt => opt.setName('titre').setDescription('Titre').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('Texte').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder().setName('giveaway').setDescription('Lancer un giveaway')
        .addStringOption(opt => opt.setName('prix').setDescription('Que gagne-t-on ?').setRequired(true))
        .addIntegerOption(opt => opt.setName('duree').setDescription('Durée en minutes').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`Connecté : ${client.user.tag}`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
});

// --- AUTO-ROLE ---
client.on('guildMemberAdd', async member => {
    try { await member.roles.add(ROLE_MEMBER_ID); } 
    catch (e) { console.error("Erreur Auto-role. Le rôle du bot est-il au-dessus du rôle membre ?"); }
});

// --- GESTION DES COMMANDES ---
client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // TICKET
        if (commandName === 'setup-ticket') {
            const embed = new EmbedBuilder().setTitle('📩 Support & Achats').setDescription('Sélectionne une option :').setColor('#2b2d31');
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('ticket_menu').addOptions([
                    { label: '🛒 Purchase assets', description: 'Pour acheter un produit', value: 'achat' },
                    { label: '❓ Questions', description: 'Pour poser une question', value: 'question' },
                    { label: '🛠️ Autre chose', description: 'Support divers', value: 'autre' }
                ])
            );
            await interaction.reply({ content: 'Ticket installé !', ephemeral: true });
            await interaction.channel.send({ embeds: [embed], components: [menu] });
        }

        // ANNONCE
        if (commandName === 'annonce') {
            const channel = interaction.options.getChannel('salon');
            const msg = interaction.options.getString('message');
            await channel.send(`📢 **Annonce**\n\n${msg}`);
            await interaction.reply({ content: 'Annonce envoyée !', ephemeral: true });
        }

        // EMBED
        if (commandName === 'embed') {
            const titre = interaction.options.getString('titre');
            const msg = interaction.options.getString('message');
            const embed = new EmbedBuilder().setTitle(titre).setDescription(msg).setColor('#0099ff');
            await interaction.channel.send({ embeds: [embed] });
            await interaction.reply({ content: 'Embed envoyé !', ephemeral: true });
        }

        // GIVEAWAY
        if (commandName === 'giveaway') {
            const prix = interaction.options.getString('prix');
            const dureeMs = interaction.options.getInteger('duree') * 60000;
            const embed = new EmbedBuilder().setTitle('🎉 GIVEAWAY 🎉').setDescription(`**Prix:** ${prix}\nRéagissez avec 🎉 !`).setColor('#FFD700');
            const msg = await interaction.reply({ embeds: [embed], fetchReply: true });
            await msg.react('🎉');

            setTimeout(async () => {
                const fetchedMsg = await interaction.channel.messages.fetch(msg.id);
                const users = await fetchedMsg.reactions.cache.get('🎉').users.fetch();
                const participants = users.filter(u => !u.bot);
                if (participants.size === 0) return interaction.channel.send('Personne n\'a participé 😢');
                const gagnant = participants.random();
                await interaction.channel.send(`Félicitations ${gagnant} ! Tu gagnes : **${prix}** ! 🎉`);
            }, dureeMs);
        }
    }

    // --- CRÉATION DU SALON TICKET ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_menu') {
        const type = interaction.values[0];
        const channel = await interaction.guild.channels.create({
            name: `ticket-${type}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
            ]
        });
        const embedTicket = new EmbedBuilder().setTitle('Nouveau Ticket').setDescription(`Salut ${interaction.user}, le staff arrive !`);
        await channel.send({ content: `${interaction.user}`, embeds: [embedTicket] });
        await interaction.reply({ content: `Ticket ouvert : ${channel}`, ephemeral: true });
    }
});

client.login(TOKEN);
