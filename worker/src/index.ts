
import { handleV2, parseJsonBody } from "./v2";
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
      "access-control-allow-headers": "content-type, x-admin-token, x-developer-key, x-bot-token",
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
          "access-control-allow-headers": "content-type, x-admin-token, x-developer-key, x-bot-token",
          "access-control-max-age": "86400",
        },
      });
    }

    const url = new URL(request.url);

    // Handle the new multi-developer API.
    const v2Response = await handleV2(request, env);
    if (v2Response) return v2Response;

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
    if (parsedBody.error === "too_large") {
      return json({ error: "Request too large" }, 413, origin);
    }
    if (!parsedBody.data) {
      return json({ error: "Invalid JSON body" }, 400, origin);
    }
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

      if (
        key.length < 20 ||
        key.length > 100 ||
        !/^[0-9]+$/.test(universeId) ||
        !/^[0-9]{1,24}$/.test(robloxUserId)
      ) {
        return json({ valid: false, reason: "invalid_request" }, 400, origin);
      }

      const globalAllowlist = parseIds(env.ALLOWED_UNIVERSE_IDS ?? "");

      if (!globalAllowlist.length || !globalAllowlist.includes(universeId)) {
        return json({ valid: false, reason: "game_not_allowed" }, 403, origin);
      }

      const { hmac: keyHash, legacy: legacyHash } = await credentialCandidateHashes(
        key,
        env.KEY_PEPPER
      );

      const row = await env.DB.prepare(
        "SELECT status, expires_at, allowed_universe_ids, key_hash, last_roblox_user_id FROM keys WHERE (key_hash = ?1 OR key_hash = ?2) AND developer_id IS NULL"
      ).bind(keyHash, legacyHash).first<{
        status: string;
        expires_at: number;
        allowed_universe_ids: string | null;
        key_hash: string;
        last_roblox_user_id: string | null;
      }>();

      if (!row || row.status !== "active") {
        return json({ valid: false, reason: "invalid_or_revoked" }, 401, origin);
      }

      const now = Math.floor(Date.now() / 1000);

      if (row.expires_at <= now) {
        await env.DB.prepare(
          "UPDATE keys SET status = 'expired' WHERE key_hash = ?1"
        ).bind(row.key_hash).run();

        return json({ valid: false, reason: "expired" }, 401, origin);
      }

      const keyAllowlist = parseIds(row.allowed_universe_ids ?? "");

      if (keyAllowlist.length && !keyAllowlist.includes(universeId)) {
        return json({ valid: false, reason: "game_not_allowed" }, 403, origin);
      }

      // Atomically bind legacy V1 licenses to their first Roblox user too.
      // The developer_id IS NULL guard keeps this compatibility route scoped to V1 keys.
      const binding = await env.DB.prepare(
        "UPDATE keys SET last_used_at = ?1, last_roblox_user_id = ?2 " +
        "WHERE key_hash = ?3 AND developer_id IS ?4 AND status = 'active' " +
        "AND (last_roblox_user_id IS NULL OR last_roblox_user_id = ?5)"
      ).bind(now, robloxUserId, row.key_hash, null, robloxUserId).run();

      if (binding.meta.changes === 0) {
        return json({ valid: false, reason: "roblox_user_mismatch" }, 403, origin);
      }

      // Seamlessly upgrade legacy hash
      if (row.key_hash === legacyHash && keyHash !== legacyHash) {
        try {
          await env.DB.prepare(
            "UPDATE keys SET key_hash = ?1 WHERE key_hash = ?2"
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
          "UPDATE keys SET status = 'revoked' WHERE discord_user_id = ?1 AND status = 'active' AND created_at <= ?2 AND developer_id IS NULL"
        ).bind(discordUserId, now - 86400),

        env.DB.prepare(
          "INSERT INTO keys (key_hash, discord_user_id, status, created_at, expires_at, allowed_universe_ids) " +
          "SELECT ?1, ?2, 'active', ?3, ?4, ?5 WHERE NOT EXISTS (" +
          "SELECT 1 FROM keys WHERE discord_user_id = ?2 AND created_at > ?6 AND developer_id IS NULL)"
        ).bind(
          keyHash,
          discordUserId,
          now,
          expiresAt,
          universeIds.join(","),
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
            "UPDATE keys SET status = 'revoked' WHERE (key_hash = ?1 OR key_hash = ?2) AND status = 'active' AND developer_id IS NULL"
          ).bind(keyHash, legacyHash).run()
        : await env.DB.prepare(
            "UPDATE keys SET status = 'revoked' WHERE discord_user_id = ?1 AND status = 'active' AND developer_id IS NULL"
          ).bind(discordUserId).run();

      return json({ revoked: result.meta.changes > 0 }, 200, origin);
    }

    return json({ error: "Not found" }, 404, origin);
  },
};
