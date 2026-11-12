import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createHmac, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

let worker;
let cryptoMod;
let buildDir;

before(async () => {
  buildDir = await mkdtemp(join(tmpdir(), "zervxhub-crypto-tests-"));
  const workerOutfile = join(buildDir, "worker.mjs");
  const cryptoOutfile = join(buildDir, "crypto.mjs");

  await build({
    entryPoints: [
      fileURLToPath(new URL("../src/index.ts", import.meta.url)),
    ],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: workerOutfile,
  });

  await build({
    entryPoints: [
      fileURLToPath(new URL("../src/crypto.ts", import.meta.url)),
    ],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile: cryptoOutfile,
  });

  const workerBuilt = await import(pathToFileURL(workerOutfile).href);
  worker = workerBuilt.default;
  cryptoMod = await import(pathToFileURL(cryptoOutfile).href);
});

after(async () => {
  if (buildDir) await rm(buildDir, { recursive: true, force: true });
});

class MockD1 {
  keys = new Map();
  developers = new Map();
  developerApiKeys = new Map();
  games = new Map();
  gameServerKeys = new Map();
  validationRequests = new Map();

  prepare(sql) {
    let args = [];
    const db = this;
    const normalized = sql.replace(/\s+/g, " ").trim();

    const statement = {
      bind(...values) {
        args = values;
        return statement;
      },
      async first() {
        if (normalized.startsWith("SELECT d.id")) {
          const [hash1, hash2] = args;
          const apiKey = db.developerApiKeys.get(hash1) || (hash2 && db.developerApiKeys.get(hash2));
          const developer = apiKey && db.developers.get(apiKey.developerId);
          return apiKey && !apiKey.revokedAt && developer?.status === "active"
            ? { id: developer.id, key_hash: apiKey.keyHash || hash1 }
            : null;
        }

        if (normalized.startsWith("SELECT status, expires_at, allowed_universe_ids, developer_id")) {
          const [hash1, hash2] = args;
          const key = db.keys.get(hash1) || (hash2 && db.keys.get(hash2));
          return key
            ? {
                status: key.status,
                expires_at: key.expiresAt,
                allowed_universe_ids: key.allowedUniverseIds,
                developer_id: key.developerId,
                key_hash: key.keyHash || hash1,
                bound_roblox_user_id: key.boundRobloxUserId ?? null,
              }
            : null;
        }

        if (normalized.includes("FROM keys WHERE") && normalized.includes("developer_id IS NULL")) {
          const [hash1, hash2] = args;
          const key = db.keys.get(hash1) || (hash2 && db.keys.get(hash2));
          return key && key.developerId == null
            ? {
                status: key.status,
                expires_at: key.expiresAt,
                allowed_universe_ids: key.allowedUniverseIds,
                key_hash: key.keyHash || hash1,
                bound_roblox_user_id: key.boundRobloxUserId ?? null,
              }
            : null;
        }

        if (normalized.startsWith("SELECT g.developer_id, d.status AS developer_status")) {
          const [universeId] = args;
          const game = [...db.games.values()].find(
            (g) => g.universeId === universeId && g.status === "approved"
          );
          if (!game) return null;
          const dev = db.developers.get(game.developerId);
          return dev ? { developer_id: game.developerId, developer_status: dev.status } : null;
        }

        if (normalized.startsWith("SELECT k.developer_id AS developerId")) {
          const [keyHash, universeId] = args;
          const key = db.gameServerKeys.get(keyHash);
          const game = [...db.games.values()].find(
            (row) => row.universeId === universeId &&
              row.developerId === key?.developerId &&
              row.status === "approved"
          );
          const developer = key && db.developers.get(key.developerId);
          return key && key.universeId === universeId && !key.revokedAt && game && developer
            ? { developerId: key.developerId, developerStatus: developer.status }
            : null;
        }

        if (normalized.startsWith("SELECT id FROM games")) {
          const [developerId, universeId] = args;
          const game = [...db.games.values()].find(
            (g) => g.developerId === developerId && g.universeId === universeId && g.status === "approved"
          );
          return game ? { id: game.id } : null;
        }

        return null;
      },
      async all() {
        if (normalized.startsWith("SELECT universe_id AS universeId, name, status, verified_at AS verifiedAt FROM games")) {
          const [developerId] = args;
          return {
            results: [...db.games.values()]
              .filter((g) => g.developerId === developerId && g.status === "approved")
              .map(({ universeId, name, status, verifiedAt }) => ({ universeId, name, status, verifiedAt })),
          };
        }

        return { results: [] };
      },
      async run() {
        if (normalized.startsWith("DELETE FROM game_validation_requests")) {
          const [now] = args;
          let changes = 0;
          for (const [requestId, request] of db.validationRequests) {
            if (request.expiresAt <= now) {
              db.validationRequests.delete(requestId);
              changes++;
            }
          }
          return { meta: { changes } };
        }

        if (normalized.startsWith("INSERT OR IGNORE INTO game_validation_requests")) {
          const [requestId, universeId, expiresAt] = args;
          if (db.validationRequests.has(requestId)) return { meta: { changes: 0 } };
          db.validationRequests.set(requestId, { universeId, expiresAt });
          return { meta: { changes: 1 } };
        }

        if (normalized.startsWith("INSERT INTO developers")) {
          const [id, discordUserId, displayName, status, createdAt] = args;
          db.developers.set(id, { id, discordUserId, displayName, status, createdAt });
          return { meta: { changes: 1 } };
        }

        if (normalized.startsWith("INSERT INTO developer_api_keys")) {
          const [keyHash, developerId, createdAt] = args;
          db.developerApiKeys.set(keyHash, { keyHash, developerId, createdAt, revokedAt: null });
          return { meta: { changes: 1 } };
        }

        if (normalized.startsWith("UPDATE developer_api_keys SET revoked_at")) {
          const [revokedAt, hash1, hash2] = args;
          const key = db.developerApiKeys.get(hash1) || (hash2 && db.developerApiKeys.get(hash2));
          if (!key || key.revokedAt) return { meta: { changes: 0 } };
          key.revokedAt = revokedAt;
          return { meta: { changes: 1 } };
        }

        if (normalized.startsWith("UPDATE keys SET status = 'revoked'")) {
          if (normalized.includes("developer_id = ?")) {
            const [hash1, hash2, developerId] = args;
            const key = db.keys.get(hash1) || (hash2 && db.keys.get(hash2));
            if (key && key.developerId === developerId && key.status === "active") {
              key.status = "revoked";
              return { meta: { changes: 1 } };
            }
          }
          return { meta: { changes: 0 } };
        }

        if (normalized.startsWith("UPDATE keys SET last_used_at")) {
          const legacy = normalized.includes("developer_id IS NULL");
          const [lastUsedAt, robloxUserId, boundUserId, hash] = args;
          const developerId = legacy ? null : args[4];
          const expiresAt = args[legacy ? 4 : 5];
          const expectedBoundUserId = args[legacy ? 5 : 6];
          const key = db.keys.get(hash);
          if (
            key &&
            (legacy
              ? key.developerId == null
              : key.developerId === developerId) &&
            key.status === "active" &&
            key.expiresAt > expiresAt &&
            (!key.boundRobloxUserId || key.boundRobloxUserId === expectedBoundUserId)
          ) {
            key.lastUsedAt = lastUsedAt;
            key.lastRobloxUserId = robloxUserId;
            key.boundRobloxUserId = boundUserId;
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }

        if (normalized.startsWith("UPDATE keys SET key_hash = ? WHERE key_hash = ?")) {
          const [newHash, oldHash] = args;
          const key = db.keys.get(oldHash);
          if (key) {
            db.keys.delete(oldHash);
            key.keyHash = newHash;
            db.keys.set(newHash, key);
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 0 } };
        }

        if (normalized.startsWith("INSERT INTO keys")) {
          const [keyHash, discordUserId, createdAt, expiresAt, allowedUniverseIds, developerId] = args;
          db.keys.set(keyHash, {
            keyHash,
            discordUserId,
            status: "active",
            createdAt,
            expiresAt,
            allowedUniverseIds,
            developerId,
            lastUsedAt: null,
            lastRobloxUserId: null,
          });
          return { meta: { changes: 1 } };
        }

        return { meta: { changes: 0 } };
      },
    };
    return statement;
  }

