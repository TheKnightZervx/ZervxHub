# ZervxHub key system

Cloudflare Worker + D1 key service, Discord `/freekey` integration, and a Roblox server validator for an experience you own or are authorized to develop. Existing interface files remain in the repository.

## Behavior

- `/freekey` creates one random 24-hour key per Discord account per 24 hours. The bot replies ephemerally.
- D1 stores a peppered SHA-256 digest, never the plaintext key.
- First valid Roblox use binds the key to the Roblox user ID. Reuse from a different account is rejected.
- The Roblox client calls a `RemoteFunction`; only the Roblox server contacts the Worker. The server applies a per-player attempt limit.
- The validator only accepts configured Roblox universe IDs. The allowlist is `ALLOWED_EXPERIENCE_IDS` in `wrangler.toml`, as a comma-separated list. It is empty by default, which rejects all games until the owner supplies IDs. Edit the list and redeploy the Worker to add or remove games. The visible UI gate is not an authorization boundary; protected game actions must also be checked by trusted server scripts.

## Local setup

Requires Node.js 20+ and a Cloudflare account for eventual hosting. No deployment is performed by this project setup.

1. Install dependencies with `pnpm install` at the repository root (Node.js 20+).
2. Create a local D1 database with `npx wrangler d1 create zervxhub-keys`, then put the returned ID in `wrangler.toml`.
3. Set `ALLOWED_EXPERIENCE_IDS` in `wrangler.toml` to the comma-separated Roblox universe IDs you own/manage.
4. Apply schema locally using `npx wrangler d1 migrations apply zervxhub-keys --local`.
5. For local development, put placeholder values for `BOT_API_TOKEN` and `KEY_PEPPER` in `.dev.vars` (this file is git-ignored). Use unique high-entropy values for real deployments, set them with `pnpm exec wrangler secret put BOT_API_TOKEN` and `pnpm exec wrangler secret put KEY_PEPPER`, and never commit them.
6. Set bot environment values `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `KEY_API_URL`, and `BOT_API_TOKEN`. Keep the API token identical to the Worker's secret. The Discord bot token must never be sent to the Worker or committed.
7. Set the `API_URL` in `ZervxHub_v1_3_KeyAuth.server.lua` to the deployed Worker URL. In Roblox Studio, enable **Allow HTTP Requests**, install the file as a Script in `ServerScriptService`, and install `ZervxHub_v1_2_Gold_Premium.client.lua` as a LocalScript in `StarterPlayerScripts`.

Do not use a real secret until deployment is intentionally configured. This code does not deploy or create a Cloudflare account resource automatically.

For the Discord bot's Railway container and environment variables, see [RAILWAY.md](RAILWAY.md).

## API

- `GET /health`: liveness check.
- `POST /v1/keys/free` with `Authorization: Bearer <BOT_API_TOKEN>` and `{ "discordUserId": "..." }`: issue a 24-hour key.
- `POST /v1/keys/validate` with `{ "key": "...", "robloxUserId": "...", "experienceId": "..." }`: validate and bind.

Responses are JSON and marked `no-store`. Never log request bodies from either key endpoint.
