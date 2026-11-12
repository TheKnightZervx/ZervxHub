# Mission 8 security review

## Scope and limitation

This is a repository-level review of the Worker, dashboard, Discord bot, and Roblox integration, with local tests and mocks. It is not a penetration test or a claim that the deployed service is secure. Production/staging secrets, Cloudflare edge rules, D1 permissions, Discord settings, and live Roblox behavior were not inspected.

## Findings

### 🟡 MEDIUM — Unauthenticated Roblox identity assertion in license validation

- **Affected paths:** `POST /v2/keys/validate` in `worker/src/v2.ts` and `POST /v1/keys/validate` in `worker/src/index.ts`.
- **Pre-fix locations:** `worker/src/v2.ts:1047-1062, 1141-1154`; `worker/src/index.ts:129-145, 199-210`.
- **Evidence:** Both routes accepted `robloxUserId` from a public request body without authenticating the game server. A caller possessing a valid license key could submit the already-bound account ID and obtain a successful validation response, bypassing the intended single-account restriction.
- **Impact:** A valid license could be reused by an unauthenticated caller who knew the bound Roblox ID. The route did not establish that the identity claim came from the Roblox server script.
- **Confidence:** 8/10.
- **Remediation implemented:** Added a random per-game server credential, stored only as a peppered hash and limited to the approved Universe ID; added dashboard create/rotate/revoke actions; require the credential on both V1 and V2 validation routes; reject stale timestamps and reused request IDs; the Roblox server script sends the credential from `ServerStorage` and derives the player ID from server-side `player.UserId`.
- **Regression coverage:** Tests verify that direct requests without the game credential fail without binding a license, valid credentials permit validation, cross-game credentials fail, rotation invalidates the old credential, revocation blocks validation, stale requests fail, and a replayed request ID is rejected.

No additional vulnerability was confirmed in the reviewed source. OAuth/session, dashboard authorization and tenant scoping, CSRF origin checks, API-key hashing and rotation, parameterized SQL, license expiry/revocation, rate limits, CORS/security headers, bot authorization, and D1 constraints were reviewed alongside their existing tests. Automated coverage does not replace a live security assessment.

## Remaining security verification

- Validate OAuth redirects, cookie behavior, secret presence/rotation, Cloudflare access rules, and D1 permissions in an isolated staging account.
- Test the Roblox script in a private Roblox Studio experience; confirm the `StringValue` is in `ServerStorage`, not replicated storage.
- Configure and verify Cloudflare edge rate limits, monitoring, log redaction, backup restoration, and incident response before public launch.
- Apply migrations only to a separately identified staging database after reviewing its target; no remote migration or deployment was performed for this review.
