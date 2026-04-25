require("dotenv").config();

const token = process.env.DISCORD_TOKEN;
const prefix = process.env.BOT_PREFIX || "!";

function validateConfig() {
	if (!token) {
		console.error("Missing DISCORD_TOKEN in .env or environment variables.");
		process.exit(1);
	}
}

module.exports = {
	token,
	prefix,
	validateConfig,
};
