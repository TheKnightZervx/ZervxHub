import assert from "node:assert/strict";
import { test } from "node:test";
import { filterGameChoices, guildIdsFromEnv, issueReply, revokeReply } from "../src/licensing.js";

test("game autocomplete stays inside Discord's choice limit", () => {
  const games = Array.from({ length: 30 }, (_, index) => ({
    name: `Game ${index}`,
    universeId: String(1000 + index),
  }));
  const choices = filterGameChoices(games, "game 2");
  assert.ok(choices.length > 0);
  assert.ok(choices.length <= 25);
  assert.equal(choices[0].value, "1002");
  assert.deepEqual(filterGameChoices([{ name: 1, universeId: "1" }], ""), []);
  assert.deepEqual(filterGameChoices(null, ""), []);
});

test("key replies explain cooldown, refusal, and success without asking for another channel", () => {
  assert.match(issueReply(429, { error: "This member already received a key in the last 24 hours" }), /24 hours/);
  assert.match(issueReply(429, {}), /Wait a minute|24-hour cooldown/);
  assert.equal(issueReply(404, {}), "This Discord server is not connected to ZervxHub.");
  assert.match(issueReply(401, { error: "Unauthorized" }), /bot API token/);
  const success = issueReply(201, { key: "ZERVX-TEST-KEY", expiresAt: 1_700_000_000 });
  assert.match(success, /ZERVX-TEST-KEY/);
  assert.match(success, /shown only once/);
  assert.equal(issueReply(500, { error: "database exploded" }), "Key service is temporarily unavailable.");
});

test("revoke replies do not claim success when nothing changed", () => {
  assert.match(revokeReply(200, { revoked: true }, "333333333333333"), /333333333333333/);
  assert.match(revokeReply(200, { revoked: false }, "333333333333333"), /No active key/);
  assert.match(revokeReply(401, { error: "Unauthorized" }, "333333333333333"), /bot API token/);
});

test("guild configuration accepts one server or a list and rejects junk", () => {
  assert.deepEqual(guildIdsFromEnv("111111111111111", "222222222222222,111111111111111"), [
    "111111111111111",
    "222222222222222",
  ]);
  assert.throws(() => guildIdsFromEnv("not-a-guild", ""));
  assert.throws(() => guildIdsFromEnv("", ""));
});
