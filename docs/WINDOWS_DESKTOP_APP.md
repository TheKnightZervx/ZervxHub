# ZervxHub Windows desktop application

## Product requirement

The Windows application is a first-class ZervxHub client, alongside the website. It must use the same backend, developer identity, projects, licenses, and account data. It is not a separate licensing system and must not create a second source of truth.

## Repository inspection status

The selected GitHub baseline, `mission3-base`, contains the Worker, website, Discord bot, Roblox scripts, documentation, and database migrations. It does not currently contain a recognizable Windows desktop application project, installer configuration, or desktop build workflow. A GitHub branch search for a desktop branch also returned no matches.

This is a repository visibility limitation, not proof that the user's previous local desktop work never existed. Do not overwrite, recreate, or discard that work. Recover its original source and history before choosing a framework or replacing implementation.

## Required desktop scope

- Windows installation, launch, upgrade, and uninstall flows.
- Consistent ZervxHub black-and-gold visual identity.
- Discord sign-in and secure session handling.
- Dashboard backed by real Worker responses, with honest loading, empty, and error states.
- Project/game management and license issue, validation history, renewal, and revocation.
- Developer Studio entry point and shared snippets/tools experience.
- Secure external-link handling and safe error reporting.
- Persistent user preferences without storing raw API keys or long-lived secrets in plaintext.

## Architecture and security requirements

- Reuse the existing Worker API and D1-backed account model; do not fork business rules into the desktop client.
- Keep administrative, bot, developer, and game-server credentials out of the packaged client.
- Use an OS-appropriate protected credential store for any desktop session material; never commit secrets.
- Validate OAuth callback/state and session expiry/revocation.
- Restrict navigation and renderer privileges if the recovered framework uses a webview/Electron-style architecture.
- Apply a strict content security policy and disable arbitrary remote code execution.
- Treat updater metadata and installers as supply-chain-sensitive; verify update integrity and never silently install an untrusted artifact.
- Do not claim the installer is signed unless a real signing certificate and verification evidence exist.

## Verification gate

Before calling the Windows app complete:

- [ ] Recover and identify the existing desktop source and framework.
- [ ] Build from a clean checkout using documented, reproducible steps.
- [ ] Run unit tests and static checks.
- [ ] Smoke-test first launch, sign-in, logout, offline/error states, and API connectivity.
- [ ] Test install, in-place upgrade, uninstall, and preservation of user data.
- [ ] Verify no secrets are bundled in application assets or installer contents.
- [ ] Scan packaged dependencies and review update behavior.
- [ ] Record installer size, version, and SHA-256 for each release artifact.
- [ ] Test on a supported Windows environment before public distribution.

## Budget and release guardrails

- Prefer free build tooling and local testing.
- Do not buy a code-signing certificate, hosting, update service, or paid dependency without explicit approval.
- Do not publish an installer or deploy production services without explicit approval.
- Preserve recovered local branches and installer artifacts; compare before integrating them into GitHub.
