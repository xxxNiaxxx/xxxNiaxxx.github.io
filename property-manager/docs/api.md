# REST API — Phase 1

All endpoints live under `/api`, use JSON, and require a signed-in session
(Auth.js cookie) unless noted. The organization is **always resolved
server-side** from the session; no endpoint accepts an `organizationId`.

**Responses**

```jsonc
// success
{ "data": … }
// error
{ "error": { "code": "VALIDATION", "message": "Check-out must be after check-in", "details": [{ "path": "checkOut", "message": "…" }] } }
```

| HTTP | code | Meaning |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | not signed in |
| 403 | `FORBIDDEN` | role too low (e.g. MEMBER deleting a task) |
| 404 | `NOT_FOUND` | missing **or belongs to another organization** (indistinguishable by design) |
| 409 | `CONFLICT` | business rule, e.g. overlapping confirmed reservation, action already reviewed |
| 422 | `VALIDATION` | Zod validation failed |
| 400 | `BAD_REQUEST` | invalid JSON / inconsistent ids |

Dates are `YYYY-MM-DD` calendar dates; timestamps (`dueAt`) are ISO 8601. Money
is a decimal number in the record's `currency` (EUR by default).

## Auth & account

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/register` | public · `{ name, email, password, organizationName }` → creates user, organization and OWNER membership · with `invite` (token) instead of `organizationName` the user joins that team |
| GET/POST | `/api/auth/*` | Auth.js handlers (sign-in uses the Credentials provider) |
| GET / PATCH | `/api/me` | current user · PATCH `{ name }` |
| GET / PATCH | `/api/organization` | active organization · PATCH `{ name }` (ADMIN+) |
| POST | `/api/organizations/active` | `{ organizationId }` — switch to another organization **you are a member of** |
| GET | `/api/members` | members of the active organization |
| PATCH | `/api/members/:userId` | `{ role: "ADMIN" \| "MEMBER" }` — OWNER only; the owner's role is fixed |
| DELETE | `/api/members/:userId` | remove a member (ADMIN+; only the OWNER removes admins), or leave when it is yourself; their open tasks become unassigned |

## Team invitations

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/invitations` | pending invitations (ADMIN+, empty list for members) |
| POST | `/api/invitations` | `{ email, role }` (ADMIN+; only the OWNER invites admins) → `{ invitation, token, path }`. Share `origin + path`; the token is shown only once (only its hash is stored). Inviting the same email again replaces the old link. |
| DELETE | `/api/invitations/:id` | revoke |
| POST | `/api/invitations/accept` | `{ token }` — signed-in user joins the team; the account email must match the invited email. Links expire after 7 days. |

The page `/invite/:token` is public: it shows who invited you and offers sign-up
(`/register?invite=…`, joins the team without creating an organization) or sign-in.

## Mobile app session

The Expo app cannot use the browser cookie, so it exchanges credentials for a
30-day bearer token and sends `Authorization: Bearer <token>` on every call.
Organization membership is still resolved server-side per request; an optional
`X-Organization-Id` header only chooses among the user's own organizations.

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/mobile/session` | public · `{ email, password }` → `{ token, user, organization, role }` · 401 on bad credentials |
| GET | `/api/mobile/session` | validates the token → `{ user, organization, role }` |

## Properties

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/properties?q=&status=ACTIVE\|INACTIVE` | list / search |
| POST | `/api/properties` | `{ name, city, country, basePrice, address?, description?, bedrooms?, bathrooms?, maxGuests?, status?, currency? }` |
| GET | `/api/properties/:id` | details: property, current stay, upcoming stays, open tasks, this month's income/expenses/occupancy |
| PATCH | `/api/properties/:id` | any subset of the create fields; `{ "status": "INACTIVE" }` deactivates |
| DELETE | `/api/properties/:id` | ADMIN+; only when the property has no reservations (otherwise 409 — deactivate instead) |

## Guests

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/guests?q=` | search by name, email, phone, country; includes stays and revenue |
| POST | `/api/guests` | `{ firstName, lastName, email?, phone?, country?, notes? }` |
| GET | `/api/guests/:id` | guest, reservation history, messages, stats (stays, total revenue, average stay) |
| PATCH | `/api/guests/:id` | subset of create fields |
| DELETE | `/api/guests/:id` | only when the guest has no reservations |

## Reservations

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/reservations?q=&status=&propertyId=&guestId=&from=&to=` | `from`/`to` return stays overlapping the window |
| POST | `/api/reservations` | see below |
| GET | `/api/reservations/:id` | reservation, its tasks and messages |
| PATCH | `/api/reservations/:id` | subset of fields incl. `status`, `guestId` |
| POST | `/api/reservations/:id/cancel` | sets CANCELLED, removes booking income, cancels open tasks |

Create body:

```jsonc
{
  "propertyId": "…",
  "guestId": "…",                      // or "newGuest": { "firstName": "…", "lastName": "…", "email": "…" }
  "checkIn": "2026-07-10",
  "checkOut": "2026-07-15",           // must be after checkIn
  "guestsCount": 2,                   // ≤ property.maxGuests
  "totalAmount": 950,
  "currency": "EUR",
  "source": "MANUAL",                 // see lib/reservation-sources.ts: BOOKING_COM | AIRBNB | VRBO | EXPEDIA | AGODA | TRIP_COM | HOLIDU | HOMETOGO | TRAVEL_AGENCY | DIRECT | MANUAL | OTHER
  "confirmationCode": "DH-4100",
  "status": "CONFIRMED",              // CONFIRMED | PENDING (COMPLETED/CANCELLED via PATCH)
  "notes": "…",
  "complimentary": false              // free stay: totalAmount must be 0
}
```

Rules: no two `CONFIRMED` stays may share a night at the same property
(same-day turnover is allowed) → `409`. Checked in a serializable transaction.
Confirmed/completed reservations automatically keep one `BOOKING` income
transaction in sync. A free stay (`complimentary: true`, relatives/friends with
no payment) has no income, no ΤΑΚΚ and no AADE stay declaration; it is rejected
with `422` if `totalAmount` is above 0. PATCH only changes the fields it is given.

### Import from Booking.com / Airbnb

`POST /api/reservations/import` — `{ source, amountMode, rows[] }`. The file (Excel/CSV
export) is parsed in the browser (`lib/import/parse.ts`: column auto-mapping in
English/Greek, dates, amounts, statuses) and only confirmed rows are sent.
`amountMode`: `GUEST_TOTAL` (guest total with ΤΑΚΚ, e.g. Booking's price), `ROOM`
(room price) or `PAYOUT` (what the host received after commission, e.g. Airbnb
earnings) — detected from the file's commission amounts when present. Rows with a
booking number update the reservation imported before (no duplicates); free
cancellations carry no rent; each row succeeds or fails on its own →
`{ created, updated, failed, results[] }`.

## iCal calendars (Airbnb / Booking.com)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/properties/:id/calendars` | the property's imported feeds and its own export path |
| POST | `/api/properties/:id/calendars` | ADMIN+ · `{ source, url }` (a platform from `CALENDAR_SOURCES`) (public `https://` only) — added and synced right away |
| DELETE | `/api/calendars/:id` | ADMIN+ · reservations it created stay |
| POST | `/api/calendars/sync` | `{ propertyId?, force? }` — without `force` only feeds not read in the last 30 minutes (the web and mobile apps call it on open) |
| POST | `/api/properties/:id/calendars/export` | ADMIN+ · creates/replaces the secret export link |
| GET | `/api/ical/:token` | **public** iCal of the property's stays (no guest data) for Airbnb/Booking to block dates |
| GET | `/api/cron/ical` | Vercel Cron, nightly (`vercel.json`), `Authorization: Bearer $CRON_SECRET` |

Sync rules: new stays are created as reservations with amount 0 and a placeholder
guest ("Επισκέπτης Airbnb"); changed dates are updated; stays that disappear before
arrival are cancelled; dates already taken by another reservation are skipped; a
cancelled reservation is never revived. Airbnb host blocks ("Not available") are
ignored; Booking.com marks every unavailable night "CLOSED - Not available", so
manual closures there also appear (cancel them once — they stay cancelled). The
file import fills in these stays (same property and dates, or the Airbnb code)
instead of duplicating them.

## Calendar

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/calendar?from=&to=&propertyId=` | properties, non-cancelled reservations overlapping `[from, to)`, and task markers per day |

## Tasks

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/tasks?tab=today\|upcoming\|overdue\|completed\|all&propertyId=&reservationId=&type=&status=&assignee=me\|unassigned\|<userId>` | |
| POST | `/api/tasks` | `{ propertyId, title, type?, priority?, status?, dueAt?, description?, reservationId?, assignedToUserId?, checklist? }` — CLEANING tasks get a default checklist |
| GET | `/api/tasks/:id` | |
| PATCH | `/api/tasks/:id` | start `{status:"IN_PROGRESS"}`, complete `{status:"COMPLETED"}` (sets `completedAt`), cancel, reopen, assign `{assignedToUserId}`, checklist `{checklist:[{label,done}]}` |
| DELETE | `/api/tasks/:id` | ADMIN+ (members cancel instead) |

The reservation must belong to the same property; the assignee must be a member.

## Messages

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/messages` | `{ guestId? , reservationId?, content, send? }` — Phase 1 records an `INTERNAL` message as `DRAFT` or (simulated) `SENT` |

## Dashboard & financials

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/dashboard` | summary cards, needs-attention list, today's agenda |
| GET | `/api/financials/summary?from=&to=&propertyId=` | income, expenses, net, occupancy, per property and per category (defaults to the current month) |
| GET | `/api/transactions?from=&to=&propertyId=` | |
| POST | `/api/transactions` | `{ propertyId, type: INCOME\|EXPENSE, category, amount, transactionDate, description?, reservationId? }` |
| DELETE | `/api/transactions/:id` | ADMIN+; booking income cannot be deleted directly |

Revenue = `INCOME` transactions dated in the period (booking income is dated at
check-in). Occupancy = booked nights of confirmed/completed stays ÷ (active
properties × days).

## Tax & AADE (Greece)

Rules and assumptions: [`tax-greece.md`](tax-greece.md).

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/tax/overview` | regime, stay declarations due, monthly climate fee (ΤΑΚΚ) / VAT / presence fee with deadlines and filing status, compliance, warnings |
| GET / PATCH | `/api/tax/settings` | `{ taxRegime: "AUTO" \| "INDIVIDUAL" \| "BUSINESS" }` (ADMIN+) |
| GET | `/api/tax/stays?year=` | tax view of every stay checking out in the year |
| GET | `/api/tax/annual?year=&otherIncome=` | Ε2 estimate (individual) or VAT/profit summary (business), per property |
| POST / DELETE | `/api/tax/filings` | mark a monthly return filed `{ kind: CLIMATE_FEE\|VAT\|PRESENCE_FEE, period: "YYYY-MM", amount }` · undo with `?kind=&period=` |
| POST | `/api/reservations/:id/declaration` | `{ status: "DECLARED" \| "PENDING" \| "NOT_REQUIRED" }` |
| GET | `/api/tax/export?type=stays\|annual&year=` | CSV for the accountant |

Properties accept `ama`, `kind` (`APARTMENT` \| `DETACHED_HOUSE`), `areaSqm` and a partial
`compliance` object (`fireExtinguisher`, `smokeDetectors`, `firstAidKit`, `emergencyLighting`,
`electricianDeclaration`, `amaDisplayed`, `insuranceExpiresOn`).

## AI

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/ai/chat` | `{ message, conversationId? }` → `{ conversationId, mode: "llm"\|"offline", message, toolsUsed, actions }` |
| GET | `/api/ai/conversations` | the caller's conversations |
| GET / DELETE | `/api/ai/conversations/:id` | messages (user/assistant) and actions |
| GET | `/api/ai/actions?status=&conversationId=` | |
| PATCH | `/api/ai/actions/:id` | edit a **PROPOSED** action's payload, e.g. `{ "message": "…" }` |
| POST | `/api/ai/actions/:id/approve` | PROPOSED → APPROVED → EXECUTED (or FAILED); 409 if already reviewed |
| POST | `/api/ai/actions/:id/reject` | PROPOSED → REJECTED |

Action types: `SEND_GUEST_MESSAGE` `{ guestId, reservationId?, message }`,
`CREATE_TASK` `{ propertyId, title, type, priority, dueAt?, … }`. The assistant
can only *propose* them; ownership is re-validated at approval time.

AI tools available to the model: `get_today_summary`, `get_upcoming_checkins`,
`get_upcoming_checkouts`, `get_overdue_tasks`, `list_tasks`, `get_property`,
`list_properties`, `get_reservation`, `list_reservations`, `get_guest`,
`list_guests`, `get_revenue_summary`, `get_tax_obligations`, `get_annual_tax_estimate`, `create_task` (proposes),
`create_message_draft` (proposes).

## Waitlist (app administrators)

Registration is closed by default: a new organization needs an approved
waitlist link (`/register?access=…`, 14 days, only for the approved email) or a
team invitation. People apply at the public page `/waitlist`. Administrators
are the emails in `ADMIN_EMAILS`; emails go out through SMTP (`SMTP_*`), and
without it the approval link is shown to copy by hand.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/admin/waitlist` | all entries |
| POST | `/api/admin/waitlist/:id/approve` | new personal link (replaces an older one), emailed; returns `{ path, emailed }` |
| POST | `/api/admin/waitlist/:id/reject` | withdraws the link |
| DELETE | `/api/admin/waitlist/:id` | deletes the entry and its data |
| GET | `/api/admin/waitlist/export` | CSV (Excel-safe, UTF-8 BOM) |
| GET/PATCH | `/api/admin/settings` | `{ registrationOpen }` — open sign-up for everyone |

## Guest replies, AADE declaration, double bookings

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/ai/reply` | `{ reservationId, guestMessage }` → `{ reply, offline, usedInfo, conversationUrl }` — a draft in the guest's language from the property's notes (LLM when `AI_API_KEY` is set) |
| POST | `/api/calendar-conflicts/:id/dismiss` | ADMIN+ · marks a possible double booking as checked |

`GET /api/reservations/:id` also returns `tax.declarationForm` (the AADE stay
declaration field by field: `fields[{ key, label, value }]`, `missing`) and
`conflicts` (possible double bookings found by the calendar sync: a platform
stay on dates already taken that is not just our own dates mirrored back).
Guests have `idType` (`ID_CARD` | `PASSPORT` | `TAX_ID`) and `idNumber`;
reservations have `paymentMethod` (see `lib/aade.ts`, null = platform default).
