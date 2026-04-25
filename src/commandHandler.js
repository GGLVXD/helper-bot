const fs = require("fs");
const path = require("path");

class CommandHandler {
	constructor(prefix) {
		this.prefix = prefix;
		this.commands = new Map();
		this.aliases = new Map();
	}

	loadCommands(commandsDir) {
		const entries = fs.readdirSync(commandsDir, { withFileTypes: true });

		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.endsWith(".js")) continue;

			const commandPath = path.join(commandsDir, entry.name);
			const command = require(commandPath);
			this.register(command);
		}
	}

	register(command) {
		if (!command || typeof command.name !== "string" || typeof command.execute !== "function") {
			return;
		}

		const name = command.name.toLowerCase();
		this.commands.set(name, command);

		const aliases = Array.isArray(command.aliases) ? command.aliases : [];
		for (const alias of aliases) {
			this.aliases.set(String(alias).toLowerCase(), name);
		}
	}

	parse(content) {
		if (!content || !content.startsWith(this.prefix)) return null;

		const withoutPrefix = content.slice(this.prefix.length).trim();
		if (!withoutPrefix) return null;

		const parts = withoutPrefix.split(/\s+/);
		const name = parts.shift().toLowerCase();

		return { name, args: parts };
	}

	resolve(name) {
		const key = name.toLowerCase();
		const resolvedName = this.aliases.get(key) || key;
		return this.commands.get(resolvedName) || null;
	}

	getPrimaryCommands() {
		return [...this.commands.values()].sort((a, b) => a.name.localeCompare(b.name));
	}

	async handle(message, context) {
		const parsed = this.parse(message.content || "");
		if (!parsed) return false;

		const command = this.resolve(parsed.name);
		if (!command) return false;

		await command.execute(message, parsed.args, context);
		return true;
	}
}

module.exports = {
	CommandHandler,
};
