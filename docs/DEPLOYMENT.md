# ZervxHub deployment checklist

## Cloudflare Worker + D1

1. Install Node.js 20+ and run `npm install` inside `worker/`.
2. Create a D1 database: `npx wrangler d1 create zervxhub-db`.
3. Put the returned database ID in `worker/wrangler.toml`.
4. Apply the schema: `npm run db:remote`.
5. Set a strong secret: `npx wrangler secret put ADMIN_TOKEN`.
6. Add the comma-separated real Universe IDs to `ALLOWED_UNIVERSE_IDS` in Worker variables. Do not leave it empty; validation and issuance intentionally fail closed.
7. Deploy: `npm run deploy`.
8. Check `GET /v1/health` on the deployed Worker URL.

Never publish the admin token. Store it in a password manager.

## Discord bot on Railway

1. Create a Discord application and bot in the Discord Developer Portal.
2. Invite it using the `bot` and `applications.commands` scopes.
3. Create a Railway service from the `discord-bot/` directory.
4. Set all variables from `.env.example` in Railway Variables.
5. Set `ZERVXHUB_API_URL` to the deployed Worker URL and `ZERVXHUB_ADMIN_TOKEN` to the same secret used by the Worker.
6. Deploy with `npm start`. Guild slash commands register at startup.

The bot needs Manage Server permission for `/revoke-key`. Keep both tokens private.

## Roblox integration contract

The API accepts `POST /v1/keys/validate` with JSON:

```json
{
  "key": "ZERVX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
  "universeId": "YOUR_UNIVERSE_ID",
  "robloxUserId": "PLAYER_USER_ID"
}
```

Use a trusted server-side script in an experience you own or are authorized to develop. A LocalScript may collect the key, but it must not decide authorization or contain admin credentials. Enable HTTP requests in Studio.

## Before public launch

- [ ] Configure real Universe IDs.
- [ ] Test valid, invalid, expired, revoked, and unauthorized-game keys.
- [ ] Test issuance cooldown and Discord permission checks.
- [ ] Add privacy policy, terms, support contact, and refund policy before selling.
- [ ] Add monitoring, backups, and an incident-response plan.
