# ZervxHub security hardening plan

## Current verified boundary

This is a source-level plan, not a penetration-test report. The repository baseline is `mission3-base`. Security PR #4 contains meaningful remediation for the Roblox identity-assertion issue and other hardening, but it is open, divergent, and not merged. Its changes must be reviewed and reconciled, not assumed to be present in the baseline.

The baseline rate limiter uses a per-isolate in-memory Map. Its own comments correctly state that this is defense in depth only; it is not a globally consistent production limit. Cloudflare edge controls and/or a durable shared limiter are required before launch.

No production environment, secrets, Cloudflare rules, remote D1 permissions, Discord live configuration, or end-user device was inspected in this review.

## Required workstreams

### P0 — Authentication and authorization

- Reconcile PR #4 changes into a clean branch after reviewing every changed file and migration.
- Verify all sensitive API routes require the correct role and tenant scope; test cross-tenant read/write denial.
- Verify Roblox validation requires an authenticated game-server credential, approved Universe ID, timestamp, unique request ID, and replay rejection in both V1 and V2. Retire unsafe legacy paths only through a reviewed compatibility plan.
- Separate admin, bot, developer, game-server, and user-session credentials. Reject missing or reused secrets.
- Add server-side authorization tests for every privileged operation; UI visibility is never authorization.

### P0 — Sessions, OAuth, and browser/app clients

- Review OAuth state lifetime, single-use behavior, callback error handling, session rotation, logout revocation, session expiry, and account suspension.
- Add session/device inventory and revoke-one/revoke-all controls before app release.
- Define refresh-token rotation/reuse detection if native apps need persistent sessions. Store refresh credentials only in OS-protected storage.
- Add CSRF protection appropriate to cookie-authenticated browser routes. Native bearer sessions must be scoped and revocable; never place tokens in deep-link query strings.
- Validate deep links and redirect destinations; prevent open redirects and callback interception.

### P0 — API and abuse resistance

- Replace reliance on per-isolate memory limits with Cloudflare edge rate-limiting rules and/or a shared durable limiter. Rate-limit auth, OAuth, validation, key issue/revoke, and expensive Developer Studio operations separately.
- Bound request bytes while streaming, validate content types and schemas, cap pagination and query complexity, and use timeouts for outbound requests.
- Review CORS and origin checks as browser protections only; they are not authentication and native clients may not send Origin.
- Audit SQL tenant filters, D1 constraints, atomic state transitions, idempotency, and race conditions.

### P1 — Secrets, privacy, and operations

- Keep secrets in provider secret storage, never in source, static assets, app bundles, logs, or crash reports.
- Add secret scanning and dependency vulnerability scanning to CI; establish a dependency update process.
- Redact credentials, license keys, OAuth codes, session IDs, and personal data from logs.
- Define retention/deletion, backup/restore verification, monitoring, incident response, key rotation, and breach notification procedures.
- Review privacy policy, terms, support and refund commitments before collecting customer data or payments.

### P1 — Desktop updater and mobile app

- Threat-model updater manifest tampering, signature verification, hash mismatch, downgrade, rollback, path traversal, symlink attacks, archive extraction, installer arguments, privilege escalation, and interrupted updates.
- Sign release manifests and artifacts; pin public verification keys in the app; support planned signing-key rotation and emergency revocation.
- Stage and verify updates before install. Keep updater privileges minimal and never run arbitrary commands from remote metadata.
- Use strict desktop IPC allowlists, context isolation, sandboxing where supported, and no renderer Node access.
- Store desktop and mobile session credentials using platform secure storage. Protect local caches and clear sensitive data on logout.
- Test Android exported components, deep links, backup settings, network security configuration, WebView use (avoid unless necessary), and release signing.

## Exit criteria before public launch

- [ ] All critical/high findings closed with regression tests and independent review.
- [ ] Tenant isolation tests cover all developer-owned resources.
- [ ] Session lifecycle, revocation, and native secure storage verified on real devices.
- [ ] Edge/shared rate limits configured and tested.
- [ ] Secrets and dependency scanning enabled; no high-risk unresolved findings.
- [ ] Backups restored successfully in a test environment.
- [ ] Monitoring, redaction, incident response, privacy and support processes documented.
- [ ] Windows update signatures, hashes, rollback and interrupted-install recovery tested.
- [ ] Android signed build, deep links, secure storage, and upgrade path tested on physical devices.
- [ ] No public deployment until owner approval.

## Explicit non-actions

No secrets were read or changed. No remote D1 migration, production deployment, payment activation, paid service, release signing, public app release, or merge was performed.
