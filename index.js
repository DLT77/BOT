const { 
    Client, GatewayIntentBits, Partials, REST, Routes, 
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, 
    StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, 
    PermissionsBitField, ChannelType 
} = require('discord.js');

const TOKEN = process.env.BOT_TOKEN; 
const CLIENT_ID = '1525840537415061524'; 
const ROLE_MEMBER_ID = '1525526172493025412'; 

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions],
    partials: [Partials.GuildMember, Partials.Message, Partials.Reaction]
});

// ==========================================
// 1. SLASH COMMANDS DEFINITION (ENGLISH)
// ==========================================
const commands = [
    // SETUP TICKET (Advanced)
    new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Configure and deploy the ticket system')
        .addChannelOption(opt => opt.setName('panel_channel').setDescription('Where to send the ticket panel').setRequired(true))
        .addChannelOption(opt => opt.setName('ticket_category').setDescription('Category where tickets will spawn').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
        .addRoleOption(opt => opt.setName('staff_role').setDescription('Staff role to mention when a ticket opens').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // RULES EMBED
    new SlashCommandBuilder()
        .setName('rules')
        .setDescription('Send the official server rules embed')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // ANNOUNCEMENT
    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an official announcement')
        .addChannelOption(opt => opt.setName('channel').setDescription('Where to announce').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('The announcement text').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    // GIVEAWAY
    new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Start a giveaway')
        .addStringOption(opt => opt.setName('prize').setDescription('What is the prize?').setRequired(true))
        .addIntegerOption(opt => opt.setName('duration').setDescription('Duration in minutes').setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`[SYSTEM] Logged in as ${client.user.tag}`);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('[SYSTEM] Pro Slash Commands successfully loaded!');
    } catch (error) {
        console.error(error);
    }
});

// ==========================================
// 2. AUTO-ROLE
// ==========================================
client.on('guildMemberAdd', async member => {
    try { 
        await member.roles.add(ROLE_MEMBER_ID); 
        console.log(`[AUTO-ROLE] Gave member role to ${member.user.tag}`);
    } 
    catch (e) { console.error("[ERROR] Cannot assign role. Check role hierarchy."); }
});

// ==========================================
// 3. INTERACTIONS (Commands, Tickets, Buttons)
// ==========================================
client.on('interactionCreate', async interaction => {

    // --- SLASH COMMANDS ---
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        // 🛠️ SETUP TICKET
        if (commandName === 'setup-ticket') {
            const panelChannel = interaction.options.getChannel('panel_channel');
            const category = interaction.options.getChannel('ticket_category');
            const staffRole = interaction.options.getRole('staff_role');

            const embed = new EmbedBuilder()
                .setTitle('📩 Welcome to Support')
                .setDescription('> Please select an option from the menu below to open a ticket.\n> \n> *Do not open tickets without a valid reason.*')
                .setColor('#2b2d31') // Discord invisible dark color
                .setImage('https://i.imgur.com/K1U121E.png'); // Replace with your banner link if you have one

            // We store the category and role ID directly inside the customId (Pro trick)
            const menu = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId(`ticket_${category.id}_${staffRole.id}`)
                    .setPlaceholder('Select a category...')
                    .addOptions([
                        { label: '🛒 Purchase Assets', description: 'Buy products or assets', value: 'purchase', emoji: '💸' },
                        { label: '❓ General Question', description: 'Ask the staff a question', value: 'question', emoji: '🤔' },
                        { label: '🤝 Partnership', description: 'Apply for a partnership', value: 'partner', emoji: '🔗' },
                        { label: '⚠️ Report', description: 'Report a user or bug', value: 'report', emoji: '🚨' }
                    ])
            );

            await panelChannel.send({ embeds: [embed], components: [menu] });
            await interaction.reply({ content: `✅ Ticket system deployed in ${panelChannel}!`, ephemeral: true });
        }

        // 📜 RULES
        if (commandName === 'rules') {
            const rulesEmbed = new EmbedBuilder()
                .setTitle('📜 Official Server Rules')
                .setDescription('Welcome to our community! To ensure a safe environment for everyone, please respect the following guidelines.')
                .setColor('#2b2d31')
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: '1️⃣ Respect Everyone', value: '> No toxicity, racism, sexism, or harassment will be tolerated. Be kind.' },
                    { name: '2️⃣ No Spam & Ads', value: '> Keep the chat clean. Do not spam messages, and do not send unsolicited links or self-promotion.' },
                    { name: '3️⃣ Keep it SFW', value: '> Strictly no explicit, NSFW, or disturbing content.' },
                    { name: '4️⃣ Listen to Staff', value: '> The staff team has the final say. If a moderator asks you to stop, please stop.' },
                    { name: '5️⃣ Discord TOS', value: '> You must strictly adhere to the [Discord Terms of Service](https://discord.com/terms).' }
                )
                .setFooter({ text: 'Ignorance of the rules is no excuse.', iconURL: client.user.displayAvatarURL() })
                .setTimestamp();

            await interaction.channel.send({ embeds: [rulesEmbed] });
            await interaction.reply({ content: '✅ Rules embedded sent.', ephemeral: true });
        }

        // 📢 ANNOUNCE
        if (commandName === 'announce') {
            const channel = interaction.options.getChannel('channel');
            const msg = interaction.options.getString('message');
            
            const announceEmbed = new EmbedBuilder()
                .setTitle('📢 Official Announcement')
                .setDescription(msg)
                .setColor('#5865F2')
                .setFooter({ text: `Announced by ${interaction.user.tag}` })
                .setTimestamp();

            await channel.send({ content: '@everyone', embeds: [announceEmbed] });
            await interaction.reply({ content: '✅ Announcement sent!', ephemeral: true });
        }

        // 🎉 GIVEAWAY
        if (commandName === 'giveaway') {
            const prize = interaction.options.getString('prize');
            const durationMs = interaction.options.getInteger('duration') * 60000;
            
            const giveawayEmbed = new EmbedBuilder()
                .setTitle('🎉 NEW GIVEAWAY 🎉')
                .setDescription(`**Prize:** ${prize}\n**Ends in:** ${interaction.options.getInteger('duration')} minutes\n\n> React with 🎉 to enter!`)
                .setColor('#FFD700')
                .setTimestamp();

            const msg = await interaction.reply({ embeds: [giveawayEmbed], fetchReply: true });
            await msg.react('🎉');

            setTimeout(async () => {
                const fetchedMsg = await interaction.channel.messages.fetch(msg.id);
                const users = await fetchedMsg.reactions.cache.get('🎉').users.fetch();
                const participants = users.filter(u => !u.bot);
                
                if (participants.size === 0) return interaction.channel.send('😢 No one participated in the giveaway.');
                
                const winner = participants.random();
                const winEmbed = new EmbedBuilder()
                    .setTitle('🎉 GIVEAWAY ENDED 🎉')
                    .setDescription(`**Prize:** ${prize}\n**Winner:** ${winner}\n\nCongratulations! Open a ticket to claim your prize.`)
                    .setColor('#00FF00');

                await interaction.channel.send({ content: `${winner}`, embeds: [winEmbed] });
            }, durationMs);
        }
    }

    // --- TICKET CREATION (Select Menu) ---
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('ticket_')) {
        const [_, categoryId, staffRoleId] = interaction.customId.split('_');
        const reason = interaction.values[0];

        // Create the private channel
        const channel = await interaction.guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: categoryId, // Spawns in the selected category
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
                { id: staffRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
            ]
        });

        // 👻 GHOST PING (Mentions and deletes instantly)
        const ghostPing = await channel.send({ content: `<@&${staffRoleId}> <@${interaction.user.id}>` });
        await ghostPing.delete().catch(() => {});

        // Ticket Embed Main
        const ticketEmbed = new EmbedBuilder()
            .setTitle(`🎫 Ticket - ${reason.toUpperCase()}`)
            .setDescription(`Hello <@${interaction.user.id}>,\n\n> A member of the <@&${staffRoleId}> will be with you shortly.\n> Please describe your issue or request in detail below.`)
            .setColor('#2b2d31')
            .setTimestamp();

        // Interactive Buttons
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setEmoji('🙋‍♂️').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
        );

        await channel.send({ embeds: [ticketEmbed], components: [buttons] });
        await interaction.reply({ content: `✅ Ticket created: ${channel}`, ephemeral: true });
    }

    // --- TICKET BUTTONS (Claim & Close) ---
    if (interaction.isButton()) {
        if (interaction.customId === 'ticket_claim') {
            // Checks if user has permission to manage channels (Staff)
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: '❌ You do not have permission to claim this ticket.', ephemeral: true });
            }

            const embed = interaction.message.embeds[0];
            const claimedEmbed = EmbedBuilder.from(embed)
                .addFields({ name: '📌 Status', value: `> Claimed by ${interaction.user}` })
                .setColor('#FEE75C');

            // Remove the claim button but keep the close button
            const closeOnlyRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ticket_close').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            await interaction.message.edit({ embeds: [claimedEmbed], components: [closeOnlyRow] });
            await interaction.reply({ content: `✅ You claimed this ticket.`, ephemeral: true });
        }

        if (interaction.customId === 'ticket_close') {
            await interaction.reply({ content: '🔒 Ticket will be deleted in 5 seconds...' });
            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 5000);
        }
    }
});

client.login(TOKEN);
