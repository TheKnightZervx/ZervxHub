import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from "discord.js";

const required = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID", "DISCORD_GUILD_ID", "KEY_API_URL", "BOT_API_TOKEN"];
for (const name of required) if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
const command = new SlashCommandBuilder().setName("freekey").setDescription("Create your 24-hour ZervxHub access key");
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID), { body: [command.toJSON()] });
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "freekey") return;
  await interaction.deferReply({ ephemeral: true });
  try {
    const response = await fetch(`${process.env.KEY_API_URL.replace(/\/$/, "")}/v1/keys/free`, { method: "POST", headers: { authorization: `Bearer ${process.env.BOT_API_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ discordUserId: interaction.user.id }) });
    const data = await response.json();
    if (!response.ok) {
      const message = response.status === 429 ? `You can request another key in ${Math.ceil(data.retryAfter / 3600)} hour(s).` : "Key creation is unavailable. Please try later.";
      return interaction.editReply({ content: message });
    }
    return interaction.editReply({ content: `Your key: \`${data.key}\`\nIt expires in 24 hours and can be bound to one Roblox account. Keep it private.` });
  } catch { return interaction.editReply({ content: "Key service is temporarily unavailable." }); }
});
await client.login(process.env.DISCORD_TOKEN);
