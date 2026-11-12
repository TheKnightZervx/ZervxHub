import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { DatabaseSync } from "node:sqlite";
import { webcrypto } from "node:crypto";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

globalThis.crypto ??= webcrypto;

class SqliteD1 {
  constructor(db) { this.db = db; }
  prepare(sql) {
    let values = [];
    const db = this.db;
    const statement = {
      bind(...args) { values = args; return statement; },
      async first() { return db.prepare(sql).get(...values) ?? null; },
      async all() { return { results: db.prepare(sql).all(...values) }; },
      async run() {
        const result = db.prepare(sql).run(...values);
        return { meta: { changes: Number(result.changes) } };
      }
    };
    return statement;
  }
  async batch(statements) {
    this.db.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.db.exec("COMMIT");
      return results;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}

let worker;
let buildDir;
let db;
let env;
let sentEmails;

before(async () => {
  buildDir = await mkdtemp(join(tmpdir(), "zervxhub-mobile-tests-"));
  const outfile = join(buildDir, "worker.mjs");
  await build({
    entryPoints: [fileURLToPath(new URL("../src/index.ts", import.meta.url))],
    bundle: true, platform: "node", format: "esm", target: "node22", outfile
  });
  worker = (await import(pathToFileURL(outfile).href)).default;
  db = new DatabaseSync(":memory:");
  db.exec(await readFile(new URL("../migrations/0007_mobile_identity_and_chat.sql", import.meta.url), "utf8"));
  sentEmails = [];
  env = {
    DB: new SqliteD1(db),
    KEY_PEPPER: "test-only-mobile-pepper",
    ADMIN_TOKEN: "test-admin",
    ALLOWED_UNIVERSE_IDS: "",
    MAILER: {
      async fetch(request) {
        sentEmails.push(await request.json());
        return new Response(null, { status: 202 });
      }
    }
  };
});

after(async () => {
  db?.close();
  if (buildDir) await rm(buildDir, { recursive: true, force: true });
});

async function call(path, { method = "GET", body, token, ip = "198.51.100.10" } = {}) {
  const headers = { "cf-connecting-ip": ip };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (token) headers.authorization = `Bearer ${token}`;
  return worker.fetch(new Request(`https://api.example.test${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  }), env);
}
async function json(response) { return response.json(); }
async function signIn(email, ip) {
  const requested = await call("/v2/mobile/auth/email/request-code", {
    method: "POST", body: { email }, ip
  });
  assert.equal(requested.status, 202);
  const challenge = await json(requested);
  const mail = sentEmails.at(-1);
  const code = mail.text.match(/code is (\d{6})/)[1];
  const verified = await call("/v2/mobile/auth/email/verify-code", {
    method: "POST", body: { challengeId: challenge.challengeId, code }, ip
  });
  assert.equal(verified.status, 200);
  return json(verified);
}

test("email OTP is delivered, single-use, and raw code is not stored", async () => {
  const requested = await call("/v2/mobile/auth/email/request-code", {
    method: "POST", body: { email: "one@example.test" }
  });
  assert.equal(requested.status, 202);
  const challenge = await json(requested);
  const code = sentEmails.at(-1).text.match(/code is (\d{6})/)[1];
  const stored = db.prepare("SELECT code_hash FROM mobile_email_challenges WHERE id = ?").get(challenge.challengeId);
  assert.notEqual(stored.code_hash, code);
  assert.match(stored.code_hash, /^[a-f0-9]{64}$/);
  const verified = await call("/v2/mobile/auth/email/verify-code", {
    method: "POST", body: { challengeId: challenge.challengeId, code }
  });
  assert.equal(verified.status, 200);
  const reused = await call("/v2/mobile/auth/email/verify-code", {
    method: "POST", body: { challengeId: challenge.challengeId, code }
  });
  assert.equal(reused.status, 400);
  const sessionCount = db.prepare("SELECT COUNT(*) AS count FROM mobile_sessions").get().count;
  assert.equal(sessionCount, 1);
});

test("OTP rejects wrong codes and caps verification attempts", async () => {
  const requested = await call("/v2/mobile/auth/email/request-code", {
    method: "POST", body: { email: "attempts@example.test" }, ip: "198.51.100.11"
  });
  const challenge = await json(requested);
  for (let i = 0; i < 5; i++) {
    const response = await call("/v2/mobile/auth/email/verify-code", {
      method: "POST", body: { challengeId: challenge.challengeId, code: "000000" }, ip: "198.51.100.11"
    });
    assert.equal(response.status, 400);
  }
  const attempts = db.prepare("SELECT attempts FROM mobile_email_challenges WHERE id = ?").get(challenge.challengeId).attempts;
  assert.equal(attempts, 5);
});

test("global chat accepts text/emoji but rejects media payloads", async () => {
  const account = await signIn("global@example.test", "198.51.100.12");
  const rejected = await call("/v2/mobile/chat/global/messages", {
    method: "POST", token: account.token, body: { content: "hello", attachment: { name: "x.png" } }
  });
  assert.equal(rejected.status, 403);
  const sent = await call("/v2/mobile/chat/global/messages", {
    method: "POST", token: account.token, body: { content: "Hello ZervxHub 🔥" }
  });
  assert.equal(sent.status, 201);
  const feed = await call("/v2/mobile/chat/global/messages", { token: account.token });
  assert.equal((await json(feed)).messages[0].content, "Hello ZervxHub 🔥");
});

test("direct messages are visible only to the two conversation members", async () => {
  const one = await signIn("one-dm@example.test", "198.51.100.13");
  const two = await signIn("two-dm@example.test", "198.51.100.14");
  const outsider = await signIn("outsider@example.test", "198.51.100.15");
  const created = await call("/v2/mobile/chat/direct", {
    method: "POST", token: one.token, body: { recipientUserId: two.user.id }
  });
  assert.equal(created.status, 201);
  const conversationId = (await json(created)).conversationId;
  const sent = await call(`/v2/mobile/chat/conversations/${conversationId}/messages`, {
    method: "POST", token: one.token, body: { content: "private hello" }
  });
  assert.equal(sent.status, 201);
  const visible = await call(`/v2/mobile/chat/conversations/${conversationId}/messages`, { token: two.token });
  assert.equal((await json(visible)).messages[0].content, "private hello");
  const denied = await call(`/v2/mobile/chat/conversations/${conversationId}/messages`, { token: outsider.token });
  assert.equal(denied.status, 404);
});

test("unauthenticated chat and account requests are denied", async () => {
  assert.equal((await call("/v2/mobile/account")).status, 401);
  assert.equal((await call("/v2/mobile/chat/global/messages")).status, 401);
});

test("session refresh rotates token and logout-all revokes active sessions", async () => {
  const account = await signIn("sessions@example.test", "198.51.100.16");
  const refreshed = await call("/v2/mobile/auth/session/refresh", { method: "POST", token: account.token, body: {} });
  assert.equal(refreshed.status, 200);
  const next = await json(refreshed);
  assert.notEqual(next.token, account.token);
  assert.equal((await call("/v2/mobile/account", { token: account.token })).status, 401);
  const logout = await call("/v2/mobile/auth/session/logout-all", { method: "POST", token: next.token, body: {} });
  assert.equal(logout.status, 200);
  assert.equal((await call("/v2/mobile/account", { token: next.token })).status, 401);
});
