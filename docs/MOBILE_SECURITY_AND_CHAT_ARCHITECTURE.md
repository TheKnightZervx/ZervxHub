# ZervxHub Mobile Security and Chat Architecture

Status: planning specification only. No mobile client, authentication service, chat API, calling service, or file-sharing service is implemented by this document.

## Product scope

The first client target is mobile. Keep the existing licensing API and Roblox integrations compatible; do not replace or weaken the existing /v1 contract while introducing account/chat services.

- Global community chat: text and emoji only. No attachments, voice notes, calls, video calls, or screen sharing.
- Direct messages: two authenticated users; text, emoji, voice notes, voice calls, video calls, screen sharing, and file attachments.
- Private groups: membership-controlled conversations with the same private-chat media features. Only current members may read messages, retrieve attachments, or join calls.
- Email OTP sign-in: passwordless one-time code, single use, short expiry, resend cooldown, attempt limits, and generic responses that do not reveal whether an email has an account.
- Mobile-first UI and black/gold branding. Do not select a mobile framework until the actual client framework and repository layout are confirmed.

## Security-first delivery gates

Do not expose chat or call features publicly until all applicable gates pass.

1. **Identity and sessions**
   - Verify email OTP server-side; generate codes with a cryptographically secure RNG; store only a keyed hash/HMAC of the code, never the plaintext.
   - Enforce expiry, single-use consumption, per-email and per-IP throttles, resend cooldown, and bounded verification attempts.
   - Use opaque, high-entropy, revocable sessions; store only token hashes server-side; rotate on sensitive events; support logout-all and device/session revocation.
   - Never trust a client-supplied user ID, role, group ID, or permission.

2. **Authorization and tenant isolation**
   - Centralize authorization checks for every message read/write, conversation lookup, group membership change, attachment operation, and call-signaling action.
   - A direct conversation is accessible only to its two participants. A group is accessible only to current members.
   - Re-check membership when downloading an attachment and when joining/rejoining a call; do not rely on an old signed URL or client-side hiding.
   - Prevent insecure direct-object references by checking ownership and membership on every request.

3. **API and infrastructure**
   - Replace wildcard production CORS with an explicit allowlist; reject unexpected origins where browser clients are involved.
   - Add endpoint-specific rate limits, payload size limits, strict schema validation, safe error responses, security headers, and request IDs.
   - Keep admin credentials separate from end-user sessions; scope developer credentials per developer and game. Preserve legacy /v1 behavior during migration.
   - Keep secrets out of source control and logs. Use least-privilege bindings and separate local/staging/production configuration.
   - Add automated tests for authorization boundaries, OTP abuse, replay, rate limits, malformed payloads, and legacy API compatibility.

4. **Privacy, moderation, and abuse controls**
   - Do not log OTPs, session tokens, message bodies, call media, or file contents.
   - Provide block, mute, report, and moderation controls for global chat and private conversations.
   - Add global-chat slow mode, spam/flood limits, content reporting, moderator audit trails, and account sanctions.
   - Establish retention/deletion rules for messages, call metadata, and attachments before public launch.

5. **Files and media**
   - Attachments are allowed only in direct messages and private groups; reject attachment creation and retrieval in global chat at the API layer.
   - Use private object storage, random object keys, short-lived upload/download authorization, strict size/type allowlists, MIME sniffing, and per-user/group quotas.
   - Never expose bucket credentials or public object URLs. Re-check conversation membership at download time.
   - Treat voice notes as private attachments with duration/size limits. Do not accept executable or active-content formats by default.
   - Add malware scanning/quarantine before allowing downloads; if no safe scanning path is available on the free budget, restrict allowed file types and keep uploads disabled until the control is in place.

6. **Calls and screen sharing**
   - Use WebRTC for real-time media with authenticated, short-lived signaling and authorization scoped to the conversation.
   - Start with one-to-one voice/video calls. Add group calls only after a secure, tested group-call topology is selected.
   - Screen sharing must be explicitly started by the user, visibly indicated, and stoppable at any time. Never start capture automatically.
   - TURN relay capacity, mobile OS permissions, background behavior, and any provider charges must be verified before enabling calls. Do not assume public STUN alone provides reliable connectivity.
   - Do not record calls by default. Make call invitations, participants, and join/leave events auditable without logging media.

## Suggested implementation sequence

A. Audit and harden the current Worker/D1 foundation; add tests and a reviewed migration plan. Do not deploy or run remote migrations as part of this planning step.

B. Confirm the mobile framework and add the branded app shell, secure local session handling, and email OTP flow.

C. Add conversation schema and APIs: users/profiles, direct conversations, private groups, group memberships, messages, blocks, reports, and moderation actions. Enforce membership checks in server-side query paths.

D. Ship global text/emoji chat with moderation and abuse controls.

E. Ship private text/emoji chat, then voice notes and private file sharing after storage authorization and scanning gates pass.

F. Add one-to-one WebRTC voice/video calling, then user-initiated screen sharing. Add group calls only after load, permission, and security testing.

G. Complete security review, dependency audit, abuse testing, backup/restore test, incident response plan, and release checklist before public launch.

## Budget and release constraints

- Design for a zero-dollar development budget and local testing first.
- Do not add paid APIs, paid email delivery, paid TURN/SFU capacity, paid storage, subscriptions, upgrades, or production billing without explaining the cost and receiving explicit approval.
- Verify current free-tier eligibility and limits before choosing any external provider; do not promise that free tiers are sufficient for production traffic.
- Do not deploy publicly or run destructive/remote database migrations without explicit approval.
- Keep the project build-test-verify-then-launch. Critical/high-risk findings block public release.

## Known repository limitation

The inspected branch currently contains a Cloudflare Worker + D1 licensing foundation, Discord bot, Roblox integration, static website, and documentation. No mobile application framework or chat implementation was found in the inspected branch. The client framework and supported mobile platform capabilities must be confirmed before writing platform-specific app code.