  async batch(statements) {
    const results = [];
    for (const stmt of statements) {
      results.push(await stmt.run());
    }
    return results;
  }
}

function createTestEnv(pepper = "test-secret-pepper", db = new MockD1()) {
  return {
    DB: db,
    ADMIN_TOKEN: "admin-secret-token",
    BOT_API_TOKEN: "bot-secret-token",
    KEY_PEPPER: pepper,
    ALLOWED_UNIVERSE_IDS: "12345,67890",
  };
}

async function addGameServerKey(env, developerId, universeId) {
  const serverKey = `zvh_game_test_${developerId}_${universeId}`;
  const keyHash = await cryptoMod.hashCredential(serverKey, env.KEY_PEPPER);
  env.DB.gameServerKeys.set(keyHash, {
    keyHash,
    universeId,
    developerId,
    revokedAt: null,
  });
  return serverKey;
}

const validationBody = (key, universeId, robloxUserId) => ({
  key,
  universeId,
  robloxUserId,
  requestId: randomUUID(),
  timestamp: Math.floor(Date.now() / 1000),
});

async function apiRequest(env, path, options = {}) {
  const { method = "POST", body, headers = {} } = options;
  const req = new Request(`https://test.zervxhub.dev${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const res = await worker.fetch(req, env);
  let data = {};
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, data };
}

test("1. correct HMAC generation matches standard HMAC-SHA-256", async () => {
  const pepper = "secret-pepper";
  const message = "ZERVX-TEST-KEY";
  const expectedHmac = createHmac("sha256", pepper).update(message).digest("hex");

  const generated = await cryptoMod.hmacSha256(message, pepper);
  assert.equal(generated, expectedHmac);
  assert.equal(generated.length, 64);

  const hashedCred = await cryptoMod.hashCredential(message, pepper);
  assert.equal(hashedCred, expectedHmac);
});

test("2. missing pepper handling: fails safely with HTTP 500", async () => {
  const envNoPepper = createTestEnv("");
  delete envNoPepper.KEY_PEPPER;

  // V2 route fails safely
  const v2Res = await apiRequest(envNoPepper, "/v2/keys/validate", {
    body: { key: "ZERVX-12345-67890-12345-67890", universeId: "12345", robloxUserId: "100" },
  });
  assert.equal(v2Res.status, 500);
  assert.match(v2Res.data.error, /KEY_PEPPER is required/i);

  // V1 route fails safely
  const v1Res = await apiRequest(envNoPepper, "/v1/keys/validate", {
    body: { key: "ZERVX-12345-67890-12345-67890", universeId: "12345", robloxUserId: "100" },
  });
  assert.equal(v1Res.status, 500);
  assert.match(v1Res.data.error, /KEY_PEPPER is required/i);

  // Crypto module itself throws on missing pepper
  await assert.rejects(async () => {
    await cryptoMod.hmacSha256("test-key", "");
  }, /Missing or invalid KEY_PEPPER/);
});

test("3. key issuance and subsequent validation using HMAC pepper", async () => {
  const env = createTestEnv("secret-pepper-3");
  const devId = "dev-test-1";

  // Setup developer and approved game
  env.DB.developers.set(devId, { id: devId, status: "active" });
  env.DB.games.set("g1", { id: "g1", developerId: devId, universeId: "12345", status: "approved" });
  const serverKey = await addGameServerKey(env, devId, "12345");
  const devApiKey = "zvh_live_0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  const devKeyHash = await cryptoMod.hashCredential(devApiKey, env.KEY_PEPPER);
  env.DB.developerApiKeys.set(devKeyHash, { keyHash: devKeyHash, developerId: devId, revokedAt: null });

  // Issue key
  const issueRes = await apiRequest(env, "/v2/keys/issue", {
    headers: { "x-developer-key": devApiKey },
    body: { discordUserId: "111111111111111", universeId: "12345" },
  });
  assert.equal(issueRes.status, 201);
  assert.match(issueRes.data.key, /^ZERVX-/);

  // Verify key is stored as HMAC hash, not raw key
  assert.equal(env.DB.keys.has(issueRes.data.key), false);
  const expectedHash = await cryptoMod.hashCredential(issueRes.data.key, env.KEY_PEPPER);
  assert.equal(env.DB.keys.has(expectedHash), true);

  // Validate key
  const validateRes = await apiRequest(env, "/v2/keys/validate", {
    headers: { "x-game-server-key": serverKey },
    body: validationBody(issueRes.data.key, "12345", "99999"),
  });
  assert.equal(validateRes.status, 200);
  assert.equal(validateRes.data.valid, true);
});

test("4. incorrect key rejection: modified key fails validation", async () => {
  const env = createTestEnv("secret-pepper-4");
  const devId = "dev-test-2";
  env.DB.developers.set(devId, { id: devId, status: "active" });
  env.DB.games.set("g1", { id: "g1", developerId: devId, universeId: "12345", status: "approved" });

  const rawKey = "ZERVX-AAAAA-BBBBB-CCCCC-DDDDD";
  const keyHash = await cryptoMod.hashCredential(rawKey, env.KEY_PEPPER);
  env.DB.keys.set(keyHash, {
    keyHash,
    developerId: devId,
    status: "active",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    allowedUniverseIds: "12345",
  });
  const serverKey = await addGameServerKey(env, devId, "12345");

  // Valid key passes
  const validRes = await apiRequest(env, "/v2/keys/validate", {
    headers: { "x-game-server-key": serverKey },
    body: validationBody(rawKey, "12345", "100"),
  });
  assert.equal(validRes.status, 200);
  assert.equal(validRes.data.valid, true);

  // Tampered key fails with 401
  const tamperedKey = "ZERVX-AAAAA-BBBBB-CCCCC-EEEEE";
  const invalidRes = await apiRequest(env, "/v2/keys/validate", {
    headers: { "x-game-server-key": serverKey },
    body: validationBody(tamperedKey, "12345", "100"),
  });
  assert.equal(invalidRes.status, 401);
  assert.equal(invalidRes.data.valid, false);
  assert.equal(invalidRes.data.reason, "invalid_or_revoked");
});

test("5. incorrect pepper rejection: key issued with pepper A fails on pepper B", async () => {
  const envA = createTestEnv("pepper-A");
  const envB = createTestEnv("pepper-B");
  const devId = "dev-test-3";

  // Register in DB shared by server
  const db = new MockD1();
  envA.DB = db;
  envB.DB = db;

  db.developers.set(devId, { id: devId, status: "active" });
  db.games.set("g1", { id: "g1", developerId: devId, universeId: "12345", status: "approved" });
  const serverKey = await addGameServerKey(envA, devId, "12345");

  const rawKey = "ZERVX-11111-22222-33333-44444";
  // Stored with Pepper A
  const hashA = await cryptoMod.hashCredential(rawKey, envA.KEY_PEPPER);
  db.keys.set(hashA, {
    keyHash: hashA,
    developerId: devId,
    status: "active",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    allowedUniverseIds: "12345",
  });

  // Server running with Pepper A accepts key
  const resA = await apiRequest(envA, "/v2/keys/validate", {
    headers: { "x-game-server-key": serverKey },
    body: validationBody(rawKey, "12345", "100"),
  });
  assert.equal(resA.status, 200);
  assert.equal(resA.data.valid, true);

  // Server running with Pepper B rejects key
  const resB = await apiRequest(envB, "/v2/keys/validate", {
    headers: { "x-game-server-key": serverKey },
    body: validationBody(rawKey, "12345", "100"),
  });
  assert.equal(resB.status, 401);
  assert.equal(resB.data.valid, false);
});

test("6. existing credential compatibility: legacy SHA-256 keys work and upgrade", async () => {
  const env = createTestEnv("modern-pepper");
  const devId = "dev-legacy";
  env.DB.developers.set(devId, { id: devId, status: "active" });
  env.DB.games.set("g1", { id: "g1", developerId: devId, universeId: "12345", status: "approved" });

  const rawLegacyKey = "ZERVX-LEGACY-KEY-99999-00000";
  // Pre-pepper legacy hash is plain SHA-256
  const legacyHash = await cryptoMod.sha256(rawLegacyKey);
  const modernHmac = await cryptoMod.hashCredential(rawLegacyKey, env.KEY_PEPPER);
  const serverKey = await addGameServerKey(env, devId, "12345");

  assert.notEqual(legacyHash, modernHmac);

  // Stored in DB under legacy plain hash
  env.DB.keys.set(legacyHash, {
    keyHash: legacyHash,
    developerId: devId,
    status: "active",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    allowedUniverseIds: "12345",
  });

  // Validation with modern server accepts the legacy credential seamlessly
  const validateRes = await apiRequest(env, "/v2/keys/validate", {
    headers: { "x-game-server-key": serverKey },
    body: validationBody(rawLegacyKey, "12345", "100"),
  });
  assert.equal(validateRes.status, 200);
  assert.equal(validateRes.data.valid, true);

  // Stored hash has been upgraded in place to HMAC-SHA-256
  assert.equal(env.DB.keys.has(legacyHash), false);
  assert.equal(env.DB.keys.has(modernHmac), true);

  // Legacy developer API key compatibility
  const rawDevKey = "zvh_live_legacy_developer_credential_12345678";
  const legacyDevHash = await cryptoMod.sha256(rawDevKey);
  const modernDevHash = await cryptoMod.hashCredential(rawDevKey, env.KEY_PEPPER);
  env.DB.developerApiKeys.set(legacyDevHash, { keyHash: legacyDevHash, developerId: devId, revokedAt: null });

  const devRes = await apiRequest(env, "/v2/games", {
    method: "GET",
    headers: { "x-developer-key": rawDevKey },
  });
  assert.equal(devRes.status, 200);
  assert.equal(devRes.data.games.length, 1);
});

test("7. revoked key rejection: revoked keys cannot be validated", async () => {
  const env = createTestEnv("secret-pepper-7");
  const devId = "dev-test-4";
  env.DB.developers.set(devId, { id: devId, status: "active" });
  env.DB.games.set("g1", { id: "g1", developerId: devId, universeId: "12345", status: "approved" });

  const rawKey = "ZERVX-REVOKE-ME-12345-67890";
  const keyHash = await cryptoMod.hashCredential(rawKey, env.KEY_PEPPER);
  env.DB.keys.set(keyHash, {
    keyHash,
    developerId: devId,
    status: "active",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    allowedUniverseIds: "12345",
  });
  const serverKey = await addGameServerKey(env, devId, "12345");

  // Revoke the key
  const revokeRes = await apiRequest(env, "/v2/keys/revoke", {
    headers: { "x-developer-key": "fake-dev" }, // bypass check in test
    body: { key: rawKey },
  });
  // Perform direct revocation in DB
  const entry = env.DB.keys.get(keyHash);
  entry.status = "revoked";

  // Validate fails
  const res = await apiRequest(env, "/v2/keys/validate", {
    headers: { "x-game-server-key": serverKey },
    body: validationBody(rawKey, "12345", "100"),
  });
  assert.equal(res.status, 401);
  assert.equal(res.data.reason, "invalid_or_revoked");
});

test("8. cross-developer credential isolation", async () => {
  const env = createTestEnv("secret-pepper-8");
  const dev1 = "dev-1";
  const dev2 = "dev-2";
  env.DB.developers.set(dev1, { id: dev1, status: "active" });
  env.DB.developers.set(dev2, { id: dev2, status: "active" });
  env.DB.games.set("g1", { id: "g1", developerId: dev1, universeId: "11111", status: "approved" });
  env.DB.games.set("g2", { id: "g2", developerId: dev2, universeId: "22222", status: "approved" });

  const key1 = "ZERVX-DEV1-KEY-00000-11111";
  const keyHash1 = await cryptoMod.hashCredential(key1, env.KEY_PEPPER);
  env.DB.keys.set(keyHash1, {
    keyHash: keyHash1,
    developerId: dev1,
    status: "active",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    allowedUniverseIds: "11111",
  });
  const serverKey1 = await addGameServerKey(env, dev1, "11111");
  const serverKey2 = await addGameServerKey(env, dev2, "22222");

  // Valid for Game 1 (Developer 1)
  const okRes = await apiRequest(env, "/v2/keys/validate", {
    headers: { "x-game-server-key": serverKey1 },
    body: validationBody(key1, "11111", "100"),
  });
  assert.equal(okRes.status, 200);

  // Attempt to use Key 1 for Game 2 (Developer 2) fails closed
  const crossRes = await apiRequest(env, "/v2/keys/validate", {
    headers: { "x-game-server-key": serverKey2 },
    body: validationBody(key1, "22222", "100"),
  });
  assert.equal(crossRes.status, 401);
  assert.equal(crossRes.data.reason, "invalid_or_revoked");
});
