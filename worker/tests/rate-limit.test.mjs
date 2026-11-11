import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

let isRateLimited;
let resetRateLimits;
let getBucketCount;
let cleanupExpiredBuckets;
let setMaxBucketsForTest;
let buildDir;

before(async () => {
  buildDir = await mkdtemp(join(tmpdir(), "zervxhub-rate-limit-tests-"));
  const outfile = join(buildDir, "rate-limit.mjs");
  await build({
    entryPoints: [fileURLToPath(new URL("../src/rate-limit.ts", import.meta.url))],
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    outfile,
  });
  const built = await import(pathToFileURL(outfile).href);
  isRateLimited = built.isRateLimited;
  resetRateLimits = built.resetRateLimits;
  getBucketCount = built.getBucketCount;
  cleanupExpiredBuckets = built.cleanupExpiredBuckets;
  setMaxBucketsForTest = built.setMaxBucketsForTest;
});

after(async () => {
  if (buildDir) await rm(buildDir, { recursive: true, force: true });
});

function req(ip = "1.2.3.4") {
  return new Request("https://example.com", {
    headers: { "cf-connecting-ip": ip },
  });
}

test("normal rate limiting: permits requests within limit and throttles when exceeded", () => {
  resetRateLimits();
  const request = req("10.0.0.1");
  const limit = 5;
  const windowMs = 60_000;

  for (let i = 1; i <= limit; i++) {
    const limited = isRateLimited(request, "test-scope", limit, windowMs);
    assert.equal(limited, false, `Request ${i} should not be rate-limited`);
  }

  const overLimit = isRateLimited(request, "test-scope", limit, windowMs);
  assert.equal(overLimit, true, "Request exceeding limit should be rate-limited");
});

test("expired bucket cleanup: removes expired entries and frees capacity", async () => {
  resetRateLimits();
  const windowMs = 40;
  const request = req("10.0.0.2");

  isRateLimited(request, "cleanup-test", 10, windowMs);
  assert.equal(getBucketCount(), 1);

  await new Promise((resolve) => setTimeout(resolve, 60));

  const cleaned = cleanupExpiredBuckets();
  assert.equal(cleaned, 1, "Should clean 1 expired bucket");
  assert.equal(getBucketCount(), 0, "Bucket count should be 0 after cleanup");
});

test("maximum bucket capacity: enforces strict memory bound without unbounded growth", () => {
  resetRateLimits();
  const capacity = 25;
  setMaxBucketsForTest(capacity);

  for (let i = 0; i < 50; i++) {
    isRateLimited(req(`192.168.1.${i}`), "capacity-test", 10, 60_000);
  }

  assert.equal(getBucketCount(), capacity, `Bucket count should not exceed capacity ${capacity}`);
});

test("unknown/new callers at capacity: admitted and not falsely rate-limited (DoS prevention)", () => {
  resetRateLimits();
  const capacity = 10;
  setMaxBucketsForTest(capacity);

  for (let i = 0; i < capacity; i++) {
    const limited = isRateLimited(req(`attacker-${i}`), "dos-scope", 5, 60_000);
    assert.equal(limited, false);
  }
  assert.equal(getBucketCount(), capacity);

  // A new, legitimate user arrives at capacity
  const legitUser = req("legitimate-user");
  const limited = isRateLimited(legitUser, "dos-scope", 5, 60_000);

  assert.equal(limited, false, "New legitimate caller should be permitted even at capacity");
  assert.equal(getBucketCount(), capacity, "Total buckets must remain bounded at capacity");
});

test("recovery after cleanup: rate-limited caller recovers after window expires", async () => {
  resetRateLimits();
  const shortWindow = 50;
  const limit = 2;
  const request = req("10.0.0.99");

  assert.equal(isRateLimited(request, "recovery-test", limit, shortWindow), false);
  assert.equal(isRateLimited(request, "recovery-test", limit, shortWindow), false);
  assert.equal(isRateLimited(request, "recovery-test", limit, shortWindow), true);

  await new Promise((resolve) => setTimeout(resolve, 70));

  const recovered = isRateLimited(request, "recovery-test", limit, shortWindow);
  assert.equal(recovered, false, "Caller should recover after window expires");
});

test("repeated requests: consistently throttles over-limit caller while allowing compliant callers", () => {
  resetRateLimits();
  const limitedCaller = req("over-limit-caller");
  const limit = 3;
  const windowMs = 60_000;

  for (let i = 0; i < limit; i++) {
    assert.equal(isRateLimited(limitedCaller, "repeat-scope", limit, windowMs), false);
  }

  for (let i = 0; i < 5; i++) {
    assert.equal(
      isRateLimited(limitedCaller, "repeat-scope", limit, windowMs),
      true,
      `Repeated request ${i + 1} over limit should consistently return true`
    );
  }

  const freshCaller = req("fresh-caller");
  assert.equal(isRateLimited(freshCaller, "repeat-scope", limit, windowMs), false);
});

test("edge cases: handles missing headers, null request, and invalid parameters safely", () => {
  resetRateLimits();

  assert.equal(isRateLimited(null, "edge-scope", 5, 60_000), false);
  assert.equal(isRateLimited(new Request("https://example.com"), "edge-scope", 5, 60_000), false);
  assert.equal(isRateLimited(req("zero-limit"), "zero-scope", 0, 60_000), true);
  assert.equal(isRateLimited(req("bad-window"), "bad-window-scope", 5, 0), false);
});
