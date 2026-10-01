# ClockHost PDSS — Part 4: Phases 13-18
## C4 Model, Data Ownership, Security, Failure Model, Critique, Final Model

---

# PHASE 13 — C4 ARCHITECTURE MODEL

## 13.1 System Context Diagram (Level 1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│    ┌──────────┐        ┌──────────────┐        ┌──────────┐       │
│    │  Guest   │        │ Venue Host   │        │  Admin   │       │
│    │ (Browser)│        │  (Browser)   │        │ (Browser)│       │
│    └────┬─────┘        └──────┬───────┘        └────┬─────┘       │
│         │                     │                      │              │
│         │    ┌────────────────┴──────────────────────┘              │
│         │    │                                                      │
│         ▼    ▼                                                      │
│    ┌──────────────┐                                                 │
│    │  ClockHost   │◀──────────────┐                                │
│    │   Platform   │               │                                │
│    │  (Next.js)   │               │                                │
│    └──────┬───────┘               │                                │
│           │                       │                                │
│    ┌──────┼───────────────────────┼────────────┐                   │
│    │      │                       │            │                   │
│    ▼      ▼                       ▼            ▼                   │
│ ┌──────┐┌──────────┐  ┌──────────────┐  ┌──────────┐             │
│ │Clerk ││ Paystack │  │   Supabase   │  │  Vercel  │             │
│ │(Auth)││(Payments)│  │  (Database)  │  │ (Deploy) │             │
│ └──────┘└──────────┘  └──────────────┘  └──────────┘             │
│                                                                     │
│    ┌──────────────┐                                                 │
│    │   WhatsApp   │ (AI Chatbot for discovery)                     │
│    │   (via Gemini)│                                                │
│    └──────────────┘                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 13.2 Container Diagram (Level 2)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ClockHost Platform                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Next.js Application                          │ │
│  │                                                                 │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │ │
│  │  │   Web App    │  │   API Routes │  │    Middleware         │ │ │
│  │  │  (React SSR) │  │  (REST)      │  │  (Auth, Security)    │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │                   Domain Modules                          │  │ │
│  │  │  Pricing │ State Machine │ Time Engine │ Notifications    │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                 │ │
│  │  ┌──────────────────────────────────────────────────────────┐  │ │
│  │  │                Infrastructure Modules                     │  │ │
│  │  │  DB Client │ Paystack │ Clerk │ Audit │ Cache │ Security │  │ │
│  │  └──────────────────────────────────────────────────────────┘  │ │
│  │                                                                 │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │    Supabase       │  │    Paystack       │  │    Clerk          │  │
│  │  PostgreSQL +     │  │  Payment API +    │  │  Auth API +       │  │
│  │  PostGIS + RLS    │  │  Webhooks         │  │  JWT Sessions     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## 13.3 Component Diagram (Level 3) — Booking Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Booking Flow Components                       │
│                                                                      │
│  ┌──────────────┐                                                    │
│  │ Checkout     │                                                    │
│  │ Page         │                                                    │
│  └──────┬───────┘                                                    │
│         │ POST /api/soft-holds                                       │
│         ▼                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ Soft Hold    │───▶│ Time Engine  │───▶│ Capacity     │          │
│  │ Handler      │    │ (check_availability) │ Check      │          │
│  └──────┬───────┘    └──────────────┘    └──────────────┘          │
│         │                                                            │
│         │ POST /api/bookings                                         │
│         ▼                                                            │
│  ┌──────────────┐    ┌──────────────┐                               │
│  │ Booking      │───▶│ Pricing      │                               │
│  │ Creator      │    │ Engine       │                               │
│  └──────┬───────┘    └──────────────┘                               │
│         │                                                            │
│         │ POST /api/payments/initiate                                │
│         ▼                                                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │ Payment      │───▶│ Paystack     │───▶│ Webhook      │          │
│  │ Initiator    │    │ API          │    │ Handler      │          │
│  └──────────────┘    └──────────────┘    └──────┬───────┘          │
│                                                  │                   │
│                                         ┌────────▼────────┐         │
│                                         │ State Machine   │         │
│                                         │ (transition)    │         │
│                                         └────────┬────────┘         │
│                                                  │                   │
│                              ┌───────────────────┼───────────────┐  │
│                              ▼                   ▼               ▼  │
│                        ┌──────────┐      ┌──────────┐    ┌────────┐│
│                        │Notifica- │      │ Audit    │    │Escrow  ││
│                        │tion      │      │ Log      │    │Release ││
│                        └──────────┘      └──────────┘    └────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

