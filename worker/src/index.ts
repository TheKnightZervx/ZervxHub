export interface Env {
  DB: D1Database;
  ADMIN_TOKEN: string;
  ALLOWED_UNIVERSE_IDS: string;
  CORS_ORIGIN?: string;
}

type Json = Record<string, unknown>;
const json = (data: Json, status = 200, origin = "*") =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-token",
      "vary": "origin",
    },
  });

const hex = (bytes: Uint8Array) => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
const digest = async (value: string) =>
  hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
const makeKey = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const raw = hex(bytes).toUpperCase();
  return `ZERVX-${raw.match(/.{1,5}/g)!.join("-")}`;
};
const parseIds = (value: string) => value.split(",").map((v) => v.trim()).filter(Boolean);

async function authorized(request: Request, env: Env): Promise<boolean> {
  const supplied = request.headers.get("x-admin-token") ?? "";
  if (!env.ADMIN_TOKEN) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(supplied);
  const b = encoder.encode(env.ADMIN_TOKEN);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function allowedOrigin(request: Request, env: Env) {
  const origin = request.headers.get("origin") ?? "";
  if (!env.CORS_ORIGIN) return "*";
  return origin === env.CORS_ORIGIN ? origin : "null";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = allowedOrigin(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: {
        "access-control-allow-origin": origin,
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type, x-admin-token",
        "access-control-max-age": "86400",
      }});
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/v1/health") {
      return json({ ok: true, service: "zervxhub-api", version: "1.0.0" }, 200, origin);
    }
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);

    let body: Json;
    try { body = await request.json() as Json; }
    catch { return json({ error: "Invalid JSON body" }, 400, origin); }

    if (url.pathname === "/v1/keys/validate") {
      const key = typeof body.key === "string" ? body.key.trim().toUpperCase() : "";
      const universeId = typeof body.universeId === "string" ? body.universeId.trim() : "";
      const robloxUserId = typeof body.robloxUserId === "string" ? body.robloxUserId.trim() : "";
      if (key.length < 20 || key.length > 100 || !/^[0-9]+$/.test(universeId)) {
        return json({ valid: false, reason: "invalid_request" }, 400, origin);
      }

      const globalAllowlist = parseIds(env.ALLOWED_UNIVERSE_IDS ?? "");
      if (!globalAllowlist.length || !globalAllowlist.includes(universeId)) {
        return json({ valid: false, reason: "game_not_allowed" }, 403, origin);
      }

      const keyHash = await digest(key);
      const row = await env.DB.prepare(
        "SELECT status, expires_at, allowed_universe_ids FROM keys WHERE key_hash = ?1"
      ).bind(keyHash).first<{ status: string; expires_at: number; allowed_universe_ids: string | null }>();

      if (!row || row.status !== "active") return json({ valid: false, reason: "invalid_or_revoked" }, 401, origin);
      const now = Math.floor(Date.now() / 1000);
      if (row.expires_at <= now) {
        await env.DB.prepare("UPDATE keys SET status = 'expired' WHERE key_hash = ?1").bind(keyHash).run();
        return json({ valid: false, reason: "expired" }, 401, origin);
      }
      const keyAllowlist = parseIds(row.allowed_universe_ids ?? "");
      if (keyAllowlist.length && !keyAllowlist.includes(universeId)) {
        return json({ valid: false, reason: "game_not_allowed" }, 403, origin);
      }

      await env.DB.prepare(
        "UPDATE keys SET last_used_at = ?1, last_roblox_user_id = ?2 WHERE key_hash = ?3"
      ).bind(now, robloxUserId || null, keyHash).run();
      return json({ valid: true, expiresAt: row.expires_at }, 200, origin);
    }

    if (!await authorized(request, env)) return json({ error: "Unauthorized" }, 401, origin);

    if (url.pathname === "/v1/keys/issue") {
      const discordUserId = typeof body.discordUserId === "string" ? body.discordUserId.trim() : "";
      const allowed = Array.isArray(body.allowedUniverseIds)
        ? body.allowedUniverseIds.filter((v): v is string => typeof v === "string" && /^[0-9]+$/.test(v))
        : [];
      const universeIds = allowed.length ? allowed : parseIds(env.ALLOWED_UNIVERSE_IDS ?? "");
      if (!/^[0-9]{15,22}$/.test(discordUserId)) return json({ error: "Invalid Discord user ID" }, 400, origin);
      if (!universeIds.length) return json({ error: "No Roblox Universe IDs are configured; issuance is disabled" }, 409, origin);

      const now = Math.floor(Date.now() / 1000);
      const key = makeKey();
      const keyHash = await digest(key);
      const expiresAt = now + 86400;

      // D1 batch runs transactionally. Check every prior issuance (including revoked
      // keys) inside the same transaction to prevent cooldown bypasses and races.
      const results = await env.DB.batch([
        env.DB.prepare(
          "UPDATE keys SET status = 'revoked' WHERE discord_user_id = ?1 AND status = 'active' AND created_at <= ?2"
        ).bind(discordUserId, now - 86400),
        env.DB.prepare(
          "INSERT INTO keys (key_hash, discord_user_id, status, created_at, expires_at, allowed_universe_ids) " +
          "SELECT ?1, ?2, 'active', ?3, ?4, ?5 WHERE NOT EXISTS (" +
          "SELECT 1 FROM keys WHERE discord_user_id = ?2 AND created_at > ?6)"
        ).bind(keyHash, discordUserId, now, expiresAt, universeIds.join(","), now - 86400),
      ]);

      if (!results[1] || results[1].meta.changes !== 1) {
        return json({ error: "A free key was already issued in the last 24 hours" }, 429, origin);
      }
      return json({ key, expiresAt, durationHours: 24 }, 201, origin);
    }

    if (url.pathname === "/v1/keys/revoke") {
      const key = typeof body.key === "string" ? body.key.trim().toUpperCase() : "";
      const discordUserId = typeof body.discordUserId === "string" ? body.discordUserId.trim() : "";
      if (!key && !discordUserId) return json({ error: "Provide key or discordUserId" }, 400, origin);
      const result = key
        ? await env.DB.prepare("UPDATE keys SET status = 'revoked' WHERE key_hash = ?1 AND status = 'active'").bind(await digest(key)).run()
        : await env.DB.prepare("UPDATE keys SET status = 'revoked' WHERE discord_user_id = ?1 AND status = 'active'").bind(discordUserId).run();
      return json({ revoked: result.meta.changes > 0 }, 200, origin);
    }

    return json({ error: "Not found" }, 404, origin);
  },
};
