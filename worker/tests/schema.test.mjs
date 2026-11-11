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
  ]) {
    db.exec(await readFile(fileURLToPath(migrationUrl(name)), "utf8"));
  }
  return db;
}

test("migrations create isolated developer, game, and license tables", async () => {
  const db = await createDatabase();
  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all().map((row) => row.name);
  assert.deepEqual(tables, [
    "developer_api_keys",
    "developers",
    "discord_integrations",
    "games",
    "keys",
  ]);

  const indexes = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name"
  ).all().map((row) => row.name);
  assert.ok(indexes.includes("idx_keys_developer_discord_created"));
  assert.ok(indexes.includes("idx_games_developer"));
  assert.ok(indexes.includes("idx_discord_integrations_developer"));

  db.prepare(
    "INSERT INTO developers (id, discord_user_id, display_name, status, created_at) VALUES (?, ?, ?, 'active', ?)"
  ).run("dev-1", "111111111111111", "One", 1);
  db.prepare(
    "INSERT INTO developers (id, discord_user_id, display_name, status, created_at) VALUES (?, ?, ?, 'active', ?)"
  ).run("dev-2", "222222222222222", "Two", 1);
  db.prepare(
    "INSERT INTO games (id, developer_id, universe_id, name, status, created_at) VALUES (?, ?, ?, ?, 'approved', ?)"
  ).run("game-1", "dev-1", "12345", "One Game", 1);

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

test("consolidated schema.sql matches the final migration table and index set", async () => {
  const db = new DatabaseSync(":memory:");
  const snapshot = new URL("../schema.sql", import.meta.url);
  db.exec(await readFile(fileURLToPath(snapshot), "utf8"));

  const tables = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  ).all().map((row) => row.name);
  assert.deepEqual(tables, [
    "developer_api_keys",
    "developers",
    "discord_integrations",
    "games",
    "keys",
  ]);

  const columns = db.prepare("PRAGMA table_info(keys)").all().map((row) => row.name);
  assert.ok(columns.includes("developer_id"));

  const indexes = db.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'"
  ).all().map((row) => row.name);
  for (const name of [
    "idx_keys_developer_discord_created",
    "idx_games_developer",
    "idx_discord_integrations_developer",
  ]) assert.ok(indexes.includes(name), `Missing index: ${name}`);

  db.close();
});