# PHASE 14 — DATA OWNERSHIP

## 14.1 Data Ownership Matrix

| Entity | Created By | Owned By | Read By | Modified By | Deleted By | Source of Truth |
|--------|-----------|----------|---------|-------------|------------|-----------------|
| User | Sign-up flow | IAM | All (by ID) | User, Admin | Admin (soft) | users table |
| Provider Profile | Complete Profile | Provider Mgmt | Space Inventory, Booking Engine | Provider, Admin | Admin | provider_profiles |
| Listing | Host creates | Space Inventory | Time Engine, Booking Engine, Search | Host, Admin | Host, Admin | listings |
| Availability Rule | Host sets | Time Engine | Booking Engine | Host | Host | availability_rules |
| Blocked Date | Host sets | Time Engine | Booking Engine | Host | Host | blocked_dates |
| Slot | System generates | Time Engine | Booking Engine | System | System | slots |
| Booking | Guest creates | Booking Engine | Pricing, Communication, Trust | Booking Engine, Host, Guest, System | System (archive) | bookings |
| Payment Record | System creates | Pricing & Billing | Booking Engine, Admin | System (webhook) | Never (audit) | payment_records |
| Review | Guest creates | Trust & Safety | Space Inventory (display) | Host (response) | Admin | reviews |
| Notification | System creates | Communication | User (read) | User (mark read) | System (cleanup) | notifications |
| Audit Log | System creates | Admin Operations | Admin (view) | Never (immutable) | System (archive) | audit_logs |

## 14.2 Consistency Rules

| Rule | Description |
|------|-------------|
| Booking → Listing | booking.listing_id must reference an existing listing |
| Booking → Guest | booking.guest_id must reference an existing user |
| Booking → Host | booking.host_id must reference the listing's provider's user_id |
| Payment → Booking | payment_record.booking_id must reference an existing booking |
| Review → Booking | review.booking_id must reference a completed booking (UNIQUE) |
| Review → Guest | review.guest_id must reference the booking's guest |
| Slot → Listing | slot.listing_id must reference an existing listing |
| Hold → Slot | soft_hold.slot_id must reference an existing slot |

---

# PHASE 15 — SECURITY & TRUST BOUNDARIES

## 15.1 Trust Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                     TRUST BOUNDARY: CLIENT                       │
│  (Browser, Mobile)                                              │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ TRUST BOUNDARY: CLIENT-SIDE APPLICATION                   │   │
│  │  - React components                                       │   │
│  │  - Client-side state                                      │   │
│  │  - NO sensitive operations                                │   │
│  │  - NO price calculation authority                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS only
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TRUST BOUNDARY: SERVER                       │
│  (Next.js API Routes)                                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ TRUST BOUNDARY: APPLICATION SERVER                        │   │
│  │  - Session validation (Clerk JWT)                         │   │
│  │  - CSRF protection                                        │   │
│  │  - Rate limiting                                          │   │
│  │  - Input validation                                       │   │
│  │  - Authorization checks                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ TRUST BOUNDARY: DOMAIN LOGIC                              │   │
│  │  - Price calculation (authoritative)                      │   │
│  │  - Booking state machine (authoritative)                  │   │
│  │  - Availability checking (authoritative)                  │   │
│  │  - Commission calculation (authoritative)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Encrypted connection
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TRUST BOUNDARY: DATA                         │
│  (Supabase PostgreSQL)                                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ TRUST BOUNDARY: DATABASE                                  │   │
│  │  - Row Level Security (RLS)                               │   │
│  │  - Database constraints (CHECK, UNIQUE, FK)               │   │
│  │  - Exclusion constraints (no overlaps)                    │   │
│  │  - Triggers (enforce business rules)                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 15.2 Sensitive Operations

