# ZervxHub Free Key System

This directory contains a Cloudflare Worker + D1 key service. It is designed for a Roblox experience you own or are authorized to develop. It does not provide executor injection, anti-cheat bypasses, or authorization for third-party games.

## Current design

- Discord `/getkey` interaction issues one active Free Key per Discord account.
- Keys are generated with cryptographically secure randomness.
- Only SHA-256 hashes are stored in D1; the plaintext key is returned privately once.
- Keys expire after 24 hours by default (configurable up to 7 days).
- The first successful server-side validation binds a key to one Roblox user ID.
- The validation endpoint requires a server-only bearer secret.
- All API responses disable caching.

## Cloudflare setup

1. Install Node.js, then run `npm install` in `key-system/worker`.
2. Create the D1 database: `npm run db:create`.
3. Copy the returned database ID into `wrangler.toml`.
4. Apply the schema: `npm run db:migrate:remote`.
5. Set secrets with Wrangler (never commit them):
   - `npx wrangler secret put DISCORD_PUBLIC_KEY`
   - `npx wrangler secret put DISCORD_APPLICATION_ID`
   - `npx wrangler secret put ROBLOX_SERVER_TOKEN`
6. Run `npm run typecheck`, then `npm run deploy`.

Cloudflare login/authorization and secret entry must be completed by the account owner. Do not paste secrets into chat or commit them.

## Discord setup

Create a Discord application and bot in the Discord Developer Portal. Configure the Interactions Endpoint URL as:

`https://YOUR-WORKER-DOMAIN/discord/interactions`

Register the slash command by running `DISCORD_BOT_TOKEN=... DISCORD_APPLICATION_ID=... npm run discord:register` from the worker folder (PowerShell users can set these with `$env:DISCORD_BOT_TOKEN=...` and `$env:DISCORD_APPLICATION_ID=...`). Optionally set `DISCORD_GUILD_ID` to register it instantly in one test server; otherwise it is registered globally. The helper replaces this application's command list with the single `/getkey` command. Discord sends interactions directly to the Worker; no always-on bot process is required. Keep the bot token in your local shell environment and never commit it. The application public key is a Worker secret. The Worker verifies Discord's Ed25519 request signature and rejects stale timestamps.

## Roblox integration

Call `POST /v1/keys/verify` from a Script in ServerScriptService only. Send JSON `{ "key": "...", "robloxUserId": "123456" }` and the server-only header `Authorization: Bearer YOUR_ROBLOX_SERVER_TOKEN`. Never call this endpoint from a LocalScript or expose the bearer token to clients. The provided Roblox server Script and client ModuleScript are starting points; put the token only in a server Script in an experience you control.

## Routes

- `GET /health` — health check.
- `POST /discord/interactions` — Discord signed interaction endpoint.
- `POST /v1/keys/verify` — server-authenticated key validation.

## Important

The repository's existing client UI is a standalone UI demo. This infrastructure does not automatically turn a client-side executor script into a trusted Roblox server. Secure validation must happen on a server you control. Production deployment also requires the owner to authorize Cloudflare and provide secrets directly through Wrangler/Cloudflare's secret manager.
