# ClockHost Booking Engine — Complete Architecture

## Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Booking Type 1: Per-Seat (Capacity)](#booking-type-1-per-seat-capacity)
4. [Booking Type 2: Private Hire (Exclusive)](#booking-type-2-private-hire-exclusive)
5. [Booking Type 3: Group Booking](#booking-type-3-group-booking)
6. [Payment Flow](#payment-flow)
7. [Race Condition Protections](#race-condition-protections)
8. [API Endpoint Reference](#api-endpoint-reference)
9. [Complete File Inventory](#complete-file-inventory)
10. [State Machine](#state-machine)

---

## System Overview

ClockHost is a Nigerian marketplace for booking event spaces, venues, and short-term stays. Hosts list commercial spaces and guests book them by the hour. The platform supports two distinct booking engines plus a group coordination layer.

### Core Concepts

- **Vertical**: The type of space (venue/stays)
- **Booking Type**: How the space is booked (per-seat/shared or exclusive/private)
- **Slot**: A bookable time window on a listing (for per-seat bookings)
- **Exclusive Lock**: A time window that can be claimed by one guest (for private hire bookings)
- **Soft Hold**: A temporary capacity reservation (10-minute TTL) while a guest completes payment
- **Group Plan**: A crowdfunded capacity reservation with a deadline

### Tech Stack

- **Framework**: Next.js 16 App Router (TypeScript)
- **Database**: Supabase PostgreSQL with PostGIS
- **Auth**: Clerk (server-side cookie-based JWT parsing)
- **Payments**: Paystack (mock mode in development)
- **Validation**: Zod v4

---

## Database Schema

### Tables

```
users
├── id (UUID, PK)
├── clerk_id (TEXT, UNIQUE)
├── name, email, phone
├── roles (TEXT[]) — ['guest'], ['guest','host'], ['guest','host','admin']
├── active_role (TEXT) — UI context only
└── profile (JSONB)

listings
├── id (UUID, PK)
├── host_id (UUID → users.id)
├── vertical (TEXT) — 'venue' or 'housing'
├── sub_vertical (TEXT[]) — ['birthday', 'karaoke', 'group_night', 'exclusive_space']
├── booking_type (TEXT) — 'capacity' or 'exclusive'
├── status (TEXT) — 'draft' | 'pending_review' | 'active' | 'suspended' | 'rejected'
├── title, description
├── location (JSONB) — {state, cityArea, address, coordinates}
├── pricing (JSONB) — {baseRatePerHour (kobo)}
├── operational_rules (JSONB) — {maxCapacity, setupTimeMinutes, ...}
├── features (JSONB) — vertical-specific feature flags
├── media (TEXT[]) — image URLs
├── add_ons (JSONB) — [{id, name, priceInKobo, isRequired}]
└── coordinates (GEOGRAPHY) — PostGIS point

slots
├── id (UUID, PK)
├── listing_id (UUID → listings.id)
├── event_start, event_end (TIMESTAMPTZ)
├── capacity (INTEGER)
├── booked (INTEGER) — confirmed + soft-held headcount
└── held_until (TIMESTAMPTZ)

exclusive_locks
├── id (UUID, PK)
├── listing_id (UUID → listings.id)
├── event_start, event_end (TIMESTAMPTZ)
├── status (TEXT) — 'open' | 'locked'
└── locked_by_booking_id (UUID → bookings.id)

soft_holds
├── id (UUID, PK)
├── slot_id (UUID → slots.id)
├── headcount (INTEGER)
├── guest_id (UUID → users.id)
├── booking_id (UUID → bookings.id, nullable)
└── expires_at (TIMESTAMPTZ)

bookings
├── id (UUID, PK)
├── listing_id (UUID → listings.id)
├── guest_id (UUID → users.id)
├── booking_type (TEXT) — 'capacity' or 'exclusive'
├── event_start, event_end (TIMESTAMPTZ)
├── headcount (INTEGER)
├── status (TEXT) — see State Machine below
├── total_amount_kobo (INTEGER)
├── commission_kobo (INTEGER) — 5% of total
├── gateway_transaction_ref (TEXT, UNIQUE)
└── paid_at (TIMESTAMPTZ)

group_plans
├── id (UUID, PK)
├── listing_id, slot_id, created_by
├── target_headcount (INTEGER)
├── event_start, event_end (TIMESTAMPTZ)
├── status (TEXT) — 'active' | 'finalized' | 'cancelled'
├── expires_at (TIMESTAMPTZ)
└── finalized_booking_id (UUID → bookings.id)

plan_members
├── id (UUID, PK)
├── plan_id (UUID → group_plans.id)
├── user_id (UUID → users.id)
├── headcount (INTEGER)
├── add_ons (JSONB)
├── share_amount_kobo (INTEGER)
├── status (TEXT) — 'pending' | 'paid' | 'confirmed'
└── gateway_transaction_ref (TEXT)

reviews
├── id (UUID, PK)
├── listing_id, guest_id, booking_id
├── rating (INTEGER, 1-5)
└── review_text (TEXT)

processed_webhooks
├── id (UUID, PK)
├── gateway_transaction_ref (TEXT, UNIQUE)
├── booking_id (UUID)
└── gateway (TEXT) — 'paystack' | 'mock'
```

### Stored Procedures (Postgres RPC)

| Function | Purpose |
|----------|---------|
| `reserve_capacity_slot(slot_id, listing_id, headcount)` | Atomically increment `slots.booked` if capacity allows. Returns updated slot or empty. |
| `resolve_exclusive_lock(lock_id, booking_id, listing_id, event_start)` | Atomically claim an open exclusive lock. Winner gets confirmed, losers get `lost_race`. |
| `release_expired_holds()` | Sweep expired soft holds and release capacity back to slots. |
| `cancel_expired_group_plans()` | Mark expired group plans as cancelled. |

---

## Booking Type 1: Per-Seat (Capacity)

For venues that sell time-based capacity (e.g., a karaoke room that fits 20 people, sold per-seat).

### End-to-End Flow

```
1. Host creates time slots
   POST /api/listings/[id]/slots
   → Creates slots table rows with capacity

2. Guest views listing, selects date
   GET /api/listings/[id]/slots?date=YYYY-MM-DD
   → Returns available slots with computed `available` field

3. Guest selects slot + headcount, clicks "Continue to Payment"
   → Checkout page (src/app/(public)/listings/[id]/checkout/page.tsx)

4. Guest clicks "Reserve & Pay"
   POST /api/soft-holds
   → Validates listing, slot, capacity
   → Calls reserve_capacity_slot() RPC (ATOMIC)
   → Creates soft_hold with 10-minute TTL
   → Returns: { softHoldId, expiresAt, totalAmountKobo }

5. Guest confirms, redirected to payment page
   POST /api/bookings
   → Validates soft hold (not expired, belongs to user)
   → SERVER-SIDE pricing: computeCapacityPriceKobo()
   → Creates booking (status: "awaiting_payment")
   → Links soft_hold to booking

6. Guest pays
   POST /api/payments/initiate → returns Paystack reference
   → Paystack processes payment
   → Webhook: POST /api/payments/webhook/paystack
   → Idempotency guard (processed_webhooks)
   → Updates booking: status → "confirmed"

7. Booking confirmed. Guest sees confirmation on /bookings/[id]
```

### Pricing Formula (Per-Seat)

```
subtotal = (baseRatePerHour × headcount × hours) + add-ons total
commission = subtotal × 0.05 (5%)
total = subtotal
```

### Database Tables Touched

1. `listings` — read (validate)
2. `slots` — read + write via `reserve_capacity_slot()` RPC
3. `soft_holds` — write (create) → write (link booking_id)
4. `bookings` — write (insert, awaiting_payment) → write (update, confirmed)
5. `processed_webhooks` — write (idempotency guard)

---

## Booking Type 2: Private Hire (Exclusive)

For venues booked in full by one guest (e.g., a private lounge for 3 hours).

### End-to-End Flow

```
1. Host creates exclusive time locks
   POST /api/listings/[id]/exclusive-locks
   → Creates exclusive_locks rows with status: "open"

2. Guest views listing, sees available time windows
   GET /api/listings/[id]/availability?date=YYYY-MM-DD
   → Returns exclusive_locks for that date

3. Guest clicks "Request to Book"
   → Exclusive request page (src/app/(public)/listings/[id]/exclusive-request/page.tsx)

4. Guest submits request
   POST /api/bookings/exclusive/request
   → Validates listing (exclusive type, active)
   → Validates lock (exists, belongs to listing, status="open")
   → Pricing: baseRatePerHour × hours (NO headcount multiplier)
   → Creates booking (status: "pending" — needs host approval)

5. Host reviews
   POST /api/bookings/[id]/approve → status → "awaiting_payment"
   POST /api/bookings/[id]/reject  → status → "rejected"

6. Guest pays (same as capacity flow)
   → initiate → webhook → confirm
   → Webhook calls resolve_exclusive_lock() RPC
   → Atomic race resolution: first payment wins
   → Loser's booking → "lost_race"

7. Booking confirmed.
```

### Pricing Formula (Private Hire)

```
subtotal = baseRatePerHour × hours
commission = subtotal × 0.05 (5%)
total = subtotal
```

### Exclusive Race Condition

Multiple guests may request the same time window. The resolution happens at payment time:

```
Guest A pays → resolve_exclusive_lock(lockA, bookingA, ...) → LOCKED (winner)
Guest B pays → resolve_exclusive_lock(lockA, bookingB, ...) → EMPTY (loser)
→ Guest B's booking marked "lost_race"
```

---

## Booking Type 3: Group Booking

A crowdfunded capacity reservation with a deadline. One person creates a plan, others join and pay their share.

### End-to-End Flow

```
1. Guest creates a group plan
   POST /api/group-plans
   → Validates: listing is capacity-type, slot has room
   → Creates plan (status: "active") + creator as member
   → Default deadline: 24 hours

2. Creator shares invite link
   → /group-plans/[id] page shows shareable URL

3. Other guests join
   POST /api/group-plans/[id]/join
   → Validates: plan active, not expired, target not exceeded
   → Computes share via computeShareKobo()
   → Creates plan_member (status: "pending")

4. Each member pays their share
   POST /api/group-plans/[id]/payments/mock-confirm
   → Updates member status to "paid"
   → Calls finalizeGroupPlan() to check if ready

5. Finalization (when all members paid + target met)
   → Runs in Postgres TRANSACTION with row-level locking:
     a. SELECT FOR UPDATE on group_plans
     b. SELECT FOR UPDATE on plan_members
     c. Validates: all members paid, headcount ≥ target
     d. Calls reserve_capacity_slot() RPC (ATOMIC)
     e. Creates booking (status: "confirmed")
     f. Updates plan status → "finalized"
     g. COMMIT

6. Booking confirmed. All members can see it.
```

### Group Plan Pricing

```
share = computeCapacityPriceKobo({
  baseRatePerHour,
  headcount: memberHeadcount,
  hours
}) + member's add-ons
```

---

## Payment Flow

### Development Mode

```
Guest clicks "Pay"
→ POST /api/payments/initiate (generates reference)
→ POST /api/payments/mock-confirm (immediately confirms)
→ Redirect to /bookings/[id] (shows confirmed)
```

### Production Mode (Paystack)

```
Guest clicks "Pay"
→ POST /api/payments/initiate (returns authorization_url)
→ Redirect to paystack.com/pay/{reference}
→ Paystack processes card/bank transfer
→ Paystack sends webhook
→ POST /api/payments/webhook/paystack
  → Verifies HMAC-SHA512 signature
  → Idempotency guard (processed_webhooks)
  → For capacity: confirms directly
  → For exclusive: resolves lock first
  → For group: marks member paid, tries finalization
```

### Commission

5% of total amount, stored in `bookings.commission_kobo` at booking creation time.

---

## Race Condition Protections

| Protection | Mechanism | Location |
|------------|-----------|----------|
| Atomic slot reservation | `UPDATE ... WHERE capacity - booked >= headcount RETURNING *` | `reserve_capacity_slot()` RPC |
| Soft hold TTL | 10-minute expiry + cron sweep | `soft_holds.expires_at` + `sweepExpiredHolds` |
| Exclusive lock atomic resolve | `SELECT ... FOR UPDATE` + conditional UPDATE | `resolve_exclusive_lock()` RPC |
| Webhook idempotency | Unique constraint on `gateway_transaction_ref` | `processed_webhooks` table |
| Group plan row locking | `SELECT ... FOR UPDATE` on plans + members | `finalizeGroupPlan()` |
| Payment amount verification | Compare webhook amount vs booking total | Webhook handler |
| Paystack signature verification | HMAC-SHA512 with timing-safe compare | `verifyPaystackSignature()` |
| Rate limiting | In-memory IP-keyed bucket (1-hour window) | `rate-limit.ts` |
| Status preconditions | Every endpoint checks current status | All API routes |

---

## API Endpoint Reference

### Bookings

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/bookings` | Required | List bookings (host sees all their listings' bookings; guest sees own) |
| POST | `/api/bookings` | Required | Create booking from soft hold |
| GET | `/api/bookings/[id]` | Required | Get booking detail |
| POST | `/api/bookings/[id]/approve` | Host only | Approve exclusive booking |
| POST | `/api/bookings/[id]/reject` | Host only | Reject booking |
| POST | `/api/bookings/[id]/complete` | Host only | Mark booking completed |
| POST | `/api/bookings/exclusive/request` | Required | Request exclusive booking |

### Soft Holds

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/soft-holds` | Required | Reserve capacity temporarily |

### Slots

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/listings/[id]/slots` | Public | List slots for date |
| POST | `/api/listings/[id]/slots` | Host only | Create slot |
| DELETE | `/api/listings/[id]/slots/[slotId]` | Host only | Delete slot |

### Exclusive Locks

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/listings/[id]/exclusive-locks` | Public | List locks for date |
| GET | `/api/listings/[id]/availability` | Public | Alias for above |
| POST | `/api/listings/[id]/exclusive-locks` | Host only | Create lock |

### Payments

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/api/payments/initiate` | Required | Generate Paystack reference |
| POST | `/api/payments/mock-confirm` | Required | Dev-only mock payment |
| POST | `/api/payments/webhook/paystack` | Paystack HMAC | Process payment webhook |

### Group Plans

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/group-plans` | Optional | List user's plans |
| POST | `/api/group-plans` | Required | Create plan |
| GET | `/api/group-plans/[id]` | Optional | Plan detail (public) |
| POST | `/api/group-plans/[id]/join` | Required | Join plan |
| POST | `/api/group-plans/[id]/finalize` | Creator only | Finalize plan |
| POST | `/api/group-plans/[id]/payments/mock-confirm` | Required | Mock pay member |

---

## Complete File Inventory

### API Routes (19 files)
1. `src/app/api/bookings/route.ts`
2. `src/app/api/bookings/[id]/route.ts`
3. `src/app/api/bookings/[id]/approve/route.ts`
4. `src/app/api/bookings/[id]/reject/route.ts`
5. `src/app/api/bookings/[id]/complete/route.ts`
6. `src/app/api/bookings/exclusive/request/route.ts`
7. `src/app/api/soft-holds/route.ts`
8. `src/app/api/listings/[id]/slots/route.ts`
9. `src/app/api/listings/[id]/slots/[slotId]/route.ts`
10. `src/app/api/listings/[id]/exclusive-locks/route.ts`
11. `src/app/api/listings/[id]/availability/route.ts`
12. `src/app/api/payments/initiate/route.ts`
13. `src/app/api/payments/mock-confirm/route.ts`
14. `src/app/api/payments/webhook/paystack/route.ts`
15. `src/app/api/group-plans/route.ts`
16. `src/app/api/group-plans/[id]/route.ts`
17. `src/app/api/group-plans/[id]/join/route.ts`
18. `src/app/api/group-plans/[id]/finalize/route.ts`
19. `src/app/api/group-plans/[id]/payments/mock-confirm/route.ts`

### Library/Logic (12 files)
20. `src/lib/bookings/booking.ts`
21. `src/lib/bookings/pricing.ts`
22. `src/lib/bookings/exclusive.ts`
23. `src/lib/bookings/group-booking.ts`
24. `src/lib/jobs/sweepExpiredHolds.ts`
25. `src/lib/payments/verifyWebhookSignature.ts`
26. `src/lib/rate-limit.ts`
27. `src/lib/db/supabase.ts`
28. `src/lib/db/connection.ts`
29. `src/lib/db/supabase-queries.ts`
30. `src/lib/db/supabase-utils.ts`
31. `src/lib/validation.ts`

### Pages (13 files)
32. `src/app/(public)/listings/[id]/page.tsx`
33. `src/app/(public)/listings/[id]/checkout/page.tsx`
34. `src/app/(public)/listings/[id]/exclusive-request/page.tsx`
35. `src/app/(public)/bookings/[id]/page.tsx`
36. `src/app/(public)/bookings/[id]/pay/page.tsx`
37. `src/app/(public)/group-plans/page.tsx`
38. `src/app/(public)/group-plans/new/page.tsx`
39. `src/app/(public)/group-plans/[id]/page.tsx`
40. `src/app/(host)/host/dashboard/page.tsx`
41. `src/app/(host)/host/bookings/page.tsx`
42. `src/app/(host)/host/bookings/[id]/page.tsx`
43. `src/app/(host)/host/listings/[id]/slots/page.tsx`
44. `src/app/(host)/host/listings/[id]/exclusive-locks/page.tsx`

### Config & Schema (3 files)
45. `src/config/homepage.ts`
46. `supabase/migration.sql`
47. `src/lib/validation.ts`

---

## State Machine

### Booking Statuses

```
                    ┌─────────────┐
                    │   pending    │  ← Exclusive: awaiting host approval
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  awaiting_  │  ← After approval, awaiting payment
                    │   payment   │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │       confirmed         │  ← Payment received
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │       completed         │  ← Host marks complete
              └─────────────────────────┘

Special states:
  rejected    ← Host rejects exclusive request
  lost_race   ← Exclusive: another guest paid first
  expired     ← Soft hold expired, capacity released
  cancelled   ← Guest or system cancelled
  disputed    ← Payment or service dispute
```

### Group Plan Statuses

```
active → finalized (all members paid, slot reserved)
active → cancelled (deadline passed without enough members)
```

### Exclusive Lock Statuses

```
open → locked (first payment wins)
```