| Operation | Risk Level | Protection |
|-----------|-----------|------------|
| Payment initiation | HIGH | Auth + CSRF + Rate limit + Server-side amount |
| Webhook processing | HIGH | HMAC signature verification + Idempotency |
| Booking creation | HIGH | Auth + Soft hold + Atomic operation |
| Admin actions | HIGH | Admin role + Audit logging |
| Listing approval | HIGH | Admin role + Audit logging + Notification |
| Refund processing | HIGH | Admin/Host role + Audit logging |
| File upload | MEDIUM | Auth + File type validation + Size limit |
| Profile update | MEDIUM | Auth + Input validation |
| Review submission | MEDIUM | Auth + Booking ownership + One review per booking |
| Search | LOW | Rate limiting |

## 15.3 Abuse Scenarios

| Scenario | Mitigation |
|----------|-----------|
| Double-booking (race condition) | Atomic soft hold + Exclusion constraints |
| Payment spoofing | Server-side Paystack verification |
| Price manipulation | Server-side pricing calculation |
| CSRF attacks | Origin/Referer validation + SameSite cookies |
| Rate abuse | Per-route rate limiting |
| SQL injection | Parameterized queries via Supabase client |
| XSS | React auto-escaping + CSP headers |
| Unauthorized access | Middleware auth + RLS |
| Idempotency attacks | Processed webhooks table + idempotency keys |
| Fake reviews | One review per booking constraint |

---

# PHASE 16 — FAILURE & RESILIENCE MODEL

## 16.1 Critical Workflow Failure Analysis

### Booking Creation

| Failure Point | State After Failure | Retryable? | Idempotent? | Recovery |
|---------------|--------------------|--------------------|-------------|----------|------------|
| Soft hold creation fails | No hold created | YES | YES | Retry with same/different slot |
| Booking creation fails (hold expired) | Hold expired, no booking | YES | YES | Create new hold |
| Booking creation fails (capacity exceeded) | Hold exists, capacity gone | NO | YES | Show error, select different slot |
| Booking creation fails (DB error) | Hold exists, no booking | YES | YES | Retry or cleanup hold |

### Payment Processing

| Failure Point | State After Failure | Retryable? | Idempotent? | Recovery |
|---------------|--------------------|--------------------|-------------|----------|------------|
| Paystack init fails | Booking awaiting_payment | YES | YES | Retry payment |
| Paystack redirect fails | Payment pending | YES | YES | Retry from booking detail |
| Webhook signature invalid | Payment pending | NO | N/A | Log security event |
| Webhook duplicate | Payment successful | N/A | YES | Return existing result |
| Amount mismatch | Payment pending | NO | N/A | Log discrepancy, reject |
| VerifyTransaction fails | Payment pending | YES | YES | Retry verification |
| Booking already confirmed | N/A | N/A | YES | Return existing result |
| Crash after webhook insert | Payment pending | YES | YES | Re-process webhook on retry |

### Exclusive Booking

| Failure Point | State After Failure | Retryable? | Idempotent? | Recovery |
|---------------|--------------------|--------------------|-------------|----------|------------|
| Lock creation fails | No lock created | YES | YES | Retry |
| Lock creation race | One wins, one loses | N/A | YES | Loser gets lost_race |
| Lock resolution fails | Lock exists, booking pending | YES | YES | Retry resolution |
| Transient DB error in lock resolution | Lock exists | YES | NO (currently) | Fix: distinguish transient vs permanent |

### Webhook Processing

| Failure Point | State After Failure | Retryable? | Idempotent? | Recovery |
|---------------|--------------------|--------------------|-------------|----------|
| processed_webhooks insert fails (duplicate) | Existing webhook | N/A | YES | Return duplicate |
| processed_webhooks insert fails (DB error) | Unknown state | YES | YES | Retry |
| Booking update fails | Webhook processed, booking not updated | PARTIAL | YES | Fix: transactional |
| Notification fails | Booking confirmed, no notification | YES | YES | Retry notification |
| Payment record fails | Booking confirmed, no payment record | YES | YES | Retry payment record |

