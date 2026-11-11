# ZervxHub deployment checklist

## Cloudflare Worker + D1

1. Install Node.js 20+ and run `npm install` inside `worker/`.
2. Create a D1 database: `npx wrangler d1 create zervxhub-db`.
3. Put the returned database ID in `worker/wrangler.toml`.
4. Apply the schema: `npm run db:remote`.
5. Set a strong secret: `npx wrangler secret put ADMIN_TOKEN`.
6. Add your real comma-separated Roblox Universe IDs to `ALLOWED_UNIVERSE_IDS` in the Worker's Variables settings. Do not leave it empty; validation and issuance intentionally fail closed.
7. Deploy: `npm run deploy`.
8. Check `GET /v1/health` on the deployed Worker URL.

Never publish the admin token. Store it in a password manager. Do not put it in Roblox scripts or a public repository.

## Discord bot on Railway

1. Create a Discord application and bot in the Discord Developer Portal.
2. Invite it using the `bot` and `applications.commands` scopes.
3. Create a Railway service from the `discord-bot/` directory.
4. Set all variables from `.env.example` in Railway Variables.
5. Set `ZERVXHUB_API_URL` to the deployed Worker URL and `ZERVXHUB_ADMIN_TOKEN` to the same secret used by the Worker.
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

The bot calls `POST /v1/keys/issue` and `POST /v1/keys/revoke` with the private admin header. Roblox calls `POST /v1/keys/validate` without an admin secret. Validation expects `key`, `universeId`, and `robloxUserId` JSON fields.

## Before public launch

- [ ] Configure real Universe IDs.
- [ ] Test valid, invalid, expired, revoked, and unauthorized-game keys.
- [ ] Test issuance cooldown and Discord permission checks.
- [ ] Configure Cloudflare rate limiting for the public validation route.
- [ ] Add privacy policy, terms, support contact, and refund policy before selling.
- [ ] Add monitoring, backups, and an incident-response plan.
