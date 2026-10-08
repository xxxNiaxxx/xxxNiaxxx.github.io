# Βραχυχρόνια.ai — Phase 1

> Το περιβάλλον της εφαρμογής (web και Android) είναι στα **ελληνικά**. Οι ετικέτες όλων των
> καταστάσεων και κατηγοριών βρίσκονται στο `lib/labels.ts`.
>
> Ο βοηθός AI γράφει στους επισκέπτες **στη γλώσσα τους** (12 γλώσσες): από την επιλογή
> «Γλώσσα μηνυμάτων» στο προφίλ του επισκέπτη ή, αν δεν έχει οριστεί, από τη χώρα του
> (`lib/i18n/guest-language.ts`, πρότυπα στο `lib/i18n/guest-messages.ts`).
>
> **Ο βοηθός μαθαίνει από τους διαχειριστές** (`lib/ai/memory.ts`, σελίδα *Γνώσεις AI*):
> «Θυμήσου ότι…» στη συνομιλία, πληροφορίες για επισκέπτες ανά ακίνητο, προτιμήσεις ομάδας,
> και πρότυπα που μαθαίνει όταν διορθώνετε και εγκρίνετε ένα μήνυμά του. Τα μηνύματα που
> γράφετε εσείς μεταφράζονται στη γλώσσα του επισκέπτη με ένα κουμπί (απαιτεί `AI_API_KEY`).

AI property manager for short-term rentals (βραχυχρόνια μίσθωση).

Operations dashboard and AI assistant for short-term rental managers:
properties, guests, reservations, calendar, cleaning/maintenance tasks,
basic financials and an AI manager that answers from your real data and
**asks before it acts**.

> Lives in `property-manager/` so the GitHub Pages site at the repository root
> (`app-ads.txt`) keeps working. See [`docs/architecture.md`](docs/architecture.md)
> and [`docs/api.md`](docs/api.md).

🇬🇷 **Tax & AADE:** stay declarations, climate fee (ΤΑΚΚ), VAT/presence fee, Ε2 estimate,
compliance checklist and CSV exports for the accountant — rules in [`docs/tax-greece.md`](docs/tax-greece.md).

📱 **Mobile:** a companion Expo app that runs in **Expo Go** lives in
[`../mobile`](../mobile/README.md). Start this server with `npm run dev:lan`
so your phone can reach it.

Stack: Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui-style
components · PostgreSQL · Prisma 6 · Zod · Auth.js v5 · Vitest.

## Run locally

Requirements: Node.js 20+ (22 recommended), npm, Docker (or any PostgreSQL 14+).

```bash
cd property-manager
cp .env.example .env              # then set AUTH_SECRET: openssl rand -base64 32
npm install                       # also generates the Prisma client
npm run db:up                     # PostgreSQL 16 in Docker on :5432
npm run db:migrate                # apply migrations
npm run db:seed                   # (re)load demo data — safe to run again
npm run dev                       # http://localhost:3000
```

Sign in with the demo account: **demo@demo-hospitality.test / demo1234**
(organization "Demo Hospitality": 5 properties in Halkidiki, Thessaloniki,
Crete and Athens, ~20 guests, ~37 reservations around today, tasks,
income and expenses). Or create your own account at `/register`.

Using your own PostgreSQL instead of Docker? Point `DATABASE_URL` at it and
skip `npm run db:up`.

### AI assistant

| `.env` | Behaviour |
| --- | --- |
| `AI_API_KEY` empty | **Offline assistant**: a rule-based engine that understands common questions ("What needs my attention today?", "Who checks in tomorrow?", "How much did I make this month?", "Which property performs best?", "Send check-in instructions to Maria Papadopoulou", "Schedule a cleaning at Villa Elia tomorrow") and answers only from tool results. |
| `AI_API_KEY` set | Any OpenAI-compatible chat-completions API with tool calling. Configure `AI_MODEL` and `AI_BASE_URL` (OpenAI, Azure, OpenRouter, Groq, a local vLLM/Ollama gateway…). |

In both modes the assistant reads data only through server-side tools scoped
to your organization, and anything that changes data (sending a guest
message, creating a task) becomes an `AIAction` in `PROPOSED` state that you
**Approve**, **Edit** or **Cancel** in the chat. Message "sending" is
simulated in Phase 1 (stored as `SENT` on the internal channel).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | development server |
| `npm run dev:lan` | development server reachable from your phone (for the Expo app) |
| `npm run build` / `npm start` | production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next/core-web-vitals + TypeScript) |
| `npm test` | Vitest against `TEST_DATABASE_URL` (migrated automatically, **wiped by the tests**) |
| `npm run db:migrate` | create/apply migrations in development |
| `npm run db:deploy` | apply migrations in production |
| `npm run db:seed` | load demo data |
| `npm run db:reset` | drop, re-migrate and re-seed the dev database |

The Docker database creates `property_manager_test` on first start. With your
own PostgreSQL, create it once: `createdb property_manager_test`.

## Environment variables

| Name | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string (pooled URL on Neon) |
| `DIRECT_URL` | yes | direct connection for migrations (same as `DATABASE_URL` locally) |
| `TEST_DATABASE_URL` | for tests | separate database used by `npm test` |
| `AUTH_SECRET` | yes | Auth.js secret (`openssl rand -base64 32`) |
| `AI_API_KEY` | no | enables the LLM; server-only, never sent to the browser |
| `AI_MODEL` | no | default `gpt-4o-mini` |
| `AI_BASE_URL` | no | default `https://api.openai.com/v1` |
| `NEXT_PUBLIC_APP_URL` | no | public URL of the app |
| `NEXT_PUBLIC_APP_NAME` | no | product name shown in the UI (default "Βραχυχρόνια.ai") |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | for Play | contact shown on `/privacy` and `/account-deletion` |
| `NEXT_PUBLIC_APP_TIMEZONE` | no | time zone for "today", due times and check-ins (default `Europe/Athens`) |

## Project layout

```
app/(auth)/            login, register (server actions)
app/(dashboard)/       dashboard, calendar, properties, reservations, guests, tasks, financials, ai, settings
app/api/               REST route handlers (thin: auth → Zod → service)
components/            ui primitives + feature components
lib/auth               Auth.js config, requireUser/requireOrganization/requireOrganizationMember/requireRole
lib/services           business logic, every query scoped by organization
lib/validation         Zod schemas
lib/ai                 provider abstraction, tools, offline assistant, chat loop, action approval
prisma/                schema, migrations, seed
tests/                 Vitest suites (authorization, reservations, tasks, AI, dashboard)
```

## Deploying (Vercel + Neon)

Root directory `property-manager`, build command `npm run vercel-build` (runs
`prisma migrate deploy` then `next build`), env vars as above. Full walkthrough,
including the Google Play release of the Android app: [`../mobile/PLAY_STORE.md`](../mobile/PLAY_STORE.md).

Public pages required by Google Play: `/privacy` and `/account-deletion`.
Users can delete their account in **Ρυθμίσεις → Διαγραφή λογαριασμού** (web) or
**Περισσότερα → Διαγραφή λογαριασμού** (Android); see `lib/services/account-deletion.ts`.

## Security notes

* Organization is resolved server-side from the session and membership table;
  ids from other organizations behave like missing ids (404) — no IDOR.
* All inputs validated with Zod; foreign keys (property, guest, reservation,
  assignee) re-checked against the organization.
* Passwords hashed with bcrypt; sessions are signed JWT cookies.
* AI tools get the organization from the server, never from the model;
  mutating AI actions require explicit approval and record who proposed and
  who reviewed them.
