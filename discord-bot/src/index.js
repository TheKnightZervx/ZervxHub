import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";
import { filterGameChoices, guildIdsFromEnv, issueReply, revokeReply } from "./licensing.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const apiUrl = process.env.ZERVXHUB_API_URL?.replace(/\/$/, "");
const botApiToken = process.env.ZERVXHUB_BOT_TOKEN || process.env.ZERVXHUB_ADMIN_TOKEN;
const guildIds = guildIdsFromEnv(process.env.DISCORD_GUILD_ID, process.env.DISCORD_GUILD_IDS);

if (!token || !clientId || !apiUrl || !botApiToken) {
  throw new Error("Missing required environment variables. Copy .env.example and fill in the private values.");
}

const parsedApiUrl = new URL(apiUrl);
const localHost = parsedApiUrl.hostname === "localhost" || parsedApiUrl.hostname === "127.0.0.1";
if (parsedApiUrl.protocol !== "https:" && !localHost) {
  throw new Error("ZERVXHUB_API_URL must use HTTPS outside local development.");
}

const commands = [
  new SlashCommandBuilder()
    .setName("getkey")
    .setDescription("Get a 24-hour license key for an approved game")
    .addStringOption(option => option
      .setName("game")
      .setDescription("Approved game")
      .setRequired(true)
      .setAutocomplete(true)),
  new SlashCommandBuilder()
    .setName("revoke-key")
    .setDescription("Admin: revoke a member's active key in this server")
    .addUserOption(option => option
      .setName("member")
      .setDescription("Member whose key should be revoked")
      .setRequired(true)),
].map(command => command.toJSON());

const gameCache = new Map();

async function api(path, body) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-bot-token": botApiToken,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }
  return { response, data };
}

async function approvedGames(guildId) {
  const cached = gameCache.get(guildId);
  if (cached && Date.now() - cached.at < 30_000) return cached.games;
  const { response, data } = await api("/v2/discord/games", { guildId });
  const games = response.ok && Array.isArray(data.games) ? data.games : [];
  if (response.ok) gameCache.set(guildId, { at: Date.now(), games });
  return games;
}

const rest = new REST({ version: "10" }).setToken(token);
for (const guildId of guildIds) {
  try {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  } catch {
    console.error(`Could not register slash commands for guild ${guildId}.`);
  }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once("ready", () => console.log(`ZervxHub bot online as ${client.user?.tag}`));
client.on("error", () => console.error("Discord client encountered an error."));

client.on("interactionCreate", async interaction => {
  if (interaction.isAutocomplete()) {
    if (interaction.commandName !== "getkey" || !interaction.guildId) {
      await interaction.respond([]);
      return;
    }
    try {
      const games = await approvedGames(interaction.guildId);
      await interaction.respond(filterGameChoices(games, interaction.options.getFocused()));
    } catch {
      await interaction.respond([]).catch(() => {});
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "getkey") {
    await interaction.deferReply({ ephemeral: true });
    if (!interaction.guildId) {
      await interaction.editReply("Use this command in a connected Discord server.");
      return;
    }
    const universeId = interaction.options.getString("game", true);
    try {
      const { response, data } = await api("/v2/discord/keys/issue", {
        guildId: interaction.guildId,
        discordUserId: interaction.user.id,
        universeId,
      });
      await interaction.editReply(issueReply(response.status, data));
    } catch {
      await interaction.editReply("Could not reach the key service. Please try again later.");
    }
    return;
  }

  if (interaction.commandName === "revoke-key") {
    if (!interaction.memberPermissions?.has("ManageGuild")) {
      await interaction.reply({ content: "You need Manage Server permission.", ephemeral: true });
      return;
    }
    if (!interaction.guildId) {
      await interaction.reply({ content: "Use this command in a connected Discord server.", ephemeral: true });
      return;
    }
    const member = interaction.options.getUser("member", true);
    await interaction.deferReply({ ephemeral: true });
    try {
      const { response, data } = await api("/v2/discord/keys/revoke", {
        guildId: interaction.guildId,
        discordUserId: member.id,
      });
      await interaction.editReply(revokeReply(response.status, data, member.id));
    } catch {
      await interaction.editReply("Could not reach the key service.");
    }
  }
});

await client.login(token);
