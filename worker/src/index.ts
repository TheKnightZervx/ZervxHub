
import {
  consumeGameValidationRequest,
  getGameServerKeyOwner,
  handleV2,
  parseJsonBody,
} from "./v2";
import { handleMobile } from "./mobile";
import {
  isRateLimited,
  resetRateLimits,
  getBucketCount,
  cleanupExpiredBuckets,
  setMaxBucketsForTest,
} from "./rate-limit";
import {
  hashCredential,
  credentialCandidateHashes,
  timingSafeEqual,
  makeLicenseKey as makeKey,
} from "./crypto";

export {
  resetRateLimits,
  isRateLimited,
  getBucketCount,
  cleanupExpiredBuckets,
  setMaxBucketsForTest,
};

export interface Env {
  DB: D1Database;
  ADMIN_TOKEN: string;
  BOT_API_TOKEN?: string;
  KEY_PEPPER: string;
  ALLOWED_UNIVERSE_IDS: string;
  CORS_ORIGIN?: string;
  DISCORD_OAUTH_CLIENT_ID?: string;
  DISCORD_OAUTH_CLIENT_SECRET?: string;
  DISCORD_OAUTH_REDIRECT_URI?: string;
  MAILER?: { fetch(request: Request): Promise<Response> };
  ASSETS?: { fetch(request: Request): Promise<Response> };
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
      "access-control-allow-headers": "content-type, x-admin-token, x-developer-key, x-game-server-key, x-bot-token, authorization",
      "vary": "origin",
    },
  });

const parseIds = (value: string) =>
  value.split(",").map((v) => v.trim()).filter(Boolean);

