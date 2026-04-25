const path = require("path");
const { Client, GatewayIntentBits, Events, Partials } = require("discord.js");
const { token, prefix, validateConfig } = require("./src/config");
const { CommandHandler } = require("./src/commandHandler");

function createClient() {
	return new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.DirectMessages,
			GatewayIntentBits.MessageContent,
		],
		partials: [Partials.Channel, Partials.Message, Partials.User],
	});
}

function registerEvents(client, commandHandler) {
	const processedMessageIds = new Set();

	const markProcessed = (id) => {
		if (!id) return;
		processedMessageIds.add(id);

		if (processedMessageIds.size > 500) {
			const oldest = processedMessageIds.values().next().value;
			processedMessageIds.delete(oldest);
		}
	};

	client.once(Events.ClientReady, (readyClient) => {
		console.log(`Logged in as ${readyClient.user.tag}`);
		console.log(`Loaded ${commandHandler.getPrimaryCommands().length} commands with prefix ${prefix}`);
	});

	client.on(Events.MessageCreate, async (message) => {
		if (message.author.bot) return;
		markProcessed(message.id);

		if (message.partial) {
			const fetched = await message.fetch().catch(() => null);
			if (!fetched) return;
		}

		try {
			await commandHandler.handle(message, {
				client,
				commandHandler,
				prefix,
			});
		} catch (error) {
			console.error("Command execution failed:", error.message);
			await message.reply("Something went wrong while running that command.").catch(() => null);
		}
	});

	client.on(Events.Raw, async (packet) => {
		if (packet.t !== "MESSAGE_CREATE") return;

		const data = packet.d;
		if (!data) return;
		if (data.guild_id) return;
		if (data.author?.bot) return;
		if (processedMessageIds.has(data.id)) return;

		try {
			const channel = await client.channels.fetch(data.channel_id);
			if (!channel || !channel.isTextBased() || !channel.messages) return;

			const message = await channel.messages.fetch(data.id).catch(() => null);
			if (!message || message.author.bot) return;

			markProcessed(message.id);

			await commandHandler.handle(message, {
				client,
				commandHandler,
				prefix,
			});
		} catch (error) {
			console.error("Raw DM command fallback failed:", error.message);
		}
	});
}

async function startBot() {
	validateConfig();

	const client = createClient();
	const commandHandler = new CommandHandler(prefix);
	commandHandler.loadCommands(path.join(__dirname, "src", "commands"));

	registerEvents(client, commandHandler);

	await client.login(token);
}

startBot();
