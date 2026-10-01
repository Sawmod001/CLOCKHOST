# ClockHost Foundation Reconciliation (Batch 0)

**Date:** 2026-08-27  
**Status:** COMPLETE  
**Purpose:** Audit every file, table, route, and feature. Classify each as KEEP / IMPROVE / REFACTOR / DEPRECATE / REMOVE / MISSING. This is the single source of truth for what exists, what's broken, and what's missing.

---

## 1. Database Schema

### 1.1 Tables (14 total)

| Table | Status | Notes |
|---|---|---|
| `users` | **IMPROVE** | Missing CHECK on `role`, no soft-delete, legacy `roles`/`active_role` TEXT[] columns still present |
| `listings` | **IMPROVE** | `media` is TEXT[] (should be table), `vertical` has no CHECK, `status` has no CHECK, no optimistic locking |
| `bookings` | **IMPROVE** | No CHECK constraints on `status`/`headcount`/`total_amount_kobo`, no `event_end > event_start`, `guest_id` INSERT RLS is `true` (anyone can create bookings as any user) |
| `slots` | **IMPROVE** | No CHECK on `capacity`/`booked`/`event_end > event_start`, no exclusion constraint for overlapping ranges |
| `exclusive_locks` | **IMPROVE** | No CHECK on `status`, no exclusion constraint |
| `soft_holds` | **IMPROVE** | No CHECK on `headcount` |
| `reviews` | **KEEP** | Minimal but functional |
| `processed_webhooks` | **KEEP** | Idempotency via UNIQUE constraint works |
| `group_plans` | **IMPROVE** | Missing `CHECK (event_end > event_start)`, `CHECK (expires_at > created_at)` |
| `plan_members` | **KEEP** | CHECK constraints present |
| `provider_profiles` | **KEEP** | RLS, indexes, triggers all present |
| `provider_verifications` | **IMPROVE** | Missing `UNIQUE(provider_profile_id, verification_type)` — allows infinite duplicate submissions |
| `audit_logs` | **REFACTOR** | RLS enabled but zero policies — table is unreadable/unwritable via PostgREST. Only works via service_role |
| `blocked_dates` | **IMPROVE** | Missing CHECK on `reason`, FK `ON DELETE CASCADE` on `booking_id` is wrong (should be SET NULL), no auto-create/remove triggers |

### 1.2 Enums (4)

| Enum | Values | Status |
|---|---|---|
| `provider_type` | `venue_host`, `housing_agent` | **KEEP** |
| `verification_status` | `none`, `pending`, `approved`, `rejected`, `suspended` | **KEEP** |
| `verification_kind` | `identity`, `business`, `property_authority` | **KEEP** |
| `verification_state` | `pending`, `approved`, `rejected`, `expired` | **IMPROVE** — confusing overlap with `verification_status` |

### 1.3 Database Functions (7)

| Function | Status | Notes |
|---|---|---|
| `search_listings_nearby()` | **KEEP** | PostGIS proximity search, read-only |
| `reserve_capacity_slot()` | **IMPROVE** | No `FOR UPDATE` — relies on single-statement atomicity. Works but fragile under high concurrency |
| `resolve_exclusive_lock()` | **IMPROVE** | No `FOR UPDATE`, no explicit transaction wrapper. 3 UPDATEs not atomic if called outside transaction |
| `release_expired_holds()` | **IMPROVE** | Uses `FOR UPDATE SKIP LOCKED` (good) but no explicit transaction — crash mid-loop leaves partial state |
| `check_housing_availability()` | **KEEP** | Read-only, correct |
| `cancel_expired_group_plans()` | **KEEP** | Single atomic UPDATE |
| `update_updated_at()` | **KEEP** | Generic trigger |

### 1.4 Critical DB Gaps

