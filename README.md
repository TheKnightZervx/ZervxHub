# ZervxHub

ZervxHub is a Roblox developer licensing project with a black-and-gold website, a Cloudflare Worker API, and Discord community tooling.

## Repository layout
- `worker/`: Cloudflare Worker API and D1 schema.
- `discord-bot/`: Discord slash-command bot intended for Railway.
- `roblox/`: server-side key validator and branded key prompt for experiences you own or are authorized to develop.
- `website/`: responsive overview, pricing, documentation, support, and developer dashboard, served by the Worker asset binding.
- `docs/`: setup, security, and release notes.
- Existing Roblox source files remain at the repository root.

## Current status
ZervxHub is a development codebase, not a hosted commercial service. The developer dashboard uses Discord OAuth and cookie sessions when configured on a same-origin Worker deployment. Production use still requires operator-managed Cloudflare D1 and secrets, configured Roblox Universe IDs, Discord credentials, Roblox Studio testing, and operational and legal review. Paid plans, checkout, and subscription entitlements are not enabled.

## Security model
- New license and developer API credentials are stored as HMAC-SHA-256 hashes using `KEY_PEPPER`; legacy SHA-256 hashes upgrade when used successfully.
- Raw license and developer API keys are returned once and never stored in plaintext.
- Dashboard sessions are opaque, time-limited, HttpOnly cookies; only a peppered HMAC is stored in D1.
- Developer/game/license queries are tenant-scoped; games must be approved before licenses can be issued.
- Dashboard write routes require a matching configured browser origin; license validation requires a game-scoped server credential.
- Roblox identity is derived by the server script and the Worker rejects stale or replayed validation requests; authorization is never decided by a LocalScript.
- Validation fails closed when no Universe IDs are configured.
- Never commit secrets, tokens, or `.env` files.

Start with [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/DEVELOPER_ONBOARDING.md](docs/DEVELOPER_ONBOARDING.md), and [docs/ROBLOX_INTEGRATION.md](docs/ROBLOX_INTEGRATION.md). Commercial billing and support limitations are documented in [docs/COMMERCIAL_READINESS.md](docs/COMMERCIAL_READINESS.md) and [docs/SUPPORT.md](docs/SUPPORT.md).
