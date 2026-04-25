const { EmbedBuilder, version: djsVersion } = require("discord.js");

const latencyHistory = [];
const MAX_HISTORY = 25;

function ratingFromMs(ms) {
	if (!Number.isFinite(ms) || ms < 0) return "unknown";
	if (ms <= 60) return "excellent";
	if (ms <= 120) return "good";
	if (ms <= 220) return "fair";
	return "slow";
}

function avg(values) {
	if (!values.length) return 0;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, p) {
	if (!values.length) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const idx = Math.max(0, Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1));
	return sorted[idx];
}

async function measureEventLoopLag(samples = 5) {
	const lags = [];

	for (let i = 0; i < samples; i += 1) {
		const start = process.hrtime.bigint();
		await new Promise((resolve) => setImmediate(resolve));
		const lag = Number(process.hrtime.bigint() - start) / 1e6;
		lags.push(lag);
	}

	return {
		avgMs: avg(lags),
		maxMs: Math.max(...lags),
		p95Ms: percentile(lags, 95),
	};
}

module.exports = {
	name: "ping",
	description: "Advanced latency diagnostics for gateway, API, event loop, and jitter.",
	aliases: ["p", "latency", "status"],
	async execute(message, _args, context) {
		const { client } = context;
		const commandReceivedAt = Date.now();
		const commandIngestionMs = commandReceivedAt - message.createdTimestamp;

		const probeStart = process.hrtime.bigint();
		const probeMessage = await message.channel.send("Measuring latency...");
		const probeEnd = process.hrtime.bigint();

		const restSendMs = Number(probeEnd - probeStart) / 1e6;
		const deliveryDeltaMs = probeMessage.createdTimestamp - message.createdTimestamp;

		const editStart = process.hrtime.bigint();
		await probeMessage.edit("Finalizing latency report...");
		const editEnd = process.hrtime.bigint();
		const restEditMs = Number(editEnd - editStart) / 1e6;

		const wsPing = Number.isFinite(client.ws.ping) ? Math.round(client.ws.ping) : -1;
		const loopLag = await measureEventLoopLag(7);

		const compositeApiMs = avg([restSendMs, restEditMs]);
		latencyHistory.push({
			ts: Date.now(),
			wsPingMs: wsPing,
			apiMs: compositeApiMs,
			ingestionMs: commandIngestionMs,
		});
		if (latencyHistory.length > MAX_HISTORY) latencyHistory.shift();

		const recentWs = latencyHistory
			.map((entry) => entry.wsPingMs)
			.filter((value) => Number.isFinite(value) && value >= 0);
		const recentApi = latencyHistory.map((entry) => entry.apiMs);

		const wsAvg = avg(recentWs);
		const wsMin = recentWs.length ? Math.min(...recentWs) : 0;
		const wsMax = recentWs.length ? Math.max(...recentWs) : 0;
		const wsP95 = percentile(recentWs, 95);
		const wsJitter = recentWs.length ? wsMax - wsMin : 0;

		const apiAvg = avg(recentApi);
		const apiP95 = percentile(recentApi, 95);

		const scoreSource = Number.isFinite(wsPing) && wsPing >= 0 ? wsPing : compositeApiMs;
		const quality = ratingFromMs(scoreSource);
		const color = quality === "excellent"
			? 0x2ecc71
			: quality === "good"
				? 0x1abc9c
				: quality === "fair"
					? 0xf1c40f
					: 0xe74c3c;

		const diagnosticsEmbed = new EmbedBuilder()
			.setColor(color)
			.setTitle("Pong! Latency Diagnostics")
			.setDescription(`Current connection quality: **${quality.toUpperCase()}**`)
			.addFields(
				{
					name: "Live Latency",
					value:
						`Gateway WS Ping: ${wsPing >= 0 ? `${wsPing} ms` : "unavailable"}\n` +
						`Command Ingestion Delay: ${Math.round(commandIngestionMs)} ms\n` +
						`REST Send Latency: ${restSendMs.toFixed(2)} ms\n` +
						`REST Edit Latency: ${restEditMs.toFixed(2)} ms\n` +
						`Discord Delivery Delta: ${Math.round(deliveryDeltaMs)} ms`,
					inline: false,
				},
				{
					name: "Event Loop Responsiveness",
					value:
						`Avg Loop Lag: ${loopLag.avgMs.toFixed(3)} ms\n` +
						`P95 Loop Lag: ${loopLag.p95Ms.toFixed(3)} ms\n` +
						`Max Loop Lag: ${loopLag.maxMs.toFixed(3)} ms`,
					inline: true,
				},
				{
					name: "Rolling Window (last 25 pings)",
					value:
						`WS Avg: ${wsAvg.toFixed(1)} ms\n` +
						`WS P95: ${wsP95.toFixed(1)} ms\n` +
						`WS Min/Max: ${wsMin.toFixed(1)} / ${wsMax.toFixed(1)} ms\n` +
						`WS Jitter Span: ${wsJitter.toFixed(1)} ms\n` +
						`API Avg/P95: ${apiAvg.toFixed(2)} / ${apiP95.toFixed(2)} ms`,
					inline: true,
				},
				{
					name: "Protocol Context",
					value:
						`WS Status Code: ${client.ws.status}\n` +
						`discord.js: v${djsVersion}\n` +
						`Sample Count: ${latencyHistory.length}`,
					inline: false,
				},
			)
			.setFooter({
				text: `Requested by ${message.author.tag}`,
			})
			.setTimestamp(new Date());

		await probeMessage.edit({
			content: "",
			embeds: [diagnosticsEmbed],
		});
	},
};