| Gap | Severity | Description |
|---|---|---|
| Missing CHECK constraints | **CRITICAL** | `listings.status`, `listings.vertical`, `listings.booking_type`, `bookings.status`, `bookings.headcount`, `bookings.total_amount_kobo`, `slots.capacity`, `slots.booked`, `exclusive_locks.status`, `soft_holds.headcount`, `blocked_dates.reason` — all accept any value |
| Missing exclusion constraints | **CRITICAL** | No `EXCLUDE USING gist` on `slots` or `bookings` for overlapping time ranges. Double-booking only prevented by application logic |
| Missing `booking_transitions` table | **HIGH** | No state machine audit trail. Booking status changes are invisible after the fact |
| Missing `payment_records` table | **HIGH** | Payments tracked only by `gateway_transaction_ref` on bookings. No refund records, no partial payments, no reconciliation |
| Missing `listing_media` table | **HIGH** | `listings.media` is TEXT[] — no metadata, no sort order, no alt text, no orphan cleanup |
| Missing `availability_rules` / `availability_exceptions` tables | **HIGH** | No recurring schedule model. Only blackout dates via `blocked_dates` |
| Missing `cancellation_rules` / `refund_records` tables | **HIGH** | No cancellation policy, no refund tracking |
| Missing `notifications` table | **MEDIUM** | No in-app notification system |
| Missing `viewings` table | **MEDIUM** | No viewing scheduling for housing |
| Missing `contact_access` table | **LOW** | No structured host contact/access handoff |
| `bookings_insert` RLS is `true` | **CRITICAL** | Any authenticated user can insert a booking as any `guest_id` for any listing |
| `audit_logs` has zero RLS policies | **HIGH** | Table is locked to service_role only. Application writes from anon key silently fail |
| No `pgcrypto` / `btree_gist` extension | **HIGH** | Required for EXCLUDE constraints on ranges |
| No `SELECT ... FOR UPDATE` in `reserve_capacity_slot` | **MEDIUM** | Two concurrent calls could both read same `booked` value |
| No optimistic locking on any table | **MEDIUM** | `updated_at` trigger exists but never used as version check |

---

## 2. Source Code Structure

### 2.1 Directory Layout

```
src/
├── app/
│   ├── (admin)/admin/          # 5 pages — admin dashboard
│   ├── (auth)/                 # 3 pages — sign-in, sign-up, complete-profile
│   ├── (host)/host/            # 9 pages — host dashboard, listings, bookings, verification
│   ├── (public)/               # 8 pages — listings, bookings, group-plans, profile
│   ├── api/                    # 14 route groups — all API endpoints
│   ├── admin-setup/            # 1 page — dev admin bootstrap
│   ├── dashboard/              # 1 page — guest dashboard
│   └── layout.tsx, page.tsx     # Root layout + homepage
├── components/
│   ├── home/                   # 13 homepage sections
│   ├── sidebar/                # 2 sidebars (host, admin)
│   ├── ChatBot.tsx, Logo.tsx, PublicHeader.tsx, BackButton.tsx
├── config/
│   ├── brand.ts, homepage.ts
├── lib/
│   ├── auth/                   # 4 files — getSessionUser, getUser, redirect, (no helpers)
│   ├── bookings/               # 3 files — booking.ts, exclusive.ts, group-booking.ts
│   ├── db/                     # 3 files — supabase.ts, supabase-queries.ts, audit.ts
│   ├── payments/               # 1 file — verifyWebhookSignature.ts
│   ├── whatsapp/               # 3 files — bot.ts, client.ts, gemini.ts
│   ├── csrf.ts, rate-limit.ts, validation.ts
```

### 2.2 API Routes (14 groups, ~30 endpoints)

