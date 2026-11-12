# ZervxHub support and issue reporting

## Current support status

ZervxHub does not have a staffed support desk, private support mailbox, response-time commitment, or production service status page. The repository's GitHub issue tracker is the available community channel. Issues may be visible publicly; do not include private player information or secrets.

## Before reporting an issue

1. Follow [DEPLOYMENT.md](DEPLOYMENT.md), [DEVELOPER_ONBOARDING.md](DEVELOPER_ONBOARDING.md), or [ROBLOX_INTEGRATION.md](ROBLOX_INTEGRATION.md), as applicable.
2. Record the repository commit, operating system, Node.js version, and exact sanitized command/result.
3. Describe the expected behavior, observed behavior, and minimal reproduction steps.
4. Say whether the report is for a local, staging, or deployed setup. Do not include production identifiers unless needed and safe to share.
5. Remove request headers, tokens, raw license keys, Discord/Roblox user IDs, database contents, private URLs, and environment values from logs and screenshots.

## If a credential may have been exposed

- Treat it as compromised immediately; do not wait for an issue response.
- Rotate the affected Worker secret through the authorized Cloudflare account. Coordinate matching bot-token updates with the bot host.
- Use `POST /v2/admin/developer-keys/rotate` with the developer ID to revoke all active developer API credentials and issue a replacement. Deliver the replacement privately; it is returned once.
- Revoke affected license keys using the authorized bot or developer workflow.
- Review access logs and D1 records for unexpected use. Do not post the credential or raw database export in a ticket.

This repository does not automate secret rotation, breach notification, data export/deletion, or incident response. Operators must establish those procedures before a commercial launch.
