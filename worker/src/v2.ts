
import { isRateLimited } from "./rate-limit";
import {
  hashCredential,
  credentialCandidateHashes,
  timingSafeEqual,
  makeApiKey,
  makeLicenseKey,
} from "./crypto";

export interface V2Env {
  DB: D1Database;
  ADMIN_TOKEN: string;
  BOT_API_TOKEN?: string;
  KEY_PEPPER: string;
  CORS_ORIGIN?: string;
}

type Json = Record<string, unknown>;

const respond = (data: Json, status = 200, origin = "*") =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-token, x-developer-key, x-bot-token",
      "vary": "origin",
    },
  });

const getOrigin = (request: Request, env: V2Env) => {
  const origin = request.headers.get("origin") ?? "";
  if (!env.CORS_ORIGIN) return "*";
  return origin === env.CORS_ORIGIN ? origin : "null";
};

async function requireAdmin(request: Request, env: V2Env, origin: string) {
  if (await isAdmin(request, env)) return null;
  if (isRateLimited(request, "admin-auth-failure", 40)) {
    return respond({ error: "Too many requests" }, 429, origin);
  }
  return respond({ error: "Unauthorized" }, 401, origin);
}

async function isAdmin(request: Request, env: V2Env) {
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN === env.BOT_API_TOKEN) return false;
  const supplied = request.headers.get("x-admin-token") ?? "";
  return timingSafeEqual(supplied, env.ADMIN_TOKEN);
}

async function getDeveloperId(request: Request, env: V2Env) {
  const supplied = request.headers.get("x-developer-key") ?? "";
  if (!supplied || supplied.length > 200 || !env.KEY_PEPPER) return null;

  const { hmac: keyHash, legacy: legacyHash } = await credentialCandidateHashes(
    supplied,
    env.KEY_PEPPER
  );

  const row = await env.DB.prepare(
    `SELECT d.id, k.key_hash
     FROM developer_api_keys k
     JOIN developers d ON d.id = k.developer_id
     WHERE (k.key_hash = ? OR k.key_hash = ?)
       AND k.revoked_at IS NULL
       AND d.status = 'active'`
  ).bind(keyHash, legacyHash).first<{ id: string; key_hash: string }>();

  if (!row) return null;

  // Upgrade legacy hash to HMAC-SHA-256 upon successful authentication
  if (row.key_hash === legacyHash && keyHash !== legacyHash) {
    try {
      await env.DB.prepare(
        "UPDATE developer_api_keys SET key_hash = ? WHERE key_hash = ?"
      ).bind(keyHash, legacyHash).run();
    } catch {
      // Ignore migration errors on read replicas
    }
  }

  return row.id;
}

const validDiscordId = (value: string) => /^[0-9]{15,22}$/.test(value);
const validUniverseId = (value: string) => /^[0-9]{1,22}$/.test(value);

function invalidDeveloper(request: Request, origin: string) {
  if (isRateLimited(request, "developer-auth-failure", 30)) {
    return respond({ error: "Too many requests" }, 429, origin);
  }
  return respond({ error: "Invalid or revoked developer credential" }, 401, origin);
}

function matchesSecret(supplied: string, expected: string | undefined) {
  return timingSafeEqual(supplied, expected);
}

const MAX_REQUEST_BODY_BYTES = 16_384;

async function parseJsonBody(request: Request): Promise<
  { data: Json; error?: never } | { data?: never; error: "too_large" | "invalid" }
> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) {
    return { error: "too_large" };
  }

  const reader = request.body?.getReader();
  if (!reader) return { error: "invalid" };

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { error: "too_large" };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    const parsed: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    );
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { error: "invalid" };
    }
    return { data: parsed as Json };
  } catch {
    await reader.cancel().catch(() => {});
    return { error: "invalid" };
  }
}

