# ZervxHub deployment checklist

## Prerequisites

Use **Node.js 22.12 or newer**. The Worker CI schema tests use Node's built-in `node:sqlite`, and the current Wrangler toolchain also requires Node 22.12+.

## Cloudflare Worker + D1

1. Install Node.js 22.12+ and run `npm ci` inside `worker/` to install the locked dependencies.
2. Create a D1 database if needed: `npx wrangler d1 create zervxhub-db`.
3. Put the returned database ID in `worker/wrangler.toml`. Verify any existing ID belongs to your Cloudflare account. The Worker serves the `website/` directory as same-origin static assets.
4. Review the pending SQL migrations. Remote changes are intentionally not run by the `db:remote` package script; it exits as a safety guard. After confirming the Cloudflare account, database, and migration contents, apply them explicitly from `worker/` with `npx wrangler d1 migrations apply zervxhub-db --remote`. The account-binding migration backfills each license's binding from its last recorded Roblox account; never-used licenses bind on their next successful validation.
5. Set `CORS_ORIGIN` in Worker Variables to the exact HTTPS origin serving the Worker and dashboard, with no trailing slash.
6. To enable developer sign-in, create a Discord OAuth2 application and set its redirect URI to `https://YOUR-WORKER/v2/auth/discord/callback`. Configure `DISCORD_OAUTH_CLIENT_ID` and `DISCORD_OAUTH_REDIRECT_URI` as Worker Variables and `DISCORD_OAUTH_CLIENT_SECRET` as a Worker secret. Discord's `identify` scope is the only requested scope.
7. Set strong secrets using Wrangler:
   - `npx wrangler secret put ADMIN_TOKEN` (Worker administrative operations)
   - `npx wrangler secret put KEY_PEPPER` (high-entropy secret for HMAC-SHA-256 credential hashing)
   - `npx wrangler secret put BOT_API_TOKEN` (private credential used only by the Discord bot; use a different random value from `ADMIN_TOKEN`)
8. Add real comma-separated Roblox Universe IDs to `ALLOWED_UNIVERSE_IDS`. Do not leave it empty; validation and legacy V1 issuance fail closed without this allowlist.
9. Deploy with `npm run deploy`, then check `GET /v1/health` and confirm the website and `/dashboard.html` load from the same origin.

Never publish the admin token, bot token, or key pepper. Store them in a password manager; do not put them in Roblox scripts, client bundles, `wrangler.toml`, or a public repository. Keep a secure backup of `KEY_PEPPER`: changing it without a planned credential migration makes existing HMAC-hashed credentials fail validation.

## Bootstrap the developer and Discord server

The V2 bot is tenant-scoped. Before the bot can issue keys, an administrator must create a developer and connect the Discord guild to that developer.

1. Use `POST /v2/admin/developers` with `x-admin-token` and the developer's Discord user ID and display name. Save the returned developer ID and API key securely; the key is shown only once. Administrators can retrieve the latest 100 developer records with `GET /v2/admin/developers`.
2. Use `POST /v2/admin/discord-integrations` with `x-admin-token` and the Discord guild ID and developer ID.
3. Review/approve the developer's registered Roblox Universe IDs through `POST /v2/admin/games/review` after the developer registers them with `POST /v2/games/register`.

If a developer loses their API key, an administrator can use `POST /v2/admin/developer-keys/rotate`; this revokes all previous keys and returns a replacement once. Do not give the developer API key or admin token to the Discord bot. The bot uses only its separate `BOT_API_TOKEN`.

## Discord bot on Railway

1. Create a Discord application and bot in the Discord Developer Portal.
2. Invite it using the `bot` and `applications.commands` scopes.
3. Create a Railway service from the `discord-bot/` directory.
4. Set all variables from `.env.example` in Railway Variables.
5. Set `ZERVXHUB_API_URL` to the deployed Worker URL and `ZERVXHUB_BOT_TOKEN` to the same secret used by the Worker for `BOT_API_TOKEN`.
6. Deploy with `npm start`. Guild slash commands register at startup.

The bot uses the tenant-scoped `/v2/discord/games`, `/v2/discord/keys/issue`, and `/v2/discord/keys/revoke` endpoints with `x-bot-token`. The `/revoke-key` Discord command additionally requires the caller to have Manage Server permission. Keep the Discord bot token and BOT_API_TOKEN private.

## Roblox integration

For an experience you own or are authorized to develop:

1. Disable the old `ZervxHub_v1_3_KeyAuth.server.lua` validator so it does not compete for the same RemoteFunction.
2. Copy `roblox/ZervxHubKeyServer.server.lua` into `ServerScriptService`.
3. Replace `https://YOUR-WORKER.workers.dev` in that server script with your deployed Worker URL.
4. Enable HTTP Requests in Roblox Studio's security settings.
5. Copy `roblox/ZervxHubKeyPrompt.client.lua` into `StarterPlayer/StarterPlayerScripts`.
6. Gate protected server-side features on the player's `ZervxHubAuthorized` attribute. Never trust a client-only UI to grant access.

The API validates the current experience's Universe ID (`game.GameId`) against an approved game owned by an active developer. The client prompt only collects the key; the server performs the request and makes the authorization decision.

## API smoke tests

Health check:

```sh
curl https://YOUR-WORKER.workers.dev/v1/health
```

The Discord bot calls `POST /v2/discord/games`, `POST /v2/discord/keys/issue`, and `POST /v2/discord/keys/revoke` with the private `x-bot-token` header. It does not use the Worker admin token. The Roblox server calls `POST /v2/keys/validate` without an admin or developer secret. Validation expects `key`, `universeId`, and `robloxUserId` JSON fields.
The legacy `POST /v1/keys/validate` route also requires a numeric `robloxUserId` and binds each legacy license to the first Roblox account that successfully uses it. Administrative V1 and V2 routes use `x-admin-token`.

## Before public launch

- [ ] Confirm the D1 database ID and apply migrations to the intended remote database.
- [ ] Configure real Universe IDs and approve each registered game.
- [ ] Test valid, invalid, expired, revoked, and unauthorized-game keys.
- [ ] Test tenant isolation, issuance cooldown, and Discord permission checks.
- [ ] Configure Cloudflare rate limiting for public validation and bot endpoints.
- [ ] Add privacy policy, terms, support contact, and refund policy before selling.
- [ ] Add monitoring, backups, and an incident-response plan.