| Route Group | Endpoints | Auth | CSRF | Rate Limit | Audit | Status |
|---|---|---|---|---|---|---|
| `/api/listings` | GET, POST | ✅ | ✅ | ❌ | ✅ | **IMPROVE** |
| `/api/listings/[id]` | GET, PATCH, DELETE | ✅ | ✅ | ❌ | ✅ | **IMPROVE** |
| `/api/listings/[id]/blocked-dates` | GET, POST, DELETE | ✅ | ✅ | ❌ | ❌ | **IMPROVE** |
| `/api/listings/[id]/availability` | GET | ❌ public | — | ❌ | ❌ | **KEEP** |
| `/api/bookings` | POST | ✅ | ❌ MISSING | ❌ | ❌ | **CRITICAL** |
| `/api/bookings/[id]/approve` | POST | ✅ | ✅ | ❌ | ❌ | **IMPROVE** |
| `/api/bookings/[id]/complete` | POST | ✅ | ✅ | ❌ | ❌ | **IMPROVE** |
| `/api/bookings/exclusive/request` | POST | ✅ | ✅ | ❌ | ❌ | **IMPROVE** |
| `/api/payments/initiate` | POST | ✅ | ✅ | ❌ | ❌ | **MISSING** (no Paystack API call) |
| `/api/payments/webhook/paystack` | POST | ❌ public | — | ❌ | ❌ | **KEEP** |
| `/api/payments/mock-confirm` | POST | ✅ | ✅ | ❌ | ❌ | **KEEP** (dev only) |
| `/api/group-plans` | POST | ✅ | ✅ | ✅ | ❌ | **IMPROVE** |
| `/api/group-plans/[id]/join` | POST | ✅ | ✅ | ❌ | ❌ | **IMPROVE** |
| `/api/chat` | POST | ✅ | ✅ | ✅ | ❌ | **IMPROVE** |
| `/api/whatsapp/webhook` | GET, POST | ❌ public | — | ❌ | ❌ | **IMPROVE** |
| `/api/admin/users` | GET | ✅ admin | — | ❌ | ❌ | **IMPROVE** |
| `/api/admin/listings/[id]/approve` | POST | ✅ admin | ✅ | ❌ | ✅ | **IMPROVE** |
| `/api/admin/listings/[id]/reject` | POST | ✅ admin | ✅ | ❌ | ✅ | **IMPROVE** |
| `/api/admin/verifications` | GET | ✅ admin | — | ❌ | ❌ | **KEEP** |
| `/api/admin/verifications/[id]/approve` | POST | ✅ admin | ✅ | ❌ | ✅ | **KEEP** |
| `/api/admin/verifications/[id]/reject` | POST | ✅ admin | ✅ | ❌ | ✅ | **KEEP** |
| `/api/provider/verifications` | GET, POST | ✅ host | ✅ | ✅ | ✅ | **KEEP** |
| `/api/cron/release-expired-holds` | GET | ✅ cron | — | — | ❌ | **KEEP** |

### 2.3 Pages (31 total — ALL are client components)

**Every page uses `"use client"`.** Zero server components. This is the #1 architectural issue.

Pages that should be Server Components (data fetching, SEO):
- `/listings` — public listing browser
- `/listings/[id]` — public listing detail
- `/admin` — admin dashboard
- `/admin/listings/pending` — admin listing review
- `/admin/users` — admin user list
- `/host/dashboard` — host dashboard
- `/profile` — user profile

Pages correctly marked as Client Components (interactivity):
- `/sign-in`, `/sign-up` — forms
- `/host/listings/new` — multi-step form
- `/host/listings/[id]/calendar` — interactive calendar
- `/listings/[id]/checkout` — payment flow
- `/group-plans/new` — group plan creation

### 2.4 Components (20 total)

| Component | Client/Server | Status |
|---|---|---|
| `home/Header.tsx` | Server | **KEEP** |
| `home/Hero.tsx` | Client | **KEEP** |
| `home/Categories.tsx` | Client | **KEEP** |
| `home/FeaturedSpaces.tsx` | Client | **KEEP** |
| `home/TwoWaysToBook.tsx` | Client | **KEEP** |
| `home/HowItWorks.tsx` | Client | **KEEP** |
| `home/OneAccountTwoRoles.tsx` | Client | **KEEP** |
| `home/WhyClockHost.tsx` | Client | **KEEP** |
| `home/Locations.tsx` | Client | **KEEP** |
| `home/Testimonials.tsx` | Client | **KEEP** |
| `home/HostCta.tsx` | Client | **KEEP** |
| `home/Faq.tsx` | Client | **KEEP** |
| `home/Footer.tsx` | Client | **KEEP** |
| `home/Reveal.tsx` | Client | **KEEP** |
| `home/Section.tsx` | Server | **KEEP** |
| `sidebar/HostSidebar.tsx` | Client | **KEEP** |
| `sidebar/AdminSidebar.tsx` | Client | **KEEP** |
| `ChatBot.tsx` | Client | **KEEP** |
| `Logo.tsx` | Client | **KEEP** |
| `PublicHeader.tsx` | Client | **KEEP** |
| `BackButton.tsx` | Client | **KEEP** |

### 2.5 Lib Files (12 total)

