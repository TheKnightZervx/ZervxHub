import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;
const configuredApiUrl = process.env.ZERVXHUB_API_URL;
const apiUrl = configuredApiUrl?.endsWith("/") ? configuredApiUrl.slice(0, -1) : configuredApiUrl;
const adminToken = process.env.ZERVXHUB_ADMIN_TOKEN;

if (!token || !clientId || !guildId || !apiUrl || !adminToken) {
  throw new Error("Missing required environment variables. Configure Railway Variables.");
}

const commands = [
  new SlashCommandBuilder().setName("getkey").setDescription("Get your 24-hour ZervxHub Free Key"),
  new SlashCommandBuilder()
    .setName("revoke-key")
    .setDescription("Admin: revoke a member's active key")
    .addUserOption(option => option.setName("member").setDescription("Member whose key should be revoked").setRequired(true)),
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(token);
await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once("ready", () => console.log(`ZervxHub bot online as ${client.user?.tag}`));

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "getkey") {
    await interaction.deferReply({ ephemeral: true });
    try {
      const response = await fetch(`${apiUrl}/v1/keys/issue`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ discordUserId: interaction.user.id }),
      });
      const data = await response.json();
      if (!response.ok || !data.key) {
        await interaction.editReply(data.error ?? "Key service is temporarily unavailable.");
        return;
      }
      const expires = new Date(data.expiresAt * 1000).toUTCString();
      await interaction.editReply(`Your ZervxHub Free Key:\n${data.key}\nExpires: ${expires}\nKeep this key private. It is shown only once.`);
    } catch (error) {
      console.error("getkey failed", error);
      await interaction.editReply("Could not reach the key service. Please try again later.");
    }
    return;
  }

  if (interaction.commandName === "revoke-key") {
    if (!interaction.memberPermissions?.has("ManageGuild")) {
      await interaction.reply({ content: "You need Manage Server permission.", ephemeral: true });
      return;
    }
    const member = interaction.options.getUser("member", true);
    await interaction.deferReply({ ephemeral: true });
    try {
      const response = await fetch(`${apiUrl}/v1/keys/revoke`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({ discordUserId: member.id }),
      });
      const data = await response.json();
      await interaction.editReply(response.ok && data.revoked
        ? `Revoked the active key for <@${member.id}>.`
        : data.error ?? "No active key found.");
    } catch (error) {
      console.error("revoke-key failed", error);
      await interaction.editReply("Could not reach the key service.");
    }
  }
});

await client.login(token);
