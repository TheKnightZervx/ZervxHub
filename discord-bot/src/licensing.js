import { EmbedBuilder } from "discord.js";

export const ZERVXHUB_GOLD = 0xe3bd70;

export function brandedReply(message) {
  return {
    embeds: [
      new EmbedBuilder()
        .setAuthor({ name: "ZervxHub" })
        .setColor(ZERVXHUB_GOLD)
        .setDescription(message),
    ],
  };
}

export function filterGameChoices(games, query) {
  const needle = String(query ?? "").trim().toLowerCase();
  if (!Array.isArray(games)) return [];
  return games
    .filter((game) => typeof game?.name === "string" && typeof game?.universeId === "string")
    .filter((game) => game.name.toLowerCase().includes(needle) || game.universeId.includes(needle))
    .slice(0, 25)
    .map((game) => ({
      name: `${game.name} (${game.universeId})`.slice(0, 100),
      value: game.universeId,
    }));
}

export function issueReply(status, data) {
  if (status === 429) {
    return data?.error || "You can request another key after your 24-hour cooldown.";
  }
  if (status === 403) return data?.error || "That game is not approved for this server.";
  if (status === 404) return "This Discord server is not connected to ZervxHub.";
  if (status === 401) return "The bot is not authorized. The owner needs to check the bot API token.";
  if (status >= 200 && status < 300 && typeof data?.key === "string") {
    const expires = Number.isFinite(data?.expiresAt)
      ? new Date(data.expiresAt * 1000).toUTCString()
      : "unknown";
    return [
      "Your ZervxHub license key:",
      data.key,
      `Expires: ${expires}`,
      "Keep this key private. It is shown only once.",
    ].join("\n");
  }
  return "Key service is temporarily unavailable.";
}

export function revokeReply(status, data, memberId) {
  if (status >= 200 && status < 300 && data?.revoked === true) {
    return `Revoked the active key for <@${memberId}> in this server.`;
  }
  if (status >= 200 && status < 300) return "No active key was found for that member.";
  if (status === 404) return "This Discord server is not connected to ZervxHub.";
  if (status === 401) return "The bot is not authorized. The owner needs to check the bot API token.";
  if (status === 429) return "Too many requests. Wait a minute and try again.";
  return "Could not revoke a key right now.";
}

export function guildIdsFromEnv(primary, extra) {
  const ids = [];
  for (const value of [primary, ...String(extra ?? "").split(",")]) {
    const id = String(value ?? "").trim();
    if (!id) continue;
    if (!/^[0-9]{15,22}$/.test(id)) {
      throw new Error("Discord guild IDs must be numeric snowflakes.");
    }
    if (!ids.includes(id)) ids.push(id);
  }
  if (!ids.length) {
    throw new Error("Set DISCORD_GUILD_ID to the server where the bot should register commands.");
  }
  return ids;
}

export async function parseWorkerResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Worker response was not valid JSON.");
  }
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Worker response must be a JSON object.");
  }
  return data;
}
