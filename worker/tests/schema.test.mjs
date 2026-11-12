import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const migrationUrl = (name) => new URL(`../migrations/${name}`, import.meta.url);

async function createDatabase() {
  const db = new DatabaseSync(":memory:");
  for (const name of [
    "0000_initial_keys.sql",
    "0001_multi_developer_foundation.sql",
    "0002_lookup_indexes.sql",
    "0003_dashboard_accounts_and_subscriptions.sql",
    "0004_license_account_binding.sql",
    "0005_game_server_credentials.sql",
    "0006_game_validation_replay_protection.sql",
    "0007_mobile_identity_and_chat.sql",
  ]) {
    db.exec(await readFile(fileURLToPath(migrationUrl(name)), "utf8"));
  }
  return db;
}

function schemaShape(db) {
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all();

  return tables.map(({ name }) => ({
    name,
    columns: db.prepare(`PRAGMA table_info("${name}")`).all().map((column) => [
      column.name,
      column.type,
      column.notnull,
      column.dflt_value,
      column.pk,
    ]),
    foreignKeys: db.prepare(`PRAGMA foreign_key_list("${name}")`).all().map((key) => [
      key.table,
      key.from,
      key.to,
      key.on_update,
      key.on_delete,
    ]),
    indexes: db.prepare(`PRAGMA index_list("${name}")`).all()
      .map((index) => ({
        name: index.name,
        unique: index.unique,
        columns: db.prepare(`PRAGMA index_info("${index.name}")`).all().map((column) => column.name),
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  }));
}

test("consolidated schema snapshot matches the migration chain", async () => {
  const migrated = await createDatabase();
  const snapshot = new DatabaseSync(":memory:");
  snapshot.exec(await readFile(fileURLToPath(new URL("../schema.sql", import.meta.url)), "utf8"));

  assert.deepEqual(schemaShape(snapshot), schemaShape(migrated));
  snapshot.close();
  migrated.close();
});

test("migrations create isolated developer, game, and license tables", async () => {
  const db = await createDatabase();
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all().map((row) => row.name);
  assert.deepEqual(tables, [
    "developer_api_keys",
    "developer_sessions",
    "developer_subscriptions",
    "developers",
    "discord_integrations",
    "game_server_keys",
    "game_validation_requests",
    "games",
    "keys",
    "license_events",
    "license_validation_daily",
    "mobile_conversation_members",
    "mobile_conversations",
    "mobile_email_challenges",
    "mobile_messages",
    "mobile_rate_limits",
    "mobile_reports",
    "mobile_sessions",
    "mobile_user_blocks",
    "mobile_users",
    "subscription_change_requests",
  ]);

  const indexes = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name"
  ).all().map((row) => row.name);
  assert.ok(indexes.includes("idx_keys_developer_discord_created"));
  assert.ok(indexes.includes("idx_games_developer"));
  assert.ok(indexes.includes("idx_games_developer_universe"));
  assert.ok(indexes.includes("idx_game_server_keys_active_universe"));
  assert.ok(indexes.includes("idx_game_validation_requests_expiry"));
  assert.ok(indexes.includes("idx_discord_integrations_developer"));
  assert.ok(indexes.includes("idx_developer_sessions_developer"));
  assert.ok(indexes.includes("idx_license_validation_developer_date"));

  db.prepare(
    "INSERT INTO developers (id, discord_user_id, display_name, status, created_at) VALUES (?, ?, ?, 'active', ?)"
  ).run("dev-1", "111111111111111", "One", 1);
  db.prepare(
    "INSERT INTO developers (id, discord_user_id, display_name, status, created_at) VALUES (?, ?, ?, 'active', ?)"
  ).run("dev-2", "222222222222222", "Two", 1);
  db.prepare(
    "INSERT INTO games (id, developer_id, universe_id, name, status, created_at) VALUES (?, ?, ?, ?, 'approved', ?)"
  ).run("game-1", "dev-1", "12345", "One Game", 1);
  db.prepare(
    "INSERT INTO game_server_keys (key_hash, universe_id, developer_id, created_at) VALUES (?, ?, ?, ?)"
  ).run("server-hash", "12345", "dev-1", 2);
  assert.throws(() => {
    db.prepare(
      "INSERT INTO game_server_keys (key_hash, universe_id, developer_id, created_at) VALUES (?, ?, ?, ?)"
    ).run("cross-tenant-server-hash", "12345", "dev-2", 2);
  });
  assert.throws(() => {
    db.prepare(
      "INSERT INTO game_server_keys (key_hash, universe_id, developer_id, created_at) VALUES (?, ?, ?, ?)"
    ).run("duplicate-server-hash", "12345", "dev-1", 3);
  });

  assert.throws(() => {
    db.prepare(
      "INSERT INTO games (id, developer_id, universe_id, name, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)"
    ).run("game-2", "dev-2", "12345", "Taken", 1);
  });

  assert.throws(() => {
    db.prepare(
      "INSERT INTO games (id, developer_id, universe_id, name, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)"
    ).run("game-3", "missing-developer", "99999", "Orphan", 1);
  });

  db.prepare(
    `INSERT INTO keys (key_hash, discord_user_id, status, created_at, expires_at, allowed_universe_ids, developer_id)
     VALUES (?, ?, 'active', ?, ?, ?, ?)`
  ).run("hash-1", "333333333333333", 1, 2, "12345", "dev-1");
  db.prepare(
    `INSERT INTO keys (key_hash, discord_user_id, status, created_at, expires_at, allowed_universe_ids)
     VALUES (?, ?, 'active', ?, ?, ?)`
  ).run("legacy-hash", "333333333333333", 1, 2, "12345");

  const scoped = db.prepare(
    "SELECT key_hash FROM keys WHERE discord_user_id = ? AND developer_id IS NULL"
  ).all("333333333333333").map((row) => ({ ...row }));
  assert.deepEqual(scoped, [{ key_hash: "legacy-hash" }]);

  assert.throws(() => {
    db.prepare("DELETE FROM developers WHERE id = ?").run("dev-1");
  });
  db.close();
});

test("dashboard migration preserves existing rows and backfills public identifiers", async () => {
  const db = new DatabaseSync(":memory:");
  for (const name of [
    "0000_initial_keys.sql",
    "0001_multi_developer_foundation.sql",
    "0002_lookup_indexes.sql",
  ]) {
    db.exec(await readFile(fileURLToPath(migrationUrl(name)), "utf8"));
  }
  db.prepare(
    "INSERT INTO developers (id, discord_user_id, display_name, status, created_at) VALUES (?, ?, ?, 'active', ?)"
  ).run("existing-developer", "111111111111111", "Existing", 10);
  db.prepare(
    "INSERT INTO developer_api_keys (key_hash, developer_id, created_at) VALUES (?, ?, ?)"
  ).run("existing-api-hash", "existing-developer", 11);
  db.prepare(
    `INSERT INTO keys
       (key_hash, discord_user_id, status, created_at, expires_at, allowed_universe_ids,
        last_roblox_user_id, developer_id)
     VALUES (?, ?, 'active', ?, ?, ?, ?, ?)`
  ).run("existing-license-hash", "222222222222222", 12, 100, "12345", "987654321", "existing-developer");

  db.exec(await readFile(fileURLToPath(migrationUrl("0003_dashboard_accounts_and_subscriptions.sql")), "utf8"));
  db.exec(await readFile(fileURLToPath(migrationUrl("0004_license_account_binding.sql")), "utf8"));
  db.prepare(
    "INSERT INTO games (id, developer_id, universe_id, name, status, created_at) VALUES (?, ?, ?, ?, 'approved', ?)"
  ).run("existing-game", "existing-developer", "12345", "Existing Game", 13);
  db.exec(await readFile(fileURLToPath(migrationUrl("0005_game_server_credentials.sql")), "utf8"));
  db.exec(await readFile(fileURLToPath(migrationUrl("0006_game_validation_replay_protection.sql")), "utf8"));
  const apiKey = db.prepare(
    "SELECT developer_id, public_id FROM developer_api_keys WHERE key_hash = ?"
  ).get("existing-api-hash");
  const license = db.prepare(
    "SELECT developer_id, public_id, validation_count, status, last_roblox_user_id, bound_roblox_user_id FROM keys WHERE key_hash = ?"
  ).get("existing-license-hash");
  assert.equal(apiKey.developer_id, "existing-developer");
  assert.match(apiKey.public_id, /^[a-f0-9]{32}$/);
  assert.equal(license.developer_id, "existing-developer");
  assert.match(license.public_id, /^[a-f0-9]{32}$/);
  assert.equal(license.validation_count, 0);
  assert.equal(license.status, "active");
  assert.equal(license.last_roblox_user_id, "987654321");
  assert.equal(license.bound_roblox_user_id, "987654321");
  db.close();
});