export async function handleV2(
  request: Request,
  env: V2Env
): Promise<Response | null> {
  const url = new URL(request.url);

  if (!url.pathname.startsWith("/v2/")) return null;

  const origin = getOrigin(request, env);

  if (!env.KEY_PEPPER) {
    return respond({ error: "Server configuration error: KEY_PEPPER is required" }, 500, origin);
  }

  if (request.method === "GET" && url.pathname === "/v2/games") {
    const developerId = await getDeveloperId(request, env);
    if (!developerId) return invalidDeveloper(request, origin);
    const result = await env.DB.prepare(
      `SELECT universe_id AS universeId, name, status, verified_at AS verifiedAt
       FROM games WHERE developer_id = ? AND status = 'approved'
       ORDER BY name COLLATE NOCASE`
    ).bind(developerId).all<{ universeId: string; name: string; status: string; verifiedAt: number | null }>();
    return respond({ games: result.results }, 200, origin);
  }

  if (request.method === "GET" && url.pathname === "/v2/admin/developers") {
    const denied = await requireAdmin(request, env, origin);
    if (denied) return denied;
    const result = await env.DB.prepare(
      `SELECT id AS developerId, discord_user_id AS discordUserId,
         display_name AS displayName, status, created_at AS createdAt
       FROM developers
       ORDER BY created_at DESC
       LIMIT 100`
    ).all<{
      developerId: string;
      discordUserId: string;
      displayName: string;
      status: string;
      createdAt: number;
    }>();
    return respond({ developers: result.results }, 200, origin);
  }

  if (request.method === "GET" && url.pathname === "/v2/admin/games") {
    const adminListDenied = await requireAdmin(request, env, origin);
    if (adminListDenied) return adminListDenied;
    const result = await env.DB.prepare(
      `SELECT g.universe_id AS universeId, g.name, g.status, g.created_at AS createdAt,
         d.display_name AS developerName, d.id AS developerId
       FROM games g JOIN developers d ON d.id = g.developer_id
       ORDER BY CASE g.status WHEN 'pending' THEN 0 ELSE 1 END, g.created_at`
    ).all<{ universeId: string; name: string; status: string; createdAt: number; developerName: string; developerId: string }>();
    return respond({ games: result.results }, 200, origin);
  }

  if (request.method !== "POST") {
    return respond({ error: "Method not allowed" }, 405, origin);
  }

  const parsedBody = await parseJsonBody(request);
  if (parsedBody.error === "too_large") {
    return respond({ error: "Request too large" }, 413, origin);
  }
  if (!parsedBody.data) {
    return respond({ error: "Invalid JSON body" }, 400, origin);
  }
  const data = parsedBody.data;

  // ADMIN: create a developer and issue their API credential.
  if (url.pathname === "/v2/admin/developers") {
    const denied = await requireAdmin(request, env, origin);
    if (denied) return denied;

    const discordUserId =
      typeof data.discordUserId === "string" ? data.discordUserId.trim() : "";
    const displayName =
      typeof data.displayName === "string" ? data.displayName.trim() : "";

    if (!validDiscordId(discordUserId)) {
      return respond({ error: "Invalid Discord user ID" }, 400, origin);
    }

    if (!displayName || displayName.length > 80) {
      return respond({ error: "Display name must be 1–80 characters" }, 400, origin);
    }

    const developerId = crypto.randomUUID();
    const apiKey = makeApiKey();
    const keyHash = await hashCredential(apiKey, env.KEY_PEPPER);
    const now = Math.floor(Date.now() / 1000);

    try {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO developers (id, discord_user_id, display_name, status, created_at)
           VALUES (?, ?, ?, 'active', ?)`
        ).bind(developerId, discordUserId, displayName, now),

        env.DB.prepare(
          `INSERT INTO developer_api_keys (key_hash, developer_id, created_at)
           VALUES (?, ?, ?)`
        ).bind(keyHash, developerId, now),
      ]);
    } catch {
      return respond(
        { error: "Could not create developer. This Discord account may already be registered." },
        409,
        origin
      );
    }

    return respond({
      created: true,
      developerId,
      displayName,
      apiKey,
      warning: "Save this API key now. It cannot be displayed again."
    }, 201, origin);
  }

  // ADMIN: revoke a developer API credential.
  if (url.pathname === "/v2/admin/developer-keys/revoke") {
    const denied = await requireAdmin(request, env, origin);
    if (denied) return denied;

    const apiKey = typeof data.apiKey === "string" ? data.apiKey.trim() : "";
    if (!apiKey || apiKey.length > 200) {
      return respond({ error: "Invalid API key" }, 400, origin);
    }

    const { hmac: keyHash, legacy: legacyHash } = await credentialCandidateHashes(
      apiKey,
      env.KEY_PEPPER
    );

    const result = await env.DB.prepare(
      "UPDATE developer_api_keys SET revoked_at = ? WHERE (key_hash = ? OR key_hash = ?) AND revoked_at IS NULL"
    ).bind(Math.floor(Date.now() / 1000), keyHash, legacyHash).run();

    return respond({ revoked: result.meta.changes > 0 }, 200, origin);
  }

  if (url.pathname === "/v2/admin/developer-keys/rotate") {
    const denied = await requireAdmin(request, env, origin);
    if (denied) return denied;

    const developerId =
      typeof data.developerId === "string" ? data.developerId.trim() : "";
    if (!developerId || developerId.length > 80) {
      return respond({ error: "Invalid developer ID" }, 400, origin);
    }

    const developer = await env.DB.prepare(
      "SELECT id FROM developers WHERE id = ? AND status = 'active'"
    ).bind(developerId).first<{ id: string }>();
    if (!developer) return respond({ error: "Active developer not found" }, 404, origin);

    const apiKey = makeApiKey();
    const keyHash = await hashCredential(apiKey, env.KEY_PEPPER);
    const now = Math.floor(Date.now() / 1000);

    await env.DB.batch([
      env.DB.prepare(
        "UPDATE developer_api_keys SET revoked_at = ? WHERE developer_id = ? AND revoked_at IS NULL"
      ).bind(now, developerId),
      env.DB.prepare(
        "INSERT INTO developer_api_keys (key_hash, developer_id, created_at) VALUES (?, ?, ?)"
      ).bind(keyHash, developerId, now),
    ]);

    return respond({
      rotated: true,
      developerId,
      apiKey,
      warning: "The previous developer API keys have been revoked. Save this new key now; it cannot be displayed again."
    }, 201, origin);
  }

  if (url.pathname === "/v2/admin/developers/status") {
    const denied = await requireAdmin(request, env, origin);
    if (denied) return denied;
    const developerId = typeof data.developerId === "string" ? data.developerId.trim() : "";
    const status = data.status;
    if (!developerId || (status !== "active" && status !== "suspended")) {
      return respond({ error: "Provide a developer ID and active/suspended status" }, 400, origin);
    }
    const result = await env.DB.prepare(
      "UPDATE developers SET status = ? WHERE id = ?"
    ).bind(status, developerId).run();
    return result.meta.changes
      ? respond({ updated: true, developerId, status }, 200, origin)
      : respond({ error: "Developer not found" }, 404, origin);
  }

  // ADMIN: connect or disconnect a Discord guild for a developer.
  if (url.pathname === "/v2/admin/discord-integrations") {
    const denied = await requireAdmin(request, env, origin);
    if (denied) return denied;
    const guildId = typeof data.guildId === "string" ? data.guildId.trim() : "";
    const developerId = typeof data.developerId === "string" ? data.developerId.trim() : "";
    if (!validDiscordId(guildId) || !developerId) {
      return respond({ error: "Provide a valid guild ID and developer ID" }, 400, origin);
    }
    const developer = await env.DB.prepare(
      "SELECT id FROM developers WHERE id = ? AND status = 'active'"
    ).bind(developerId).first<{ id: string }>();
    if (!developer) return respond({ error: "Active developer not found" }, 404, origin);
    await env.DB.prepare(
      `INSERT INTO discord_integrations (guild_id, developer_id, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT(guild_id) DO UPDATE SET developer_id = excluded.developer_id,
         created_at = excluded.created_at`
    ).bind(guildId, developerId, Math.floor(Date.now() / 1000)).run();
    return respond({ connected: true, guildId, developerId }, 201, origin);
  }

  if (url.pathname === "/v2/admin/discord-integrations/revoke") {
    const denied = await requireAdmin(request, env, origin);
    if (denied) return denied;
    const guildId = typeof data.guildId === "string" ? data.guildId.trim() : "";
    if (!validDiscordId(guildId)) return respond({ error: "Invalid guild ID" }, 400, origin);
    const result = await env.DB.prepare(
      "DELETE FROM discord_integrations WHERE guild_id = ?"
    ).bind(guildId).run();
    return respond({ revoked: result.meta.changes > 0 }, 200, origin);
  }

  // ADMIN: approve or reject a registered game.
  if (url.pathname === "/v2/admin/games/review") {
    const denied = await requireAdmin(request, env, origin);
    if (denied) return denied;

    const universeId =
      typeof data.universeId === "string" ? data.universeId.trim() : "";
    const status = data.status;

    if (
      !validUniverseId(universeId) ||
      (status !== "approved" && status !== "rejected")
    ) {
      return respond(
        { error: "Provide a valid Universe ID and approved/rejected status" },
        400,
        origin
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const result = await env.DB.prepare(
      `UPDATE games
       SET status = ?, verified_at = ?
       WHERE universe_id = ? AND status = 'pending'`
    ).bind(status, status === "approved" ? now : null, universeId).run();

    if (result.meta.changes === 0) {
      return respond(
        { error: "No pending game found for that Universe ID" },
        404,
        origin
      );
    }

    return respond({ reviewed: true, universeId, status }, 200, origin);
  }

  // PUBLIC: validate a key without a developer credential.
  // Roblox game servers share egress addresses, so the tight limit is per
  // player and a higher ceiling still applies to the calling address.
  if (url.pathname === "/v2/keys/validate") {
    const key = typeof data.key === "string" ? data.key.trim().toUpperCase() : "";
    const universeId =
      typeof data.universeId === "string" ? data.universeId.trim() : "";
    const robloxUserId =
      typeof data.robloxUserId === "string" ? data.robloxUserId.trim() : "";
    const playerKey = /^\d{1,24}$/.test(robloxUserId) ? robloxUserId : "invalid";

    if (
      isRateLimited(request, "license-validation-ip", 600) ||
      isRateLimited(request, "license-validation", 60, 60_000, playerKey)
    ) {
      return respond({ valid: false, reason: "rate_limited" }, 429, origin);
    }

    if (key.length < 20 || key.length > 100 || !validUniverseId(universeId) || !/^\d{1,24}$/.test(robloxUserId)) {
      return respond({ valid: false, reason: "invalid_request" }, 400, origin);
    }

    const game = await env.DB.prepare(
      `SELECT g.developer_id, d.status AS developer_status
       FROM games g
       JOIN developers d ON d.id = g.developer_id
       WHERE g.universe_id = ? AND g.status = 'approved'`
    ).bind(universeId).first<{ developer_id: string; developer_status: string }>();

    if (!game) {
      return respond({ valid: false, reason: "game_not_allowed" }, 403, origin);
    }
    if (game.developer_status !== "active") {
      return respond({ valid: false, reason: "developer_suspended" }, 403, origin);
    }

    const { hmac: keyHash, legacy: legacyHash } = await credentialCandidateHashes(
      key,
      env.KEY_PEPPER
    );
    const row = await env.DB.prepare(
      `SELECT status, expires_at, allowed_universe_ids, developer_id, key_hash
       FROM keys WHERE key_hash = ? OR key_hash = ?`
    ).bind(keyHash, legacyHash).first<{
      status: string;
      expires_at: number;
      allowed_universe_ids: string | null;
      developer_id: string | null;
      key_hash: string;
    }>();

    const now = Math.floor(Date.now() / 1000);

    if (!row || row.developer_id !== game.developer_id || row.status === "revoked") {
      return respond({ valid: false, reason: "invalid_or_revoked" }, 401, origin);
    }

    if (row.status === "expired" || row.expires_at <= now) {
      if (row.status === "active") {
        await env.DB.prepare(
          `UPDATE keys SET status = 'expired'
           WHERE key_hash = ? AND developer_id = ? AND status = 'active'`
        ).bind(row.key_hash, game.developer_id).run();
      }
      return respond({ valid: false, reason: "expired" }, 401, origin);
    }

    if (row.status !== "active") {
      return respond({ valid: false, reason: "invalid_or_revoked" }, 401, origin);
    }

    const allowedIds = (row.allowed_universe_ids ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (!allowedIds.includes(universeId)) {
      return respond({ valid: false, reason: "game_not_allowed" }, 403, origin);
    }

    await env.DB.prepare(
      `UPDATE keys SET last_used_at = ?, last_roblox_user_id = ?
       WHERE key_hash = ? AND developer_id = ?`
    ).bind(now, robloxUserId || null, row.key_hash, game.developer_id).run();

    // Seamlessly upgrade legacy SHA-256 hash to HMAC-SHA-256 with KEY_PEPPER
    if (row.key_hash === legacyHash && keyHash !== legacyHash) {
      try {
        await env.DB.prepare(
          "UPDATE keys SET key_hash = ? WHERE key_hash = ?"
        ).bind(keyHash, legacyHash).run();
      } catch {
        // Ignore duplicate or concurrency conflict
      }
    }

    return respond({ valid: true, expiresAt: row.expires_at }, 200, origin);
  }

  // Discord bot endpoints use one private service token, then derive the tenant
  // from the guild-to-developer integration. The bot never receives admin access.
  if (url.pathname.startsWith("/v2/discord/")) {
    const supplied = request.headers.get("x-bot-token") ?? "";
    // Never let the bot credential become an accidental alias for admin access.
    const botTokenIsDistinct =
      typeof env.BOT_API_TOKEN === "string" &&
      env.BOT_API_TOKEN.length > 0 &&
      env.BOT_API_TOKEN !== env.ADMIN_TOKEN;
    if (!botTokenIsDistinct || !matchesSecret(supplied, env.BOT_API_TOKEN)) {
      if (isRateLimited(request, "bot-auth-failure", 30)) {
        return respond({ error: "Too many requests" }, 429, origin);
      }
      return respond({ error: "Unauthorized" }, 401, origin);
    }
    const guildId = typeof data.guildId === "string" ? data.guildId.trim() : "";
    if (!validDiscordId(guildId)) return respond({ error: "Invalid guild ID" }, 400, origin);
    const integration = await env.DB.prepare(
      `SELECT i.developer_id FROM discord_integrations i
       JOIN developers d ON d.id = i.developer_id
       WHERE i.guild_id = ? AND d.status = 'active'`
    ).bind(guildId).first<{ developer_id: string }>();
    if (!integration) return respond({ error: "This Discord server is not connected" }, 404, origin);
    const developerId = integration.developer_id;

    if (url.pathname === "/v2/discord/games") {
      const games = await env.DB.prepare(
        `SELECT universe_id AS universeId, name FROM games
         WHERE developer_id = ? AND status = 'approved'
         ORDER BY name COLLATE NOCASE`
      ).bind(developerId).all<{ universeId: string; name: string }>();
      return respond({ games: games.results }, 200, origin);
    }

    if (url.pathname === "/v2/discord/keys/issue") {
      const discordUserId = typeof data.discordUserId === "string" ? data.discordUserId.trim() : "";
      const universeId = typeof data.universeId === "string" ? data.universeId.trim() : "";
      if (
        isRateLimited(request, "discord-issue-ip", 120) ||
        isRateLimited(request, "discord-issue-user", 5, 60_000, discordUserId || "invalid")
      ) {
        return respond({ error: "Too many requests. Wait a minute and try again." }, 429, origin);
      }
      if (!validDiscordId(discordUserId) || !validUniverseId(universeId)) {
        return respond({ error: "Invalid Discord user or Universe ID" }, 400, origin);
      }
      const game = await env.DB.prepare(
        `SELECT id FROM games WHERE developer_id = ? AND universe_id = ? AND status = 'approved'`
      ).bind(developerId, universeId).first<{ id: string }>();
      if (!game) return respond({ error: "Game is not approved for this server" }, 403, origin);
      const now = Math.floor(Date.now() / 1000);
      const key = makeLicenseKey();
      const keyHash = await hashCredential(key, env.KEY_PEPPER);
      const expiresAt = now + 86400;
      const results = await env.DB.batch([
        env.DB.prepare(
          `UPDATE keys SET status = 'revoked' WHERE developer_id = ? AND discord_user_id = ?
           AND status = 'active' AND created_at <= ?`
        ).bind(developerId, discordUserId, now - 86400),
        env.DB.prepare(
          `INSERT INTO keys (key_hash, discord_user_id, status, created_at, expires_at,
             allowed_universe_ids, developer_id)
           SELECT ?, ?, 'active', ?, ?, ?, ? WHERE NOT EXISTS (
             SELECT 1 FROM keys WHERE developer_id = ? AND discord_user_id = ? AND created_at > ?
           )`
        ).bind(keyHash, discordUserId, now, expiresAt, universeId, developerId,
          developerId, discordUserId, now - 86400),
      ]);
      if (!results[1] || results[1].meta.changes !== 1) {
        return respond({ error: "This member already received a key in the last 24 hours" }, 429, origin);
      }
      return respond({ key, expiresAt, durationHours: 24 }, 201, origin);
    }

    if (url.pathname === "/v2/discord/keys/revoke") {
      const discordUserId = typeof data.discordUserId === "string" ? data.discordUserId.trim() : "";
      if (!validDiscordId(discordUserId)) return respond({ error: "Invalid Discord user ID" }, 400, origin);
      const result = await env.DB.prepare(
        `UPDATE keys SET status = 'revoked' WHERE developer_id = ? AND discord_user_id = ? AND status = 'active'`
      ).bind(developerId, discordUserId).run();
      return respond({ revoked: result.meta.changes > 0 }, 200, origin);
    }

    return respond({ error: "Not found" }, 404, origin);
  }

  // All remaining routes require a valid developer credential.
  const developerId = await getDeveloperId(request, env);

  if (!developerId) return invalidDeveloper(request, origin);

  // DEVELOPER: register a Roblox game. It remains pending until approved.
  if (url.pathname === "/v2/games/register") {
    if (isRateLimited(request, "game-register", 15)) {
      return respond({ error: "Too many requests" }, 429, origin);
    }
    const universeId =
      typeof data.universeId === "string" ? data.universeId.trim() : "";
    const name = typeof data.name === "string" ? data.name.trim() : "";

    if (!validUniverseId(universeId)) {
      return respond({ error: "Invalid Roblox Universe ID" }, 400, origin);
    }

    if (!name || name.length > 100) {
      return respond({ error: "Game name must be 1–100 characters" }, 400, origin);
    }

    try {
      await env.DB.prepare(
        `INSERT INTO games (id, developer_id, universe_id, name, status, created_at)
         VALUES (?, ?, ?, ?, 'pending', ?)`
      ).bind(
        crypto.randomUUID(),
        developerId,
        universeId,
        name,
        Math.floor(Date.now() / 1000)
      ).run();
    } catch {
      return respond(
        { error: "This Universe ID may already be registered." },
        409,
        origin
      );
    }

    return respond({
      registered: true,
      status: "pending",
      message: "Your game must be approved before it can validate keys."
    }, 201, origin);
  }

  // DEVELOPER: issue a 24-hour key for one of their approved games.
  if (url.pathname === "/v2/keys/issue") {
    if (isRateLimited(request, "license-issue", 30)) {
      return respond({ error: "Too many requests" }, 429, origin);
    }
    const discordUserId =
      typeof data.discordUserId === "string" ? data.discordUserId.trim() : "";
    const universeId =
      typeof data.universeId === "string" ? data.universeId.trim() : "";

    if (!validDiscordId(discordUserId)) {
      return respond({ error: "Invalid Discord user ID" }, 400, origin);
    }

    if (!validUniverseId(universeId)) {
      return respond({ error: "Invalid Roblox Universe ID" }, 400, origin);
    }

    const game = await env.DB.prepare(
      `SELECT id FROM games
       WHERE developer_id = ? AND universe_id = ? AND status = 'approved'`
    ).bind(developerId, universeId).first<{ id: string }>();

    if (!game) {
      return respond(
        { error: "This game is not approved for your developer account" },
        403,
        origin
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const key = makeLicenseKey();
    const keyHash = await hashCredential(key, env.KEY_PEPPER);
    const expiresAt = now + 86400;

    const results = await env.DB.batch([
      env.DB.prepare(
        `UPDATE keys SET status = 'revoked'
         WHERE developer_id = ? AND discord_user_id = ?
           AND status = 'active' AND created_at <= ?`
      ).bind(developerId, discordUserId, now - 86400),

      env.DB.prepare(
        `INSERT INTO keys
         (key_hash, discord_user_id, status, created_at, expires_at,
          allowed_universe_ids, developer_id)
         SELECT ?, ?, 'active', ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM keys
           WHERE developer_id = ? AND discord_user_id = ? AND created_at > ?
         )`
      ).bind(
        keyHash, discordUserId, now, expiresAt, universeId, developerId,
        developerId, discordUserId, now - 86400
      )
    ]);

    if (!results[1] || results[1].meta.changes !== 1) {
      return respond(
        { error: "This Discord user already received a key in the last 24 hours." },
        429,
        origin
      );
    }

    return respond({ key, expiresAt, durationHours: 24 }, 201, origin);
  }

  // DEVELOPER: revoke only keys belonging to their own account.
  if (url.pathname === "/v2/keys/revoke") {
    const key = typeof data.key === "string" ? data.key.trim().toUpperCase() : "";
    const discordUserId =
      typeof data.discordUserId === "string" ? data.discordUserId.trim() : "";

    if (!key && !validDiscordId(discordUserId)) {
      return respond(
        { error: "Provide a valid key or Discord user ID" },
        400,
        origin
      );
    }

    const { hmac: keyHash, legacy: legacyHash } = key
      ? await credentialCandidateHashes(key, env.KEY_PEPPER)
      : { hmac: "", legacy: "" };

    const result = key
      ? await env.DB.prepare(
          `UPDATE keys SET status = 'revoked'
           WHERE (key_hash = ? OR key_hash = ?) AND developer_id = ? AND status = 'active'`
        ).bind(keyHash, legacyHash, developerId).run()
      : await env.DB.prepare(
          `UPDATE keys SET status = 'revoked'
           WHERE discord_user_id = ? AND developer_id = ? AND status = 'active'`
        ).bind(discordUserId, developerId).run();

    return respond({ revoked: result.meta.changes > 0 }, 200, origin);
  }

  return respond({ error: "Not found" }, 404, origin);
}