| File | Status | Notes |
|---|---|---|
| `auth/getSessionUser.ts` | **IMPROVE** | Parses JWT without signature verification |
| `auth/getUser.ts` | **KEEP** | Merges Clerk + Supabase, handles race condition |
| `auth/redirect.ts` | **KEEP** | 4-role redirect |
| `db/supabase.ts` | **KEEP** | Client + admin clients |
| `db/supabase-queries.ts` | **KEEP** | All DB queries |
| `db/audit.ts` | **KEEP** | Audit logging helper |
| `bookings/booking.ts` | **KEEP** | Atomic slot reservation |
| `bookings/exclusive.ts` | **KEEP** | Atomic lock resolution |
| `bookings/group-booking.ts` | **KEEP** | Transactional group plan |
| `payments/verifyWebhookSignature.ts` | **KEEP** | HMAC-SHA512 verification |
| `csrf.ts` | **IMPROVE** | Allows requests with neither Origin nor Referer |
| `rate-limit.ts` | **REFACTOR** | In-memory only — doesn't work on multi-instance serverless |
| `validation.ts` | **KEEP** | Zod schemas with strict mode |
| `whatsapp/bot.ts` | **KEEP** | Bot logic, intent parsing |
| `whatsapp/client.ts` | **KEEP** | WhatsApp Cloud API client |
| `whatsapp/gemini.ts` | **IMPROVE** | API key in URL query param |

---

## 3. Business Logic Audit

### 3.1 Authentication

| Area | Status | Details |
|---|---|---|
| JWT parsing | **IMPROVE** | `parseSessionToken()` decodes without signature verification. Relies on Clerk API for liveness |
| Middleware | **IMPROVE** | Only checks `hasSession()` (cookie presence), never verifies JWT |
| Role storage | **KEEP** | DB role is authoritative, not Clerk metadata |
| User creation | **KEEP** | Race condition handled with email-based retry |
| Auth helpers | **MISSING** | No `requireAuthenticatedUser()`, `requireHost()`, `requireAdmin()` — every route repeats 5-8 lines of boilerplate |

### 3.2 Listing Lifecycle

| Area | Status | Details |
|---|---|---|
| Status transitions | **IMPROVE** | Enforced via ad-hoc `if` checks, no formal state machine |
| Zod validation | **KEEP** | Strict schemas for create/update |
| Image cleanup | **KEEP** | Best-effort storage removal on update/delete |
| Audit logging | **KEEP** | All mutations logged |
| Image URL validation | **IMPROVE** | No URL format or domain allowlist |
| Reactivation flow | **MISSING** | `suspended`/`rejected` listings cannot return to `draft` |

### 3.3 Booking Flow

| Area | Status | Details |
|---|---|---|
| Capacity booking | **KEEP** | SQL-level atomic slot reservation |
| Exclusive booking | **KEEP** | Atomic lock resolution with `lost_race` |
| Group booking | **KEEP** | Fully transactional with row locks |
| Hold expiry | **KEEP** | Cron job releases expired holds |
| CSRF on POST /api/bookings | **CRITICAL** | Missing `validateCsrfOrigin` |
| Host approval audit | **IMPROVE** | No audit log on approve/reject |
| Completed status guard | **IMPROVE** | No `event_end` check before marking completed |
| Exclusive request validation | **IMPROVE** | No future-date validation on `eventStart`/`eventEnd` |

### 3.4 Payment Flow

| Area | Status | Details |
|---|---|---|
| Webhook signature | **KEEP** | HMAC-SHA512 + timing-safe comparison |
| Amount mismatch check | **KEEP** | Rejects if paid ≠ expected |
| Exclusive lock resolution | **KEEP** | Atomic via SQL function |
| Webhook idempotency | **KEEP** | `processed_webhooks` UNIQUE constraint |
| Paystack API integration | **MISSING** | `initiate` route returns mock URL, never calls Paystack API |
| Payment idempotency key | **MISSING** | Multiple calls for same booking generate different references |
| mock-confirm guard | **IMPROVE** | Only checks `NODE_ENV`, no API key |

### 3.5 WhatsApp Bot

| Area | Status | Details |
|---|---|---|
| Intent parsing | **KEEP** | Menu, search, select, about, group_booking |
| Gemini integration | **KEEP** | Graceful fallback to templates |
| Input truncation | **KEEP** | 500 char limit |
| Session management | **REFACTOR** | In-memory `Map()` — broken on serverless cold starts |
| Signature verification | **IMPROVE** | Skipped if `WHATSAPP_APP_SECRET` not set |
| Rate limiting | **MISSING** | No rate limit on incoming messages |
| API key in URL | **IMPROVE** | Should use Authorization header |

