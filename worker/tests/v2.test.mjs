import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID, webcrypto } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

globalThis.crypto ??= webcrypto;

let worker;
let resetRateLimits;
let buildDir;

before(async () => {
  buildDir = await mkdtemp(join(tmpdir(), "zervxhub-worker-tests-"));
  const outfile = join(buildDir, "worker.mjs");
  await build({
    entryPoints: [fileURLToPath(new URL("../src/index.ts", import.meta.url))],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile,
  });
  const built = await import(pathToFileURL(outfile).href);
  worker = built.default;
  resetRateLimits = built.resetRateLimits;
});

after(async () => {
  if (buildDir) await rm(buildDir, { recursive: true, force: true });
});

class MemoryD1 {
  developers = new Map();
  apiKeys = new Map();
  games = new Map();
  keys = new Map();
  integrations = new Map();

  prepare(sql) {
    let args = [];
    const db = this;
    const normalized = sql.replace(/\s+/g, " ").trim();
    const statement = {
      bind(...values) { args = values; return statement; },
      async first() {
        if (normalized.startsWith("SELECT d.id")) {
          const [hash1, hash2] = args;
          const apiKey = db.apiKeys.get(hash1) || (hash2 && db.apiKeys.get(hash2));
          const developer = apiKey && db.developers.get(apiKey.developerId);
          return apiKey && !apiKey.revokedAt && developer?.status === "active"
            ? { id: developer.id, key_hash: apiKey.hash || hash1 } : null;
        }
        if (normalized.startsWith("SELECT id FROM developers")) {
          const [id] = args;
          const developer = db.developers.get(id);
          return developer?.status === "active" ? { id } : null;
        }
        if (normalized.startsWith("SELECT id FROM games")) {
          const [developerId, universeId] = args;
          const game = [...db.games.values()].find(row =>
            row.developerId === developerId && row.universeId === universeId && row.status === "approved");
          return game ? { id: game.id } : null;
        }
        if (normalized.startsWith("SELECT g.developer_id, d.status AS developer_status")) {
          const [universeId] = args;
          const game = [...db.games.values()].find(row => row.universeId === universeId && row.status === "approved");
          if (!game) return null;
          const developer = db.developers.get(game.developerId);
          return developer ? { developer_id: game.developerId, developer_status: developer.status } : null;
        }
        if (normalized.startsWith("SELECT developer_id FROM games")) {
          const [universeId] = args;
          const game = [...db.games.values()].find(row => row.universeId === universeId && row.status === "approved");
          return game ? { developer_id: game.developerId } : null;
        }
        if (normalized.startsWith("SELECT status, expires_at, allowed_universe_ids, developer_id")) {
          const [hash1, hash2] = args;
          const key = db.keys.get(hash1) || (hash2 && db.keys.get(hash2));
          return key ? {
            status: key.status,
            expires_at: key.expiresAt,
            allowed_universe_ids: key.allowedUniverseIds,
            developer_id: key.developerId,
            key_hash: key.hash || hash1,
          } : null;
        }
        if (normalized.includes("FROM keys WHERE") && normalized.includes("developer_id IS NULL")) {
          const [hash1, hash2] = args;
          const key = db.keys.get(hash1) || (hash2 && db.keys.get(hash2));
          return key?.developerId == null ? {
            status: key.status,
            expires_at: key.expiresAt,
            allowed_universe_ids: key.allowedUniverseIds,
            key_hash: key.hash || hash1,
          } : null;
        }
        if (normalized.startsWith("SELECT i.developer_id FROM discord_integrations")) {
          const [guildId] = args;
          const developerId = db.integrations.get(guildId);
          const developer = developerId && db.developers.get(developerId);
          return developer?.status === "active" ? { developer_id: developerId } : null;
        }
        return null;
      },
      async all() {
        if (normalized.startsWith("SELECT id AS developerId, discord_user_id AS discordUserId")) {
          return { results: [...db.developers.values()]
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 100)
            .map(({ id: developerId, discordUserId, displayName, status, createdAt }) => ({
              developerId, discordUserId, displayName, status, createdAt,
            })) };
        }
        if (normalized.startsWith("SELECT universe_id AS universeId, name, status, verified_at AS verifiedAt FROM games")) {
          const [developerId] = args;
          return { results: [...db.games.values()]
            .filter(game => game.developerId === developerId && game.status === "approved")
            .map(({ universeId, name, status, verifiedAt }) => ({ universeId, name, status, verifiedAt })) };
        }
        if (normalized.startsWith("SELECT universe_id AS universeId, name FROM games")) {
          const [developerId] = args;
          return { results: [...db.games.values()]
            .filter(game => game.developerId === developerId && game.status === "approved")
            .map(({ universeId, name }) => ({ universeId, name })) };
        }
        return { results: [] };
      },
      async run() {
        if (normalized.startsWith("INSERT INTO developers")) {
          const [id, discordUserId, displayName, createdAt] = args;
          if ([...db.developers.values()].some(row => row.discordUserId === discordUserId)) throw new Error("duplicate developer");
          db.developers.set(id, { id, discordUserId, displayName, status: "active", createdAt });
          return { meta: { changes: 1 } };
        }
        if (normalized.startsWith("INSERT INTO developer_api_keys")) {
          const [hash, developerId, createdAt] = args;
          db.apiKeys.set(hash, { hash, developerId, createdAt, revokedAt: null });
          return { meta: { changes: 1 } };
        }
        if (normalized.startsWith("UPDATE developer_api_keys SET revoked_at")) {
          const [revokedAt, selector, hash2] = args;
          if (normalized.includes("WHERE developer_id = ?")) {
            let changes = 0;
            for (const key of db.apiKeys.values()) {
              if (key.developerId === selector && !key.revokedAt) {
                key.revokedAt = revokedAt;
                changes++;
              }
            }
            return { meta: { changes } };
          }
          const key = db.apiKeys.get(selector) || (hash2 && db.apiKeys.get(hash2));
          if (!key || key.revokedAt) return { meta: { changes: 0 } };
          key.revokedAt = revokedAt;
          return { meta: { changes: 1 } };
        }
        if (normalized.startsWith("UPDATE keys SET key_hash = ? WHERE key_hash = ?")) {
          const [newHash, oldHash] = args;
          const key = db.keys.get(oldHash);
          if (key) {
            db.keys.delete(oldHash);
            key.hash = newHash;
            db.keys.set(newHash, key);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
        if (normalized.startsWith("UPDATE developer_api_keys SET key_hash = ? WHERE key_hash = ?")) {
          const [newHash, oldHash] = args;
          const key = db.apiKeys.get(oldHash);
          if (key) {
            db.apiKeys.delete(oldHash);
            key.hash = newHash;
            db.apiKeys.set(newHash, key);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }
        if (normalized.startsWith("INSERT INTO games")) {
          const [id, developerId, universeId, name, createdAt] = args;
          if ([...db.games.values()].some(row => row.universeId === universeId)) throw new Error("duplicate game");
          db.games.set(id, { id, developerId, universeId, name, status: "pending", createdAt, verifiedAt: null });
          return { meta: { changes: 1 } };
        }
        if (normalized.startsWith("UPDATE developers SET status")) {
          const [status, id] = args;
          const developer = db.developers.get(id);
          if (!developer) return { meta: { changes: 0 } };
          developer.status = status;
          return { meta: { changes: 1 } };
        }
        if (normalized.startsWith("UPDATE games SET status")) {
          const [status, verifiedAt, universeId] = args;
          const game = [...db.games.values()].find(row => row.universeId === universeId && row.status === "pending");
          if (!game) return { meta: { changes: 0 } };
          game.status = status;
          game.verifiedAt = verifiedAt;
          return { meta: { changes: 1 } };
        }
        if (normalized.startsWith("INSERT INTO discord_integrations")) {
          const [guildId, developerId] = args;
          db.integrations.set(guildId, developerId);
          return { meta: { changes: 1 } };
        }
        if (normalized.startsWith("DELETE FROM discord_integrations")) {
          const [guildId] = args;
          const existed = db.integrations.delete(guildId);
          return { meta: { changes: Number(existed) } };
        }
        if (normalized.startsWith("UPDATE keys SET status = 'expired'")) {
          const [hash, developerId] = args;
          const key = db.keys.get(hash);
          if (!key || key.developerId !== developerId || key.status !== "active") return { meta: { changes: 0 } };
          key.status = "expired";
          return { meta: { changes: 1 } };
        }
        if (normalized.startsWith("UPDATE keys SET status = 'revoked'")) {
          return db.revokeKeys(normalized, args);
        }
        if (normalized.startsWith("INSERT INTO keys") && normalized.includes("developer_id IS NULL")) {
          const [hash, discordUserId, createdAt, expiresAt, allowedUniverseIds, threshold] = args;
          const recent = [...db.keys.values()].some(row =>
            row.developerId == null && row.discordUserId === discordUserId && row.createdAt > threshold);
          if (recent) return { meta: { changes: 0 } };
          db.keys.set(hash, {
            hash, discordUserId, createdAt, expiresAt, allowedUniverseIds,
            developerId: null, status: "active", lastUsedAt: null, lastRobloxUserId: null,
          });
          return { meta: { changes: 1 } };
        }
        if (normalized.startsWith("INSERT INTO keys")) {
          const [hash, discordUserId, createdAt, expiresAt, allowedUniverseIds, developerId, checkDeveloperId, checkDiscordId, threshold] = args;
          const recent = [...db.keys.values()].some(row => row.developerId === checkDeveloperId && row.discordUserId === checkDiscordId && row.createdAt > threshold);
          if (recent) return { meta: { changes: 0 } };
          db.keys.set(hash, { hash, discordUserId, createdAt, expiresAt, allowedUniverseIds, developerId, status: "active", lastUsedAt: null, lastRobloxUserId: null });
          return { meta: { changes: 1 } };
        }
        if (normalized.startsWith("UPDATE keys SET last_used_at")) {
          const [lastUsedAt, robloxUserId, hash, developerId] = args;
          const key = db.keys.get(hash);
          if (!key || (developerId !== undefined && key.developerId !== developerId)) return { meta: { changes: 0 } };
          key.lastUsedAt = lastUsedAt;
          key.lastRobloxUserId = robloxUserId;
          return { meta: { changes: 1 } };
        }
        return { meta: { changes: 0 } };
      },
    };
    return statement;
  }

  revokeKeys(sql, args) {
    let matches;
    if (sql.includes("developer_id IS NULL") && sql.includes("key_hash")) {
      const [hash1, hash2] = args;
      matches = [...this.keys.values()].filter(row => (row.hash === hash1 || row.hash === hash2) && row.developerId == null && row.status === "active");
    } else if (sql.includes("developer_id IS NULL") && sql.includes("created_at <=")) {
      const [discordUserId, olderThan] = args;
      matches = [...this.keys.values()].filter(row =>
        row.developerId == null && row.discordUserId === discordUserId && row.status === "active" && row.createdAt <= olderThan);
    } else if (sql.includes("developer_id IS NULL")) {
      const [discordUserId] = args;
      matches = [...this.keys.values()].filter(row => row.developerId == null && row.discordUserId === discordUserId && row.status === "active");
    } else if (sql.includes("key_hash") && sql.includes("developer_id = ?")) {
      const [hash1, hash2, developerId] = args.length === 3 ? args : [args[0], null, args[1]];
      matches = [...this.keys.values()].filter(row => (row.hash === hash1 || row.hash === hash2) && row.developerId === developerId && row.status === "active");
    } else if (sql.includes("discord_user_id = ? AND developer_id = ? AND status = 'active'")) {
      const [discordUserId, developerId] = args;
      matches = [...this.keys.values()].filter(row => row.discordUserId === discordUserId && row.developerId === developerId && row.status === "active");
    } else if (sql.includes("developer_id = ? AND discord_user_id = ? AND status = 'active'")) {
      const [developerId, discordUserId] = args;
      matches = [...this.keys.values()].filter(row => row.developerId === developerId && row.discordUserId === discordUserId && row.status === "active");
    } else if (sql.includes("developer_id = ? AND discord_user_id = ?")) {
      const [developerId, discordUserId, olderThan] = args;
      matches = [...this.keys.values()].filter(row => row.developerId === developerId && row.discordUserId === discordUserId && row.status === "active" && row.createdAt <= olderThan);
    } else {
      matches = [];
    }
    for (const row of matches) row.status = "revoked";
    return { meta: { changes: matches.length } };
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }
}

const ADMIN_TOKEN = "local-test-admin-token";
const BOT_API_TOKEN = "local-test-bot-token";
const KEY_PEPPER = "local-test-pepper-secret";
const GUILD_1 = "111111111111111";
const GUILD_2 = "222222222222222";
const MEMBER = "333333333333333";
const MEMBER_2 = "444444444444444";

function createApi() {
  const DB = new MemoryD1();
  const env = { DB, ADMIN_TOKEN, BOT_API_TOKEN, KEY_PEPPER, ALLOWED_UNIVERSE_IDS: "12345,67890" };
  async function request(path, { method = "POST", body, headers = {} } = {}) {
    const req = new Request(`https://worker.test${path}`, {
      method,
      headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
      ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
    });
    return worker.fetch(req, env);
  }
  return { DB, request, env };
}

async function json(response) { return response.json(); }
function testCase(name, fn) {
  test(name, async () => {
    resetRateLimits();
    await fn();
  });
}

const adminHeaders = { "x-admin-token": ADMIN_TOKEN };
const botHeaders = { "x-bot-token": BOT_API_TOKEN };
const devHeaders = key => ({ "x-developer-key": key });

async function createDeveloper(api, discordUserId, displayName) {
  const response = await api.request("/v2/admin/developers", {
    body: { discordUserId, displayName }, headers: adminHeaders,
  });
  assert.equal(response.status, 201);
  return json(response);
}

async function registerApprovedGame(api, developerKey, universeId, name) {
  const registered = await api.request("/v2/games/register", {
    body: { universeId, name }, headers: devHeaders(developerKey),
  });
  assert.equal(registered.status, 201);
  const approved = await api.request("/v2/admin/games/review", {
    body: { universeId, status: "approved" }, headers: adminHeaders,
  });
  assert.equal(approved.status, 200);
}

async function issueForDeveloper(api, developerKey, discordUserId, universeId) {
  const response = await api.request("/v2/keys/issue", {
    body: { discordUserId, universeId }, headers: devHeaders(developerKey),
  });
  return { response, data: await json(response) };
}

testCase("admin creates developers; developer API keys are hashed and admin routes stay admin-only", async () => {
  const api = createApi();
  const created = await createDeveloper(api, GUILD_1, "Developer One");
  assert.match(created.apiKey, /^zvh_live_[a-f0-9]{64}$/);
  assert.equal([...api.DB.apiKeys.keys()].includes(created.apiKey), false);

  const denied = await api.request("/v2/admin/developers", {
    body: { discordUserId: MEMBER, displayName: "Not admin" },
    headers: devHeaders(created.apiKey),
  });
  assert.equal(denied.status, 401);

  const revoked = await api.request("/v2/admin/developer-keys/revoke", {
    body: { apiKey: created.apiKey }, headers: adminHeaders,
  });
  assert.deepEqual(await json(revoked), { revoked: true });
  const afterRevoke = await api.request("/v2/games", { method: "GET", headers: devHeaders(created.apiKey) });
  assert.equal(afterRevoke.status, 401);
});

testCase("admins can list developers while unauthenticated callers are denied", async () => {
  const api = createApi();
  const developer = await createDeveloper(api, GUILD_1, "Listed Developer");

  const denied = await api.request("/v2/admin/developers", { method: "GET" });
  assert.equal(denied.status, 401);

  const listed = await api.request("/v2/admin/developers", {
    method: "GET",
    headers: adminHeaders,
  });
  assert.equal(listed.status, 200);
  const data = await json(listed);
  assert.equal(data.developers.length, 1);
  assert.deepEqual(data.developers[0], {
    developerId: developer.developerId,
    discordUserId: GUILD_1,
    displayName: "Listed Developer",
    status: "active",
    createdAt: data.developers[0].createdAt,
  });
});

testCase("admin can rotate a developer API key and the previous key stops working", async () => {
  const api = createApi();
  const developer = await createDeveloper(api, GUILD_1, "Rotate Me");
  const rotated = await api.request("/v2/admin/developer-keys/rotate", {
    body: { developerId: developer.developerId },
    headers: adminHeaders,
  });
  assert.equal(rotated.status, 201);
  const result = await json(rotated);
  assert.match(result.apiKey, /^zvh_live_[a-f0-9]{64}$/);
  assert.notEqual(result.apiKey, developer.apiKey);
  assert.equal(api.DB.apiKeys.has(result.apiKey), false);

  const oldCredential = await api.request("/v2/games", {
    method: "GET",
    headers: devHeaders(developer.apiKey),
  });
  assert.equal(oldCredential.status, 401);

  const newCredential = await api.request("/v2/games", {
    method: "GET",
    headers: devHeaders(result.apiKey),
  });
  assert.equal(newCredential.status, 200);
});

testCase("game approval and developer game listing are scoped to the authenticated developer", async () => {
  const api = createApi();
  const one = await createDeveloper(api, GUILD_1, "One");
  const two = await createDeveloper(api, GUILD_2, "Two");
  await registerApprovedGame(api, one.apiKey, "12345", "One's Game");
  await registerApprovedGame(api, two.apiKey, "67890", "Two's Game");

  const gamesOne = await api.request("/v2/games", { method: "GET", headers: devHeaders(one.apiKey) });
  const gamesTwo = await api.request("/v2/games", { method: "GET", headers: devHeaders(two.apiKey) });
  assert.deepEqual((await json(gamesOne)).games.map(game => game.universeId), ["12345"]);
  assert.deepEqual((await json(gamesTwo)).games.map(game => game.universeId), ["67890"]);

  const pending = await api.request("/v2/games/register", {
    body: { universeId: "99999", name: "Pending" }, headers: devHeaders(one.apiKey),
  });
  assert.equal(pending.status, 201);
  const issuePending = await issueForDeveloper(api, one.apiKey, MEMBER, "99999");
  assert.equal(issuePending.response.status, 403);
});

testCase("licenses cannot be issued, validated, or revoked across developer boundaries", async () => {
  const api = createApi();
  const one = await createDeveloper(api, GUILD_1, "One");
  const two = await createDeveloper(api, GUILD_2, "Two");
  await registerApprovedGame(api, one.apiKey, "12345", "One's Game");
  await registerApprovedGame(api, two.apiKey, "67890", "Two's Game");

  const issuedOne = await issueForDeveloper(api, one.apiKey, MEMBER, "12345");
  const issuedTwo = await issueForDeveloper(api, two.apiKey, MEMBER, "67890");
  assert.equal(issuedOne.response.status, 201);
  assert.equal(issuedTwo.response.status, 201);

  const crossIssue = await issueForDeveloper(api, two.apiKey, MEMBER_2, "12345");
  assert.equal(crossIssue.response.status, 403);

  const valid = await api.request("/v2/keys/validate", {
    body: { key: issuedOne.data.key, universeId: "12345", robloxUserId: MEMBER },
  });
  assert.equal(valid.status, 200);
  const validBody = await json(valid);
  assert.equal(validBody.valid, true);
  assert.equal(typeof validBody.expiresAt, "number");

  for (const [key, universeId] of [[issuedOne.data.key, "67890"], [issuedTwo.data.key, "12345"]]) {
    const response = await api.request("/v2/keys/validate", {
      body: { key, universeId, robloxUserId: MEMBER },
    });
    assert.equal(response.status, 401);
    const body = await json(response);
    assert.equal(body.valid, false);
    assert.equal(body.reason, "invalid_or_revoked");
  }

  const crossRevoke = await api.request("/v2/keys/revoke", {
    body: { key: issuedOne.data.key }, headers: devHeaders(two.apiKey),
  });
  assert.deepEqual(await json(crossRevoke), { revoked: false });

  const ownRevoke = await api.request("/v2/keys/revoke", {
    body: { key: issuedOne.data.key }, headers: devHeaders(one.apiKey),
  });
  assert.deepEqual(await json(ownRevoke), { revoked: true });
  const validateRevoked = await api.request("/v2/keys/validate", {
    body: { key: issuedOne.data.key, universeId: "12345", robloxUserId: MEMBER },
  });
  assert.equal(validateRevoked.status, 401);
});

testCase("developer integration and Discord bot operations stay bound to one guild tenant", async () => {
  const api = createApi();
  const one = await createDeveloper(api, GUILD_1, "One");
  const two = await createDeveloper(api, GUILD_2, "Two");
  await registerApprovedGame(api, one.apiKey, "12345", "One's Game");
  await registerApprovedGame(api, two.apiKey, "67890", "Two's Game");
  for (const [guildId, developerId] of [[GUILD_1, one.developerId], [GUILD_2, two.developerId]]) {
    const response = await api.request("/v2/admin/discord-integrations", {
      body: { guildId, developerId }, headers: adminHeaders,
    });
    assert.equal(response.status, 201);
  }

  const listOne = await api.request("/v2/discord/games", { body: { guildId: GUILD_1 }, headers: botHeaders });
  assert.deepEqual((await json(listOne)).games.map(game => game.universeId), ["12345"]);
  const badToken = await api.request("/v2/discord/games", { body: { guildId: GUILD_1 }, headers: { "x-bot-token": "wrong" } });
  assert.equal(badToken.status, 401);

  const issued = await api.request("/v2/discord/keys/issue", {
    body: { guildId: GUILD_1, discordUserId: MEMBER, universeId: "12345" }, headers: botHeaders,
  });
  assert.equal(issued.status, 201);
  const crossIssue = await api.request("/v2/discord/keys/issue", {
    body: { guildId: GUILD_1, discordUserId: MEMBER_2, universeId: "67890" }, headers: botHeaders,
  });
  assert.equal(crossIssue.status, 403);

  const revoke = await api.request("/v2/discord/keys/revoke", {
    body: { guildId: GUILD_1, discordUserId: MEMBER }, headers: botHeaders,
  });
  assert.deepEqual(await json(revoke), { revoked: true });
});

testCase("oversized V2 request bodies are rejected while streaming", async () => {
  const api = createApi();
  const response = await api.request("/v2/games/register", {
    body: { universeId: "12345", name: "x".repeat(17_000) },
  });
  assert.equal(response.status, 413);
  assert.deepEqual(await json(response), { error: "Request too large" });
});

testCase("malformed V2 payloads are rejected and V1 cannot bypass V2 game approval/isolation", async () => {
  const api = createApi();
  for (const body of ["null", "[]", "1", "\"text\""]) {
    const response = await api.request("/v2/keys/validate", { body });
    assert.equal(response.status, 400);
  }
  const oversized = await api.request("/v2/keys/validate", { body: { key: "x".repeat(20_000) } });
  assert.equal(oversized.status, 413);

  const developer = await createDeveloper(api, GUILD_1, "One");
  await registerApprovedGame(api, developer.apiKey, "12345", "Game");
  const issued = await issueForDeveloper(api, developer.apiKey, MEMBER, "12345");
  assert.equal(issued.response.status, 201);
  const v1 = await api.request("/v1/keys/validate", {
    body: { key: issued.data.key, universeId: "12345", robloxUserId: MEMBER },
  });
  assert.equal(v1.status, 401);
});

testCase("expired licenses fail validation", async () => {
  const api = createApi();
  const developer = await createDeveloper(api, GUILD_1, "One");
  await registerApprovedGame(api, developer.apiKey, "12345", "Game");
  const issued = await issueForDeveloper(api, developer.apiKey, MEMBER, "12345");
  const row = [...api.DB.keys.values()].find(key => key.discordUserId === MEMBER);
  row.expiresAt = Math.floor(Date.now() / 1000) - 1;
  const response = await api.request("/v2/keys/validate", {
    body: { key: issued.data.key, universeId: "12345", robloxUserId: MEMBER },
  });
  assert.equal(response.status, 401);
  assert.equal((await json(response)).reason, "expired");
  assert.equal(row.status, "expired");
});

testCase("public license validation is throttled per caller", async () => {
  const api = createApi();
  let last;
  for (let index = 0; index < 61; index++) {
    last = await api.request("/v2/keys/validate", {
      body: { key: "ZERVX-0123456789012345678901234567890123456789", universeId: "12345", robloxUserId: MEMBER },
      headers: { "cf-connecting-ip": "198.51.100.10" },
    });
  }
  assert.equal(last.status, 429);
  const otherPlayer = await api.request("/v2/keys/validate", {
    body: { key: "ZERVX-0123456789012345678901234567890123456789", universeId: "12345", robloxUserId: MEMBER_2 },
    headers: { "cf-connecting-ip": "198.51.100.10" },
  });
  assert.equal(otherPlayer.status, 403);
});

testCase("invalid, missing, and revoked developer credentials are rejected", async () => {
  const api = createApi();
  const missing = await api.request("/v2/games", { method: "GET" });
  assert.equal(missing.status, 401);

  const invalid = await api.request("/v2/keys/issue", {
    body: { discordUserId: MEMBER, universeId: "12345" },
    headers: devHeaders("zvh_live_not_a_real_credential"),
  });
  assert.equal(invalid.status, 401);

  const created = await createDeveloper(api, GUILD_1, "Developer One");
  const revoked = await api.request("/v2/admin/developer-keys/revoke", {
    body: { apiKey: created.apiKey }, headers: adminHeaders,
  });
  assert.equal(revoked.status, 200);
  const after = await api.request("/v2/games/register", {
    body: { universeId: "12345", name: "Blocked" },
    headers: devHeaders(created.apiKey),
  });
  assert.equal(after.status, 401);
});

testCase("pending and rejected games cannot issue or validate keys", async () => {
  const api = createApi();
  const developer = await createDeveloper(api, GUILD_1, "One");
  const pending = await api.request("/v2/games/register", {
    body: { universeId: "55555", name: "Pending Game" },
    headers: devHeaders(developer.apiKey),
  });
  assert.equal(pending.status, 201);
  assert.equal((await json(pending)).status, "pending");

  const pendingIssue = await issueForDeveloper(api, developer.apiKey, MEMBER, "55555");
  assert.equal(pendingIssue.response.status, 403);
  const pendingValidate = await api.request("/v2/keys/validate", {
    body: { key: "ZERVX-0123456789012345678901234567890123456789", universeId: "55555", robloxUserId: MEMBER },
  });
  assert.equal(pendingValidate.status, 403);
  assert.equal((await json(pendingValidate)).reason, "game_not_allowed");

  const rejected = await api.request("/v2/admin/games/review", {
    body: { universeId: "55555", status: "rejected" }, headers: adminHeaders,
  });
  assert.equal(rejected.status, 200);
  const rejectedIssue = await issueForDeveloper(api, developer.apiKey, MEMBER, "55555");
  assert.equal(rejectedIssue.response.status, 403);
  const listed = await api.request("/v2/games", { method: "GET", headers: devHeaders(developer.apiKey) });
  assert.deepEqual((await json(listed)).games, []);

  await registerApprovedGame(api, developer.apiKey, "12345", "Approved Game");
  const issued = await issueForDeveloper(api, developer.apiKey, MEMBER, "12345");
  assert.equal(issued.response.status, 201);
  const validated = await api.request("/v2/keys/validate", {
    body: { key: issued.data.key, universeId: "12345", robloxUserId: MEMBER },
  });
  assert.equal(validated.status, 200);
  assert.equal((await json(validated)).valid, true);
});

testCase("revoked licenses fail validation and suspended developers are blocked", async () => {
  const api = createApi();
  const developer = await createDeveloper(api, GUILD_1, "One");
  await registerApprovedGame(api, developer.apiKey, "12345", "Game");
  const issued = await issueForDeveloper(api, developer.apiKey, MEMBER, "12345");
  const revoke = await api.request("/v2/keys/revoke", {
    body: { discordUserId: MEMBER }, headers: devHeaders(developer.apiKey),
  });
  assert.deepEqual(await json(revoke), { revoked: true });
  const validated = await api.request("/v2/keys/validate", {
    body: { key: issued.data.key, universeId: "12345", robloxUserId: MEMBER },
  });
  assert.equal(validated.status, 401);
  assert.equal((await json(validated)).reason, "invalid_or_revoked");

  const second = await issueForDeveloper(api, developer.apiKey, MEMBER_2, "12345");
  assert.equal(second.response.status, 201);
  const suspended = await api.request("/v2/admin/developers/status", {
    body: { developerId: developer.developerId, status: "suspended" },
    headers: adminHeaders,
  });
  assert.equal(suspended.status, 200);
  const afterSuspend = await api.request("/v2/keys/validate", {
    body: { key: second.data.key, universeId: "12345", robloxUserId: MEMBER_2 },
  });
  assert.equal(afterSuspend.status, 403);
  assert.equal((await json(afterSuspend)).reason, "developer_suspended");
  const issueAfter = await issueForDeveloper(api, developer.apiKey, "555555555555555", "12345");
  assert.equal(issueAfter.response.status, 401);
});

testCase("legacy V1 admin authentication failures are rate limited", async () => {
  const api = createApi();
  let last;
  for (let index = 0; index < 41; index++) {
    last = await api.request("/v1/keys/issue", {
      body: { discordUserId: MEMBER },
      headers: { "x-admin-token": "incorrect-admin-token" },
    });
  }
  assert.equal(last.status, 429);
});

testCase("Discord bot credential must be configured separately from the admin token", async () => {
  const api = createApi();
  api.env.BOT_API_TOKEN = ADMIN_TOKEN;
  const response = await api.request("/v2/discord/games", {
    body: { guildId: GUILD_1 },
    headers: { "x-bot-token": ADMIN_TOKEN },
  });
  assert.equal(response.status, 401);

  // A shared secret must not continue to work through either admin API.
  const adminResponse = await api.request("/v2/admin/developers", {
    body: { discordUserId: MEMBER, displayName: "Should be denied" },
    headers: adminHeaders,
  });
  assert.equal(adminResponse.status, 401);

  const legacyAdminResponse = await api.request("/v1/keys/issue", {
    body: { discordUserId: MEMBER },
    headers: adminHeaders,
  });
  assert.equal(legacyAdminResponse.status, 401);
});

testCase("admin routes reject missing and wrong credentials", async () => {
  const api = createApi();
  const missing = await api.request("/v2/admin/developers", {
    body: { discordUserId: GUILD_1, displayName: "Nope" },
  });
  assert.equal(missing.status, 401);
  const wrong = await api.request("/v2/admin/games/review", {
    body: { universeId: "12345", status: "approved" },
    headers: { "x-admin-token": "wrong-token" },
  });
  assert.equal(wrong.status, 401);
  const malformed = await api.request("/v2/admin/developers", {
    body: { discordUserId: "123", displayName: "" },
    headers: adminHeaders,
  });
  assert.equal(malformed.status, 400);
});

testCase("legacy v1 admin actions cannot revoke or validate another developer's keys", async () => {
  const api = createApi();
  const developer = await createDeveloper(api, GUILD_1, "One");
  await registerApprovedGame(api, developer.apiKey, "12345", "Game");
  const issued = await issueForDeveloper(api, developer.apiKey, MEMBER, "12345");
  assert.equal(issued.response.status, 201);

  const v1Revoke = await api.request("/v1/keys/revoke", {
    body: { discordUserId: MEMBER },
    headers: adminHeaders,
  });
  assert.deepEqual(await json(v1Revoke), { revoked: false });

  const stillValid = await api.request("/v2/keys/validate", {
    body: { key: issued.data.key, universeId: "12345", robloxUserId: MEMBER },
  });
  assert.equal(stillValid.status, 200);

  const legacy = await api.request("/v1/keys/issue", {
    body: { discordUserId: MEMBER },
    headers: adminHeaders,
  });
  assert.equal(legacy.status, 201);
  const legacyBody = await json(legacy);
  const legacyValidate = await api.request("/v1/keys/validate", {
    body: { key: legacyBody.key, universeId: "12345", robloxUserId: MEMBER },
  });
  assert.equal(legacyValidate.status, 200);
  assert.equal((await json(legacyValidate)).valid, true);
});
