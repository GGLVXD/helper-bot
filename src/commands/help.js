module.exports = {
	name: "help",
	description: "Show available commands.",
	aliases: ["h", "commands"],
	async execute(message, args, context) {
		const commands = context.commandHandler.getPrimaryCommands();

		if (args.length > 0) {
			const target = context.commandHandler.resolve(args[0]);
			if (!target) {
				await message.reply(`Unknown command: ${args[0]}`);
				return;
			}

			const aliases = Array.isArray(target.aliases) && target.aliases.length > 0
				? target.aliases.join(", ")
				: "none";
			await message.reply(
				`Command: ${context.prefix}${target.name}\nDescription: ${target.description || "No description."}\nAliases: ${aliases}`
			);
			return;
		}

		const lines = commands.map((cmd) => `${context.prefix}${cmd.name} - ${cmd.description || "No description."}`);
		await message.reply(`Available commands:\n${lines.join("\n")}`);
	},
};
