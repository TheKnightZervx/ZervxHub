
import { isRateLimited } from "./rate-limit";
import {
  hex,
  hashCredential,
  credentialCandidateHashes,
  timingSafeEqual,
  makeApiKey,
  makeGameServerKey,
  makeLicenseKey,
} from "./crypto";
import { PLAN_CATALOG, type BillingPeriod, type SubscriptionPlan } from "./subscriptions";

export interface V2Env {
  DB: D1Database;
  ADMIN_TOKEN: string;
  BOT_API_TOKEN?: string;
  KEY_PEPPER: string;
  CORS_ORIGIN?: string;
  DISCORD_OAUTH_CLIENT_ID?: string;
  DISCORD_OAUTH_CLIENT_SECRET?: string;
  DISCORD_OAUTH_REDIRECT_URI?: string;
}

export type Json = Record<string, unknown>;
type DeveloperSession = {
  developerId: string;
  displayName: string;
  discordUserId: string;
};

const SESSION_COOKIE = "zvh_session";
const OAUTH_STATE_COOKIE = "zvh_oauth_state";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const MAX_LICENSE_LIFETIME_HOURS = 24 * 365;
const MAX_VALIDATION_CLOCK_SKEW_SECONDS = 60;
const VALIDATION_REQUEST_TTL_SECONDS = 120;
const respond = (data: Json, status = 200, origin = "*") =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type, x-admin-token, x-developer-key, x-game-server-key, x-bot-token",
      ...(origin !== "*" && origin !== "null"
        ? { "access-control-allow-credentials": "true" }
        : {}),
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

export async function getGameServerKeyOwner(
  request: Request,
  env: V2Env,
  universeId: string
) {
  const supplied = request.headers.get("x-game-server-key") ?? "";
  if (!supplied || supplied.length > 200 || !env.KEY_PEPPER) return null;

  const keyHash = await hashCredential(supplied, env.KEY_PEPPER);
  const row = await env.DB.prepare(
    `SELECT k.developer_id AS developerId, d.status AS developerStatus
     FROM game_server_keys k
     JOIN games g ON g.universe_id = k.universe_id AND g.developer_id = k.developer_id
     JOIN developers d ON d.id = k.developer_id
     WHERE k.key_hash = ? AND k.universe_id = ? AND k.revoked_at IS NULL
       AND g.status = 'approved'`
  ).bind(keyHash, universeId).first<{ developerId: string; developerStatus: string }>();

  return row ?? null;
}

export async function consumeGameValidationRequest(
  env: V2Env,
  requestId: string,
  universeId: string,
  now: number
) {
  const results = await env.DB.batch([
    env.DB.prepare(
      "DELETE FROM game_validation_requests WHERE expires_at <= ?"
    ).bind(now),
    env.DB.prepare(
      `INSERT OR IGNORE INTO game_validation_requests (request_id, universe_id, expires_at)
       VALUES (?, ?, ?)`
    ).bind(requestId, universeId, now + VALIDATION_REQUEST_TTL_SECONDS),
  ]);
  return results[1]?.meta.changes === 1;
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

export async function parseJsonBody(request: Request): Promise<
  { data: Json; error?: never } | { data?: never; error: "too_large" | "invalid" }
> {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BODY_BYTES) return { error: "too_large" };
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
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { error: "invalid" };
    return { data: parsed as Json };
  } catch {
    await reader.cancel().catch(() => {});
    return { error: "invalid" };
  }
}