async function authorized(request: Request, env: Env): Promise<boolean> {
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN === env.BOT_API_TOKEN) return false;
  const supplied = request.headers.get("x-admin-token") ?? "";
  return timingSafeEqual(supplied, env.ADMIN_TOKEN);
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
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": origin,
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type, x-admin-token, x-developer-key, x-game-server-key, x-bot-token",
          ...(env.CORS_ORIGIN && origin !== "null"
            ? { "access-control-allow-credentials": "true" }
            : {}),
          "access-control-max-age": "86400",
        },
      });
    }

    const url = new URL(request.url);

    // Native mobile identity/chat API is isolated from legacy developer auth.
    const mobileResponse = await handleMobile(request, env);
    if (mobileResponse) return mobileResponse;

    // Handle the new multi-developer API.
    const v2Response = await handleV2(request, env);
    if (v2Response) return v2Response;

    if (!url.pathname.startsWith("/v1/") && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    // Original V1 API remains available.
    if (request.method === "GET" && url.pathname === "/v1/health") {
      return json(
        { ok: true, service: "zervxhub-api", version: "1.0.0" },
        200,
        origin
      );
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, origin);
    }

    const parsedBody = await parseJsonBody(request);
    if (parsedBody.error === "too_large") return json({ error: "Request too large" }, 413, origin);
    if (!parsedBody.data) return json({ error: "Invalid JSON body" }, 400, origin);
    const body: Json = parsedBody.data;

    if (url.pathname === "/v1/keys/validate") {
      if (isRateLimited(request, "license-validation")) {
        return json({ valid: false, reason: "rate_limited" }, 429, origin);
      }
      if (!env.KEY_PEPPER) {
        return json({ error: "Server configuration error: KEY_PEPPER is required" }, 500, origin);
      }
      const key =
        typeof body.key === "string" ? body.key.trim().toUpperCase() : "";
      const universeId =
        typeof body.universeId === "string" ? body.universeId.trim() : "";
      const robloxUserId =
        typeof body.robloxUserId === "string" ? body.robloxUserId.trim() : "";
      const requestId = typeof body.requestId === "string" ? body.requestId.trim().toLowerCase() : "";
      const requestTimestamp = body.timestamp;
      const now = Math.floor(Date.now() / 1000);

      const invalidRobloxUserId =
        typeof body.robloxUserId !== "string" ||
        !/^[0-9]{1,24}$/.test(robloxUserId);

      if (
        key.length < 20 ||
        key.length > 100 ||
        !/^[0-9]+$/.test(universeId) ||
        invalidRobloxUserId ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId) ||
        typeof requestTimestamp !== "number" ||
        !Number.isInteger(requestTimestamp) ||
        Math.abs(now - requestTimestamp) > 60
      ) {
        return json({ valid: false, reason: "invalid_request" }, 400, origin);
      }

      const globalAllowlist = parseIds(env.ALLOWED_UNIVERSE_IDS ?? "");

      if (!globalAllowlist.length || !globalAllowlist.includes(universeId)) {
        return json({ valid: false, reason: "game_not_allowed" }, 403, origin);
      }

      const serverDeveloper = await getGameServerKeyOwner(request, env, universeId);
      if (!serverDeveloper) {
        return json({ valid: false, reason: "server_credential_invalid" }, 401, origin);
      }
      if (serverDeveloper.developerStatus !== "active") {
        return json({ valid: false, reason: "developer_suspended" }, 403, origin);
      }
      if (!await consumeGameValidationRequest(env, requestId, universeId, now)) {
        return json({ valid: false, reason: "request_replayed" }, 409, origin);
      }

      const { hmac: keyHash, legacy: legacyHash } = await credentialCandidateHashes(
        key,
        env.KEY_PEPPER
      );

      const row = await env.DB.prepare(
        `SELECT status, expires_at, allowed_universe_ids, key_hash,
           bound_roblox_user_id
         FROM keys WHERE (key_hash = ? OR key_hash = ?) AND developer_id IS NULL`
      ).bind(keyHash, legacyHash).first<{
        status: string;
        expires_at: number;
        allowed_universe_ids: string | null;
        key_hash: string;
        bound_roblox_user_id: string | null;
      }>();

      if (!row || row.status !== "active") {
        return json({ valid: false, reason: "invalid_or_revoked" }, 401, origin);
      }

      if (row.expires_at <= now) {
        await env.DB.prepare(
          "UPDATE keys SET status = 'expired' WHERE key_hash = ?"
        ).bind(row.key_hash).run();

        return json({ valid: false, reason: "expired" }, 401, origin);
      }

      const keyAllowlist = parseIds(row.allowed_universe_ids ?? "");

      if (keyAllowlist.length && !keyAllowlist.includes(universeId)) {
        return json({ valid: false, reason: "game_not_allowed" }, 403, origin);
      }

      if (row.bound_roblox_user_id && row.bound_roblox_user_id !== robloxUserId) {
        return json({ valid: false, reason: "license_bound_to_another_user" }, 403, origin);
      }

      const validation = await env.DB.prepare(
        `UPDATE keys
         SET last_used_at = ?, last_roblox_user_id = ?,
             bound_roblox_user_id = COALESCE(bound_roblox_user_id, ?)
         WHERE key_hash = ? AND developer_id IS NULL AND status = 'active'
           AND expires_at > ?
           AND (bound_roblox_user_id IS NULL OR bound_roblox_user_id = ?)`
      ).bind(now, robloxUserId, robloxUserId, row.key_hash, now, robloxUserId).run();

      if (validation.meta.changes !== 1) {
        const latest = await env.DB.prepare(
          `SELECT status, expires_at, bound_roblox_user_id
           FROM keys WHERE key_hash = ? AND developer_id IS NULL`
        ).bind(row.key_hash).first<{
          status: string;
          expires_at: number;
          bound_roblox_user_id: string | null;
        }>();
        if (latest?.bound_roblox_user_id && latest.bound_roblox_user_id !== robloxUserId) {
          return json({ valid: false, reason: "license_bound_to_another_user" }, 403, origin);
        }
        if (latest?.status === "active" && latest.expires_at <= now) {
          return json({ valid: false, reason: "expired" }, 401, origin);
        }
        return json({ valid: false, reason: "invalid_or_revoked" }, 401, origin);
      }

      // Seamlessly upgrade legacy hash
      if (row.key_hash === legacyHash && keyHash !== legacyHash) {
        try {
          await env.DB.prepare(
            "UPDATE keys SET key_hash = ? WHERE key_hash = ?"
          ).bind(keyHash, legacyHash).run();
        } catch {
          // Ignore migration conflicts
        }
      }

      return json({ valid: true, expiresAt: row.expires_at }, 200, origin);
    }

    if (!await authorized(request, env)) {
      if (isRateLimited(request, "v1-admin-auth-failure", 40)) {
        return json({ error: "Too many requests" }, 429, origin);
      }
      return json({ error: "Unauthorized" }, 401, origin);
    }

    if (url.pathname === "/v1/keys/issue") {
      if (!env.KEY_PEPPER) {
        return json({ error: "Server configuration error: KEY_PEPPER is required" }, 500, origin);
      }
      const discordUserId =
        typeof body.discordUserId === "string" ? body.discordUserId.trim() : "";

      const allowed = Array.isArray(body.allowedUniverseIds)
        ? body.allowedUniverseIds.filter(
            (v): v is string =>
              typeof v === "string" && /^[0-9]+$/.test(v)
          )
        : [];

      const universeIds = allowed.length
        ? allowed
        : parseIds(env.ALLOWED_UNIVERSE_IDS ?? "");

      if (!/^[0-9]{15,22}$/.test(discordUserId)) {
        return json({ error: "Invalid Discord user ID" }, 400, origin);
      }

      if (!universeIds.length) {
        return json(
          { error: "No Roblox Universe IDs are configured; issuance is disabled" },
          409,
          origin
        );
      }

      const now = Math.floor(Date.now() / 1000);
      const key = makeKey();
      const keyHash = await hashCredential(key, env.KEY_PEPPER);
      const expiresAt = now + 86400;

      const results = await env.DB.batch([
        env.DB.prepare(
          "UPDATE keys SET status = 'revoked' WHERE discord_user_id = ? AND status = 'active' AND created_at <= ? AND developer_id IS NULL"
        ).bind(discordUserId, now - 86400),

        env.DB.prepare(
          "INSERT INTO keys (key_hash, discord_user_id, status, created_at, expires_at, allowed_universe_ids) " +
          "SELECT ?, ?, 'active', ?, ?, ? WHERE NOT EXISTS (" +
          "SELECT 1 FROM keys WHERE discord_user_id = ? AND created_at > ? AND developer_id IS NULL)"
        ).bind(
          keyHash,
          discordUserId,
          now,
          expiresAt,
          universeIds.join(","),
          discordUserId,
          now - 86400
        ),
      ]);

      if (!results[1] || results[1].meta.changes !== 1) {
        return json(
          { error: "A free key was already issued in the last 24 hours" },
          429,
          origin
        );
      }

      return json({ key, expiresAt, durationHours: 24 }, 201, origin);
    }

    if (url.pathname === "/v1/keys/revoke") {
      if (!env.KEY_PEPPER) {
        return json({ error: "Server configuration error: KEY_PEPPER is required" }, 500, origin);
      }
      const key =
        typeof body.key === "string" ? body.key.trim().toUpperCase() : "";
      const discordUserId =
        typeof body.discordUserId === "string" ? body.discordUserId.trim() : "";

      if (!key && !discordUserId) {
        return json({ error: "Provide key or discordUserId" }, 400, origin);
      }

      const { hmac: keyHash, legacy: legacyHash } = key
        ? await credentialCandidateHashes(key, env.KEY_PEPPER)
        : { hmac: "", legacy: "" };

      const result = key
        ? await env.DB.prepare(
            "UPDATE keys SET status = 'revoked' WHERE (key_hash = ? OR key_hash = ?) AND status = 'active' AND developer_id IS NULL"
          ).bind(keyHash, legacyHash).run()
        : await env.DB.prepare(
            "UPDATE keys SET status = 'revoked' WHERE discord_user_id = ? AND status = 'active' AND developer_id IS NULL"
          ).bind(discordUserId).run();

      return json({ revoked: result.meta.changes > 0 }, 200, origin);
    }

    return json({ error: "Not found" }, 404, origin);
  },

  scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    const now = Math.floor(Date.now() / 1000);
    ctx.waitUntil(Promise.all([
      env.DB.prepare("DELETE FROM mobile_email_challenges WHERE expires_at <= ? OR consumed_at IS NOT NULL")
        .bind(now).run(),
      env.DB.prepare("DELETE FROM mobile_rate_limits WHERE window_start < ?")
        .bind(now - 86_400).run(),
      env.DB.prepare("DELETE FROM mobile_sessions WHERE expires_at <= ? OR (revoked_at IS NOT NULL AND revoked_at < ?)")
        .bind(now, now - 86_400).run(),
    ]).then(() => undefined));
  },
};
