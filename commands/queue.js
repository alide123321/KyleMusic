const { MessageEmbed } = require('discord.js');
const { LOCALE } = require('../util/EvobotUtil');
const createBar = require('string-progressbar');
const i18n = require('i18n');

i18n.setLocale(LOCALE);

module.exports = {
	name: 'queue',
	cooldown: 5,
	aliases: ['q'],
	description: i18n.__('queue.description'),
	async execute(message) {
		const permissions = message.channel.permissionsFor(message.client.user);
		if (!permissions.has(['MANAGE_MESSAGES', 'ADD_REACTIONS']))
			return message.reply(i18n.__('queue.missingPermissionMessage'));

		const queue = message.client.queue.get(message.guild.id);
		if (!queue) return message.channel.send(i18n.__('queue.errorNotQueue'));

		let currentPage = 0;
		const embeds = generateQueueEmbed(message, queue);

		const queueEmbed = await message.channel.send(
			`**${i18n.__mf('queue.currentPage')} ${currentPage + 1}/${embeds.length}**`,
			embeds[currentPage]
		);

		try {
			await queueEmbed.react('⬅️');
			await queueEmbed.react('⏹');
			await queueEmbed.react('➡️');
		} catch (error) {
			console.error(error);
			message.channel.send(error.message).catch(console.error);
		}

		const filter = (reaction, user) =>
			['⬅️', '⏹', '➡️'].includes(reaction.emoji.name) && message.author.id === user.id;
		const collector = queueEmbed.createReactionCollector(filter, { time: 60000 });

		collector.on('collect', async (reaction, user) => {
			try {
				if (reaction.emoji.name === '➡️') {
					if (currentPage < embeds.length - 1) {
						currentPage++;
						queueEmbed.edit(
							i18n.__mf('queue.currentPage', { page: currentPage + 1, length: embeds.length }),
							embeds[currentPage]
						);
					}
				} else if (reaction.emoji.name === '⬅️') {
					if (currentPage !== 0) {
						--currentPage;
						queueEmbed.edit(
							i18n.__mf('queue.currentPage', { page: currentPage + 1, length: embeds.length }),
							embeds[currentPage]
						);
					}
				} else {
					collector.stop();
					reaction.message.reactions.removeAll();
				}
				await reaction.users.remove(message.author.id);
			} catch (error) {
				console.error(error);
				return message.channel.send(error.message).catch(console.error);
			}
		});
	},
};

function generateQueueEmbed(message, queue) {
	let embeds = [];
	let k = 10;

	for (let i = 0; i < queue.songs.length; i += 10) {
		const current = queue.songs.slice(i, k);
		let j = i;
		k += 10;

		const info = current
			.map(
				(track) =>
					`${++j} - [${track.title}] - [${
						track.duration == 0
							? ' ◉ LIVE'
							: new Date(track.duration * 1000).toISOString().substr(11, 8)
					}]\n`
			)
			.join('\n');

		const seek =
			(queue.connection.dispatcher.streamTime - queue.connection.dispatcher.pausedTime) / 1000;

		const embed = new MessageEmbed()
			.setTitle(i18n.__('queue.embedTitle'))
			.setThumbnail(message.guild.iconURL())
			.setColor('#F8AA2A')
			.setDescription(
				i18n.__mf('queue.embedCurrentSong', {
					title: queue.songs[0].title,
					url: queue.songs[0].url,
					info: info,
				})
			)
			.setFooter(
				new Date(seek * 1000).toISOString().substr(11, 8) +
					'[' +
					createBar(queue.songs[0].duration == 0 ? seek : queue.songs[0].duration, seek, 20)[0] +
					']' +
					(queue.songs[0].duration == 0
						? ' ◉ LIVE'
						: new Date(queue.songs[0].duration * 1000).toISOString().substr(11, 8))
			);
		embeds.push(embed);
	}

	return embeds;
}
