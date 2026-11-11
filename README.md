# ZervxHub

ZervxHub is a Roblox experience tooling project with a premium black-and-gold brand, a separate licensing API, and Discord community automation.

## Repository layout
- `worker/`: Cloudflare Worker API and D1 schema.
- `discord-bot/`: Discord slash-command bot intended for Railway.
- `roblox/`: server-side key validator and branded key prompt for experiences you own or are authorized to develop.
- `website/`: responsive static landing page.
- `docs/`: setup, security, and release notes.
- Existing Roblox source files remain at the repository root.

## Current status
This branch adds the first backend and product foundation. It is not production-ready until the owner verifies the Cloudflare D1 database, configures Worker secrets and Roblox Universe IDs, connects the Discord guild, and completes the deployment and live-integration checklist.

## Security model
- License and developer API credentials are stored as HMAC-SHA-256 hashes using a server-side pepper; raw credentials are returned only at creation/issuance.
- Developer keys, approved games, licenses, and Discord guild integrations are tenant-scoped.
- The Discord bot uses a dedicated BOT_API_TOKEN, not the Worker admin token.
- Roblox authorization is decided by the Worker through a server-side script, never by a LocalScript.
- Legacy V1 validation fails closed unless the configured Universe ID allowlist permits the experience.
- Never commit secrets, tokens, or `.env` files.

Start with [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
