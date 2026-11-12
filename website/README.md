# ZervxHub website

Static, responsive black-and-gold pages for the project overview, access/pricing status, developer documentation, support, and policy publication status. The copy intentionally distinguishes repository code from a configured hosted service; it does not advertise paid plans or claim Studio verification.

## Local preview

From the repository root, run `python -m http.server 8000 --directory website` and open `http://localhost:8000`. The site has no package dependencies or build step.

## Publishing checklist

- Confirm all service status and setup links still reflect the deployed code.
- Publish reviewed terms, privacy, refund, and support policies before collecting personal data or offering paid access.
- Do not publish until the owner has configured the API, bot, database, supported Universe IDs, and monitoring.
- No live payment or subscription integration is included.
