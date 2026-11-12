# ZervxHub app-first platform architecture

## Product decision

ZervxHub is an app-first developer platform. The Windows desktop app and mobile app are the primary authenticated control surfaces. The website is a lightweight public storefront for plan information, subscription entry points, legal pages, support, and documentation. Do not rebuild the full developer dashboard as a competing web application.

Both apps use the same versioned Worker API and tenant-scoped authorization. A change made in one app must be reflected by the other after a fresh API read; clients must not keep independent license or project truth.

## User experience

### Windows desktop app

- Main control center for developers: overview, projects, games, licenses, users, activity, integrations, Developer Studio, account and security settings.
- A Steam-inspired library/download experience: app release channel, current/available version, release notes, download progress, verified package size, retry/resume, install, update, and rollback/recovery status.
- Distribute signed installer packages through GitHub Releases initially to avoid a paid hosting dependency. A small version manifest may point to the release asset.
- Verify a cryptographic signature and SHA-256 digest before installation. HTTPS alone is not artifact authenticity.
- Never execute an update merely because a manifest changed. Validate schema, channel, version ordering, signature, digest, and package identity; stage the package, verify it, then hand off to a narrowly scoped updater.
- Preserve user data and settings during upgrades. Keep a known-good rollback path. Do not silently downgrade or install a different publisher/package.
- Release channels: stable first; beta only after the updater has safe channel isolation.

### Mobile app

- Mobile companion with the same black-and-metallic-gold visual language and familiar Steam-like library/navigation patterns.
- Account and session management, project/game overview, license issuance/revocation where authorized, activity, notifications, subscription status, documentation, and security controls.
- Mobile app is a management client, not a Windows installer. It must not expose admin-only operations to ordinary developers.
- Android is the first practical target for free local builds and direct signed APK distribution. Keep the API and UI architecture portable so iOS can be added later; iOS distribution and store enrollment have separate costs and requirements.
- Prefer a cross-platform client only after confirming the recovered desktop code and shared component strategy. Do not choose a framework that forces a paid build service.

## Website boundary

- Public landing/storefront, plan comparison, subscription/checkout entry point when a provider is approved, terms, privacy, refunds, support, status and documentation.
- Authenticated management lives in the Windows and mobile apps. The website may provide secure account recovery or a minimal handoff page, but should not duplicate the full dashboard.
- Never imply subscriptions or checkout are live until a payment merchant is approved and payout access is verified.

## Shared backend contract

- Keep the Cloudflare Worker and D1 as the source of truth until a deliberate migration is reviewed.
- Version app-facing endpoints under /v2 or a later explicit version. Use tenant-scoped authorization on every project, game, key, activity, and subscription query.
- Add app-specific capabilities only through server authorization; hiding a button is not access control.
- Use short-lived access sessions, revocable refresh/session records, explicit logout, device/session inventory, and re-authentication for sensitive actions.
- Avoid long-lived admin or developer API keys in mobile/desktop bundles. Never embed Worker secrets, Discord bot tokens, OAuth client secrets, KEY_PEPPER, or payment secrets in either app.
- Use secure OS storage for client refresh credentials (Windows Credential Manager/DPAPI; Android Keystore). Never store credentials in plaintext config, logs, analytics, crash reports, or local databases.
- Design API responses for offline-friendly read caching, but all writes and authorization decisions remain server-side. Clearly label stale/offline data.

## Security and release requirements

- Threat-model desktop updater, mobile session storage, deep links, OAuth callbacks, IPC, local files, API authorization, tenant isolation, and release pipeline before implementation.
- Verify all downloaded artifacts against signed release metadata; pin trusted signing keys and plan rotation/revocation.
- Use least-privilege updater process and strict IPC allowlists. Never expose arbitrary shell execution or Node integration to untrusted renderer content.
- Mobile deep links must validate state and redirect destinations; use Android App Links where domain control is available.
- No secrets in source control, app bundles, build logs, screenshots, or test fixtures.
- CI must run type checks, unit/integration tests, dependency and secret scans, package integrity checks, and desktop/mobile build smoke tests when source is available.
- Do not release unsigned production installers or claim a verified mobile build until signing and device tests are complete.

## Recovery and implementation order

1. Recover and inspect the existing Windows desktop source and latest installer from the user's laptop or a user-provided backup. The repository's current mission3-base branch does not contain that desktop app source; do not overwrite it with a speculative replacement.
2. Review the existing security PR and reconcile its changes with the current baseline before applying security fixes. Do not merge a divergent PR blindly.
3. Threat-model and fix backend authorization/session/rate-limit issues; add regression tests.
4. Define stable app API contracts and authentication/session lifecycle.
5. Build Windows app navigation and secure updater against GitHub Releases.
6. Build Android companion against the same API and account model.
7. Move website navigation toward storefront/docs/support only after app parity is real.
8. Perform a pre-release security audit and signed-artifact/device testing. No public launch before critical/high issues are closed.

## Budget and approvals

- Project budget remains $0. Prefer local builds, open-source tooling, and GitHub's existing free repository/release/CI capabilities within applicable limits.
- Do not create paid accounts, buy developer certificates, upgrade plans, activate billing, or deploy production resources without the owner's explicit approval.
- GitHub Releases are a proposed distribution path, not yet configured or tested.
- No app has been built, signed, released, installed, or connected to production by this architecture document.
