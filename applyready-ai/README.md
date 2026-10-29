# ApplyReady AI

A multilingual AI CV tailoring web app (Next.js App Router, TypeScript, made for Vercel).

Paste a CV and a job ad, then pick an output language (English, Greek, Spanish, French or German) and a theme. The app returns a tailored CV, a cover letter and a list of **skills to address / verify**: things the job asks for that the CV does not show. You can request as many revisions as you like; every version is kept in the tab. The CV and the letter download as real **PDF** and **Word (DOCX)** files in the chosen theme.

No account and no card are needed. The app does not store CVs.

## What works

| Area | Status |
|---|---|
| Site in 5 languages (`en`, `el`, `es`, `fr`, `de`); output language chosen separately | Done |
| 3 free themes (Classic, Modern, Minimal) that look different in the preview, PDF and DOCX | Done |
| CV from a file: PDF (text layer), Word DOCX or TXT, read in memory on the server | Done |
| CV and job ad from screenshots (upload, or paste with Ctrl+V), read by a vision model; the text lands in the box for the user to check | Done (needs `AI_VISION_MODEL`) |
| Generation and repeated revisions, schema-validated; earlier versions kept, never overwritten | Done |
| Fabrication guards: strict prompt, CV/job ad treated as data (prompt-injection fencing), unsupported requirements go to "verify", new years/percentages/amounts are flagged | Done |
| PDF export (pdf-lib + bundled DejaVu fonts: Greek, accents, ß, ñ, ç as real, searchable text) | Done |
| DOCX export (separate CV and cover letter) | Done |
| Ollama for local dev; any OpenAI-compatible provider in production | Done |
| Durable rate limits on Vercel (Upstash Redis): per visitor, global daily budget, duplicate-request lock | Done (needs an Upstash database) |
| Request size limits, timeouts, safe error codes, security headers, logs without user text | Done |
| Privacy notice in all 5 languages | Done (needs legal review) |
| Premium themes (Executive, Creative) through Stripe Checkout | Implemented and tested in **test mode**, **off by default**. See [Premium themes](#premium-themes-stripe) |

## Run locally

Requirements: Node.js 20.9+ and [Ollama](https://ollama.com) (or any OpenAI-compatible API).

```bash
npm install
cp .env.example .env.local      # local settings; never committed
ollama pull llama3.1:8b         # or another model you prefer
ollama serve                    # if it is not already running
npm run dev                     # http://localhost:3000
```

To try screenshot import locally: `ollama pull llama3.2-vision` and set `AI_VISION_MODEL=llama3.2-vision` in `.env.local`. Without it, the screenshot buttons are hidden.

The defaults in `.env.example` point at Ollama on `http://localhost:11434/v1`. Small local models are slower and less reliable at following the JSON format; the app retries once on malformed output. Larger models give better Greek.

Locally, rate limits use process memory. To test the real limiter, add Upstash credentials to `.env.local`.

## Checks

```bash
npm run lint        # ESLint (next/core-web-vitals + typescript)
npm run typecheck   # tsc --noEmit
npm test            # Vitest: logic, routes, exports, Stripe webhook
npm run build       # production build
npm run check       # lint + typecheck + tests
```

The PDF test also extracts the text with `pdftotext` when Poppler is installed, to prove the Greek, German, Spanish and French characters come out as real text.

## How it fits together

```
src/app/page.tsx                 UI (client): form, themes, versions, preview, downloads
src/components/DocumentPreview   on-screen version of the export layouts
src/app/api/generate             validate → AI config → duplicate lock → rate limit → AI → checks
src/app/api/import               CV file (multipart) → type checked from the bytes → text (PDF/DOCX/TXT)
src/app/api/extract              screenshot (data URL, shrunk in the browser) → vision model → text
src/app/api/export/{pdf,docx}    validate → rate limit → premium check → render file
src/app/api/stripe/checkout      creates a Checkout Session with a server-side Price ID
src/app/api/stripe/webhook       verifies the signature on the raw body, idempotent fulfilment
src/app/api/stripe/claim         session id → signed token, only after the webhook recorded payment
src/app/api/config               { premiumCheckout: boolean } for the UI
src/lib/ai.ts                    OpenAI-compatible client (plain fetch), prompt, parsing, figure check
src/lib/kv.ts                    Upstash REST store, or memory locally
src/lib/ratelimit.ts             per-IP, global and duplicate guards
src/lib/export/*                 PDF (pdf-lib) and DOCX (docx) renderers sharing one block parser
src/lib/i18n.ts                  all UI text in 5 languages
fonts/                           DejaVu Sans/Serif (free licence in fonts/LICENSE-DejaVu.txt)
```

### Dependencies

All are runtime-necessary and widely used:

- `next`, `react`, `react-dom`
- `zod` for input and AI-output validation
- `pdf-lib` + `@pdf-lib/fontkit` to build PDFs with embedded Unicode fonts (pure JavaScript, works on Vercel)
- `docx` to build Word files
- `stripe` for Checkout and webhook signature verification
- `unpdf` (MIT, pdf.js packaged for serverless) to read the text of uploaded PDF CVs. It is pinned to 1.8.x; 2.0 was released the day before this was added.

Word files are read with a small built-in zip reader (`src/lib/zip.ts`, with a cap on the unpacked size) instead of another dependency.

The original scaffold's `openai` SDK was removed: its peer dependency conflicts with zod 4, and plain `fetch` covers the one endpoint we call. `@react-pdf/renderer` was replaced by `pdf-lib`. `postcss` is pinned through `overrides` to a patched version. `npm audit` reports 0 vulnerabilities.

## Privacy and data

What is sent where, what is kept, and what still needs legal review: see [PRIVACY.md](PRIVACY.md).

## Premium themes (Stripe)

The code path is complete for **Stripe test mode**:

1. The browser names a theme. The server creates a Checkout Session with the Price ID from its own environment variables, so the browser cannot set a price.
2. Stripe calls `/api/stripe/webhook`. The signature is verified on the raw body. Each event id is processed once: it is claimed first and released if processing fails, so Stripe's retry works. A paid `checkout.session.completed` or `async_payment_succeeded` stores `{theme, status, livemode, createdAt}` under the session id in Redis. No email, name or card data is stored. Expired and failed sessions unlock nothing. A full `charge.refunded` marks the purchase refunded.
3. After the redirect, the browser sends the session id to `/api/stripe/claim`. The server returns a signed token **only if the webhook has already recorded the session as paid**. The success URL alone unlocks nothing.
4. Exports in a premium theme need a valid token **and** a purchase record that is still `paid`, so refunds take effect.

It stays **switched off** (the UI says "coming soon", with no buy buttons) until `PREMIUM_THEMES_ENABLED=true` and all of the following are set: Stripe test keys, the webhook secret, both Price IDs, `ENTITLEMENT_SECRET` and (on Vercel) Upstash. `/api/config` only reports a boolean.

**Before real payments, the owner must decide on purchase recovery.** Without accounts, a purchase lives in one browser's local storage: clearing it, or switching device, loses access. Proposed approach (not built yet): Stripe Checkout already collects the buyer's email. Add a "restore purchase" form that emails a one-time, short-lived magic link (the email is looked up through the Stripe API, not stored by us), and the link issues a new token. Also needed: published refund terms, a support contact, and EU consumer-law withdrawal wording for digital content. Live keys are refused unless `STRIPE_LIVE_MODE_APPROVED=true`, which the owner should only set after those steps.

## Deploying

See [DEPLOYMENT.md](DEPLOYMENT.md). Nothing has been deployed, and no external service (AI provider, Upstash, Stripe, Vercel) has been configured by this code. Each needs the owner's account.