### 3.6 Chat Bot

| Area | Status | Details |
|---|---|---|
| CSRF protection | **KEEP** | Present |
| Input validation | **KEEP** | 2000 char max |
| Fallback responses | **KEEP** | Canned responses on Gemini failure |
| Clerk session verification | **IMPROVE** | Only parses token, doesn't verify liveness |
| Prompt injection | **IMPROVE** | Client-supplied history trusted without sanitization |
| Rate limiter | **IMPROVE** | In-memory only, doesn't scale across instances |

### 3.7 Admin Features

| Area | Status | Details |
|---|---|---|
| Role check | **IMPROVE** | Listing approve/reject uses Clerk metadata instead of DB role |
| Verification cascade | **KEEP** | Auto-updates provider profile status |
| Audit logging | **KEEP** | All admin actions logged |
| User list pagination | **IMPROVE** | Full table scan + TS pagination — doesn't scale |
| Rate limiting | **MISSING** | No rate limit on admin actions |
| Reject response | **IMPROVE** | Returns 200 with error body instead of 400 |

### 3.8 Cross-Cutting Concerns

| Area | Status | Details |
|---|---|---|
| CSRF | **IMPROVE** | Bypassable by omitting both Origin and Referer headers |
| Rate limiting | **MISSING** on most endpoints | Only chat and group-plans have rate limits |
| Input validation | **KEEP** | Zod with strict schemas, UUID validation |
| Audit trail | **KEEP** on listings/verifications | **MISSING** on bookings, payments, group plans |

---

## 4. UI / Pages

### 4.1 Terminology Compliance

**All source files use ClockHost terminology.** Zero "HostMe" references in `src/` or `tests/`.

### 4.2 Server Components

**Zero.** All 31 pages are client components. This is the #1 UI issue.

### 4.3 Missing UI Features

| Feature | Status |
|---|---|
| Error boundaries | **MISSING** — no error.tsx files anywhere |
| Loading states | **MISSING** — no loading.tsx files anywhere |
| Not found pages | **MISSING** — no not-found.tsx files |
| SEO metadata | **PARTIAL** — root layout has metadata, individual pages don't |
| Open Graph images | **MISSING** — no dynamic OG image generation |
| Favicon setup | **MISSING** — no favicon.ico or manifest |
| Responsive design | **PARTIAL** — most pages use responsive classes but some layouts break on mobile |
| Accessibility | **PARTIAL** — some aria labels, but no skip-to-content, no focus management |

---

## 5. Tests

### 5.1 Existing Tests (5 files)

| File | Coverage |
|---|---|
| `whatsapp-bot.test.ts` | Intent parsing, search flow, menu reset, about, group booking, Gemini fallback |
| `supabase-builder.test.ts` | PgQuery builder, RPC compilation, error handling |
| `group-booking.test.ts` | finalizeGroupPlan, computeShareKobo |
| `exclusive-lock.test.ts` | resolveExclusiveLock, markWebhookProcessing |
| `concurrency.test.ts` | reserveCapacitySlot when full |

### 5.2 Missing Tests

| Area | Status |
|---|---|
| API route tests | **MISSING** — no tests for any endpoint |
| Auth tests | **MISSING** — no tests for JWT parsing, role checks |
| Listing CRUD tests | **MISSING** |
| Booking flow tests | **MISSING** (only concurrency edge case) |
| Payment webhook tests | **MISSING** |
| Admin action tests | **MISSING** |
| Validation tests | **MISSING** |
| UI component tests | **MISSING** |

---

## 6. Documentation

### 6.1 Existing Docs (10 files)

