# ZervxHub native app API contract

Cross-platform contract boundary for Android and future iOS clients. Cloudflare Worker remains the source of truth.

## Security rules
- Native clients use HTTPS only in release builds.
- Server derives tenant/user identity from authenticated session; never trust client-supplied tenant IDs, roles, owners, or permissions.
- Every project, game, key, activity, and subscription operation is tenant-scoped and authorized server-side.
- Never ship admin, bot, game-server, OAuth client, payment, or key-pepper secrets in an app.
- Session credentials are short-lived, revocable and rotated on refresh; store in platform secure storage (Android Keystore-backed encryption; iOS Keychain).
- Never put tokens in URLs, deep links, analytics, logs, crash reports, or clipboard.
- Handle 401, 403, 404, 409, 422, 429 and 5xx without exposing server internals.
- Use idempotency keys for retryable mutations; cap pagination server-side.

## Initial capability map

| Area | Read | Write |
| --- | --- | --- |
| Account/session | Own profile and sessions | Logout, revoke own sessions |
| Projects | Authorized projects | Create/update/archive own projects |
| Licenses | Authorized keys and status | Issue/revoke/renew where role permits |
| Activity | Own tenant activity | None |
| Developer Studio | Docs/snippets | Local-only code tools by default |
| Subscription | Current plan/status | Website-hosted checkout after provider approval |

## Not yet wired
No native login, refresh endpoint, push notifications, payment checkout, or live project/key API is enabled by this starter. Endpoint paths and schemas must be verified against Worker source before implementation. Never invent endpoint names or show fabricated live data.