## 16.2 External Dependency Failure

| Dependency | Failure Mode | Impact | Recovery |
|------------|-------------|--------|----------|
| Clerk | Auth service down | Cannot authenticate new users | Show error, retry |
| Clerk | JWT verification fails | Cannot validate sessions | Show error, retry |
| Paystack | API down | Cannot initiate payments | Show error, retry later |
| Paystack | Webhook delayed | Booking stays pending | Cron job catches expired bookings |
| Supabase | DB connection lost | All operations fail | Show error, retry |
| Supabase | RLS policy blocks | Operation rejected | Fix policy |
| Vercel | Deployment fails | Old version stays live | Re-deploy |

## 16.3 Idempotency Matrix

| Operation | Idempotency Strategy |
|-----------|---------------------|
| Booking creation | idempotency_key UNIQUE constraint |
| Webhook processing | processed_webhooks UNIQUE constraint |
| Payment initiation | Check existing successful payment |
| Soft hold creation | Hold expires, new hold can be created |
| Review submission | One review per booking (UNIQUE constraint) |
| Group plan finalization | Check plan status before processing |

---

# PHASE 17 — ARCHITECTURE CRITIQUE

## 17.1 Issues Found

### Issue 1: Dual Pricing Calculation (CRITICAL)
**Problem:** Reserve route and bookings route calculate prices differently. Pricing engine exists but isn't used consistently.
**Impact:** Customers see different prices at different steps.
**Fix:** Single pricing path through pricing engine. Reserve calls it, bookings validates against it.

### Issue 2: No Server-Side Route Protection (CRITICAL)
**Problem:** Middleware doesn't check auth. Only per-route checks.
**Impact:** Users can access protected pages by typing URLs directly.
**Fix:** Add auth checking in middleware for all protected paths.

### Issue 3: Status Enum Mismatch (HIGH)
**Problem:** TS state machine uses `pending_approval`, SQL uses `pending` in some places.
**Impact:** Transitions may fail at DB level.
**Fix:** Align all status enums across TS and SQL.

### Issue 4: Dual Audit Systems (MEDIUM)
**Problem:** `src/lib/audit.ts` and `src/lib/db/audit.ts` both exist.
**Impact:** Inconsistent audit logging.
**Fix:** Remove `src/lib/audit.ts`, use `db/audit.ts` only.

### Issue 5: Mixed DB Access Patterns (MEDIUM)
**Problem:** Some files use raw pg pool, some use Supabase client.
**Impact:** Inconsistent query patterns, harder to maintain.
**Fix:** Standardize on Supabase client for all queries.

### Issue 6: blocked_dates Hour Granularity (LOW)
**Problem:** `blocked_date` is DATE type, cannot block specific hours.
**Impact:** Host cannot block "5 PM - 11 PM" on a specific day.
**Fix:** Add start_time/end_time columns or use availability_exceptions.

### Issue 7: Venue-Spend Entitlement Ambiguity (LOW)
**Problem:** Spec says "NOT tracked" but pricing engine computes venue-spend discount.
**Impact:** Confusion about what venue-spend means.
**Fix:** Clarify: venue-spend entitlement is a customer-facing benefit, NOT a wallet. The discount in pricing.ts is a separate loyalty mechanism.

## 17.2 Revised Architecture Decisions

| Original Decision | Revised Decision | Reason |
|-------------------|-----------------|--------|
| Per-route auth checking | Middleware-based auth | Defense-in-depth, consistency |
| Two pricing calculation paths | Single pricing engine path | Price consistency |
| `src/lib/audit.ts` kept | Remove it | Single audit system |
| Mixed DB access | Supabase client only | Consistency |
| `blocked_dates` DATE only | Add time support | §11 requires hour granularity |

---

# PHASE 18 — FINAL PRODUCT MODEL

## 18.1 Product Map

