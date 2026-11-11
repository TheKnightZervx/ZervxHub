import test from "node:test";
import assert from "node:assert/strict";
import worker, { makeKey, verifyDiscordRequest } from "../src/index.ts";

const encoder = new TextEncoder();
const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

test("generated keys use the ZervxHub format and are unique", () => {
  const first = makeKey();
  const second = makeKey();
  assert.match(first, /^ZHX-[A-F0-9]{5}-[A-F0-9]{5}-[A-F0-9]{5}-[A-F0-9]{25}$/);
  assert.notEqual(first, second);
});

test("Discord Ed25519 signatures are accepted when valid", async () => {
  const pair = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const publicKey = toHex(new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey)));
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({ type: 1, application_id: "test-app" });
  const signature = new Uint8Array(await crypto.subtle.sign("Ed25519", pair.privateKey, encoder.encode(timestamp + body)));
  const request = new Request("https://worker.test/discord/interactions", {
    method: "POST",
    headers: {
      "x-signature-ed25519": toHex(signature),
      "x-signature-timestamp": timestamp,
    },
    body,
  });
  assert.equal(await verifyDiscordRequest(request, body, publicKey), true);
});

test("stale Discord signatures are rejected", async () => {
  const request = new Request("https://worker.test/discord/interactions", {
    method: "POST",
    headers: {
      "x-signature-ed25519": "00".repeat(64),
      "x-signature-timestamp": "1",
    },
    body: "{}",
  });
  assert.equal(await verifyDiscordRequest(request, "{}", "00".repeat(32)), false);
});

test("health endpoint returns service status", async () => {
  const response = await worker.fetch(new Request("https://worker.test/health"), {});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "zervxhub-key-api" });
});

test("Roblox verification rejects missing server authentication", async () => {
  const request = new Request("https://worker.test/v1/keys/verify", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer wrong" },
    body: JSON.stringify({ key: "ZHX-FAKE-KEY", robloxUserId: "123" }),
  });
  const response = await worker.fetch(request, { ROBLOX_SERVER_TOKEN: "server-only-secret" });
  assert.equal(response.status, 401);
});
