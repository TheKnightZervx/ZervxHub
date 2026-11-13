# ZervxHub Security Review Checklist

This checklist is a release gate, not evidence that a control has already been tested. Record the commit, environment, test method, result, and reviewer for every verification.

## Scope and trust boundaries

- [ ] Treat Roblox clients, browser input, Discord interaction payloads, and developer-supplied code as untrusted.
- [ ] Keep license validation and entitlement decisions on the server; never trust a client-side success flag.
- [ ] Identify the Worker, D1 database, Discord bot, dashboard, Android client, and third-party callbacks as separate trust boundaries.
- [ ] Confirm production, staging, and local credentials/databases are distinct.

## Authentication and session security

- [ ] Verify Discord Ed25519 signatures before processing interactions; reject invalid signatures and stale timestamps.
- [ ] Keep Discord bot credentials, admin credentials, developer API keys, and user session tokens separate.
- [ ] Fail closed when required secrets are absent; reject equal bot/admin secrets.
- [ ] Store only password hashes or appropriately hashed tokens server-side; never log raw credentials.
- [ ] Enforce session expiry, revocation, and authorization on every protected request.
- [ ] Rate-limit failed authentication by stable identity as well as network source; avoid trusting spoofable forwarding headers.
- [ ] Ensure passwordless OTP codes are random, short-lived, single-use, rate-limited, and not generated when email delivery is unavailable.

## Authorization and tenant isolation

- [ ] Derive developer identity from verified credentials, never from a caller-controlled developer ID.
- [ ] Scope every developer-owned query and mutation by the authenticated developer ID.
- [ ] Test cross-tenant read, create, update, rotate, and revoke attempts for licenses, games, projects, logs, and API keys.
- [ ] Ensure administrator-only routes cannot be reached with developer or bot credentials.
- [ ] Ensure Discord roles/permissions are checked server-side for privileged bot commands.
- [ ] Ensure Roblox account/game binding is validated server-side and cannot be bypassed by client-supplied identifiers.

## Input, abuse, and availability controls

- [ ] Bound request bodies before buffering; verify oversized and malformed JSON is rejected consistently across V1 and V2.
- [ ] Validate types, lengths, formats, enums, and numeric ranges at every API boundary.
- [ ] Use parameterized D1 queries; review dynamic SQL construction.
- [ ] Apply per-route and per-identity quotas to expensive or sensitive endpoints.
- [ ] Set safe timeouts and bounded response sizes for external calls and streamed data.
- [ ] Reject unexpected content types and methods; configure CORS narrowly for browser endpoints.
- [ ] Avoid exposing stack traces, SQL errors, secrets, internal IDs, or sensitive account details in responses.

## Data, secrets, and operational security

- [ ] Store only hashed license keys and appropriately hashed API/session tokens where feasible.
- [ ] Redact authorization headers, cookies, OTPs, license keys, and personal data from logs.
- [ ] Keep secrets in platform secret storage, never source files, build artifacts, mobile resources, or committed environment files.
- [ ] Verify secret scanning and push protection in repository settings; configuration files alone do not enable account-level features.
- [ ] Review dependency alerts and update pull requests before release; test upgrades.
- [ ] Restrict GitHub Actions permissions per workflow/job and pin third-party actions to reviewed immutable commit SHAs before production use.
- [ ] Protect release branches with required reviews and passing checks; restrict force pushes and deletion.

## Backup, recovery, and incident response

- [ ] Define backup frequency, retention, access controls, and encryption for D1 exports.
- [ ] Restore a backup into an isolated non-production database and verify schema, data integrity, and application compatibility.
- [ ] Document credential revocation/rotation for Worker, Discord, developer API keys, and user sessions.
- [ ] Document incident triage, evidence preservation, user notification, and recovery ownership.
- [ ] Confirm monitoring detects authentication spikes, repeated authorization failures, unusual key issuance/revocation, and Worker errors.

## Required negative tests

- [ ] Missing, invalid, expired, revoked, and wrong-scope credentials are rejected.
- [ ] Developer A cannot read or mutate Developer B's records, even by guessing IDs.
- [ ] Oversized, malformed, deeply nested, and wrong-content-type requests fail safely.
- [ ] Replayed Discord interactions and invalid signatures are rejected.
- [ ] Expired, revoked, wrong-game, and wrong-account license validations fail closed.
- [ ] Rate limits remain effective when the caller changes IP addresses.
- [ ] Logs and error responses contain no secrets or sensitive tokens.

## Launch blockers

Do not launch publicly while any critical/high-severity issue is open, tenant-isolation tests fail, required secrets or production configuration are unverified, backup restoration is untested, or required CI/security checks are failing. Do not run destructive tests against production. Do not deploy, migrate production data, enable billing, or activate paid services without explicit owner approval.
