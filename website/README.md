# ZervxHub website

Responsive black-and-gold pages for the project overview, access/pricing status, developer documentation, support, policy publication status, and a cookie-authenticated developer dashboard. The copy distinguishes repository code from a configured hosted service; it does not advertise paid plans or claim Studio verification.

## Local preview

For static layout review, run `python -m http.server 8000 --directory website` from the repository root and open `http://localhost:8000`. Dashboard API and sign-in actions require the Worker. `worker/wrangler.toml` binds this directory as same-origin Worker assets so cookies and API requests share an origin.

## Publishing checklist

- Confirm all service status and setup links still reflect the deployed code.
- Configure Discord OAuth and `CORS_ORIGIN` for the exact HTTPS Worker origin before enabling developer sign-in.
- Apply reviewed D1 migrations before using dashboard endpoints.
- Publish reviewed terms, privacy, refund, and support policies before collecting personal data or offering paid access.
- Do not publish until the owner has configured the API, bot, database, supported Universe IDs, and monitoring.
- Paid plans are request-only; no payment provider or subscription entitlement activation is connected.
