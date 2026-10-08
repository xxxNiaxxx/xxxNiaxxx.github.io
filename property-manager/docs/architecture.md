# Architecture — Βραχυχρόνια.ai (Phase 1)

## 1. What was in the repository before Phase 1

| Item | Finding |
| --- | --- |
| Repository | `xxxNiaxxx.github.io` — a GitHub Pages user site |
| Contents | `README.md` and `app-ads.txt` (AdMob ads.txt verification) only |
| Framework / package manager | none |
| Database / auth / UI library | none |
| Env vars, tests, lint | none |

Nothing at the repository root is an application, but `app-ads.txt` must stay
served from the Pages root. The application therefore lives in its own
directory, **`property-manager/`**, and nothing at the repository root changes.

## 2. Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Language | TypeScript (strict) | spec |
| Framework | Next.js 15 (App Router), React 19 | server components + route handlers in one app |
| Styling | Tailwind CSS 4 + shadcn/ui-style components (copied in `components/ui`) | no runtime UI framework; Radix only for dialog/dropdown |
| Database | PostgreSQL 16 + Prisma 6 | typed queries, migrations, seed |
| Validation | Zod 4 | shared by route handlers, services and AI tools |
| Auth | Auth.js v5 (`next-auth`), Credentials provider, JWT sessions, bcrypt hashes | simple, self-hosted, no external IdP |
| AI | `lib/ai/provider.ts`: OpenAI-compatible `/chat/completions` over `fetch` with tool calling; offline rule-based fallback when `AI_API_KEY` is empty | no SDK dependency, demo works without a key |
| Tests | Vitest against a real PostgreSQL test database | authorization tests must exercise real queries |
| Package manager | npm | none existed |

## 3. Layers

```
Browser ──► app/(dashboard)/* (server components, read via services)
        └─► client components ──fetch──► app/api/* route handlers
                                             │ requireOrganizationMember()
                                             │ Zod parse
                                             ▼
                                       lib/services/*  ◄── lib/ai/tools.ts
                                             │ every query scoped by ctx.organizationId
                                             ▼
                                        lib/db (Prisma)
```

* **`lib/auth`** — Auth.js config plus `requireUser()`, `requireOrganization()`,
  `requireOrganizationMember()`, `requireRole()`. They return an `OrgContext`
  `{ userId, organizationId, role }` that is resolved **server-side** from the
  session and the `OrganizationMember` table. The active-organization cookie is
  only a *preference*; it is honoured only if the user is a member.
* **`lib/services`** — all business logic. Every function takes `OrgContext`
  as its first argument and scopes every read/write by `ctx.organizationId`.
  Single-record lookups use `findFirst({ where: { id, organizationId } })`, so
  an id from another organization behaves exactly like a missing id (404) —
  no IDOR. Foreign keys passed by clients (propertyId, guestId, …) are
  re-checked against the organization before use.
* **`lib/validation`** — Zod schemas for every input.
* **`app/api`** — thin REST handlers: auth → parse → service → JSON. Errors
  are mapped centrally (`lib/api.ts`) to `{ error: { code, message, details } }`.
* **`lib/ai`** — provider abstraction, tool registry and chat loop. Tools are
  plain functions over the services layer and receive the `OrgContext` from
  the server, never from the model. Mutating intents (sending a guest message)
  produce an `AIAction` in status `PROPOSED`; only
  `POST /api/ai/actions/:id/approve` executes them.

## 4. Domain model

Multi-tenant: `Organization` owns `Property`, `Guest`, `Reservation`, `Task`,
`Message`, `Transaction`, `AIConversation`, `AIAction`. `User` ↔ `Organization`
via `OrganizationMember(role: OWNER|ADMIN|MEMBER)`.

Integration readiness (Phase 2+):

* `Reservation.source` enum (`MANUAL`, `AIRBNB`, `BOOKING_COM`, `DIRECT`, `OTHER`)
  plus nullable `externalId` with a unique `(organizationId, source, externalId)`
  index — a channel sync can upsert without schema changes.
* `Message.channel` / `direction` / `status` already model inbound/outbound
  traffic for email, SMS, WhatsApp and OTA inboxes. Phase 1 only writes
  `INTERNAL` messages; "sending" is simulated and recorded as `SENT`.
* `AIAction.type` is a string, so new action kinds need only a new executor.

## 5. Business rules enforced server-side

* `checkOut > checkIn` (Zod refinement + service check).
* No two `CONFIRMED` reservations for the same property may overlap
  (half-open intervals: a check-out day may equal the next check-in day).
  Checked in a serializable transaction on create/update/status change.
* Tasks: property / reservation / assignee must belong to the organization;
  completing sets `completedAt`; reopening clears it.
* AI actions never execute without an explicit approve request by a member.

## 6. Out of scope for Phase 1

OTA APIs/scraping, payments, dynamic pricing, booking engine, real message
delivery, accounting-grade ledgers.
