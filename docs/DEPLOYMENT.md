# ZervxHub deployment checklist

## Cloudflare Worker + D1

1. Install Node.js 22.12+ and run `npm ci` inside `worker/` to install the locked dependencies.
2. Create a D1 database: `npx wrangler d1 create zervxhub-db`.
3. Put the returned database ID in `worker/wrangler.toml`. The Worker serves the `website/` directory as same-origin static assets.
4. Review the pending SQL migrations, then apply them to the remote database with `npx wrangler d1 migrations apply zervxhub-db --remote` from `worker/`. The `db:remote` package script intentionally exits without applying changes; it is a safety guard, not the migration command.
   The account-binding migration preserves existing licenses and binds each one on its next successful Roblox validation.
5. Set `CORS_ORIGIN` in Worker Variables to the exact HTTPS origin serving the Worker and dashboard, with no trailing slash.
6. To enable developer sign-in, create a Discord OAuth2 application and set its redirect URI to `https://YOUR-WORKER/v2/auth/discord/callback`. Configure:
   - `DISCORD_OAUTH_CLIENT_ID` in Worker Variables.
   - `DISCORD_OAUTH_CLIENT_SECRET` as a Worker secret.
   - `DISCORD_OAUTH_REDIRECT_URI` in Worker Variables using the exact registered redirect URI.
   Discord's `identify` scope is the only requested scope. The dashboard sign-in status remains disabled until all OAuth settings and the same-origin configuration are valid.
7. Set strong secrets using Wrangler:
   - `npx wrangler secret put ADMIN_TOKEN` (Worker administrative operations)
   - `npx wrangler secret put KEY_PEPPER` (High-entropy secret for HMAC-SHA-256 key hashing)
   - `npx wrangler secret put BOT_API_TOKEN` (Private service credential for the Discord bot)
8. Add your real comma-separated Roblox Universe IDs to `ALLOWED_UNIVERSE_IDS` in the Worker's Variables settings. Do not leave it empty; validation and issuance intentionally fail closed.
9. Deploy: `npm run deploy`.
10. Check `GET /v1/health` on the deployed Worker URL, then confirm the website and `/dashboard.html` load from that same origin.

Never publish the admin token, bot token, or key pepper. Store them in a password manager. Do not put them in Roblox scripts, client bundles, or a public repository.
Never add the Discord OAuth client secret to `wrangler.toml`, website assets, or client-side code.

## Discord bot on Railway

1. Create a Discord application and bot in the Discord Developer Portal.
2. Invite it using the `bot` and `applications.commands` scopes.
3. Create a Railway service from the `discord-bot/` directory.
4. Set all variables from `.env.example` in Railway Variables.
5. Set `ZERVXHUB_API_URL` to the deployed Worker URL and `ZERVXHUB_BOT_TOKEN` to the same secret used by the Worker for `BOT_API_TOKEN`.
6. Deploy with `npm start`. Guild slash commands register at startup.

The bot needs Manage Server permission for `/revoke-key`. Keep both tokens private.

## Roblox integration

For an experience you own or are authorized to develop:

1. Disable the old `ZervxHub_v1_3_KeyAuth.server.lua` validator so it does not compete for the same RemoteFunction.
2. Copy `roblox/ZervxHubKeyServer.server.lua` into `ServerScriptService`.
3. Replace `https://YOUR-WORKER.workers.dev` in that server script with your deployed Worker URL.
4. Enable HTTP Requests in Roblox Studio's security settings.
5. Copy `roblox/ZervxHubKeyPrompt.client.lua` into `StarterPlayer/StarterPlayerScripts`.
6. Gate protected server-side features on the player's `ZervxHubAuthorized` attribute. Never trust a client-only UI to grant access.

The API validates the current experience's Universe ID (`game.GameId`) against the allowlist. The client prompt only collects the key; the server performs the request and makes the authorization decision.

## API smoke tests

Health check:

```sh
curl https://YOUR-WORKER.workers.dev/v1/health
```

The Discord bot calls `POST /v2/discord/games`, `POST /v2/discord/keys/issue`, and `POST /v2/discord/keys/revoke` with the private `x-bot-token` header. It does not use the Worker admin token. The Roblox server calls `POST /v2/keys/validate` without an admin or developer secret. Validation expects `key`, `universeId`, and `robloxUserId` JSON fields.

## Before public launch

- [ ] Configure real Universe IDs.
- [ ] Test valid, invalid, expired, revoked, and unauthorized-game keys.
- [ ] Test issuance cooldown and Discord permission checks.
- [ ] Configure Cloudflare rate limiting for the public validation route.
- [ ] Add privacy policy, terms, support contact, and refund policy before selling.
- [ ] Add monitoring, backups, and an incident-response plan.
