/**
 * Module Imports
 */
const { Client, Collection } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
const { TOKEN, PREFIX, LOCALE } = require('./util/EvobotUtil');
const path = require('path');
const i18n = require('i18n');

const client = new Client({
	disableMentions: 'everyone',
	restTimeOffset: 0,
});

client.login(TOKEN);
client.commands = new Collection();
client.prefix = PREFIX;
client.queue = new Map();
const cooldowns = new Collection();
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

i18n.configure({
	locales: ['en', 'es', 'ko', 'fr', 'tr', 'pt_br', 'zh_cn', 'zh_tw'],
	directory: path.join(__dirname, 'locales'),
	defaultLocale: 'en',
	objectNotation: true,
	register: global,

	logWarnFn: function (msg) {
		console.log('warn', msg);
	},

	logErrorFn: function (msg) {
		console.log('error', msg);
	},

	missingKeyFn: function (locale, value) {
		return value;
	},

	mustacheConfig: {
		tags: ['{{', '}}'],
		disable: false,
	},
});

/**
 * Client Events
 */
client.on('ready', () => {
	let index = 1;
	console.log('______________________');
	console.log(`${client.user.username} ready!`);
	client.guilds.cache.forEach((guild) => {
		console.log(`   ${index}) ${guild.name}`);
		++index;
	});
	console.log('‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾');
	client.user.setActivity(`${PREFIX}help and ${PREFIX}play`, { type: 'LISTENING' });
});
client.on('warn', (info) => console.log(info));
client.on('error', console.error);

/**
 * Import all commands
 */
const commandFiles = readdirSync(join(__dirname, 'commands')).filter((file) =>
	file.endsWith('.js')
);
for (const file of commandFiles) {
	const command = require(join(__dirname, 'commands', `${file}`));
	client.commands.set(command.name, command);
}

client.on('message', async (message) => {
	if (message.author.bot) return;
	if (!message.guild) return;

	const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(PREFIX)})\\s*`);
	if (!prefixRegex.test(message.content)) return;

	const [, matchedPrefix] = message.content.match(prefixRegex);

	const args = message.content.slice(matchedPrefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	const command =
		client.commands.get(commandName) ||
		client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Collection());
	}

	try {
		command.execute(message, args);
	} catch (error) {
		console.error(error);
		message.reply(i18n.__('common.errorCommend')).catch(console.error);
	}
});
