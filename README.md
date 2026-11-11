# ZervxHub

ZervxHub is a Roblox experience tooling project with a separate licensing API and Discord community bot.

## Repository layout
- `worker/`: Cloudflare Worker API and D1 schema.
- `discord-bot/`: Discord slash-command bot intended for Railway.
- `docs/`: setup, security, and release notes.
- Existing Roblox Luau files remain at the repository root.

## Current status
This branch adds the first backend foundation. It is not production-ready until the owner configures real Roblox Universe IDs, Cloudflare D1, Worker secrets, Discord credentials, and completes the deployment checklist.

## Security model
- Only SHA-256 hashes of license keys are stored in D1.
- Raw keys are returned once through an ephemeral Discord reply.
- Key issuance and revocation require the Worker admin token.
- Authorization must be validated by a trusted server/backend, never a LocalScript.
- Validation fails closed when no Universe IDs are configured.
- Never commit secrets, tokens, or `.env` files.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
