# ZervxHub developer onboarding

ZervxHub includes a developer dashboard and Discord OAuth sign-in, but they work only when an operator configures the Worker, same-origin website assets, D1 migrations, and OAuth application. The repository does not include password authentication, email collection, or account recovery. A connected Discord account is the account identity.

## Before onboarding

The operator should:

- Configure the Worker, D1 database, website assets, and OAuth settings using [DEPLOYMENT.md](DEPLOYMENT.md).
- Test the API and bot against a non-production D1 database.
- Confirm the developer controls the Roblox experience and Discord guild being connected.
- Tell developers to access the dashboard only on the configured HTTPS Worker origin. Raw API and license keys are shown once and cannot be retrieved from their D1 hashes.

Never request or store a developer's raw API key after delivery. Do not put keys in Roblox scripts, issue reports, source control, or shared screenshots.

## Register and approve

1. The developer opens `/dashboard.html` and chooses Discord sign-in. On first successful sign-in, the Worker creates a free developer account using the verified Discord user ID. No email or password is requested.
2. The developer registers a Roblox Universe ID and name in the dashboard. Registration creates a pending game; it does not authorize keys.
3. Verify the Universe ID and ownership independently, then approve it through `POST /v2/admin/games/review`.
4. The developer can create licenses only for approved games, configure expiration from one hour to one year, inspect validation totals/history, and revoke licenses. The raw license key is shown once. A license is bound atomically to the Roblox account ID from its first successful validation; later validation attempts by another account are denied. Existing licenses preserve their last recorded Roblox account during migration; never-used licenses bind on their first successful validation.
5. The developer API key can be rotated in the dashboard. Rotation revokes every active key for that account and returns one replacement once. Store it privately and use it only in trusted server-side requests.
6. Connect a Discord guild through `POST /v2/admin/discord-integrations`. A guild is mapped to one developer at a time. Review the intended developer before changing an existing integration.
7. Configure the Discord bot in its own host with the guild ID, Discord credentials, Worker URL, and a dedicated bot API token. Configure the matching token as the Worker's `BOT_API_TOKEN` secret. Do not give the bot the admin token.
8. Create a per-game server key in the dashboard and place it in a `StringValue` under Roblox `ServerStorage`; do not use a developer API key for game validation. Test `/getkey`, `/revoke-key`, the Roblox server validator, expiry, and game scoping using test data before inviting real users.

The browser session is an opaque random token in a Secure, HttpOnly, SameSite=Lax cookie with a seven-day lifetime. D1 stores only its HMAC using `KEY_PEPPER`; logout revokes the session. Mutating dashboard routes require an exact `Origin` match to `CORS_ORIGIN`. Discord OAuth state is random, short-lived, and checked against a host-only HttpOnly cookie. The application does not implement password or email-based recovery.

All tokens must be supplied through private request headers or secret managers. Do not paste token values into shell history or public logs. Review the endpoint behavior and request fields in `worker/src/v2.ts` before operating a production instance.

## Lifecycle operations

- **Suspend a developer:** use `POST /v2/admin/developers/status` with status `suspended`. Developer credentials and linked Discord operations then fail closed; key validation for that developer is denied.
- **Rotate a lost or exposed developer API key:** use `POST /v2/admin/developer-keys/rotate` with the developer ID. All active developer API keys for that account are revoked and a replacement is returned once. Deliver it privately; the old credential stops working immediately.
- **Revoke all developer API keys:** use the dashboard rotation action or `POST /v2/admin/developer-keys/rotate`. The raw replacement is returned once.
- **Revoke a specific developer API key:** administrators can use `POST /v2/admin/developer-keys/revoke`. The raw key is needed for this operation.
- **Disconnect a guild:** use `POST /v2/admin/discord-integrations/revoke` with the guild ID.
- **Review a game:** pending games may be approved or rejected; re-check the Roblox Universe ID before approval.
- **Revoke a member key:** use the bot command `/revoke-key` with a member who has Manage Server permission, or use the developer API from a trusted host.

Keep an operational record of the developer, game, guild, approvals, and actions without recording raw credentials or raw license keys.

## Current product limitations

There is no account recovery, customer email, paid entitlement enforcement, checkout, payment provider, service-level agreement, or formal support queue. Subscription records and plan-change requests are a foundation only; requests do not change entitlements and no payment is taken. License validation tracks daily aggregate counts and timestamps, not individual Roblox player activity history. First-use account binding is enforced, but there is no separate activation workflow. See [COMMERCIAL_READINESS.md](COMMERCIAL_READINESS.md) before considering a paid launch.
