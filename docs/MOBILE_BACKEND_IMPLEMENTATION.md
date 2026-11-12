# Mobile backend implementation

## Scope delivered on this branch

- Passwordless email OTP request and verification routes.
- HMAC-SHA-256 OTP and bearer-session token storage using a separate `MOBILE_AUTH_PEPPER` secret with domain-separated HMACs.
- Five-minute, single-use codes with five verification attempts, 60-second resend cooldown, and persistent D1 rate limits by email and IP.
- Session refresh rotation, current-session logout, and logout-all.
- Authenticated global text/Unicode-emoji chat, direct conversations, private groups, bounded message pagination, blocking, and abuse reports.
- Global chat rejects attachment, voice, call, video, and screen-share payloads.
- Direct/group media and WebRTC signaling deliberately return 503 until safe storage, malware scanning, TURN/SFU reachability, and cost are verified.

## Routes

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/v2/mobile/auth/email/request-code` | Request a one-time email code |
| POST | `/v2/mobile/auth/email/verify-code` | Consume code and create session |
| POST | `/v2/mobile/auth/session/refresh` | Rotate bearer token |
| POST | `/v2/mobile/auth/session/logout` | Revoke current session |
| POST | `/v2/mobile/auth/session/logout-all` | Revoke all sessions for user |
| GET | `/v2/mobile/account` | Read current account |
| GET | `/v2/mobile/subscription` | Read currently connected subscription (null until linked) |
| GET/POST | `/v2/mobile/chat/global/messages` | Global text and emoji only |
| GET | `/v2/mobile/chat/conversations` | List private conversations |
| POST | `/v2/mobile/chat/direct` | Create or retrieve a two-person DM |
| POST | `/v2/mobile/chat/groups` | Create a private group |
| GET/POST | `/v2/mobile/chat/conversations/:id/messages` | Read/send authorized private text messages |
| POST | `/v2/mobile/chat/block` | Block a user |
| POST | `/v2/mobile/chat/report` | Report a user |

All authenticated routes require `Authorization: Bearer <token>`. User IDs, membership, sender identity, and conversation type are resolved server-side. Client-supplied sender/role fields are ignored.

## Email delivery binding

The Worker accepts an optional Cloudflare service binding named `MAILER`. It sends a POST to `https://mailer.internal/send` with JSON `{ to, subject, text }`. The binding must point to an independently reviewed mail-delivery Worker/service that:
- validates recipient and sender policy;
- uses an approved sender identity;
- never logs message bodies or verification codes;
- has abuse controls and provider quota handling;
- returns a success status only after accepting delivery.

No `MOBILE_AUTH_PEPPER` secret or mail service is currently configured for production. If `MAILER` is absent, OTP requests return 503 without creating or exposing a code. Do not connect a paid provider or enable billing without owner approval.

## Required setup and verification

1. Review the service binding implementation and set `MAILER` only after a delivery provider and sender identity are approved.
2. Apply migration `0007_mobile_identity_and_chat.sql` to a local database for development. Do not apply remote D1 migrations from this branch.
3. Run `npm ci`, `npm run typecheck`, and `npm test` in `worker/`.
4. Confirm D1 migration ordering and run the migration against a disposable local D1 database.
5. Add abuse/moderation operations, group membership management, account deletion/export, privacy retention and user discovery before public release.
6. Implement private media only with private object storage, one-use upload grants, MIME sniffing, byte quotas, malware quarantine, per-download membership checks, and deletion lifecycle.
7. Implement WebRTC only with authenticated expiring signaling, verified TURN relay, mobile background handling and an approved zero-cost relay plan.
8. Integrate this backend branch with the Android UI branch only after security branch review and CI.
9. Keep subscription checkout disabled until provider onboarding, Iraq payout eligibility, and explicit owner approval are complete.

No deployment, remote migration, billing activation, paid API, production storage, TURN/SFU, or public release was performed.
