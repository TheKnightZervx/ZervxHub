# Staging acceptance and production-readiness checklist

## Current status

The isolated Cloudflare D1 database `zervxhub-staging-db` has been created and migrations `0000`–`0006` have been applied to that new, empty database. `worker/wrangler.staging.toml` binds only this database and sets `workers_dev = false`, so the staging Worker is not internet-accessible until an access-controlled HTTPS route is configured. The existing configured databases were not used or modified. No Worker deployment, staging secret setup, or remote backup was performed. A separate Discord OAuth test application and its credentials are not available. No production data was used.

The local static dashboard preview was checked at a 338 px viewport: it had no horizontal page overflow and the mobile navigation expanded with the expected links. The preview has no Worker API, so the dashboard displayed an unreadable API response. This is a local layout check, not a staging sign-in or dashboard acceptance result. Roblox Studio testing was not performed.

## Local checks completed

| Acceptance area | Result |
|---|---|
| Discord sign-in and unavailable configuration | Worker tests exercise OAuth with mocked Discord token/user responses and verify the unconfigured state; live Discord OAuth remains untested. |
| Session creation, cookies, logout, and invalid sessions | Worker tests pass with mock D1; no live session service was used. |
| Dashboard access and tenant isolation | Worker tests cover authenticated dashboard access, cross-developer access denial, and CSRF/origin handling. |
| Game registration and approval | Worker tests cover pending/approved game flows and ownership checks. |
| API-key rotation | Worker tests verify that rotation revokes old developer API credentials. |
| Game server key management | Worker tests cover per-game creation, hashed storage, tenant ownership, rotation, and revocation. |
| License creation, validation, account binding, expiry, and revocation | Worker tests cover the full local/mock lifecycle. |
| Roblox account binding | Worker tests use synthetic IDs; direct unauthenticated validation and replay attempts fail. No Roblox Studio runtime test was performed. |
| Subscription requests | Worker tests verify requests do not change plans or activate paid entitlements. |
| Unauthorized access and rate limiting | Local tests cover invalid credentials, cross-tenant access, per-player validation limits, and bounded in-memory rate-limit state. Cloudflare edge limits were not tested. |
| D1 migrations and backup | Migrations `0000`–`0006` were applied in order to the new empty staging database. In-memory SQLite tests compare the consolidated schema with the migration chain and verify existing rows, ownership constraints, indexes, and replay-nonce storage. A separate synthetic local SQLite database applied the same migrations; a license binding, game credential, and replay row survived SQLite backup and restore. No customer data was used; staging backup/restore remains untested. |
| Mobile dashboard usability | Narrow viewport and mobile navigation checked in the local static preview; API-backed actions need staging verification. |

These are local automated or browser-preview results, not live staging acceptance.

## Staging prerequisites

1. **Done:** Created a separate empty D1 database named `zervxhub-staging-db`, and applied migrations `0000`–`0006`. The repository config is `worker/wrangler.staging.toml`; it does not reference the existing configured database. The Worker remains undeployed and `workers_dev` is disabled pending an access-controlled HTTPS route.
2. Configure an HTTPS staging origin and set `CORS_ORIGIN` to that exact origin. Register the exact `https://<staging-host>/v2/auth/discord/callback` URI in a dedicated Discord OAuth test application.
3. Configure staging-only Worker variables/secrets: `DISCORD_OAUTH_CLIENT_ID`, `DISCORD_OAUTH_CLIENT_SECRET`, `DISCORD_OAUTH_REDIRECT_URI`, `KEY_PEPPER`, `ADMIN_TOKEN`, `BOT_API_TOKEN`, `CORS_ORIGIN`, and `ALLOWED_UNIVERSE_IDS`. Do not copy production credentials or print secret values.
4. Configure a test Discord bot and sandbox guild with `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID` (or `DISCORD_GUILD_IDS`), `ZERVXHUB_API_URL`, and a matching staging-only `ZERVXHUB_BOT_TOKEN`.
5. Create synthetic developer/customer accounts and an authorized private Roblox test experience. Set up the approved game's key as a `StringValue` in `ServerStorage`; never use production users, licenses, or keys.
6. Configure staging-only edge rate limits, request logging with credential redaction, alerts, and a backup/restore procedure. Verify a restore before acceptance.
7. **Done:** Reviewed and applied the ordered migrations `0000`–`0006` only to the verified, newly created staging database. Recheck migration metadata before any future staging deployment; never reapply already-recorded migrations manually.

## Staging test sequence

