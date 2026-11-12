# ZervxHub

ZervxHub is a Roblox developer licensing project with a black-and-gold website, a Cloudflare Worker API, and Discord community tooling.

## Repository layout
- `worker/`: Cloudflare Worker API and D1 schema.
- `discord-bot/`: Discord slash-command bot intended for Railway.
- `roblox/`: server-side key validator and branded key prompt for experiences you own or are authorized to develop.
- `website/`: responsive static overview, pricing, documentation, and support pages.
- `docs/`: setup, security, and release notes.
- Existing Roblox source files remain at the repository root.

## Current status
ZervxHub is a development codebase, not a hosted commercial service. Production use requires an operator-managed Cloudflare D1 database and secrets, configured Roblox Universe IDs, Discord credentials, Roblox Studio testing, and operational and legal review. Paid plans, checkout, and subscription entitlements are not implemented.

## Security model
- New license and developer API credentials are stored as HMAC-SHA-256 hashes using `KEY_PEPPER`; legacy SHA-256 hashes upgrade when used successfully.
- Raw keys are returned once through an ephemeral Discord reply.
- Key issuance and revocation require the Worker admin token.
- Authorization is decided by a trusted server/backend, never a LocalScript.
- Validation fails closed when no Universe IDs are configured.
- Never commit secrets, tokens, or `.env` files.

Start with [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md), [docs/DEVELOPER_ONBOARDING.md](docs/DEVELOPER_ONBOARDING.md), and [docs/ROBLOX_INTEGRATION.md](docs/ROBLOX_INTEGRATION.md). Commercial billing and support limitations are documented in [docs/COMMERCIAL_READINESS.md](docs/COMMERCIAL_READINESS.md) and [docs/SUPPORT.md](docs/SUPPORT.md).
