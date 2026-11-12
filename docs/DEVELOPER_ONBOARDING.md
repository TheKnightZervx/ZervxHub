# ZervxHub developer onboarding

ZervxHub currently has **administrator-provisioned developer accounts**, not public self-service registration. The repository does not include a user dashboard, account recovery flow, hosted API, or staffed onboarding service.

## Before onboarding

The operator should:

- Configure the Worker, D1 database, and secrets using [DEPLOYMENT.md](DEPLOYMENT.md).
- Test the API and bot against a non-production D1 database.
- Confirm the developer controls the Roblox experience and Discord guild being connected.
- Establish a private channel for delivering a newly issued developer API key. The key is returned once and cannot be retrieved from the hash stored in D1.

Never request or store a developer's raw API key after delivery. Do not put keys in Roblox scripts, issue reports, source control, or shared screenshots.

## Provision and approve

1. An administrator creates the developer using `POST /v2/admin/developers` with the Worker admin token. Provide the developer's Discord user ID and a display name. The API returns a new developer API key once.
2. Deliver that key privately using an approved secret-sharing method. Ask the developer to store it in a password manager and use it only in trusted server-side requests.
3. The developer registers a game using `POST /v2/games/register`, their developer API key, the Roblox Universe ID, and a display name. Registration creates a pending game; it does not authorize keys.
4. Verify the Universe ID and ownership independently, then approve it through `POST /v2/admin/games/review`.
5. Connect a Discord guild through `POST /v2/admin/discord-integrations`. A guild is mapped to one developer at a time. Review the intended developer before changing an existing integration.
6. Configure the Discord bot in its own host with the guild ID, Discord credentials, Worker URL, and a dedicated bot API token. Configure the matching token as the Worker's `BOT_API_TOKEN` secret. Do not give the bot the admin token.
7. Test `/getkey`, `/revoke-key`, the Roblox server validator, expiry, and game scoping using test data before inviting real users.

All tokens must be supplied through private request headers or secret managers. Do not paste token values into shell history or public logs. Review the endpoint behavior and request fields in `worker/src/v2.ts` before operating a production instance.

## Lifecycle operations

- **Suspend a developer:** use `POST /v2/admin/developers/status` with status `suspended`. Developer credentials and linked Discord operations then fail closed; key validation for that developer is denied.
- **Rotate a lost or exposed developer API key:** use `POST /v2/admin/developer-keys/rotate` with the developer ID. All active developer API keys for that account are revoked and a replacement is returned once. Deliver it privately; the old credential stops working immediately.
- **Revoke a specific developer API key:** use `POST /v2/admin/developer-keys/revoke`. The raw key is needed for this operation.
- **Disconnect a guild:** use `POST /v2/admin/discord-integrations/revoke` with the guild ID.
- **Review a game:** pending games may be approved or rejected; re-check the Roblox Universe ID before approval.
- **Revoke a member key:** use the bot command `/revoke-key` with a member who has Manage Server permission, or use the developer API from a trusted host.

Keep an operational record of the developer, game, guild, approvals, and actions without recording raw credentials or raw license keys.

## Current product limitations

There is no public signup, password/account recovery, customer portal, billing or subscription system, payment provider integration, service-level agreement, or formal support queue. The Worker issues 24-hour licenses; it does not provide subscription entitlements. See [COMMERCIAL_READINESS.md](COMMERCIAL_READINESS.md) before considering a paid launch.