```
ClockHost
├── Guest Experience
│   ├── Discovery (Browse, Search, Filter)
│   ├── Evaluation (Listing Detail, Reviews, Availability)
│   ├── Booking (Capacity, Exclusive, Group, Housing)
│   ├── Payment (Paystack, Receipt)
│   └── Post-Booking (Manage, Check-in, Review, Dispute)
├── Host Experience
│   ├── Onboarding (Profile, Verification)
│   ├── Listing Management (Create, Edit, Submit)
│   ├── Availability Management (Calendar, Rules, Blocked Dates)
│   ├── Booking Management (Approve, Reject, Complete)
│   ├── Financial Management (Earnings, Payouts)
│   └── Communication (Messages, Notifications)
├── Admin Experience
│   ├── Listing Governance (Review, Approve, Reject, Suspend)
│   ├── Provider Governance (Verification Review)
│   ├── User Management (Roles, Suspension)
│   ├── Dispute Resolution (Review, Decide, Refund)
│   ├── Audit Trail (View, Filter, Export)
│   └── Monitoring (Health, Errors, Uptime)
└── Platform Infrastructure
    ├── Authentication (Clerk)
    ├── Database (Supabase PostgreSQL)
    ├── Payments (Paystack)
    ├── Storage (File uploads)
    └── Deployment (Vercel)
```

## 18.2 Domain Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOCKHOST DOMAIN MAP                          │
│                                                                  │
│  CORE DOMAINS:                                                   │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐        │
│  │    IAM      │ │   Provider   │ │ Space Inventory  │        │
│  │             │ │  Management  │ │                  │        │
│  │ Users       │ │ Profiles     │ │ Listings         │        │
│  │ Sessions    │ │ Verification │ │ Media            │        │
│  │ Roles       │ │ Suspension   │ │ Status           │        │
│  └─────────────┘ └──────────────┘ └──────────────────┘        │
│                                                                  │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐        │
│  │    Time     │ │   Booking    │ │   Pricing &      │        │
│  │   Engine    │ │   Engine     │ │   Billing        │        │
│  │             │ │              │ │                  │        │
│  │ Rules       │ │ Bookings     │ │ Calculations     │        │
│  │ Exceptions  │ │ Holds        │ │ Payments         │        │
│  │ Blocked     │ │ Locks        │ │ Escrow           │        │
│  │ Slots       │ │ Group Plans  │ │ Refunds          │        │
│  └─────────────┘ └──────────────┘ └──────────────────┘        │
│                                                                  │
│  SUPPORTING DOMAINS:                                             │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐        │
│  │    Trust    │ │Communication │ │    Admin         │        │
│  │  & Safety   │ │              │ │   Operations     │        │
│  │             │ │ Notifications│ │                  │        │
│  │ Reviews     │ │ Messages     │ │ Audit            │        │
│  │ Disputes    │ │ Preferences  │ │ Monitoring       │        │
│  │ Reports     │ │ Contact      │ │ Review           │        │
│  └─────────────┘ └──────────────┘ └──────────────────┘        │
│                                                                  │
│  GENERIC DOMAINS:                                                │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐        │
│  │   Search    │ │   Analytics  │ │    Export        │        │
│  │ & Discovery │ │              │ │                  │        │
│  └─────────────┘ └──────────────┘ └──────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 18.3 Feature Map

