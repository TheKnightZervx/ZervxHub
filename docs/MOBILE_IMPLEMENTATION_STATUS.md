# Mobile implementation status — Android first

## Current client
- Native Kotlin + Jetpack Compose.
- Black and gold visual system (#090909 / #D6A93A).
- Android Keystore AES-GCM session-token helper already exists; cleartext traffic disabled and Android backup disabled.
- API base URL intentionally unset until verified Worker host and contracts exist.
- Future iOS client must implement the same platform-neutral API contract and use Keychain.

## This implementation slice
- Add Chat navigation with Global, Direct and Groups views.
- Global room explicitly advertises text + emoji only; no media actions are exposed.
- Direct and group views show private-media affordances (voice note, file, voice/video call, screen share) but controls remain disabled until authorization, signaling and storage services exist.
- Add Account navigation with passwordless email OTP and subscription tabs. Both remain disabled until secure Worker endpoints and provider eligibility are verified.
- Add a black/gold adaptive Android launcher icon.
- Do not fabricate users, messages, login success, plan prices, entitlements or checkout status.

## Backend delivery gates
1. Reconcile the Android branch with the latest Worker security hardening before backend auth/chat code is merged.
2. Implement OTP request/verify/session rotation/revocation with HMAC-only OTP storage, atomic one-time consumption, CSPRNG, attempt limits and per-identity/IP throttling.
3. Add D1 schema and server-side authorization tests for users, sessions, conversations, direct participants, groups/memberships, messages, blocks/reports, call invitations and attachment metadata.
4. Add global-room attachment/call rejection tests and direct/group membership isolation tests.
5. Add private object storage only after one-use upload grants, MIME sniffing, byte quotas and malware quarantine are in place.
6. Add authenticated WebRTC signaling. Verify TURN reachability and cost before calls are enabled; screen sharing must be user-initiated and visibly active.
7. Wire subscription status and plan catalog from the Worker. Keep checkout disabled until merchant onboarding, Iraq payout eligibility and explicit owner approval.
8. Run Android CI, API tests, dependency/security scans and physical-device checks. Critical/high findings block release.

## Budget and deployment guardrails
- $0 development budget. No paid API, email delivery, TURN/SFU, storage, subscription, upgrade or deployment without explaining cost and receiving explicit approval.
- No production migration, live billing, release signing, public launch or production deployment in this work.
- UI controls remain disabled until server-side enforcement and automated tests are available.
