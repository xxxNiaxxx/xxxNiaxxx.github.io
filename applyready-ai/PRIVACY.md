# Privacy and data handling (owner notes)

This describes what the code does. It is **not** legal advice, and it does not make the service GDPR-compliant by itself. Have it reviewed before public launch.

## Data flow

| Data | Where it goes | Kept? |
|---|---|---|
| CV text, job ad, revision request, previous result | Browser → our serverless function → the configured AI provider | **Not stored by the app.** Not written to logs. Exists in the browser tab until reload or close. The AI provider handles it under its own terms (see below). |
| Generated CV / letter / gaps | AI provider → our function → browser | Same as above. |
| Uploaded CV files (PDF/DOCX/TXT) | Browser → our function; the text is extracted in memory | Not stored or logged. Only the extracted text goes back to the browser. |
| Screenshots of a CV or job ad | Shrunk in the browser (max 2000 px, JPEG) → our function → the AI provider's vision model | Not stored or logged by the app. The provider handles it like the text (see below). Screenshots can show more than intended (other tabs, notifications), so users should crop them. |
| Export requests (CV and letter text) | Browser → our function, rendered in memory | Not stored or logged. The file is streamed back. |
| IP address | Used to build a rate-limit key: `sha256(RATE_LIMIT_SALT + IP)`, truncated | Daily counters in Upstash Redis, expiring after about 25 hours. A duplicate-request lock (a hash of the request) lasts up to 2 minutes and is deleted on completion. |
| Stripe purchase (if enabled) | Stripe processes payment and email | We store `{theme, status, livemode, createdAt}` keyed by the Checkout Session id for 3 years (fulfilment and refunds), plus a payment-intent → session id mapping. No name, email or card data. |
| Browser storage | `localStorage` on the visitor's device | Site language and premium purchase tokens only. **Never** CV text. |
| Server logs | Vercel function logs | JSON events with codes, durations and counts only (`src/lib/log.ts`). A test checks that CV text, job text and API keys never appear. |

No cookies, analytics or third-party scripts are used. The Content Security Policy only allows the site's own origin.

## Deletion

There is nothing CV-related to delete on our side. Rate-limit counters expire on their own. A purchase record can be deleted by hand in Upstash (`stripe:purchase:<session id>`) on request. That also removes the theme.

## The AI provider is the main processor

Everything the user pastes goes to the AI provider. Before launch:

- Choose a **paid** API plan whose terms permit this use and do **not** use API inputs for training. Free tiers often allow training on inputs, or exclude EEA users.
- Sign or accept the provider's **data processing agreement (DPA)**. Check where data is processed, and that international transfers are covered (e.g. SCCs, or the EU–US Data Privacy Framework).
- Check the provider's retention (abuse-monitoring logs are common, often around 30 days) and whether zero-retention is available. Then update the in-app privacy text (`privacy` in `src/lib/i18n.ts`) to name the provider and its retention.
- Ollama on your own machine is for development only. A self-hosted model on infrastructure you control is a privacy-friendly alternative, but you must secure it.

## Still to do for launch (legal)

- A full privacy policy and imprint/contact (`NEXT_PUBLIC_SUPPORT_CONTACT` shows a contact in the app).
- The legal basis for processing (likely performance of a service requested by the user), and a records-of-processing entry.
- CVs can contain special-category data. The app warns users and tells the AI not to add such data, but cannot prevent users from pasting it.
- If payments are enabled: terms of sale, refund policy, EU withdrawal-right wording for digital content, and VAT handling (Stripe Tax or manual).
