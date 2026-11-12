import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { randomUUID, webcrypto } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

globalThis.crypto ??= webcrypto;

const WEB_ORIGIN = "https://dashboard.test";
const WORKER_URL = WEB_ORIGIN;
const ADMIN_TOKEN = "dashboard-test-admin-token";
const KEY_PEPPER = "dashboard-test-pepper";
const USER_ONE = "111111111111111";
const USER_TWO = "222222222222222";
const MEMBER = "333333333333333";

class SqliteD1 {
  batchTail = Promise.resolve();

  constructor(db) {
    this.db = db;
  }

  prepare(sql) {
    const db = this.db;
    let values = [];
    const statement = {
      bind(...args) {
        values = args;
        return statement;
      },
      async first() {
        return db.prepare(sql).get(...values) ?? null;
      },
      async all() {
        return { results: db.prepare(sql).all(...values) };
      },
      async run() {
        const result = db.prepare(sql).run(...values);
        return { meta: { changes: Number(result.changes) } };
      },
    };
    return statement;
  }

  async batch(statements) {
    const previous = this.batchTail;
    let release;
    this.batchTail = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    this.db.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    } finally {
      release();
    }
  }
}

async function createApi({ oauth = true } = {}) {
  const db = new DatabaseSync(":memory:");
  for (const name of [
    "0000_initial_keys.sql",
    "0001_multi_developer_foundation.sql",
    "0002_lookup_indexes.sql",
    "0003_dashboard_accounts_and_subscriptions.sql",
    "0004_license_account_binding.sql",
    "0005_game_server_credentials.sql",
    "0006_game_validation_replay_protection.sql",
  ]) {
    db.exec(await readFile(fileURLToPath(new URL(`../migrations/${name}`, import.meta.url)), "utf8"));
  }
  const DB = new SqliteD1(db);
  const env = {
    DB,
    ADMIN_TOKEN,
    KEY_PEPPER,
    ALLOWED_UNIVERSE_IDS: "12345,67890",
    CORS_ORIGIN: WEB_ORIGIN,
    ...(oauth ? {
      DISCORD_OAUTH_CLIENT_ID: "oauth-client-id",
      DISCORD_OAUTH_CLIENT_SECRET: "oauth-client-secret",
      DISCORD_OAUTH_REDIRECT_URI: `${WEB_ORIGIN}/v2/auth/discord/callback`,
    } : {}),
  };
  const buildDir = await mkdtemp(join(tmpdir(), "zervxhub-dashboard-test-"));
  const outfile = join(buildDir, "worker.mjs");
  await build({
    entryPoints: [fileURLToPath(new URL("../src/index.ts", import.meta.url))],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile,
  });
  const workerModule = await import(`${pathToFileURL(outfile).href}?${crypto.randomUUID()}`);
  const api = {
    db,
    resetRateLimits: workerModule.resetRateLimits,
    async request(path, { method = "POST", body, headers = {} } = {}) {
      return workerModule.default.fetch(new Request(`${WORKER_URL}${path}`, {
        method,
        headers: {
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...headers,
        },
        ...(body === undefined ? {} : {
          body: typeof body === "string" ? body : JSON.stringify(body),
        }),
      }), env);
    },
    async signIn(discordUserId, username) {
      const start = await api.request("/v2/auth/discord/start", { method: "GET" });
      assert.equal(start.status, 302);
      const authorize = new URL(start.headers.get("location"));
      const state = authorize.searchParams.get("state");
      const startCookie = start.headers.get("set-cookie").split(";")[0];
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input) => {
        const target = String(input);
        if (target === "https://discord.com/api/oauth2/token") {
          return Response.json({ access_token: username });
        }
        if (target === "https://discord.com/api/users/@me") {
          return Response.json({ id: discordUserId, username, global_name: username });
        }
        throw new Error("Unexpected test fetch target");
      };
      try {
        const callback = await api.request(
          `/v2/auth/discord/callback?code=${encodeURIComponent(username)}&state=${state}`,
          { method: "GET", headers: { cookie: startCookie } }
        );
        assert.equal(callback.status, 303);
        assert.equal(callback.headers.get("location"), `${WEB_ORIGIN}/dashboard.html?auth=success`);
        const cookies = callback.headers.getSetCookie();
        const sessionCookie = cookies.find((cookie) => cookie.startsWith("zvh_session="));
        assert.ok(sessionCookie);
        return {
          cookie: sessionCookie.split(";")[0],
          sessionToken: sessionCookie.split(";")[0].split("=")[1],
        };
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  };
  return {
    ...api,
    async close() {
      db.close();
      await rm(buildDir, { recursive: true, force: true });
    },
  };
}

const json = (response) => response.json();
const adminHeaders = { "x-admin-token": ADMIN_TOKEN };
const browserHeaders = (cookie) => ({ origin: WEB_ORIGIN, cookie });
const gameServerHeaders = (serverKey) => ({ "x-game-server-key": serverKey });
const validationBody = (key, universeId, robloxUserId) => ({
  key,
  universeId,
  robloxUserId,
  requestId: randomUUID(),
  timestamp: Math.floor(Date.now() / 1000),
});

async function rotateGameServerKey(api, cookie, universeId) {
  const response = await api.request(
    `/v2/dashboard/games/${universeId}/server-key/rotate`,
    { body: {}, headers: browserHeaders(cookie) }
  );
  assert.equal(response.status, 201);
  return (await json(response)).serverKey;
}

test("Discord OAuth creates a hashed, expiring session and logout revokes it", async () => {
  const api = await createApi();
  api.resetRateLimits();
  try {
    const status = await api.request("/v2/auth/status", { method: "GET" });
    assert.deepEqual(await json(status), { discordSignInAvailable: true, dashboardAvailable: true });

    const start = await api.request("/v2/auth/discord/start", { method: "GET" });
    assert.equal(start.status, 302);
    const oauthUrl = new URL(start.headers.get("location"));
    assert.equal(oauthUrl.origin, "https://discord.com");
    assert.equal(oauthUrl.searchParams.get("scope"), "identify");
    const state = oauthUrl.searchParams.get("state");
    const stateCookie = start.headers.get("set-cookie");
    assert.match(stateCookie, /HttpOnly/);
    assert.match(stateCookie, /Secure/);
    assert.match(stateCookie, /SameSite=Lax/);

    const mismatch = await api.request(`/v2/auth/discord/callback?code=x&state=${"0".repeat(64)}`, {
      method: "GET",
      headers: { cookie: stateCookie.split(";")[0] },
    });
    assert.equal(mismatch.status, 400);

    const session = await api.signIn(USER_ONE, "Developer One");
    const stored = api.db.prepare("SELECT session_hash, expires_at FROM developer_sessions").get();
    assert.notEqual(stored.session_hash, session.sessionToken);
    assert.match(stored.session_hash, /^[a-f0-9]{64}$/);
    assert.ok(stored.expires_at > Math.floor(Date.now() / 1000));

    const response = await api.request("/v2/auth/session", {
      method: "GET",
      headers: { cookie: session.cookie },
    });
    assert.equal(response.status, 200);
    const profile = await json(response);
    assert.equal(profile.developer.displayName, "Developer One");
    assert.equal(profile.developer.discordUserId, USER_ONE);
    assert.equal(Object.hasOwn(profile.developer, "sessionHash"), false);

    const blockedCsrf = await api.request("/v2/dashboard/api-keys/rotate", {
      body: {},
      headers: { cookie: session.cookie },
    });
    assert.equal(blockedCsrf.status, 403);
    assert.equal(api.db.prepare("SELECT COUNT(*) AS count FROM developer_api_keys").get().count, 0);
    const wrongOrigin = await api.request("/v2/dashboard/api-keys/rotate", {
      body: {},
      headers: { cookie: session.cookie, origin: "https://attacker.test" },
    });
    assert.equal(wrongOrigin.status, 403);
    assert.equal(api.db.prepare("SELECT COUNT(*) AS count FROM developer_api_keys").get().count, 0);

    const noOriginLogout = await api.request("/v2/auth/logout", {
      method: "POST",
      headers: { cookie: session.cookie },
    });
    assert.equal(noOriginLogout.status, 403);

    const logout = await api.request("/v2/auth/logout", {
      method: "POST",
      headers: browserHeaders(session.cookie),
    });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
    const afterLogout = await api.request("/v2/auth/session", {
      method: "GET",
      headers: { cookie: session.cookie },
    });
    assert.equal(afterLogout.status, 401);

    const expired = await api.signIn(USER_TWO, "Developer Two");
    api.db.prepare(
      `UPDATE developer_sessions SET expires_at = 1
       WHERE developer_id = (SELECT id FROM developers WHERE discord_user_id = ?)`
    ).run(USER_TWO);
    const expiredResponse = await api.request("/v2/auth/session", {
      method: "GET",
      headers: { cookie: expired.cookie },
    });
    assert.equal(expiredResponse.status, 401);

    const suspended = await api.signIn(USER_ONE, "Developer One");
    api.db.prepare(
      "UPDATE developers SET status = 'suspended' WHERE discord_user_id = ?"
    ).run(USER_ONE);
    const suspendedResponse = await api.request("/v2/auth/session", {
      method: "GET",
      headers: { cookie: suspended.cookie },
    });
    assert.equal(suspendedResponse.status, 401);
  } finally {
    await api.close();
  }
});

test("dashboard APIs isolate tenants and manage games, licenses, usage, keys, and plan requests", async () => {
  const api = await createApi();
  api.resetRateLimits();
  try {
    const one = await api.signIn(USER_ONE, "Developer One");
    const two = await api.signIn(USER_TWO, "Developer Two");

    const registered = await api.request("/v2/dashboard/games", {
      body: { universeId: "12345", name: "One Game" },
      headers: browserHeaders(one.cookie),
    });
    assert.equal(registered.status, 201);
    assert.equal((await json(registered)).status, "pending");

    const otherGames = await api.request("/v2/dashboard/games", {
      method: "GET",
      headers: { cookie: two.cookie },
    });
    assert.deepEqual(await json(otherGames), { games: [] });

    const approved = await api.request("/v2/admin/games/review", {
      body: { universeId: "12345", status: "approved" },
      headers: adminHeaders,
    });
    assert.equal(approved.status, 200);
    const serverKey = await rotateGameServerKey(api, one.cookie, "12345");
    const gameList = await api.request("/v2/dashboard/games", {
      method: "GET",
      headers: { cookie: one.cookie },
    });
    assert.equal((await json(gameList)).games[0].serverKeyConfigured, 1);
    const crossTenantRotation = await api.request(
      "/v2/dashboard/games/12345/server-key/rotate",
      { body: {}, headers: browserHeaders(two.cookie) }
    );
    assert.equal(crossTenantRotation.status, 404);

    for (const hours of [0, 8761, 1.5, "24"]) {
      const invalid = await api.request("/v2/dashboard/licenses", {
        body: { discordUserId: MEMBER, universeId: "12345", expiresInHours: hours },
        headers: browserHeaders(one.cookie),
      });
      assert.equal(invalid.status, 400);
    }
    const unauthorizedGame = await api.request("/v2/dashboard/licenses", {
      body: { discordUserId: MEMBER, universeId: "67890", expiresInHours: 24 },
      headers: browserHeaders(one.cookie),
    });
    assert.equal(unauthorizedGame.status, 403);

    const issued = await api.request("/v2/dashboard/licenses", {
      body: { discordUserId: MEMBER, universeId: "12345", expiresInHours: 1 },
      headers: browserHeaders(one.cookie),
    });
    assert.equal(issued.status, 201);
    const created = await json(issued);
    assert.match(created.key, /^ZERVX-/);
    assert.ok(created.expiresAt <= Math.floor(Date.now() / 1000) + 3601);
    assert.ok(created.expiresAt > Math.floor(Date.now() / 1000) + 3500);
    const storedLicense = api.db.prepare(
      "SELECT key_hash, public_id, validation_count FROM keys WHERE public_id = ?"
    ).get(created.licenseId);
    assert.notEqual(storedLicense.key_hash, created.key);
    assert.equal(storedLicense.validation_count, 0);

    const otherLicenses = await api.request("/v2/dashboard/licenses", {
      method: "GET",
      headers: { cookie: two.cookie },
    });
    assert.deepEqual(await json(otherLicenses), { licenses: [] });
    const crossRevoke = await api.request(`/v2/dashboard/licenses/${created.licenseId}/revoke`, {
      body: {},
      headers: browserHeaders(two.cookie),
    });
    assert.deepEqual(await json(crossRevoke), { revoked: false });

    const validation = await api.request("/v2/keys/validate", {
      body: validationBody(created.key, "12345", USER_ONE),
      headers: gameServerHeaders(serverKey),
    });
    assert.equal(validation.status, 200);
    assert.equal((await json(validation)).valid, true);
    assert.equal(api.db.prepare("SELECT bound_roblox_user_id FROM keys WHERE public_id = ?")
      .get(created.licenseId).bound_roblox_user_id, USER_ONE);

    const replay = await api.request("/v2/keys/validate", {
      body: validationBody(created.key, "12345", USER_TWO),
      headers: gameServerHeaders(serverKey),
    });
    assert.equal(replay.status, 403);
    assert.equal((await json(replay)).reason, "license_bound_to_another_user");

    const licenses = await api.request("/v2/dashboard/licenses", {
      method: "GET",
      headers: { cookie: one.cookie },
    });
    const listed = (await json(licenses)).licenses[0];
    assert.equal(listed.id, created.licenseId);
    assert.equal(listed.validationCount, 1);
    assert.equal(listed.boundRobloxUserId, USER_ONE);
    const history = await api.request(`/v2/dashboard/licenses/${created.licenseId}/history`, {
      method: "GET",
      headers: { cookie: one.cookie },
    });
    const historyData = await json(history);
    const historyEntries = historyData.history;
    assert.equal(historyEntries.length, 1);
    assert.equal(historyEntries[0].validationCount, 1);
    assert.ok(historyData.events.some((event) => event.type === "issued"));

    const revoke = await api.request(`/v2/dashboard/licenses/${created.licenseId}/revoke`, {
      body: {},
      headers: browserHeaders(one.cookie),
    });
    assert.deepEqual(await json(revoke), { revoked: true });
    const revokedValidation = await api.request("/v2/keys/validate", {
      body: validationBody(created.key, "12345", MEMBER),
      headers: gameServerHeaders(serverKey),
    });
    assert.equal(revokedValidation.status, 401);
    const revokedHistory = await api.request(`/v2/dashboard/licenses/${created.licenseId}/history`, {
      method: "GET",
      headers: { cookie: one.cookie },
    });
    assert.ok((await json(revokedHistory)).events.some((event) => event.type === "revoked"));

    const firstRotation = await api.request("/v2/dashboard/api-keys/rotate", {
      body: {},
      headers: browserHeaders(one.cookie),
    });
    assert.equal(firstRotation.status, 201);
    const firstKey = await json(firstRotation);
    const secondRotation = await api.request("/v2/dashboard/api-keys/rotate", {
      body: {},
      headers: browserHeaders(one.cookie),
    });
    assert.equal(secondRotation.status, 201);
    const secondKey = await json(secondRotation);
    assert.notEqual(firstKey.apiKey, secondKey.apiKey);
    assert.equal(api.db.prepare(
      "SELECT COUNT(*) AS count FROM developer_api_keys WHERE developer_id = (SELECT id FROM developers WHERE discord_user_id = ?) AND revoked_at IS NULL"
    ).get(USER_ONE).count, 1);
    const oldCredential = await api.request("/v2/games", {
      method: "GET",
      headers: { "x-developer-key": firstKey.apiKey },
    });
    const currentCredential = await api.request("/v2/games", {
      method: "GET",
      headers: { "x-developer-key": secondKey.apiKey },
    });
    assert.equal(oldCredential.status, 401);
    assert.equal(currentCredential.status, 200);

    const subscription = await api.request("/v2/dashboard/subscription", {
      method: "GET",
      headers: { cookie: one.cookie },
    });
    const initial = await json(subscription);
    assert.equal(initial.subscription.plan, "free");
    assert.equal(initial.paymentsEnabled, false);

    const requestPlan = await api.request("/v2/dashboard/subscription/change", {
      body: { plan: "starter", billingPeriod: "monthly" },
      headers: browserHeaders(one.cookie),
    });
    assert.equal(requestPlan.status, 202);
    const pending = await json(requestPlan);
    assert.equal(pending.planChanged, false);
    assert.equal(pending.paymentsEnabled, false);

    const otherCancel = await api.request("/v2/dashboard/subscription/change/cancel", {
      body: { requestId: pending.requestId },
      headers: browserHeaders(two.cookie),
    });
    assert.deepEqual(await json(otherCancel), { canceled: false });
    const cancel = await api.request("/v2/dashboard/subscription/change/cancel", {
      body: { requestId: pending.requestId },
      headers: browserHeaders(one.cookie),
    });
    assert.deepEqual(await json(cancel), { canceled: true });

    api.db.prepare(
      `UPDATE developer_subscriptions
       SET plan = 'pro', billing_period = 'monthly', current_period_end = ?
       WHERE developer_id = (SELECT id FROM developers WHERE discord_user_id = ?)`
    ).run(Math.floor(Date.now() / 1000) + 3600, USER_ONE);
    const cancellation = await api.request("/v2/dashboard/subscription/cancel", {
      body: {},
      headers: browserHeaders(one.cookie),
    });
    assert.equal(cancellation.status, 202);
    const cancellationRequest = await json(cancellation);
    assert.equal(cancellationRequest.planChanged, false);
    assert.equal(cancellationRequest.paymentsEnabled, false);
    const afterCancellationRequest = await api.request("/v2/dashboard/subscription", {
      method: "GET",
      headers: { cookie: one.cookie },
    });
    const stillPaid = await json(afterCancellationRequest);
    assert.equal(stillPaid.subscription.plan, "pro");
    assert.equal(stillPaid.pendingRequest.requestedPlan, "free");

    const overviewResponse = await api.request("/v2/dashboard/overview", {
      method: "GET",
      headers: { cookie: one.cookie },
    });
    const overview = await json(overviewResponse);
    assert.equal(overview.usage.games, 1);
    assert.equal(overview.usage.licenses, 1);
    assert.equal(overview.usage.validationsLast30Days, 1);
    assert.ok(overview.recentActivity.some((activity) => activity.type === "issued"));
    assert.ok(overview.recentActivity.some((activity) => activity.type === "revoked"));
  } finally {
    await api.close();
  }
});

test("replacing an expired key records its revocation in license history", async () => {
  const api = await createApi();
  api.resetRateLimits();
  try {
    const session = await api.signIn(USER_ONE, "Developer One");
    const registration = await api.request("/v2/dashboard/games", {
      body: { universeId: "12345", name: "One Game" },
      headers: browserHeaders(session.cookie),
    });

    assert.equal(registration.status, 201);
    const approval = await api.request("/v2/admin/games/review", {
      body: { universeId: "12345", status: "approved" },
      headers: adminHeaders,
    });
    assert.equal(approval.status, 200);
    const rotated = await api.request("/v2/dashboard/api-keys/rotate", {
      body: {},
      headers: browserHeaders(session.cookie),
    });
    const { apiKey } = await json(rotated);
    const issued = await api.request("/v2/dashboard/licenses", {
      body: { discordUserId: MEMBER, universeId: "12345", expiresInHours: 700 },
      headers: browserHeaders(session.cookie),
    });
    const originalLicense = await json(issued);
    api.db.prepare("UPDATE keys SET created_at = ? WHERE public_id = ?")
      .run(Math.floor(Date.now() / 1000) - 25 * 3600, originalLicense.licenseId);

    const replacement = await api.request("/v2/keys/issue", {
      body: { discordUserId: MEMBER, universeId: "12345" },
      headers: { "x-developer-key": apiKey },
    });
    assert.equal(replacement.status, 201);
    assert.equal(api.db.prepare("SELECT status FROM keys WHERE public_id = ?")
      .get(originalLicense.licenseId).status, "revoked");
    assert.equal(api.db.prepare(
      `SELECT COUNT(*) AS count FROM license_events
       WHERE license_id = ? AND event_type = 'revoked'`
    ).get(originalLicense.licenseId).count, 1);
  } finally {
    await api.close();
  }
});

test("concurrent first validations bind a license to exactly one Roblox account", async () => {
  const api = await createApi();
  api.resetRateLimits();
  try {
    const session = await api.signIn(USER_ONE, "Developer One");
    const registration = await api.request("/v2/dashboard/games", {
      body: { universeId: "12345", name: "One Game" },
      headers: browserHeaders(session.cookie),
    });
    assert.equal(registration.status, 201);
    const approval = await api.request("/v2/admin/games/review", {
      body: { universeId: "12345", status: "approved" },
      headers: adminHeaders,
    });
    assert.equal(approval.status, 200);
    const serverKey = await rotateGameServerKey(api, session.cookie, "12345");
    const issued = await api.request("/v2/dashboard/licenses", {
      body: { discordUserId: MEMBER, universeId: "12345", expiresInHours: 24 },
      headers: browserHeaders(session.cookie),
    });
    const license = await json(issued);

    const responses = await Promise.all([USER_ONE, USER_TWO].map((robloxUserId) =>
      api.request("/v2/keys/validate", {
        body: validationBody(license.key, "12345", robloxUserId),
        headers: gameServerHeaders(serverKey),
      })
    ));
    assert.deepEqual(responses.map((response) => response.status).sort(), [200, 403]);
    const stored = api.db.prepare(
      "SELECT bound_roblox_user_id, validation_count FROM keys WHERE public_id = ?"
    ).get(license.licenseId);
    assert.ok([USER_ONE, USER_TWO].includes(stored.bound_roblox_user_id));
    assert.equal(stored.validation_count, 1);
    assert.equal(api.db.prepare(
      "SELECT COALESCE(SUM(validation_count), 0) AS count FROM license_validation_daily WHERE license_id = ?"
    ).get(license.licenseId).count, 1);
  } finally {
    await api.close();
  }
});

test("license validation requires a game-scoped server credential and supports rotation and revocation", async () => {
  const api = await createApi();
  api.resetRateLimits();
  try {
    const session = await api.signIn(USER_ONE, "Developer One");
    const registration = await api.request("/v2/dashboard/games", {
      body: { universeId: "12345", name: "One Game" },
      headers: browserHeaders(session.cookie),
    });
    assert.equal(registration.status, 201);
    const approval = await api.request("/v2/admin/games/review", {
      body: { universeId: "12345", status: "approved" },
      headers: adminHeaders,
    });
    assert.equal(approval.status, 200);
    const firstServerKey = await rotateGameServerKey(api, session.cookie, "12345");
    const issued = await api.request("/v2/dashboard/licenses", {
      body: { discordUserId: MEMBER, universeId: "12345", expiresInHours: 24 },
      headers: browserHeaders(session.cookie),
    });
    const license = await json(issued);

    const staleBody = validationBody(license.key, "12345", USER_ONE);
    staleBody.timestamp -= 61;
    const staleRequest = await api.request("/v2/keys/validate", {
      body: staleBody,
      headers: gameServerHeaders(firstServerKey),
    });
    assert.equal(staleRequest.status, 400);
    assert.equal((await json(staleRequest)).reason, "invalid_request");

    const spoofed = await api.request("/v2/keys/validate", {
      body: validationBody(license.key, "12345", USER_ONE),
    });
    assert.equal(spoofed.status, 401);
    assert.equal((await json(spoofed)).reason, "server_credential_invalid");
    assert.equal(api.db.prepare("SELECT bound_roblox_user_id FROM keys WHERE public_id = ?")
      .get(license.licenseId).bound_roblox_user_id, null);

    const firstValidationBody = validationBody(license.key, "12345", USER_ONE);
    const firstValidation = await api.request("/v2/keys/validate", {
      body: firstValidationBody,
      headers: gameServerHeaders(firstServerKey),
    });
    assert.equal(firstValidation.status, 200);
    const repeatedRequest = await api.request("/v2/keys/validate", {
      body: firstValidationBody,
      headers: gameServerHeaders(firstServerKey),
    });
    assert.equal(repeatedRequest.status, 409);
    assert.equal((await json(repeatedRequest)).reason, "request_replayed");
    const caseVariantReplay = await api.request("/v2/keys/validate", {
      body: { ...firstValidationBody, requestId: firstValidationBody.requestId.toUpperCase() },
      headers: gameServerHeaders(firstServerKey),
    });
    assert.equal(caseVariantReplay.status, 409);
    assert.equal(api.db.prepare("SELECT validation_count FROM keys WHERE public_id = ?")
      .get(license.licenseId).validation_count, 1);

    const secondServerKey = await rotateGameServerKey(api, session.cookie, "12345");
    assert.notEqual(secondServerKey, firstServerKey);
    const storedKey = api.db.prepare(
      "SELECT key_hash FROM game_server_keys WHERE universe_id = ? AND revoked_at IS NULL"
    ).get("12345");
    assert.notEqual(storedKey.key_hash, secondServerKey);

    const oldCredential = await api.request("/v2/keys/validate", {
      body: validationBody(license.key, "12345", USER_ONE),
      headers: gameServerHeaders(firstServerKey),
    });
    assert.equal(oldCredential.status, 401);
    const currentCredential = await api.request("/v2/keys/validate", {
      body: validationBody(license.key, "12345", USER_ONE),
      headers: gameServerHeaders(secondServerKey),
    });
    assert.equal(currentCredential.status, 200);

    const revoked = await api.request("/v2/dashboard/games/12345/server-key/revoke", {
      body: {},
      headers: browserHeaders(session.cookie),
    });
    assert.deepEqual(await json(revoked), { revoked: true });
    const afterRevoke = await api.request("/v2/keys/validate", {
      body: validationBody(license.key, "12345", USER_ONE),
      headers: gameServerHeaders(secondServerKey),
    });
    assert.equal(afterRevoke.status, 401);
    assert.equal((await json(afterRevoke)).reason, "server_credential_invalid");
  } finally {
    await api.close();
  }
});

test("legacy V1 licenses require and bind a Roblox account on first validation", async () => {
  const api = await createApi();
  api.resetRateLimits();
  try {
    const session = await api.signIn(USER_ONE, "Developer One");
    const registration = await api.request("/v2/dashboard/games", {
      body: { universeId: "12345", name: "One Game" },
      headers: browserHeaders(session.cookie),
    });
    assert.equal(registration.status, 201);
    const approval = await api.request("/v2/admin/games/review", {
      body: { universeId: "12345", status: "approved" },
      headers: adminHeaders,
    });
    assert.equal(approval.status, 200);
    const serverKey = await rotateGameServerKey(api, session.cookie, "12345");
    const issued = await api.request("/v1/keys/issue", {
      body: { discordUserId: MEMBER, allowedUniverseIds: ["12345"] },
      headers: adminHeaders,
    });
    assert.equal(issued.status, 201);
    const { key } = await json(issued);
    const unauthenticated = await api.request("/v1/keys/validate", {
      body: validationBody(key, "12345", USER_ONE),
    });
    assert.equal(unauthenticated.status, 401);
    assert.equal((await json(unauthenticated)).reason, "server_credential_invalid");

    const missingIdentity = await api.request("/v1/keys/validate", {
      body: { key, universeId: "12345" },
    });
    assert.equal(missingIdentity.status, 400);

    const firstUse = await api.request("/v1/keys/validate", {
      body: validationBody(key, "12345", USER_ONE),
      headers: gameServerHeaders(serverKey),
    });
    assert.equal(firstUse.status, 200);
    const replay = await api.request("/v1/keys/validate", {
      body: validationBody(key, "12345", USER_TWO),
      headers: gameServerHeaders(serverKey),
    });
    assert.equal(replay.status, 403);
    assert.equal((await json(replay)).reason, "license_bound_to_another_user");
  } finally {
    await api.close();
  }
});

test("OAuth remains unavailable without provider configuration and malformed sessions fail closed", async () => {
  const api = await createApi({ oauth: false });
  api.resetRateLimits();
  try {
    const status = await api.request("/v2/auth/status", { method: "GET" });
    assert.equal((await json(status)).discordSignInAvailable, false);
    const start = await api.request("/v2/auth/discord/start", { method: "GET" });
    assert.equal(start.status, 503);
    const callback = await api.request("/v2/auth/discord/callback", { method: "GET" });
    assert.equal(callback.status, 503);

    const user = await api.request("/v2/admin/developers", {
      body: { discordUserId: USER_ONE, displayName: "Suspended" },
      headers: adminHeaders,
    });
    const developer = await json(user);
    await api.db.prepare("UPDATE developers SET status = 'suspended' WHERE id = ?").run(developer.developerId);
    assert.equal((await api.request("/v2/auth/session", {
      method: "GET",
      headers: { cookie: `zvh_session=${"a".repeat(64)}` },
    })).status, 401);
  } finally {
    await api.close();
  }
});