| File | Status |
|---|---|
| `AUTH-GATE-FIXES-AND-AUDIT.md` | **KEEP** — historical record |
| `BATCH-1-AUTH-AUTHORIZATION.md` | **KEEP** — Batch 1 record |
| `BATCH-3-PROVIDER-VERIFICATION.md` | **KEEP** — Batch 3 record |
| `BATCH-4-HOUSING-LISTING-CALENDAR.md` | **KEEP** — Batch 4 record |
| `BOOKING-ENGINE.md` | **KEEP** — booking system docs |
| `ClockHost_Content_and_Terminology.md` | **KEEP** — language authority |
| `CLOCKHOST_REBRAND_MIGRATION.md` | **KEEP** — rebrand migration record |
| `PROBLEMS-AND-LIMITATIONS.md` | **KEEP** — known issues |
| `RESTRUCTURING-GUIDE.md` | **KEEP** — restructuring guidance |
| `VERTICAL-NAMING.md` | **KEEP** — naming conventions |
| `HOSTME_CURRENT_STATE_AUDIT.md` | **THIS FILE** |

### 6.2 Missing Docs

| Document | Status |
|---|---|
| API documentation | **MISSING** |
| Database schema reference | **MISSING** |
| Deployment guide | **MISSING** |
| Environment variable reference | **PARTIAL** — in README |

---

## 7. Configuration

### 7.1 Brand Config

| File | Status |
|---|---|
| `src/config/brand.ts` | **KEEP** — complete |
| `src/config/homepage.ts` | **KEEP** — all ClockHost terminology |

### 7.2 Package

| Item | Status |
|---|---|
| `package.json` name | **KEEP** — `clockhost-app` |
| Scripts | **IMPROVE** — `lint:fix`, `format`, `typecheck` present; `ci` still missing |
| Dependencies | **KEEP** |

### 7.3 Environment

| Item | Status |
|---|---|
| `.env` | **KEEP** — `CLOCKHOST_BASE_URL` present |
| `.env.example` | **KEEP** — 14 vars documented |
| `.gitignore` | **KEEP** |

---

## 8. Prioritized Remediation Plan

### CRITICAL (must fix before any new features)

| # | Fix | Files |
|---|---|---|
| C1 | Add CHECK constraints on `listings.status`, `listings.vertical`, `listings.booking_type`, `bookings.status`, `bookings.headcount`, `bookings.total_amount_kobo`, `slots.capacity`, `slots.booked`, `exclusive_locks.status`, `soft_holds.headcount` | `supabase/migration.sql` |
| C2 | Fix `bookings_insert` RLS — add `WITH CHECK (guest_id = current_setting('app.user_id', true))` | `supabase/migration.sql` |
| C3 | Add CSRF to `POST /api/bookings` | `src/app/api/bookings/route.ts` |
| C4 | Enable `pgcrypto` + `btree_gist` extensions, add exclusion constraints on `slots` and `bookings` | `supabase/migration.sql` |

### HIGH (fix in Batch 1)

| # | Fix | Files |
|---|---|---|
| H1 | Create `requireAuthenticatedUser()`, `requireHost()`, `requireAdmin()` helpers — eliminate auth boilerplate | `src/lib/auth/helpers.ts` |
| H2 | Create `booking_transitions` table + trigger on `bookings.status` changes | `supabase/migration.sql` |
| H3 | Create `payment_records` table | `supabase/migration.sql` |
| H4 | Create `listing_media` table, migrate `listings.media` TEXT[] to proper rows | `supabase/migration.sql` |
| H5 | Fix `audit_logs` RLS — add admin read policy + service_role write policy | `supabase/migration.sql` |
| H6 | Fix admin listing approve/reject to use DB role (`getUser()`) not Clerk metadata (`getClerkUser()`) | `src/app/api/admin/listings/[id]/*.ts` |
| H7 | Add `FOR UPDATE` to `reserve_capacity_slot()` and `resolve_exclusive_lock()` | `supabase/migration.sql` |
| H8 | Add transaction wrappers to `release_expired_holds()` and `resolve_exclusive_lock()` | `supabase/migration.sql` |
| H9 | Fix `blocked_dates.booking_id` FK to `ON DELETE SET NULL` | `supabase/migration.sql` |
| H10 | Add composite indexes: `bookings(guest_id, status)`, `bookings(listing_id, event_start)`, `slots(listing_id, event_start)`, `listings(status, vertical)` | `supabase/migration.sql` |

### MEDIUM (fix in Batch 2)

