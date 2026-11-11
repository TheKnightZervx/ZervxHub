# Deploying the Discord bot on Railway

The bot is a long-running Discord Gateway worker. It does not serve HTTP traffic and does not need a public domain or port. The Cloudflare Worker and D1 database are separate services; deploy the Worker with Wrangler after the Roblox allowlist is configured.

## Before deploying

1. Configure and deploy the Cloudflare Worker as described in [README.md](README.md). Set `ALLOWED_EXPERIENCE_IDS` to the real Roblox universe IDs. An empty list rejects every game.
2. Create a Discord application and bot in the Discord Developer Portal. Add the bot to the intended server with the `bot` and `applications.commands` scopes and only the permissions needed to use slash commands.
3. Keep the bot token private. Do not commit it or paste it into chat.

## Railway project setup

1. In Railway, create a project and add a service from the GitHub repository `TheKnightZervx/ZervxHub`.
2. Select the `codex/zervxhub-key-system` branch for this service. Keep the service root directory at `/`; Railway will detect the repository's root `Dockerfile`.
3. Add these variables in the bot service's Variables page. Mark the token values as secrets in Railway.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes, secret | Bot token from Discord Developer Portal |
| `DISCORD_CLIENT_ID` | Yes | Discord application ID |
| `DISCORD_GUILD_ID` | Yes | Discord server ID for registering the guild slash command |
| `KEY_API_URL` | Yes | Deployed Worker base URL, for example `https://your-worker.workers.dev` |
| `BOT_API_TOKEN` | Yes, secret | Must exactly match the Worker's `BOT_API_TOKEN` secret |

4. Review Railway's staged configuration and pricing before deploying. The first bot startup registers the guild `/freekey` command, then connects to Discord.
5. Check the Railway deployment logs for a successful Discord connection. Do not print or log environment variable values.

## Rotation and updates

- Rotate `DISCORD_TOKEN` in the Discord Developer Portal if it is exposed, then update the Railway secret.
- Rotate `BOT_API_TOKEN` in both Cloudflare Worker secrets and Railway. Update both sides before restarting the bot.
- `KEY_PEPPER` protects stored key hashes. Changing it invalidates all existing keys; rotate only when necessary.
- To add or remove games, edit `ALLOWED_EXPERIENCE_IDS` in the root `wrangler.toml` as a comma-separated list of real universe IDs, then redeploy the Worker. Keep it empty until the owner supplies the IDs.

Railway's [Dockerfile guide](https://docs.railway.com/builds/dockerfiles) describes root Dockerfile detection. Its [variables guide](https://docs.railway.com/variables) describes service variables and secret management.
