# ZervxHub execution tracker

Last repository review: 2026-11-12
Working baseline: `mission3-base`

This tracker records repository-visible work only. A checked item means its source or test evidence exists in this branch; it does not imply a live production deployment or an external integration has been verified.

## Current baseline

- [x] Cloudflare Worker API source and D1 migrations are present.
- [x] V1 and V2 licensing routes are present, including tenant-scoped developer operations.
- [x] Developer dashboard and Discord OAuth/session implementation are present.
- [x] Discord bot source and slash-command licensing flows are present.
- [x] Roblox server/client integration source is present.
- [x] Worker and Discord CI workflows are present.
- [x] Repository-level security review and deployment instructions are present.
- [ ] Production deployment and remote D1 configuration are not verified.
- [ ] Discord OAuth, bot behavior, and Roblox Studio flows are not verified against live external accounts.
- [ ] Billing/checkout is not enabled.
- [ ] Developer Studio tools are not complete.
- [ ] Windows desktop installer/source and current local worktree are not verified from this repository baseline.

## Execution order

### 1. Stabilize the existing baseline

- [ ] Inspect all open pull requests and compare their base/head histories before integrating anything.
- [ ] Run the repository CI on the selected baseline and record the exact run URLs and results.
- [ ] Review migrations 0000–0006 for ordering, constraints, rollback/recovery implications, and compatibility.
- [ ] Review Worker V1/V2 authorization, origin/CSRF behavior, session lifecycle, rate limiting, and tenant isolation.
- [ ] Review Discord bot permissions, guild scoping, secret handling, error handling, and API authorization.
- [ ] Review Roblox server credential storage and ensure no credential is exposed to clients.
- [ ] Fix confirmed issues in a focused branch with regression tests.

### 2. Complete product fundamentals

- [ ] Verify dashboard data is backed by real API responses; keep honest empty/loading/error states and no fabricated metrics.
- [ ] Complete project/game management and approval flows.
- [ ] Complete license lifecycle: issue, validate, bind, expire, revoke, renew, and audit history.
- [ ] Verify developer API-key creation, one-time display, rotation, and revocation.
- [ ] Complete documentation and integration examples for supported flows.
- [ ] Improve accessible, responsive black-and-gold website/dashboard consistency.

### 3. Developer Studio

- [ ] Code snippets library for JavaScript, Python, Lua, Roblox Lua, HTML/CSS, and Discord.js.
- [ ] API tester with safe request handling and no accidental secret persistence.
- [ ] Error explainer/debugger with explicit user-controlled code input.
- [ ] Documentation generator.
- [ ] Local-first security scanner for common secrets and risky patterns.
- [ ] GitHub integration using secure authorization and least privilege.
- [ ] AI coding assistance only through a genuinely free/local option unless the owner explicitly approves a paid provider.

### 4. Discord community and services

- [ ] Audit the existing server structure before changing channels or roles.
- [ ] Define clear support, announcements, documentation, developer, and service-request areas.
- [ ] Apply least-privilege roles and bot permissions.
- [ ] Publish service descriptions only after scope, delivery expectations, and support boundaries are clear.

### 5. Pre-launch security and operations gate

- [ ] Resolve all critical/high findings and document accepted residual risks.
- [ ] Test OAuth state, redirect validation, cookies, logout, session expiry, and revocation in isolated staging.
- [ ] Test tenant isolation and cross-developer access denial.
- [ ] Test request size limits, replay prevention, rate limits, and abuse handling.
- [ ] Verify secrets are stored only in platform secret storage and are never logged or bundled.
- [ ] Configure edge rate limits, monitoring, log redaction, backups, and a tested restore procedure.
- [ ] Run dependency and static security checks; manually review findings.
- [ ] Perform private Roblox Studio and Discord staging acceptance tests.
- [ ] Review privacy policy, terms, support, refund, and applicable legal requirements before selling.

### 6. Deployment and commercial readiness

- [ ] Confirm a free-tier deployment path and current limits before any setup.
- [ ] Verify account eligibility, region support, and operational access before choosing providers.
- [ ] Verify payment-provider merchant onboarding and payout availability for the owner's actual country and destination before integration.
- [ ] Keep paid plans, checkout, subscriptions, and external paid APIs disabled until explicitly approved.
- [ ] Deploy only after the security gate passes and the owner approves the exact target.

## Guardrails

- No paid service, API, domain, subscription, upgrade, or billable action without explicit approval.
- No production deployment, remote database migration, billing activation, or public launch without explicit approval.
- Do not merge divergent or unreviewed branches simply to make the branch list look clean.
- Preserve existing branches and user data; prefer small, reviewable pull requests.
- Never report a test as passed unless a real run produced that result.
- Do not treat repository source presence as proof of live Discord, Roblox, OAuth, payment, or production behavior.

## Current known integration boundary

The repository contains source code and local-test infrastructure. The checked-in deployment guide itself requires operator-provided Cloudflare configuration/secrets, Discord credentials, approved Roblox Universe IDs, and staging/live verification. Those external prerequisites are not satisfied merely by having the source in GitHub.
