# Commercial readiness and payment integration plan

## Current status

The repository does not implement checkout, payment processing, paid entitlement activation, refunds, tax handling, or a customer billing portal. The Worker now has a provider-neutral subscription record, a plan catalog, usage aggregates, and tenant-scoped pending plan-change requests. The free plan is the only active plan; paid plan requests leave the current plan unchanged. No payment provider has been selected or connected. Do not accept payment or advertise a paid plan based on this code.

## Decisions required before provider selection

The project owner must decide the legal seller and operating jurisdictions, product and entitlement model, prices and currencies, trial and renewal rules, cancellation and refund policy, support channel, record-retention requirements, and tax obligations. Obtain qualified legal/accounting review and publish accurate terms, privacy, refund, and support information before taking payments. Choose a provider only after those constraints and its supported regions, fees, webhook security, and dispute process are reviewed.

## Safe implementation sequence

1. **Define entitlements first.** Specify the plans, eligible developers/games, key duration, renewal behavior, grace period, cancellation, failed payment, refund, and chargeback outcomes. Keep this policy separate from provider-specific code.
2. **Add tenant-scoped billing records.** The current `developer_subscriptions` schema associates a plan, status, billing period, period boundaries, cancellation marker, and provider references with one developer. It stores no card data. Define and approve exact limits and entitlement rules before enforcing paid plans; limit values remain unpublished and unconfigured.
3. **Isolate provider integration.** `worker/src/subscriptions.ts` defines the verified-event and provider-adapter contracts, but no provider implementation or public webhook route exists. Put checkout and subscription operations behind a server-side adapter. Keep API secrets in the hosting secret store; never expose them to Roblox clients, the website, or Discord command responses.
4. **Verify webhooks.** Verify the provider signature against the unmodified request body, enforce the provider's timestamp/replay rules, and reject invalid signatures. Use a unique provider event ID with a durable idempotency constraint; persist receipt and processing status, tolerate retries and out-of-order events, and reconcile provider state periodically.
5. **Grant from trusted state only.** A verified, reconciled subscription transition may change a developer entitlement. Never grant access from a browser redirect, client callback, or unverified webhook. Check the tenant and entitlement before issuing a key, and define how existing keys behave after cancellation, refund, or chargeback.
6. **Test in a provider sandbox.** Add durable event-id idempotency before implementing webhooks; the current foundation deliberately cannot activate paid access. Cover duplicate and reordered webhook events, failed and recovered payments, cancellation, refund, dispute, signature failure, secret rotation, and reconciliation. Test migrations and rollback strategy on a disposable local/staging database before considering a production change.
7. **Prepare operations and customer rights.** Add auditable support workflows, data export/deletion and retention procedures where required, incident handling, support ownership, and clear customer-facing pricing and policies. Limit administrator access and never log secrets or raw license keys.

## Launch blockers

- No approved provider, commercial terms, pricing, or entitlement limits.
- No checkout, verified webhook handler, payment event idempotency, reconciliation, refund workflow, or paid entitlement activation.
- Paid-plan change requests are informational and do not upgrade or downgrade accounts.
- No reviewed terms, privacy notice, refund/cancellation policy, or formal support operation.
- No production monitoring, on-call ownership, payment incident response, or audited data-retention policy.

This document is an implementation plan, not a payment integration or legal recommendation. Production billing must be separately authorized, implemented, tested with the selected provider's sandbox, reviewed, and explicitly approved before deployment.