| Domain | Capability | Feature | Status |
|--------|-----------|---------|--------|
| IAM | Authentication | Sign up / Sign in | DONE |
| IAM | Profile | Complete profile | DONE (needs fix) |
| IAM | Roles | Role selection | DONE (needs fix) |
| IAM | Security | Route protection | MISSING |
| Provider | Onboarding | Create provider profile | DONE |
| Provider | Verification | Submit documents | DONE |
| Provider | Verification | View verification status | DONE |
| Inventory | Listing | Create listing | DONE (needs fix) |
| Inventory | Listing | Edit listing | DONE |
| Inventory | Listing | Submit for review | DONE |
| Inventory | Listing | Delete listing | DONE |
| Time | Availability | Set availability rules | DONE |
| Time | Availability | Add availability exceptions | DONE |
| Time | Availability | Block dates | DONE |
| Time | Availability | Generate time slots | DONE |
| Booking | Capacity | Create soft hold | DONE |
| Booking | Capacity | Convert to booking | DONE |
| Booking | Exclusive | Request exclusive lock | DONE |
| Booking | Group | Create group plan | DONE |
| Booking | Group | Join group plan | DONE |
| Booking | Group | Finalize group plan | DONE |
| Booking | State | Approve/reject booking | DONE |
| Booking | State | Cancel booking | DONE |
| Booking | Check-in | Check-in with token | PARTIAL |
| Pricing | Calculation | Capacity pricing | DONE (not used) |
| Pricing | Calculation | Exclusive pricing | DONE |
| Pricing | Discount | Multi-guest discount | DONE (not used) |
| Pricing | Discount | Hourly discount | DONE (not used) |
| Pricing | Commission | Configurable commission | DONE (not used) |
| Pricing | Fee | Paystack fee | MISSING |
| Billing | Payment | Initialize transaction | DONE |
| Billing | Payment | Process webhook | DONE |
| Billing | Escrow | Release escrow | DONE |
| Billing | Refund | Process refund | DONE |
| Billing | Receipt | Generate receipt | MISSING |
| Communication | Notifications | Send notifications | DONE |
| Communication | Notifications | Notification preferences | PARTIAL |
| Communication | Messaging | Send messages | DONE |
| Communication | Messaging | Conversations | DONE |
| Trust | Reviews | Submit review | DONE |
| Trust | Reviews | Host response | DONE |
| Trust | Disputes | File dispute | DONE |
| Trust | Disputes | Submit evidence | DONE |
| Admin | Review | Approve/reject listing | DONE |
| Admin | Review | Approve/reject verification | DONE |
| Admin | Users | Manage users | DONE |
| Admin | Audit | View audit trail | MISSING |
| Admin | Monitoring | System health | DONE |
| Search | Discovery | Full-text search | DONE |
| Search | Discovery | Proximity search | DONE |
| Search | Discovery | Autocomplete | DONE |

## 18.4 Requirements Traceability Matrix

| # | Requirement | Spec | Domain | Feature | API | UI | Test | Status |
|---|-------------|------|--------|---------|-----|-----|------|--------|
| 1 | One role per account | §2 | IAM | Role Selection | /auth/complete-profile | Complete Profile | Sign up test | DONE |
| 2 | One listing per venue host | §4 | Inventory | Create Listing | /listings (POST) | New Listing | Create 2nd test | DONE |
| 3 | Venue booking modes | §8 | Booking | Capacity/Exclusive | /reserve | Checkout | Mode selection | DONE |
| 4 | Capacity calculation | §9 | Time | Availability Check | check_time_availability | Slots | Overlap test | DONE |
| 5 | Configurable pricing | §15 | Pricing | Pricing Engine | computeCapacityPriceKobo | Checkout | Rate test | PARTIAL |
| 6 | Paystack fees | §17 | Billing | Fee Calculation | — | Checkout | Fee test | MISSING |
| 7 | Multi-guest discount | §20 | Pricing | Guest Discount | computeMultiGuestDiscount | Checkout | Discount test | PARTIAL |
| 8 | Atomic booking | §28 | Booking | Atomic Hold | create_hold | Checkout | Race test | DONE |
| 9 | Idempotency | §30 | Booking | Idempotency | UNIQUE constraint | — | Double submit | DONE |
| 10 | Receipt | §32 | Billing | Receipt Generation | — | Booking Detail | Receipt test | MISSING |
| 11 | Shortlet Host | §38 | Provider | Role Selection | /auth/complete-profile | Complete Profile | Shortlet test | BROKEN |
| 12 | Viewing workflow | §42 | Housing | View Request | /viewings | Listing Detail | Viewing test | PARTIAL |
| 13 | Auth enforcement | §51 | IAM | Route Protection | middleware.ts | All pages | Unauth test | MISSING |
| 14 | Route protection | §62 | IAM | Middleware Auth | middleware.ts | Sidebar | URL test | MISSING |

## 18.5 Missing Requirements Summary