| # | Fix | Files |
|---|---|---|
| M1 | Replace in-memory WhatsApp sessions with Supabase table or Redis | `src/app/api/whatsapp/webhook/route.ts` |
| M2 | Add rate limiting to booking creation, payment initiation, listing creation | Various API routes |
| M3 | Verify Clerk session (not just parse) in chat endpoint | `src/app/api/chat/route.ts` |
| M4 | Sanitize client-supplied chat history to prevent prompt injection | `src/app/api/chat/route.ts` |
| M5 | Convert key pages to Server Components: `/listings`, `/listings/[id]`, `/admin`, `/host/dashboard` | Various page.tsx files |
| M6 | Add error boundaries (`error.tsx`) to all route segments | Various |
| M7 | Add loading states (`loading.tsx`) to data-heavy pages | Various |
| M8 | Add reactivation flow for suspended/rejected listings | Listing API routes |
| M9 | Add audit logging to booking approve/reject/complete, payment initiation | Various API routes |
| M10 | Implement Paystack API integration in `initiate` route | `src/app/api/payments/initiate/route.ts` |

### LOW (fix in later batches)

| # | Fix | Files |
|---|---|---|
| L1 | Create `cancellation_rules` / `refund_records` tables | `supabase/migration.sql` |
| L2 | Create `notifications` table + in-app notification system | `supabase/migration.sql` + UI |
| L3 | Create `viewings` table for housing viewing workflow | `supabase/migration.sql` |
| L4 | Create `contact_access` table for host handoff | `supabase/migration.sql` |
| L5 | Add Open Graph image generation | `src/app/` |
| L6 | Add favicon + manifest | `public/` |
| L7 | Add skip-to-content + focus management | Layout + components |
| L8 | Add API documentation | `docs/` |
| L9 | Add `lint:fix`, `format`, `typecheck`, `ci` scripts | `package.json` |
| L10 | Add tests for API routes, auth, booking flow, payments | `tests/` |

---

## 9. Architecture Decision Records

### ADR-001: All pages are client components
**Decision:** Every page uses `"use client"`.  
**Impact:** No SSR, no SEO for public pages, larger bundle sizes, slower initial loads.  
**Resolution:** Convert public-facing pages (`/listings`, `/listings/[id]`, `/`) to Server Components in Batch 2.

### ADR-002: In-memory state for WhatsApp sessions
**Decision:** WhatsApp bot sessions stored in `Map()`.  
**Impact:** Broken on serverless cold starts. Users lose conversation context frequently.  
**Resolution:** Replace with Supabase table in Batch 2.

### ADR-003: In-memory rate limiter
**Decision:** Rate limiting uses in-memory sliding window.  
**Impact:** Doesn't work across multiple Vercel instances. Effective limit = configured_limit × N_instances.  
**Resolution:** Replace with Upstash Redis in later batch.

### ADR-004: Storage bucket name stays HOSTME
**Decision:** Keep Supabase storage bucket as `HOSTME` for production data compatibility.  
**Impact:** Internal naming inconsistency. User never sees bucket name.  
**Resolution:** Accept permanently.

### ADR-005: Payment prefix stays hostme-
**Decision:** Keep `hostme-` prefix on Paystack references for in-flight payment compatibility.  
**Impact:** Internal naming inconsistency. User never sees payment reference.  
**Resolution:** Accept permanently.

---

## 10. Summary Scorecard

| Area | Score | Verdict |
|---|---|---|
| Database schema | 4/10 | Missing CHECK constraints, exclusion constraints, state machine tables, payment records |
| Authentication | 7/10 | Solid Clerk integration, but no auth helpers and middleware doesn't verify JWT |
| Listing lifecycle | 6/10 | Works but no formal state machine, missing reactivation |
| Booking flow | 7/10 | Atomic SQL functions work, but missing CSRF on booking creation |
| Payment flow | 5/10 | Webhook solid, but no Paystack API integration, no idempotency |
| WhatsApp bot | 6/10 | Good bot logic, but broken session management on serverless |
| Chat bot | 7/10 | Works, but prompt injection risk and no session verification |
| Admin features | 7/10 | Functional, but inconsistent role check and no rate limiting |
| UI / Pages | 5/10 | All client components, no error boundaries or loading states |
| Tests | 3/10 | Only 5 test files, no API/auth/booking tests |
| Documentation | 7/10 | Good batch docs, missing API/schema docs |
| Security | 5/10 | CSRF bypassable, rate limiting missing on most endpoints |

**Overall: 6/10** — Functional MVP with significant security and reliability gaps that must be addressed before production use.
