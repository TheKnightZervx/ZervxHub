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
This branch adds the first backend and product foundation. It is not production-ready until the owner configures real Roblox Universe IDs, Cloudflare D1, Worker secrets, Discord credentials, and completes the deployment checklist.

## Security model
- Only SHA-256 hashes of license keys are stored in D1.
- Raw keys are returned once through an ephemeral Discord reply.
- Key issuance and revocation require the Worker admin token.
- Authorization is decided by a trusted server/backend, never a LocalScript.
- Validation fails closed when no Universe IDs are configured.
- Never commit secrets, tokens, or `.env` files.

Start with [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