| # | Test | Expected acceptance result |
|---|---|---|
| 1 | Discord sign-in, callback state mismatch, and missing OAuth configuration | Valid staging OAuth creates a session; mismatched state fails; unconfigured OAuth explains sign-in is unavailable. |
| 2 | Session creation, expiration, logout, and cookie flags | Session is Secure, HttpOnly, SameSite=Lax, expires as configured, and cannot be reused after logout/expiry. |
| 3 | Dashboard access | Anonymous requests are denied; the signed-in synthetic developer sees only their own account data. |
| 4 | Game registration | A game remains pending until administrator approval; only its owner can manage its validation credential. |
| 5 | Developer API-key rotation | New key is returned once and old key stops authenticating. |
| 6 | License creation | Only approved games accept license creation; raw key is shown once and D1 stores only a hash. |
| 7 | License validation | Correct server credential, approved game, active developer, unexpired key, and allowed universe validate successfully. |
| 8 | Roblox account binding | First trusted server validation binds the synthetic account; another account is denied; no Roblox Studio result is accepted until actually tested. |
| 9 | License revocation | Revocation prevents the next validation and is visible in the developer history. |
| 10 | Subscription requests | Requests remain pending/informational; plan and entitlements do not change and no payment is attempted. |
| 11 | Unauthorized access attempts | Missing/wrong game credential, cross-game credential, cross-tenant access, and untrusted browser origin fail closed without changing customer records. |
| 12 | Rate limiting | Worker and Cloudflare edge limits return controlled 429 responses without exposing credentials or customer data. |
| 13 | Migrations and recovery | Existing synthetic rows remain intact; apply migrations in order once and verify D1 migration metadata. Demonstrate backup restore in the isolated staging database before acceptance. |
| 14 | Mobile dashboard | Test at 320, 375, and 768 px; navigation, forms, tables, one-time key display, and accessible status messages remain usable without page-level horizontal overflow. |

Capture only synthetic IDs and result codes. Never use production customer data or include raw secrets, license keys, or OAuth tokens in evidence.

## Roblox Studio manual acceptance (staging only)

Run this only after a private staging experience and staging Worker/D1 are available. Use a synthetic developer, test license, and test Roblox accounts. Never point `API_BASE` at production.

1. Register the staging experience's Universe ID, approve it in the staging admin workflow, create a game server key, and save it as `ServerStorage.ZervxHubGameServerKey`. Confirm it is not in `ReplicatedStorage`, a LocalScript, or any client-visible object. Enable HTTP Requests and set the server script's `API_BASE` to the staging Worker URL.
2. Create a synthetic license for a test Roblox account and install the server and prompt scripts. Start a private server session with that account, enter the license, and confirm the server-controlled `ZervxHubAuthorized` attribute becomes true. Check the intended server-gated feature, not only the UI.
3. Replace the test license with an invalid value; confirm authorization is cleared and the client receives only a generic failure. Restore the valid key and confirm normal behavior.
4. In the staging dashboard, rotate the game's server key. Before updating ServerStorage, confirm the old key fails closed. Set the newly shown key in `ServerStorage` and confirm validation succeeds. Revoke that key in the dashboard and confirm validation fails; create a fresh key and update ServerStorage before continuing.
5. Test first-use account binding with a synthetic license: validate once as the intended test account, then try the same license from a different test account. The second account must be denied and the first must remain authorized. Revoke the license in the dashboard and confirm the first account is denied on its next validation.
6. To test timestamp expiry and replay handling without altering the shipped Roblox script, use a temporary **server-only** test harness in the private experience. Read the credential from ServerStorage, submit a request to the staging endpoint with the normal synthetic license fields and a UUID request ID, first with a timestamp 61 seconds old, then with a fresh timestamp. The stale request must return `invalid_request`; the fresh request may validate. Submit the same fresh request ID again (including an uppercase UUID variant) and expect `request_replayed`. Do not print request headers, credentials, or license values.
7. Temporarily point the server script at an unreachable staging-only URL and confirm API failure clears authorization and fails closed. Restore the staging URL and verify recovery.
8. Remove temporary harnesses and test credentials after recording synthetic result codes. Never copy a game key into client-visible storage or attach raw request/response secrets to the acceptance report.

## Production-readiness checklist

- [ ] Establish a separately named staging environment and database; keep production resources out of staging commands.
- [ ] Complete staging acceptance above, including the actual Roblox Studio flow and a second-person review of the server-only key placement.
- [ ] Set and verify production secrets privately: `ADMIN_TOKEN`, `KEY_PEPPER`, `BOT_API_TOKEN`, and Discord OAuth client secret. Configure Worker variables for OAuth client ID/redirect, exact HTTPS `CORS_ORIGIN`, and approved Universe IDs.
- [ ] Verify custom domain, HTTPS, Discord redirect URI, and same-origin dashboard settings from the deployed environment without exposing secret values.
- [ ] Review and apply migrations `0000`–`0006` through the approved deployment process with a verified backup and rollback/recovery plan.
- [ ] Configure Cloudflare edge rate limits and alerts; the Worker’s in-memory limiter is isolate-local and is not a global abuse-control boundary.
- [ ] Establish monitoring, error reporting, alert ownership, credential/log redaction, retention limits, and an incident-response/on-call process. These are not verified as configured.
- [ ] Demonstrate D1 backup restoration and document recovery ownership and recovery objectives. No restore was performed.
- [ ] Publish reviewed privacy, terms, refund/cancellation, support, and data-retention policies; establish a staffed support path.
- [ ] Do not enable payments or paid entitlements until a provider is separately selected, sandboxed, security-reviewed, and explicitly approved. No payment integration exists.
