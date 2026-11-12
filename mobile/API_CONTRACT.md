# ZervxHub native app API contract

Cross-platform contract boundary for Android now and future iOS clients. Cloudflare Worker remains the source of truth.

## Security rules
- Native clients use HTTPS only in release builds.
- Server derives user, tenant, role, group and conversation identity from the authenticated session; never trust client-supplied ownership or permissions.
- Never ship admin, bot, game-server, OAuth client, payment, storage, or key-pepper secrets in an app.
- Session credentials are short-lived, revocable and rotated on refresh; store them in platform secure storage (Android Keystore; iOS Keychain).
- Never put tokens in URLs, deep links, analytics, logs, crash reports, or clipboard.
- Handle 401, 403, 404, 409, 422, 429 and 5xx without exposing server internals.
- Use idempotency keys for retryable mutations; cap pagination and request sizes.

## Account and email OTP
Proposed routes only; implement only after route schemas and D1 migrations have tests.
- `POST /v2/mobile/auth/email/request-code`: generic response regardless of account existence; server-generated CSPRNG code, HMAC/hash-only storage, short expiry, one-time consumption, resend cooldown, per-email/IP throttles, attempt cap.
- `POST /v2/mobile/auth/email/verify-code`: constant-time verification, atomic consume, issue opaque high-entropy session; store only session-token hash.
- `POST /v2/mobile/auth/session/refresh`: rotate credentials and detect reuse.
- `POST /v2/mobile/auth/session/logout` and `/logout-all`: revoke current or all user sessions.
- Never log email OTPs, verification codes, raw tokens, or session identifiers.

## Chat and realtime access model
- Global room: authenticated text and Unicode emoji only. API rejects attachments, voice notes, call signaling, video and screen-share requests.
- Direct messages: exactly two participants. Every read/write and realtime subscription verifies that the authenticated user is one of the participants.
- Private groups: server-managed membership and roles. Every message, membership mutation, upload/download, and call join rechecks current membership.
- Blocked users cannot initiate DMs, mention, invite, or call the blocker. Add report, mute, spam/flood throttles, global slow mode, moderator actions and audit records.
- Message pagination is bounded; input length and content type are validated server-side. No client-trusted sender IDs.

## Attachments and voice notes
- Attachments and voice notes are allowed only in DMs/private groups; the global-room API rejects both on create and read.
- Use private object storage with random object keys and no public bucket URLs. Authorize upload and re-authorize every download against current conversation membership.
- Enforce byte limits, MIME sniffing, allowlisted media/document types, per-user/group quotas, short-lived one-use upload grants, and malware quarantine/scanning before download.
- If safe scanning/storage cannot be provided within the approved free budget, keep upload controls disabled; never silently fall back to public storage.
- Voice notes have duration and byte caps and are stored as private media objects.

## Voice/video calls and screen sharing
- Use authenticated, short-lived WebRTC signaling bound to a direct conversation or private group.
- Start with one-to-one voice/video calls; add group calling only after a secure SFU/topology and cost plan is approved.
- Do not assume public STUN is sufficient. TURN relay availability, free-tier limits, mobile background behavior and any charges must be verified before enabling calls.
- Screen capture is user-initiated, visibly indicated, and stoppable at any time. Never start capture automatically.
- Calls are not recorded by default; persist only minimal call metadata needed for abuse handling and troubleshooting.

## Subscriptions
- Native app reads plan catalog and the authenticated user's entitlement/status from the Worker.
- Purchase/checkout remains disabled until merchant onboarding and Iraq payout eligibility are verified and owner explicitly approves activation.
- Never trust client-submitted plan, price, entitlement or payment status. Grant entitlements only from verified provider webhooks/server-side checks.
- Do not bundle payment secrets or open a checkout that can incur charges without explicit approval.

## Not yet implemented
The Android UI currently presents disabled placeholders until matching server endpoints, storage authorization, realtime transport and tests exist. Do not show fake users, messages, prices, entitlements or payment success.
