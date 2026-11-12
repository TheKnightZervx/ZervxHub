# Global payments foundation

## Current status

This repository does not yet have a live payment provider, merchant profile, payment API credentials, checkout, or payment webhooks. The public API must continue to report `paymentsEnabled: false` until the merchant is approved and the complete integration is implemented and verified.

## Global checkout goals

- Accept international customers where the acquiring provider and issuer permit the transaction.
- Support Visa and Mastercard as the baseline global card rails.
- Let the provider-hosted checkout show only payment methods enabled for the merchant profile, buyer context, and transaction currency.
- Add local payment methods where they are genuinely available. For the current Iraq merchant-country candidate, PayTabs publishes Visa, Mastercard, and Amwal for Iraq.
- Do not display a payment method merely because its name appears in a global catalog. Provider profile activation, currency, country, device, and eligibility can restrict availability.
- Keep card entry and sensitive payment data on the provider-hosted page; never collect PAN or CVV in ZervxHub forms.

## Provider research: PayTabs candidate

PayTabs' merchant onboarding documentation lists Iraq among its supported merchant countries. Its Iraq page describes international card acceptance, multiple currencies, and settlement in local currency. Its 2026 country/payment-method material lists Visa, Mastercard, and Amwal for Iraq.

PayTabs documents region-specific API endpoints, including `https://secure-iraq.paytabs.com` for Iraq and `https://secure-global.paytabs.com` for its global region. The correct endpoint must come from the approved merchant profile; do not choose a global endpoint just because customers are international.

PayTabs' hosted payment page is the preferred first integration because the provider hosts the sensitive payment form. The provider documentation describes a server-side `POST /payment/request`, with a merchant profile ID, server key, transaction type/class, cart ID, currency, and amount. The provider can show all methods enabled on the merchant profile; the customer-facing site should not hard-code unavailable local wallets.

### Wallet limitations

PayTabs' published Apple Pay activation guidance lists merchant profiles in Saudi Arabia, UAE, Egypt, Oman, and Jordan. Iraq is not included in that list. Therefore do not promise Apple Pay for an Iraqi merchant profile. Google Pay is not confirmed by the reviewed PayTabs method documentation and must not be advertised as supported through this provider without written confirmation.

## Required before live integration

1. Confirm the merchant's legal onboarding eligibility as an individual or registered business in Iraq, exact KYC requirements, accepted bank account types, payout currency, settlement route, minimum payout, fees, and any setup costs directly with PayTabs.
2. Confirm that the merchant can receive payouts into an account they can access. Customer card acceptance does not prove payout eligibility.
3. Obtain an approved merchant profile and its correct region endpoint.
4. Obtain test profile credentials first. Store the profile ID as a Worker variable and server key as a Worker secret; never put either in website assets, desktop binaries, Roblox scripts, or Git.
5. Implement server-created orders with immutable plan/product price IDs, currency and amount validation, idempotency, and expiry.
6. Create hosted payment pages only from the Worker. Redirect customers only to validated HTTPS provider URLs.
7. Verify PayTabs server-to-server callbacks using HMAC-SHA256 and the exact raw request body/signature header. Fail closed on invalid signatures.
8. Bind every callback to a previously created order and verify cart ID, provider transaction reference, amount, currency, merchant profile, and final successful status. Deduplicate repeated notifications by transaction reference.
9. Never activate a subscription from the browser return URL alone. Only a verified server callback may change an entitlement.
10. Test success, failure, cancellation, pending, duplicate callback, invalid signature, amount/currency mismatch, refund, and provider outage cases.
11. Keep live billing disabled until test-mode verification and explicit launch approval.

## Method availability contract

The public `GET /v2/payments/methods` endpoint is informational only. It must return `checkoutEnabled: false` while the provider is not configured. Its catalog describes intended coverage, not a promise that every method is enabled for every customer.

The hosted provider page should be configured to show all payment methods enabled on the approved merchant profile. This lets the provider handle regional method, currency, and device availability rather than showing unsupported buttons in ZervxHub.

## Budget and launch guardrails

- No paid plan prices, provider setup fees, subscriptions, or recurring charges are activated by this work.
- No provider account is created and no paid service is purchased.
- No live payment credentials are requested in chat or committed to Git.
- No production deployment, remote database migration, or live checkout is performed without explicit approval.
