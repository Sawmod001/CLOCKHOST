# ClockHost App

Multi-vertical marketplace for Nigerian hospitality and real estate. Hosts list commercial spaces (venues, short-let housing) and guests book them by the hour. Built for the App Router, server-rendered, with two distinct booking engines.

## Tech Stack

- **Framework**: Next.js 16 App Router (TypeScript)
- **Database**: Supabase PostgreSQL 
- **Auth**: Clerk 
- **CSS**: Tailwind v4
- **Validation**: Zod v4
- **Payments**: Paystack (mock mode
- **AI**: Google Gemini (ChatBot + WhatsApp assistant)
- **Deployment**: Vercel

## Features

- **Capacity booking** — atomic `UPDATE ... RETURNING` prevents overselling; 10-minute soft holds; 5% commission in integer kobo.
- **Exclusive booking** — first-to-pay wins a time-window lock; losers marked `lost_race`.
- **Group booking (Book Together)** — invite link, per-member shares priced by `pricing.ts`, one transaction finalizes paid plans.
- **WhatsApp assistant** — Meta webhook → pure bot brain (intents, area extraction, availability) → interactive list messages; Gemini for open-ended questions; deep links into the web app.
- **Dual-role accounts** — `guest` / `host` / `admin` with a role switch.

## Repository structure

```
├── src/
│   ├── app/                          # App Router — folder path = URL
│   │   ├── (auth)/                   # sign-in, sign-up, verify-email, sso-callback, complete-profile
│   │   ├── (public)/                 # listings, bookings, group-plans, profile
│   │   ├── (host)/                   # host dashboard, listings, bookings
│   │   ├── (admin)/                  # admin overview, listing reviews, users
│   │   ├── api/                      # server routes grouped by resource:
│   │   │   │                         #   auth, admin, bookings, group-plans, listings,
│   │   │   │                         #   payments, users, whatsapp, cron, upload, …
│   │   ├── layout.tsx                 # root layout (fonts, metadata)
│   │   ├── page.tsx                   # marketplace home
│   │   ├── dashboard/                # post-login landing per role
│   │   └── management-portal-x7q/    # admin portal (single, unguessable URL)
│   ├── components/                   # Logo, ChatBot
│   ├── lib/
│   │   ├── auth/                     # Clerk session + user helpers        — who you are
│   │   ├── db/                       # pg pool + Supabase query layer      — where data lives
│   │   ├── bookings/                 # capacity, exclusive, group engines + pricing
│   │   ├── payments/                 # Paystack webhook verification
│   │   ├── whatsapp/                 # WhatsApp client, bot brain, Gemini
│   │   ├── jobs/                     # background sweeps (cron)
│   │   ├── rate-limit.ts             # shared guard
│   │   └── validation.ts             # Zod schemas
│   └── middleware.ts                 # route protection
├── public/                           # static assets (uploaded images)
├── supabase/
│   ├── migration.sql                  # schema + stored procedures
│   └── scripts/                       # DB migration runners
├── tests/                             # offline unit tests
├── next.config.ts                    # Next.js config
├── package.json                       # dependencies + scripts
└── vercel.json                        # cron schedule
```

## How the pieces connect

Requests flow top-down: browser → page → API route → `lib` → Postgres.

1. **Page** (`src/app/**`) asks the browser for data using `fetch()` to an API route or loads it directly in a Server Component.
2. **API route** (`src/app/api/**`) validates the request with Zod (`validation.ts`) and confirms the caller with `src/lib/auth/getSessionUser.ts`.
3. **Business logic** lives in `src/lib/bookings/*` (capacity, exclusive, group engines — all price math through `pricing.ts`).
4. **Persistence** goes through `src/lib/db/*` (raw `pg` pool + a thin Supabase-style query builder) into the Supabase PostgreSQL `supabase/migration.sql` schema.

Auth anatomy — the chain the demo should walk through:

- `src/middleware.ts` guards protected pages and redirects to `/sign-in` when the Clerk `__session` cookie is missing.
- `src/lib/auth/clerk.ts` parses that cookie and talks to the Clerk API using `CLERK_SECRET_KEY`.
- `src/lib/auth/getSessionUser.ts` resolves the cookie into the current user — nearly every page and API route starts here.
- `src/lib/auth/getUser.ts` maps the Clerk account to a row in the `users` table (role: `guest` / `host` / `admin`).
- `src/lib/auth/redirect.ts` then sends each role to its own area: `(public)`, `(host)` or `(admin)`.
- The sign-in / sign-up / verify / onboarding pages live together in `(auth)/`; their endpoints are `/api/auth/*`.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server |
| `npm run dev:nodemon` | Dev server that restarts on `src` changes |
| `npm run build` | Production build (`standalone` output) |
| `npm start` | Run the production build |
| `npm run lint` | ESLint over the codebase |
| `npm test` | Offline unit tests (no DB/network needed) |

## Environment

Create a single `.env` file in **this directory** (the repository root) and fill in all required values. It is gitignored — never commit it; there is no `.env.example` template by design.

Required vars:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Supabase Postgres pooled connection string |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side key for uploads |
| `NEXT_PUBLIC_SUPABASE_URL` | public Supabase project URL (fallback) |
| `CLERK_SECRET_KEY` | server-side Clerk backend key |
| `ADMIN_SETUP_SECRET` | guards `POST /api/auth/admin-setup` |
| `CRON_SECRET` | bearer token for the two cron routes |
| `PAYSTACK_SECRET_KEY` | verifies Paystack webhooks (empty until prod keys) |
| `GEMINI_API_KEY` | ChatBot + WhatsApp AI |
| `WHATSAPP_TOKEN` | Meta Graph API bearer token |
| `WHATSAPP_PHONE_NUMBER_ID` | business WhatsApp number id |
| `WHATSAPP_VERIFY_TOKEN` | webhook verification echo |
| `WHATSAPP_APP_SECRET` | HMAC-verifies WhatsApp webhooks |
| `CLOCKHOST_BASE_URL` | public base URL for shareable links |
| `DEBUG_SECRET` | (production only) token for `GET/POST /api/debug/db` |

`DEBUG_SECRET` only matters in production: the `/api/debug/db` diagnostic is open in local dev but returns `401` in production unless the request carries `x-debug-token: <DEBUG_SECRET>`.

## Database Setup

Run `supabase/migration.sql` once in the Supabase SQL editor. It creates all tables, indexes, RLS policies, and stored procedures, including the concurrency functions `reserve_capacity_slot`, `resolve_exclusive_lock`, `release_expired_holds`, and `cancel_expired_group_plans`.

Key tables: `users`, `listings`, `bookings`, `slots`, `exclusive_locks`, `soft_holds`, `processed_webhooks`, `reviews`, `group_plans`, `plan_members`.

## Testing

```bash
npm test
```

The suites (`tests/`) run fully offline with hand-rolled fakes for the Postgres pool and Supabase client — they prove the concurrency guarantees (capacity oversell → 409, exclusive first-pay-wins) and the WhatsApp bot brain without needing a database.

```bash
npm run lint
npm run build
```

## Deployment

### Vercel (recommended)

1. Push to GitHub.
2. Import the repo in Vercel.
3. Add all env vars listed above.
4. `vercel.json` registers two daily crons (midnight UTC), both bearer-gated by `CRON_SECRET`:
   - `/api/cron/release-expired-holds`
   - `/api/cron/cancel-expired-group-plans`

## Architecture Notes

- **No ClerkProvider**: Auth is handled server-side via cookie-based JWT parsing and Clerk API verification. No Clerk React SDK in the client bundle.
- **Custom PgQuery class**: Replaces the Supabase JS SDK with a lightweight query builder over a raw `pg` pool, mimicking `from().select().eq()` while compiling to parameterised SQL.
- **The DB owns correctness**: concurrency, capacity, and payment idempotency live in Postgres, not fragile JS.
- **Money is integer kobo** — never floats, never client-supplied totals; shared math lives in `src/lib/bookings/pricing.ts`.
- **No guest identity**: every booking and group-plan write requires a real Clerk account.