| # | Requirement | Priority | Impact |
|---|-------------|----------|--------|
| 1 | Venue Host listing type switch | CRITICAL | Affects one-listing constraint |
| 2 | Max booking duration | HIGH | Affects availability, pricing |
| 3 | Guest multiple active bookings | HIGH | Affects concurrency |
| 4 | Suspended listing effect on bookings | HIGH | Affects booking state machine |
| 5 | Dispute resolution SLA | MEDIUM | Affects dispute workflow |
| 6 | Host cancellation penalty | MEDIUM | Affects refund logic |
| 7 | Payment webhook after expiry | MEDIUM | Affects webhook handler |
| 8 | Group booking partial refund | MEDIUM | Affects refund logic |
| 9 | Shortlet Host property limit | LOW | Affects listing creation |
| 10 | Host guest rejection | LOW | Affects booking flow |

## 18.6 Open Architectural Questions

| # | Question | Impact | Recommended Decision |
|---|----------|--------|---------------------|
| 1 | Should venue-spend be tracked as a wallet? | Pricing domain | NO — keep as display-only benefit |
| 2 | Should `under_review` listing status be used? | Listing state machine | YES — add to state machine |
| 3 | Should WhatsApp bot use Gemini or simpler rules? | Communication | Keep Gemini for now |
| 4 | Should notifications include email channel? | Communication | YES, but not MVP |
| 5 | Should analytics use materialized views? | Performance | YES — already implemented |

## 18.7 Architecture Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Paystack outage during peak | Medium | High | Retry logic, cron job for expired bookings |
| Supabase connection limits | Low | High | Connection pooling, read replicas |
| Double-booking race condition | Low | Critical | Exclusion constraints + atomic operations |
| Price inconsistency across routes | High | High | Single pricing engine path |
| Missing server-side auth | High | Critical | Middleware auth enforcement |
| Status enum mismatch | Medium | High | Align JS and SQL enums |

## 18.8 Implementation Roadmap

```
PHASE A: Foundation (Week 1)
├── Fix all 10 critical bugs (PDSS Part 1)
├── Fix shortlet_host routing
├── Fix pricing engine integration
├── Add middleware auth enforcement
└── Remove debug route

PHASE B: Core Features (Week 2-3)
├── Complete pricing engine integration
├── Paystack fee calculation
├── Receipt generation
├── Full pricing snapshot
├── Booking state machine alignment
└── Atomic exclusive locks

PHASE C: Host Experience (Week 3-4)
├── Host Calendar page
├── Host Reviews page
├── Host Earnings page
├── Host Notifications page
├── Host Settings page
├── Update HostSidebar
└── Shortlet Host sidebar variant

PHASE D: Housing & Viewing (Week 4-5)
├── Housing monthly pricing
├── Lease duration options
├── Viewing workflow UI
├── Viewing fee handling
├── My Properties page
└── Add Property page

PHASE E: Admin & Safety (Week 5-6)
├── Admin audit trail view
├── Notification preferences UI
├── Automatic suspension
├── Suspension with reason
├── Group booking share view
├── Check-in token system
└── Dashboard per listing type

PHASE F: Polish (Week 6-7)
├── Pricing breakdown at checkout
├── Venue-spend display
├── Error pages
├── Mobile responsive audit
├── Remove dead code
├── Consolidate DB access
├── Standardize responses
└── Full test suite
```

---

# APPENDIX: CHANGE IMPACT MAP

When a requirement changes, what else must be revisited:

| Changed Requirement | Must Revisit |
|--------------------|--------------|
| Booking state machine | State transitions, webhook handler, notification triggers, UI status display |
| Pricing formula | Pricing engine, reserve route, bookings route, checkout page, receipts |
| Listing status lifecycle | Listing API, admin review, host UI, search indexing |
| Payment flow | Webhook handler, escrow release, refund logic, payment records |
| Auth model | Middleware, role gate, route protection, complete-profile |
| User roles | Complete profile, role selection, host layout, sidebar |
| Availability model | Time engine, calendar UI, slot generation, blocked dates |
| Notification events | Notification service, all routes that send notifications |
