// One-time Discord slash-command registration. Never commit the bot token.
const token = process.env.DISCORD_BOT_TOKEN;
const applicationId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !applicationId) {
  console.error("Set DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID in your shell environment.");
  process.exit(1);
}

const commands = [{
  name: "getkey",
  description: "Generate your ZervxHub Free Key",
  type: 1,
}];

const endpoint = guildId
  ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${applicationId}/commands`;

const response = await fetch(endpoint, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
});

const result = await response.json().catch(() => ({}));
if (!response.ok) {
  console.error(`Discord command registration failed (${response.status}).`);
  console.error(result.message || "Check the application ID, bot token, and command permissions.");
  process.exit(1);
}
console.log(guildId ? "Guild /getkey command registered." : "Global /getkey command registered.");