function getCookie(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  for (const part of cookies.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return "";
}

function isTrustedBrowserOrigin(request: Request, env: V2Env) {
  return Boolean(env.CORS_ORIGIN && request.headers.get("origin") === env.CORS_ORIGIN);
}

function configuredDiscordOAuth(env: V2Env) {
  if (
    !env.CORS_ORIGIN ||
    !env.DISCORD_OAUTH_CLIENT_ID ||
    !env.DISCORD_OAUTH_CLIENT_SECRET ||
    !env.DISCORD_OAUTH_REDIRECT_URI
  ) return false;
  try {
    const appOrigin = new URL(env.CORS_ORIGIN);
    const redirect = new URL(env.DISCORD_OAUTH_REDIRECT_URI);
    return appOrigin.origin === env.CORS_ORIGIN &&
      redirect.origin === appOrigin.origin &&
      redirect.pathname === "/v2/auth/discord/callback" &&
      !redirect.search &&
      !redirect.hash &&
      redirect.protocol === "https:";
  } catch {
    return false;
  }
}

function setCookie(name: string, value: string, maxAge: number, path = "/") {
  return `${name}=${value}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function authRedirect(env: V2Env, result: string, sessionToken?: string) {
  const headers = new Headers({
    location: `${env.CORS_ORIGIN}/dashboard.html?auth=${encodeURIComponent(result)}`,
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
  });
  headers.append("set-cookie", setCookie(OAUTH_STATE_COOKIE, "", 0, "/v2/auth/discord"));
  if (sessionToken) {
    headers.append("set-cookie", setCookie(SESSION_COOKIE, sessionToken, SESSION_TTL_SECONDS));
  }
  return new Response(null, { status: 303, headers });
}

async function getDeveloperSession(request: Request, env: V2Env): Promise<DeveloperSession | null> {
  const token = getCookie(request, SESSION_COOKIE);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const sessionHash = await hashCredential(token, env.KEY_PEPPER);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    `SELECT s.session_hash, s.last_seen_at, d.id AS developer_id,
       d.display_name, d.discord_user_id
     FROM developer_sessions s
     JOIN developers d ON d.id = s.developer_id
     WHERE s.session_hash = ? AND s.revoked_at IS NULL
       AND s.expires_at > ? AND d.status = 'active'`
  ).bind(sessionHash, now).first<{
    session_hash: string;
    last_seen_at: number;
    developer_id: string;
    display_name: string;
    discord_user_id: string;
  }>();
  if (!row) return null;
  if (now - row.last_seen_at >= 300) {
    await env.DB.prepare(
      "UPDATE developer_sessions SET last_seen_at = ? WHERE session_hash = ? AND revoked_at IS NULL"
    ).bind(now, sessionHash).run();
  }
  return {
    developerId: row.developer_id,
    displayName: row.display_name,
    discordUserId: row.discord_user_id,
  };
}

async function handleDiscordOAuthStart(request: Request, env: V2Env) {
  const origin = getOrigin(request, env);
  if (!configuredDiscordOAuth(env)) {
    return respond({ error: "Discord sign-in is not configured for this deployment" }, 503, origin);
  }
  if (isRateLimited(request, "discord-oauth-start", 10)) {
    return respond({ error: "Too many sign-in attempts" }, 429, origin);
  }

  const state = hex(crypto.getRandomValues(new Uint8Array(32)));
  const authorize = new URL("https://discord.com/oauth2/authorize");
  authorize.searchParams.set("client_id", env.DISCORD_OAUTH_CLIENT_ID!);
  authorize.searchParams.set("redirect_uri", env.DISCORD_OAUTH_REDIRECT_URI!);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "identify");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "set-cookie": setCookie(OAUTH_STATE_COOKIE, state, 600, "/v2/auth/discord"),
    },
  });
}

async function handleDiscordOAuthCallback(request: Request, env: V2Env) {
  if (!configuredDiscordOAuth(env)) {
    return respond(
      { error: "Discord sign-in is not configured for this deployment" },
      503,
      getOrigin(request, env)
    );
  }
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const stateCookie = getCookie(request, OAUTH_STATE_COOKIE);
  if (
    !/^[a-f0-9]{64}$/.test(state) ||
    !timingSafeEqual(state, stateCookie) ||
    isRateLimited(request, "discord-oauth-callback", 20)
  ) {
    return respond({ error: "Sign-in could not be completed. Start again." }, 400, getOrigin(request, env));
  }
  if (url.searchParams.has("error")) return authRedirect(env, "cancelled");

  const code = url.searchParams.get("code") ?? "";
  if (!code || code.length > 2048) return authRedirect(env, "failed");
  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.DISCORD_OAUTH_CLIENT_ID!,
        client_secret: env.DISCORD_OAUTH_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: env.DISCORD_OAUTH_REDIRECT_URI!,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) return authRedirect(env, "failed");
    const tokenData: unknown = await tokenResponse.json();
    if (
      tokenData === null ||
      typeof tokenData !== "object" ||
      !("access_token" in tokenData) ||
      typeof tokenData.access_token !== "string"
    ) return authRedirect(env, "failed");

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { authorization: `Bearer ${tokenData.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!userResponse.ok) return authRedirect(env, "failed");
    const userData: unknown = await userResponse.json();
    if (
      userData === null ||
      typeof userData !== "object" ||
      !("id" in userData) ||
      typeof userData.id !== "string" ||
      !validDiscordId(userData.id) ||
      !("username" in userData) ||
      typeof userData.username !== "string"
    ) return authRedirect(env, "failed");

    const discordUserId = userData.id;
    const displayName = (
      "global_name" in userData && typeof userData.global_name === "string"
        ? userData.global_name
        : userData.username
    ).trim().slice(0, 80) || "Discord developer";
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      `INSERT INTO developers (id, discord_user_id, display_name, status, created_at)
       VALUES (?, ?, ?, 'active', ?)
       ON CONFLICT(discord_user_id) DO NOTHING`
    ).bind(crypto.randomUUID(), discordUserId, displayName, now).run();
    const developer = await env.DB.prepare(
      "SELECT id, status FROM developers WHERE discord_user_id = ?"
    ).bind(discordUserId).first<{ id: string; status: string }>();
    if (!developer || developer.status !== "active") return authRedirect(env, "unavailable");

    await env.DB.prepare(
      `INSERT INTO developer_subscriptions
         (developer_id, plan, status, billing_period, created_at, updated_at)
       VALUES (?, 'free', 'active', 'none', ?, ?)
       ON CONFLICT(developer_id) DO NOTHING`
    ).bind(developer.id, now, now).run();

    const sessionToken = hex(crypto.getRandomValues(new Uint8Array(32)));
    const sessionHash = await hashCredential(sessionToken, env.KEY_PEPPER);
    await env.DB.prepare(
      `INSERT INTO developer_sessions
         (session_hash, developer_id, created_at, expires_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(sessionHash, developer.id, now, now + SESSION_TTL_SECONDS, now).run();
    return authRedirect(env, "success", sessionToken);
  } catch {
    return authRedirect(env, "failed");
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

  if (request.method === "GET" && url.pathname === "/v2/auth/status") {
    return respond({
      discordSignInAvailable: configuredDiscordOAuth(env),
      dashboardAvailable: true,
    }, 200, origin);
  }

  if (request.method === "GET" && url.pathname === "/v2/auth/discord/start") {
    return handleDiscordOAuthStart(request, env);
  }

  if (request.method === "GET" && url.pathname === "/v2/auth/discord/callback") {
    return handleDiscordOAuthCallback(request, env);
  }

  if (request.method === "GET" && url.pathname === "/v2/auth/session") {
    const session = await getDeveloperSession(request, env);
    if (!session) return respond({ error: "Authentication required" }, 401, origin);
    return respond({ developer: session }, 200, origin);
  }

  if (request.method === "POST" && url.pathname === "/v2/auth/logout") {
    if (!isTrustedBrowserOrigin(request, env)) {
      return respond({ error: "Untrusted browser origin" }, 403, origin);
    }
    const token = getCookie(request, SESSION_COOKIE);
    if (/^[a-f0-9]{64}$/.test(token)) {
      const sessionHash = await hashCredential(token, env.KEY_PEPPER);
      await env.DB.prepare(
        "UPDATE developer_sessions SET revoked_at = ? WHERE session_hash = ? AND revoked_at IS NULL"
      ).bind(Math.floor(Date.now() / 1000), sessionHash).run();
    }
    const response = respond({ loggedOut: true }, 200, origin);
    response.headers.append("set-cookie", setCookie(SESSION_COOKIE, "", 0));
    return response;
  }

  if (request.method === "GET" && url.pathname.startsWith("/v2/dashboard/")) {
    const session = await getDeveloperSession(request, env);
    if (!session) return respond({ error: "Authentication required" }, 401, origin);
    const developerId = session.developerId;

    if (url.pathname === "/v2/dashboard/overview") {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const [games, licenses, validations, subscription, activity] = await Promise.all([
        env.DB.prepare(
          `SELECT COUNT(*) AS total,
             SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
             SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
           FROM games WHERE developer_id = ?`
        ).bind(developerId).first<{ total: number; approved: number; pending: number }>(),
        env.DB.prepare(
          `SELECT COUNT(*) AS total,
             SUM(CASE WHEN status = 'active' AND expires_at > ? THEN 1 ELSE 0 END) AS active
           FROM keys WHERE developer_id = ?`
        ).bind(Math.floor(Date.now() / 1000), developerId).first<{ total: number; active: number }>(),
        env.DB.prepare(
          `SELECT COALESCE(SUM(validation_count), 0) AS total
           FROM license_validation_daily
           WHERE developer_id = ? AND usage_date >= ?`
        ).bind(developerId, since).first<{ total: number }>(),
        env.DB.prepare(
          `SELECT plan, status, billing_period AS billingPeriod,
             current_period_end AS currentPeriodEnd, cancel_at_period_end AS cancelAtPeriodEnd
           FROM developer_subscriptions WHERE developer_id = ?`
        ).bind(developerId).first<{
          plan: string;
          status: string;
          billingPeriod: string;
          currentPeriodEnd: number | null;
          cancelAtPeriodEnd: number;
        }>(),
        env.DB.prepare(
          `SELECT event_type AS type, occurred_at AS occurredAt, universe_id AS subject
           FROM license_events WHERE developer_id = ?
           UNION ALL
           SELECT 'game_registered' AS type, created_at AS occurredAt, name AS subject
           FROM games WHERE developer_id = ?
           UNION ALL
           SELECT 'api_key_created' AS type, created_at AS occurredAt, 'Developer API key' AS subject
           FROM developer_api_keys WHERE developer_id = ?
           UNION ALL
           SELECT 'subscription_request' AS type, requested_at AS occurredAt,
             requested_plan AS subject
           FROM subscription_change_requests WHERE developer_id = ?
           ORDER BY occurredAt DESC LIMIT 10`
        ).bind(developerId, developerId, developerId, developerId).all<{
          type: string;
          occurredAt: number;
          subject: string | null;
        }>(),
      ]);
      return respond({
        developer: session,
        subscription: subscription ?? {
          plan: "free",
          status: "active",
          billingPeriod: "none",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: 0,
        },
        usage: {
          games: games?.total ?? 0,
          approvedGames: games?.approved ?? 0,
          pendingGames: games?.pending ?? 0,
          licenses: licenses?.total ?? 0,
          activeLicenses: licenses?.active ?? 0,
          validationsLast30Days: validations?.total ?? 0,
        },
        recentActivity: activity.results,
      }, 200, origin);
    }

    if (url.pathname === "/v2/dashboard/games") {
      const games = await env.DB.prepare(
        `SELECT g.id, g.universe_id AS universeId, g.name, g.status,
           g.created_at AS createdAt, g.verified_at AS verifiedAt,
           CASE WHEN k.key_hash IS NULL THEN 0 ELSE 1 END AS serverKeyConfigured
         FROM games g
         LEFT JOIN game_server_keys k
           ON k.universe_id = g.universe_id AND k.revoked_at IS NULL
         WHERE g.developer_id = ? ORDER BY g.created_at DESC LIMIT 100`
      ).bind(developerId).all<{
        id: string;
        universeId: string;
        name: string;
        status: string;
        createdAt: number;
        verifiedAt: number | null;
        serverKeyConfigured: number;
      }>();
      return respond({ games: games.results }, 200, origin);
    }

    if (url.pathname === "/v2/dashboard/licenses") {
      const requestedLimit = Number(url.searchParams.get("limit") ?? "50");
      const limit = Number.isInteger(requestedLimit)
        ? Math.min(100, Math.max(1, requestedLimit))
        : 50;
      const licenses = await env.DB.prepare(
        `SELECT public_id AS id, discord_user_id AS discordUserId,
           CASE WHEN status = 'active' AND expires_at <= ? THEN 'expired' ELSE status END AS status,
           created_at AS createdAt, expires_at AS expiresAt,
           last_used_at AS lastUsedAt, validation_count AS validationCount,
           bound_roblox_user_id AS boundRobloxUserId,
           allowed_universe_ids AS universeIds
         FROM keys WHERE developer_id = ?
         ORDER BY created_at DESC LIMIT ?`
      ).bind(Math.floor(Date.now() / 1000), developerId, limit).all<{
        id: string;
        discordUserId: string;
        status: string;
        createdAt: number;
        expiresAt: number;
        lastUsedAt: number | null;
        validationCount: number;
        boundRobloxUserId: string | null;
        universeIds: string;
      }>();
      return respond({ licenses: licenses.results }, 200, origin);
    }

    const historyMatch = url.pathname.match(/^\/v2\/dashboard\/licenses\/([a-f0-9-]{32,36})\/history$/i);
    if (historyMatch) {
      const ownedLicense = await env.DB.prepare(
        "SELECT public_id FROM keys WHERE developer_id = ? AND public_id = ?"
      ).bind(developerId, historyMatch[1]).first<{ public_id: string }>();
      if (!ownedLicense) return respond({ error: "License not found" }, 404, origin);
      const [history, events] = await Promise.all([
        env.DB.prepare(
          `SELECT usage_date AS date, universe_id AS universeId,
             validation_count AS validationCount, last_validated_at AS lastValidatedAt
           FROM license_validation_daily
           WHERE developer_id = ? AND license_id = ?
           ORDER BY usage_date DESC LIMIT 90`
        ).bind(developerId, historyMatch[1]).all<{
          date: string;
          universeId: string;
          validationCount: number;
          lastValidatedAt: number;
        }>(),
        env.DB.prepare(
          `SELECT event_type AS type, occurred_at AS occurredAt, universe_id AS universeId
           FROM license_events
           WHERE developer_id = ? AND license_id = ?
           ORDER BY occurred_at DESC LIMIT 50`
        ).bind(developerId, historyMatch[1]).all<{
          type: string;
          occurredAt: number;
          universeId: string | null;
        }>(),
      ]);
      return respond({ history: history.results, events: events.results }, 200, origin);
    }

    if (url.pathname === "/v2/dashboard/api-keys") {
      const apiKeys = await env.DB.prepare(
        `SELECT public_id AS id, created_at AS createdAt, revoked_at AS revokedAt
         FROM developer_api_keys WHERE developer_id = ?
         ORDER BY created_at DESC LIMIT 25`
      ).bind(developerId).all<{
        id: string;
        createdAt: number;
        revokedAt: number | null;
      }>();
      return respond({ apiKeys: apiKeys.results }, 200, origin);
    }

    if (url.pathname === "/v2/dashboard/subscription") {
      const [subscription, pendingRequest] = await Promise.all([
        env.DB.prepare(
          `SELECT plan, status, billing_period AS billingPeriod,
             current_period_start AS currentPeriodStart,
             current_period_end AS currentPeriodEnd,
             cancel_at_period_end AS cancelAtPeriodEnd
           FROM developer_subscriptions WHERE developer_id = ?`
        ).bind(developerId).first(),
        env.DB.prepare(
          `SELECT id, requested_plan AS requestedPlan,
             billing_period AS billingPeriod, requested_at AS requestedAt
           FROM subscription_change_requests
           WHERE developer_id = ? AND status = 'pending'
           ORDER BY requested_at DESC LIMIT 1`
        ).bind(developerId).first(),
      ]);
      return respond({
        subscription: subscription ?? {
          plan: "free",
          status: "active",
          billingPeriod: "none",
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: 0,
        },
        pendingRequest: pendingRequest ?? null,
        plans: PLAN_CATALOG,
        paymentsEnabled: false,
      }, 200, origin);
    }

    return respond({ error: "Not found" }, 404, origin);
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
  if (parsedBody.error === "too_large") return respond({ error: "Request too large" }, 413, origin);
  if (!parsedBody.data) return respond({ error: "Invalid JSON body" }, 400, origin);
  const data = parsedBody.data;

  if (url.pathname.startsWith("/v2/dashboard/")) {
    if (!isTrustedBrowserOrigin(request, env)) {
      return respond({ error: "Untrusted browser origin" }, 403, origin);
    }
    const session = await getDeveloperSession(request, env);
    if (!session) return respond({ error: "Authentication required" }, 401, origin);
    const developerId = session.developerId;

    if (url.pathname === "/v2/dashboard/games") {
      if (isRateLimited(request, "dashboard-game-register", 15, 60_000, developerId)) {
        return respond({ error: "Too many requests" }, 429, origin);
      }
      const universeId = typeof data.universeId === "string" ? data.universeId.trim() : "";
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
        ).bind(crypto.randomUUID(), developerId, universeId, name, Math.floor(Date.now() / 1000)).run();
      } catch {
        return respond({ error: "This Universe ID may already be registered." }, 409, origin);
      }
      return respond({
        registered: true,
        status: "pending",
        message: "Your game must be approved before it can validate keys.",
      }, 201, origin);
    }

    const gameServerKeyMatch = url.pathname.match(
      /^\/v2\/dashboard\/games\/([0-9]{1,22})\/server-key\/(rotate|revoke)$/
    );
    if (gameServerKeyMatch) {
      if (isRateLimited(request, "dashboard-game-server-key", 5, 60_000, developerId)) {
        return respond({ error: "Too many requests" }, 429, origin);
      }
      const [, universeId, action] = gameServerKeyMatch;
      const game = await env.DB.prepare(
        "SELECT id FROM games WHERE developer_id = ? AND universe_id = ? AND status = 'approved'"
      ).bind(developerId, universeId).first<{ id: string }>();
      if (!game) return respond({ error: "Approved game not found" }, 404, origin);

      const now = Math.floor(Date.now() / 1000);
      if (action === "revoke") {
        const result = await env.DB.prepare(
          `UPDATE game_server_keys SET revoked_at = ?
           WHERE developer_id = ? AND universe_id = ? AND revoked_at IS NULL`
        ).bind(now, developerId, universeId).run();
        return respond({ revoked: result.meta.changes > 0 }, 200, origin);
      }

      const serverKey = makeGameServerKey();
      const keyHash = await hashCredential(serverKey, env.KEY_PEPPER);
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE game_server_keys SET revoked_at = ?
           WHERE developer_id = ? AND universe_id = ? AND revoked_at IS NULL`
        ).bind(now, developerId, universeId),
        env.DB.prepare(
          `INSERT INTO game_server_keys (key_hash, universe_id, developer_id, created_at)
           VALUES (?, ?, ?, ?)`
        ).bind(keyHash, universeId, developerId, now),
      ]);
      return respond({
        rotated: true,
        serverKey,
        warning: "Save this game server key in server-only storage. It cannot be displayed again.",
      }, 201, origin);
    }

    if (url.pathname === "/v2/dashboard/licenses") {
      if (isRateLimited(request, "dashboard-license-create", 20, 60_000, developerId)) {
        return respond({ error: "Too many requests" }, 429, origin);
      }
      const discordUserId = typeof data.discordUserId === "string" ? data.discordUserId.trim() : "";
      const universeId = typeof data.universeId === "string" ? data.universeId.trim() : "";
      const expiresInHours = data.expiresInHours;
      if (!validDiscordId(discordUserId) || !validUniverseId(universeId)) {
        return respond({ error: "Provide a valid Discord user and Universe ID" }, 400, origin);
      }
      if (
        typeof expiresInHours !== "number" ||
        !Number.isInteger(expiresInHours) ||
        expiresInHours < 1 ||
        expiresInHours > MAX_LICENSE_LIFETIME_HOURS
      ) {
        return respond({
          error: `Expiration must be an integer from 1 to ${MAX_LICENSE_LIFETIME_HOURS} hours`,
        }, 400, origin);
      }
      const game = await env.DB.prepare(
        "SELECT id FROM games WHERE developer_id = ? AND universe_id = ? AND status = 'approved'"
      ).bind(developerId, universeId).first<{ id: string }>();
      if (!game) return respond({ error: "Game is not approved for this account" }, 403, origin);

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + expiresInHours * 3600;
      const licenseKey = makeLicenseKey();
      const licenseHash = await hashCredential(licenseKey, env.KEY_PEPPER);
      const licenseId = crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO keys
             (key_hash, discord_user_id, status, created_at, expires_at,
              allowed_universe_ids, developer_id, public_id)
           VALUES (?, ?, 'active', ?, ?, ?, ?, ?)`
        ).bind(licenseHash, discordUserId, now, expiresAt, universeId, developerId, licenseId),
        env.DB.prepare(
          `INSERT INTO license_events
             (id, developer_id, license_id, event_type, occurred_at, universe_id)
           VALUES (?, ?, ?, 'issued', ?, ?)`
        ).bind(crypto.randomUUID(), developerId, licenseId, now, universeId),
      ]);
      return respond({
        created: true,
        licenseId,
        key: licenseKey,
        expiresAt,
        warning: "Save this license key now. It cannot be displayed again.",
      }, 201, origin);
    }

    const revokeMatch = url.pathname.match(/^\/v2\/dashboard\/licenses\/([a-f0-9-]{32,36})\/revoke$/i);
    if (revokeMatch) {
      const now = Math.floor(Date.now() / 1000);
      const result = await env.DB.prepare(
        `UPDATE keys SET status = 'revoked', revoked_at = ?
         WHERE public_id = ? AND developer_id = ? AND status = 'active'`
      ).bind(now, revokeMatch[1], developerId).run();
      if (result.meta.changes > 0) {
        const license = await env.DB.prepare(
          "SELECT allowed_universe_ids FROM keys WHERE public_id = ? AND developer_id = ?"
        ).bind(revokeMatch[1], developerId).first<{ allowed_universe_ids: string }>();
        await env.DB.prepare(
          `INSERT INTO license_events
             (id, developer_id, license_id, event_type, occurred_at, universe_id)
           VALUES (?, ?, ?, 'revoked', ?, ?)`
        ).bind(
          crypto.randomUUID(),
          developerId,
          revokeMatch[1],
          now,
          license?.allowed_universe_ids ?? null
        ).run();
      }
      return respond({ revoked: result.meta.changes > 0 }, 200, origin);
    }

    if (url.pathname === "/v2/dashboard/api-keys/rotate") {
      if (isRateLimited(request, "dashboard-api-key-rotate", 5, 60_000, developerId)) {
        return respond({ error: "Too many requests" }, 429, origin);
      }
      const apiKey = makeApiKey();
      const keyHash = await hashCredential(apiKey, env.KEY_PEPPER);
      const keyId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE developer_api_keys SET revoked_at = ? WHERE developer_id = ? AND revoked_at IS NULL"
        ).bind(now, developerId),
        env.DB.prepare(
          `INSERT INTO developer_api_keys (key_hash, developer_id, created_at, public_id)
           VALUES (?, ?, ?, ?)`
        ).bind(keyHash, developerId, now, keyId),
      ]);
      return respond({
        rotated: true,
        apiKey,
        keyId,
        warning: "Save this API key now. It cannot be displayed again.",
      }, 201, origin);
    }

    if (url.pathname === "/v2/dashboard/subscription/change") {
      if (isRateLimited(request, "dashboard-subscription-change", 5, 60_000, developerId)) {
        return respond({ error: "Too many requests" }, 429, origin);
      }
      const requestedPlan = PLAN_CATALOG.find(plan => plan.id === data.plan);
      if (!requestedPlan) return respond({ error: "Unknown subscription plan" }, 400, origin);
      const billingPeriod = requestedPlan.billingPeriods.find(period => period === data.billingPeriod);
      if (!billingPeriod) return respond({ error: "Invalid billing period for this plan" }, 400, origin);
      const current = await env.DB.prepare(
        "SELECT plan FROM developer_subscriptions WHERE developer_id = ?"
      ).bind(developerId).first<{ plan: SubscriptionPlan }>();
      const currentPlan = current?.plan ?? "free";
      if (requestedPlan.id === currentPlan) {
        return respond({ error: "This plan is already active" }, 409, origin);
      }
      const now = Math.floor(Date.now() / 1000);
      const requestId = crypto.randomUUID();
      try {
        await env.DB.prepare(
          `INSERT INTO subscription_change_requests
             (id, developer_id, from_plan, requested_plan, billing_period, status, requested_at)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`
        ).bind(requestId, developerId, currentPlan, requestedPlan.id, billingPeriod, now).run();
      } catch {
        return respond({ error: "A subscription change request is already pending" }, 409, origin);
      }
      return respond({
        requestId,
        status: "pending",
        planChanged: false,
        paymentsEnabled: false,
        message: "Your request is recorded. No payment was taken and your plan remains unchanged.",
      }, 202, origin);
    }

    if (url.pathname === "/v2/dashboard/subscription/cancel") {
      if (isRateLimited(request, "dashboard-subscription-cancel", 5, 60_000, developerId)) {
        return respond({ error: "Too many requests" }, 429, origin);
      }
      const current = await env.DB.prepare(
        "SELECT plan, status FROM developer_subscriptions WHERE developer_id = ?"
      ).bind(developerId).first<{ plan: SubscriptionPlan; status: string }>();
      if (!current || current.plan === "free" || current.status !== "active") {
        return respond({ error: "There is no active paid subscription to cancel" }, 409, origin);
      }
      const requestId = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);
      try {
        await env.DB.prepare(
          `INSERT INTO subscription_change_requests
             (id, developer_id, from_plan, requested_plan, billing_period, status, requested_at)
           VALUES (?, ?, ?, 'free', 'none', 'pending', ?)`
        ).bind(requestId, developerId, current.plan, now).run();
      } catch {
        return respond({ error: "A subscription change request is already pending" }, 409, origin);
      }
      return respond({
        requestId,
        status: "pending",
        planChanged: false,
        paymentsEnabled: false,
        message: "Cancellation request recorded. The current plan remains unchanged until a verified provider workflow is configured.",
      }, 202, origin);
    }

    if (url.pathname === "/v2/dashboard/subscription/change/cancel") {
      if (isRateLimited(request, "dashboard-subscription-request-cancel", 10, 60_000, developerId)) {
        return respond({ error: "Too many requests" }, 429, origin);
      }
      const requestId = typeof data.requestId === "string" ? data.requestId.trim() : "";
      if (!/^[a-f0-9-]{36}$/i.test(requestId)) {
        return respond({ error: "Invalid subscription request ID" }, 400, origin);
      }
      const result = await env.DB.prepare(
        `UPDATE subscription_change_requests
         SET status = 'canceled', resolved_at = ?
         WHERE id = ? AND developer_id = ? AND status = 'pending'`
      ).bind(Math.floor(Date.now() / 1000), requestId, developerId).run();
      return respond({ canceled: result.meta.changes > 0 }, 200, origin);
    }

    return respond({ error: "Not found" }, 404, origin);
  }

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
    const keyId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    try {
      await env.DB.batch([
        env.DB.prepare(
          `INSERT INTO developers (id, discord_user_id, display_name, status, created_at)
           VALUES (?, ?, ?, 'active', ?)`
        ).bind(developerId, discordUserId, displayName, now),

        env.DB.prepare(
          `INSERT INTO developer_api_keys (key_hash, developer_id, created_at, public_id)
           VALUES (?, ?, ?, ?)`
        ).bind(keyHash, developerId, now, keyId),
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

    const developerId = typeof data.developerId === "string" ? data.developerId.trim() : "";
    if (!developerId) {
      return respond({ error: "Provide a developer ID" }, 400, origin);
    }

    const developer = await env.DB.prepare(
      "SELECT id, status FROM developers WHERE id = ?"
    ).bind(developerId).first<{ id: string; status: string }>();
    if (!developer) return respond({ error: "Developer not found" }, 404, origin);

    const apiKey = makeApiKey();
    const keyHash = await hashCredential(apiKey, env.KEY_PEPPER);
    const keyId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE developer_api_keys SET revoked_at = ? WHERE developer_id = ? AND revoked_at IS NULL"
      ).bind(now, developerId),
      env.DB.prepare(
        "INSERT INTO developer_api_keys (key_hash, developer_id, created_at, public_id) VALUES (?, ?, ?, ?)"
      ).bind(keyHash, developerId, now, keyId),
    ]);

    return respond({
      rotated: true,
      developerId,
      apiKey,
      warning: "Save this API key now. It cannot be displayed again."
    }, 200, origin);
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

  // Roblox server scripts authenticate with a per-game credential; clients
  // cannot validate by supplying an arbitrary Roblox user ID directly.
  if (url.pathname === "/v2/keys/validate") {
    const key = typeof data.key === "string" ? data.key.trim().toUpperCase() : "";
    const universeId =
      typeof data.universeId === "string" ? data.universeId.trim() : "";
    const robloxUserId =
      typeof data.robloxUserId === "string" ? data.robloxUserId.trim() : "";
    const requestId = typeof data.requestId === "string" ? data.requestId.trim().toLowerCase() : "";
    const requestTimestamp = data.timestamp;
    const now = Math.floor(Date.now() / 1000);
    if (isRateLimited(request, "license-validation-ip", 600)) {
      return respond({ valid: false, reason: "rate_limited" }, 429, origin);
    }

    if (
      key.length < 20 ||
      key.length > 100 ||
      !validUniverseId(universeId) ||
      !/^\d{1,24}$/.test(robloxUserId) ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId) ||
      typeof requestTimestamp !== "number" ||
      !Number.isInteger(requestTimestamp) ||
      Math.abs(now - requestTimestamp) > MAX_VALIDATION_CLOCK_SKEW_SECONDS
    ) {
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
    const serverDeveloper = await getGameServerKeyOwner(request, env, universeId);
    if (!serverDeveloper || serverDeveloper.developerId !== game.developer_id) {
      if (isRateLimited(request, "license-validation-auth-failure", 30)) {
        return respond({ valid: false, reason: "rate_limited" }, 429, origin);
      }
      return respond({ valid: false, reason: "server_credential_invalid" }, 401, origin);
    }
    if (serverDeveloper.developerStatus !== "active" || game.developer_status !== "active") {
      return respond({ valid: false, reason: "developer_suspended" }, 403, origin);
    }
    if (!await consumeGameValidationRequest(env, requestId, universeId, now)) {
      return respond({ valid: false, reason: "request_replayed" }, 409, origin);
    }
    const playerKey = /^\d{1,24}$/.test(robloxUserId) ? robloxUserId : "invalid";
    if (isRateLimited(
      request,
      "license-validation",
      60,
      60_000,
      `${serverDeveloper.developerId}:${universeId}:${playerKey}`
    )) {
      return respond({ valid: false, reason: "rate_limited" }, 429, origin);
    }
    const { hmac: keyHash, legacy: legacyHash } = await credentialCandidateHashes(
      key,
      env.KEY_PEPPER
    );
    const row = await env.DB.prepare(
      `SELECT status, expires_at, allowed_universe_ids, developer_id, key_hash, public_id,
         bound_roblox_user_id
       FROM keys WHERE key_hash = ? OR key_hash = ?`
    ).bind(keyHash, legacyHash).first<{
      status: string;
      expires_at: number;
      allowed_universe_ids: string | null;
      developer_id: string | null;
      key_hash: string;
      public_id: string;
      bound_roblox_user_id: string | null;
    }>();

    if (!row || row.developer_id !== game.developer_id || row.status === "revoked") {
      return respond({ valid: false, reason: "invalid_or_revoked" }, 401, origin);
    }

    if (row.status === "expired" || row.expires_at <= now) {
      if (row.status === "active") {
        await env.DB.batch([
          env.DB.prepare(
            `UPDATE keys SET status = 'expired'
             WHERE key_hash = ? AND developer_id = ? AND status = 'active'`
          ).bind(row.key_hash, game.developer_id),
          env.DB.prepare(
            `INSERT OR IGNORE INTO license_events
               (id, developer_id, license_id, event_type, occurred_at, universe_id)
             SELECT ?, ?, public_id, 'expired', ?, ?
             FROM keys WHERE public_id = ? AND developer_id = ? AND status = 'expired'`
          ).bind(
            crypto.randomUUID(),
            game.developer_id,
            now,
            universeId,
            row.public_id
          ),
        ]);
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

    if (row.bound_roblox_user_id && row.bound_roblox_user_id !== robloxUserId) {
      return respond({ valid: false, reason: "license_bound_to_another_user" }, 403, origin);
    }

    const usageDate = new Date(now * 1000).toISOString().slice(0, 10);
    const results = await env.DB.batch([
      env.DB.prepare(
        `UPDATE keys SET last_used_at = ?, last_roblox_user_id = ?,
           bound_roblox_user_id = COALESCE(bound_roblox_user_id, ?),
           validation_count = validation_count + 1
       WHERE key_hash = ? AND developer_id = ? AND status = 'active'
         AND expires_at > ?
         AND (bound_roblox_user_id IS NULL OR bound_roblox_user_id = ?)`
      ).bind(
        now,
        robloxUserId,
        robloxUserId,
        row.key_hash,
        game.developer_id,
        now,
        robloxUserId
      ),
      env.DB.prepare(
        `INSERT INTO license_validation_daily
           (license_id, developer_id, usage_date, universe_id, validation_count, last_validated_at)
         SELECT ?, ?, ?, ?, 1, ?
         WHERE EXISTS (
           SELECT 1 FROM keys WHERE key_hash = ? AND developer_id = ?
             AND status = 'active' AND expires_at > ?
             AND bound_roblox_user_id = ?
         )
         ON CONFLICT(license_id, usage_date) DO UPDATE SET
           validation_count = validation_count + 1,
           last_validated_at = excluded.last_validated_at,
           universe_id = excluded.universe_id`
      ).bind(
        row.public_id,
        game.developer_id,
        usageDate,
        universeId,
        now,
        row.key_hash,
        game.developer_id,
        now,
        robloxUserId
      ),
    ]);

    if (results[0]?.meta.changes !== 1) {
      const latest = await env.DB.prepare(
        `SELECT status, expires_at, bound_roblox_user_id
         FROM keys WHERE key_hash = ? AND developer_id = ?`
      ).bind(row.key_hash, game.developer_id).first<{
        status: string;
        expires_at: number;
        bound_roblox_user_id: string | null;
      }>();
      if (latest?.bound_roblox_user_id && latest.bound_roblox_user_id !== robloxUserId) {
        return respond({ valid: false, reason: "license_bound_to_another_user" }, 403, origin);
      }
      if (!latest || latest.status !== "active") {
        return respond({ valid: false, reason: "invalid_or_revoked" }, 401, origin);
      }
      if (latest.expires_at <= now) {
        return respond({ valid: false, reason: "expired" }, 401, origin);
      }
      return respond({ valid: false, reason: "invalid_or_revoked" }, 401, origin);
    }

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
        isRateLimited(
          request,
          "discord-issue-user",
          5,
          60_000,
          validDiscordId(discordUserId) ? discordUserId : "invalid"
        )
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
      const licenseId = crypto.randomUUID();
      const expiresAt = now + 86400;
      const results = await env.DB.batch([
        env.DB.prepare(
          `UPDATE keys SET status = 'revoked', revoked_at = ?
           WHERE developer_id = ? AND discord_user_id = ?
             AND status = 'active' AND created_at <= ?`
        ).bind(now, developerId, discordUserId, now - 86400),
        env.DB.prepare(
          `INSERT OR IGNORE INTO license_events
             (id, developer_id, license_id, event_type, occurred_at, universe_id)
           SELECT lower(hex(randomblob(16))), developer_id, public_id, 'revoked',
             revoked_at, NULL
           FROM keys
           WHERE developer_id = ? AND discord_user_id = ?
             AND status = 'revoked' AND revoked_at = ?
             AND created_at <= ?`
        ).bind(developerId, discordUserId, now, now - 86400),
        env.DB.prepare(
          `INSERT INTO keys (key_hash, discord_user_id, status, created_at, expires_at,
             allowed_universe_ids, developer_id, public_id)
           SELECT ?, ?, 'active', ?, ?, ?, ?, ? WHERE NOT EXISTS (
             SELECT 1 FROM keys WHERE developer_id = ? AND discord_user_id = ? AND created_at > ?
           )`
        ).bind(keyHash, discordUserId, now, expiresAt, universeId, developerId, licenseId,
          developerId, discordUserId, now - 86400),
        env.DB.prepare(
          `INSERT INTO license_events
             (id, developer_id, license_id, event_type, occurred_at, universe_id)
           SELECT ?, ?, ?, 'issued', ?, ? WHERE EXISTS (
             SELECT 1 FROM keys WHERE public_id = ? AND developer_id = ?
           )`
        ).bind(crypto.randomUUID(), developerId, licenseId, now, universeId, licenseId, developerId),
      ]);
      if (!results[2] || results[2].meta.changes !== 1) {
        return respond({ error: "This member already received a key in the last 24 hours" }, 429, origin);
      }
      return respond({ key, expiresAt, durationHours: 24 }, 201, origin);
    }

    if (url.pathname === "/v2/discord/keys/revoke") {
      const discordUserId = typeof data.discordUserId === "string" ? data.discordUserId.trim() : "";
      if (!validDiscordId(discordUserId)) return respond({ error: "Invalid Discord user ID" }, 400, origin);
      const now = Math.floor(Date.now() / 1000);
      const results = await env.DB.batch([
        env.DB.prepare(
          `UPDATE keys SET status = 'revoked', revoked_at = ?
           WHERE developer_id = ? AND discord_user_id = ? AND status = 'active'`
        ).bind(now, developerId, discordUserId),
        env.DB.prepare(
          `INSERT OR IGNORE INTO license_events
             (id, developer_id, license_id, event_type, occurred_at, universe_id)
           SELECT lower(hex(randomblob(16))), developer_id, public_id, 'revoked',
             revoked_at, NULL
           FROM keys
           WHERE developer_id = ? AND discord_user_id = ?
             AND status = 'revoked' AND revoked_at = ?`
        ).bind(developerId, discordUserId, now),
      ]);
      return respond({ revoked: results[0].meta.changes > 0 }, 200, origin);
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
    const licenseId = crypto.randomUUID();
    const expiresAt = now + 86400;

    const results = await env.DB.batch([
      env.DB.prepare(
        `UPDATE keys SET status = 'revoked', revoked_at = ?
         WHERE developer_id = ? AND discord_user_id = ?
           AND status = 'active' AND created_at <= ?`
      ).bind(now, developerId, discordUserId, now - 86400),
      env.DB.prepare(
        `INSERT OR IGNORE INTO license_events
           (id, developer_id, license_id, event_type, occurred_at, universe_id)
         SELECT lower(hex(randomblob(16))), developer_id, public_id, 'revoked',
           revoked_at, NULL
         FROM keys
         WHERE developer_id = ? AND discord_user_id = ?
           AND status = 'revoked' AND revoked_at = ?
           AND created_at <= ?`
      ).bind(developerId, discordUserId, now, now - 86400),

      env.DB.prepare(
        `INSERT INTO keys
         (key_hash, discord_user_id, status, created_at, expires_at,
          allowed_universe_ids, developer_id, public_id)
         SELECT ?, ?, 'active', ?, ?, ?, ?, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM keys
           WHERE developer_id = ? AND discord_user_id = ? AND created_at > ?
         )`
      ).bind(
        keyHash, discordUserId, now, expiresAt, universeId, developerId,
        licenseId,
        developerId, discordUserId, now - 86400
      ),
      env.DB.prepare(
        `INSERT INTO license_events
           (id, developer_id, license_id, event_type, occurred_at, universe_id)
         SELECT ?, ?, ?, 'issued', ?, ? WHERE EXISTS (
           SELECT 1 FROM keys WHERE public_id = ? AND developer_id = ?
         )`
      ).bind(crypto.randomUUID(), developerId, licenseId, now, universeId, licenseId, developerId),
    ]);

    if (!results[2] || results[2].meta.changes !== 1) {
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
    const now = Math.floor(Date.now() / 1000);

    const update = key
      ? env.DB.prepare(
          `UPDATE keys SET status = 'revoked', revoked_at = ?
           WHERE (key_hash = ? OR key_hash = ?) AND developer_id = ? AND status = 'active'`
        ).bind(now, keyHash, legacyHash, developerId)
      : env.DB.prepare(
          `UPDATE keys SET status = 'revoked', revoked_at = ?
           WHERE discord_user_id = ? AND developer_id = ? AND status = 'active'`
        ).bind(now, discordUserId, developerId);
    const eventInsert = key
      ? env.DB.prepare(
          `INSERT OR IGNORE INTO license_events
             (id, developer_id, license_id, event_type, occurred_at, universe_id)
           SELECT lower(hex(randomblob(16))), developer_id, public_id, 'revoked',
             revoked_at, NULL
           FROM keys WHERE developer_id = ? AND status = 'revoked'
             AND revoked_at = ? AND (key_hash = ? OR key_hash = ?)`
        ).bind(developerId, now, keyHash, legacyHash)
      : env.DB.prepare(
          `INSERT OR IGNORE INTO license_events
             (id, developer_id, license_id, event_type, occurred_at, universe_id)
           SELECT lower(hex(randomblob(16))), developer_id, public_id, 'revoked',
             revoked_at, NULL
           FROM keys WHERE developer_id = ? AND discord_user_id = ?
             AND status = 'revoked' AND revoked_at = ?`
        ).bind(developerId, discordUserId, now);
    const results = await env.DB.batch([update, eventInsert]);
    return respond({ revoked: results[0].meta.changes > 0 }, 200, origin);
  }

  return respond({ error: "Not found" }, 404, origin);
}
