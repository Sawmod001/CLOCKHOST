# ClockHost PDSS — Part 3: Phases 8-12
## Requirements Interrogation, Traceability, Domain Interaction, Architecture

---

# PHASE 8 — REQUIREMENTS INTERROGATION

## 8.1 CRITICAL Questions (Must resolve before implementation)

### Q1: What happens when a Venue Host wants to switch from Venue to Outdoor Space?
**Why it matters:** The one-listing-per-host constraint means they must delete their venue listing first. But what about existing bookings?
- **Option A:** Block the switch entirely until all bookings complete
- **Option B:** Allow switch but archive old listing, preserve booking history
- **Option C:** Allow switching only if no active bookings exist
- **Impact:** Affects listing lifecycle, one-listing constraint, booking data retention

### Q2: What is the maximum booking duration for Venue bookings?
**Why it matters:** Affects availability checking, slot generation, pricing.
- If max is 8 hours, a guest cannot book 9 PM - 6 AM (9 hours)
- If max is 12 hours,午夜 crossing becomes complex
- **Impact:** Affects Time Engine, slot generation, pricing calculation

### Q3: Can a guest have multiple active bookings simultaneously?
**Why it matters:** Affects concurrency, capacity management, user experience.
- A guest could book Venue A from 6-8 PM and Venue B from 7-9 PM (overlap is OK since different venues)
- A guest could book Venue A from 6-8 PM AND 7-9 PM at the same venue (overlap is NOT OK)
- **Impact:** Affects booking validation, guest-level constraints

### Q4: What happens to bookings when a listing is suspended by admin?
**Why it matters:** Affects booking state machine, refund policy, user trust.
- **Option A:** All active bookings auto-cancelled with full refund
- **Option B:** Active bookings remain until completion, no new bookings
- **Option C:** Admin decides per-booking
- **Impact:** Affects booking state machine, refund logic, notification

### Q5: What happens to bookings when a host deletes their listing?
**Why it matters:** Similar to Q4 but initiated by host.
- Listings with active bookings should probably not be deletable
- **Impact:** Affects listing deletion, booking integrity

### Q6: What is the dispute resolution SLA?
**Why it matters:** Affects dispute workflow, notifications, admin operations.
- How long does admin have to resolve?
- What happens if admin doesn't respond?
- Can parties escalate?
- **Impact:** Affects dispute state machine, notification triggers

## 8.2 HIGH Questions (Should resolve before Sprint 5)

### Q7: Can a Host cancel a confirmed booking?
**Why it matters:** The spec says host can cancel confirmed bookings, but what about refund implications?
- Does host pay cancellation penalty?
- Is there a cancellation window?
- How does this affect escrow release?
- **Impact:** Affects cancellation rules, refund logic, host reputation

### Q8: What happens when a payment webhook arrives after booking expiry?
**Why it matters:** The 15-minute payment window may expire while webhook is in transit.
- **Option A:** Reject payment (booking already expired)
- **Option B:** Accept payment and re-activate booking
- **Impact:** Affects webhook handler, booking state machine

### Q9: How are partial refunds handled for group bookings?
**Why it matters:** Group plans have multiple payers. If one cancels, how does refund work?
- Does the cancelling member get their share back?
- Does the group plan continue with fewer members?
- **Impact:** Affects group booking cancellation, refund logic

### Q10: What is the maximum number of properties a Shortlet Host can manage?
**Why it matters:** Affects listing creation, database constraints, UI.
- Is there a cap? 10? 50? Unlimited?
- **Impact:** Affects listing creation validation

### Q11: Can a Host reject a guest based on past behavior?
**Why it matters:** Affects booking flow, host autonomy, discrimination concerns.
- Can host see guest's review history?
- Can host refuse specific guests?
- **Impact:** Affects booking approval, privacy, fairness

## 8.3 MEDIUM Questions (Resolve before Sprint 8)

### Q12: Is there a cap on listing photos?
**Why it matters:** Affects storage costs, UI, upload validation.
- 10 photos? 20? Unlimited?
- **Impact:** Affects upload validation, storage architecture

### Q13: What happens when a host account is suspended mid-booking?
**Why it matters:** Affects booking state machine, guest experience.
- Do active bookings continue?
- Does escrow get released?
- **Impact:** Affects suspension logic, booking integrity

### Q14: What is the "Under Review" listing status for?
**Why it matters:** The CHECK constraint has `under_review` but it's never used.
- Is it for admin queue management?
- Should it replace `submitted`?
- **Impact:** Affects listing state machine

### Q15: What happens when the Paystack fee cap changes?
**Why it matters:** Currently hardcoded at ₦2,000 cap.
- Should it be configurable?
- Where should configuration live?
- **Impact:** Affects pricing engine, configuration management

## 8.4 LOW Questions (Nice to clarify)

### Q16: Should the WhatsApp bot be accessible to all users or only guests?
### Q17: Should listing views be counted for analytics or also for ranking?
### Q18: Can a host respond to a review after a guest has already responded?
### Q19: Should notification preferences affect email notifications or just in-app?
### Q20: What languages should the error messages support?

---

# PHASE 9 — REQUIREMENTS TRACEABILITY

## 9.1 Traceability Matrix: Critical Features

| Requirement | Domain | Capability | Feature | Business Rule | Workflow | Data | API | UI | Test |
|-------------|--------|-----------|---------|---------------|----------|------|-----|-----|------|
| §2 One role per account | IAM | Role Mgmt | Role Selection | No multi-role | Complete Profile | users.role | POST /auth/complete-profile | Complete Profile page | Sign up as each role |
| §4 One listing per venue host | Inventory | Listing Mgmt | Create Listing | DB trigger enforcement | Create Listing | listings.provider_profile_id | POST /listings | New Listing form | Try create 2nd listing |
| §8 Venue booking modes | Booking | Reservation | Capacity/Exclusive | Mode selection | Booking flow | listings.booking_type | POST /reserve | Checkout page | Book capacity vs exclusive |
| §9 Capacity calculation | Time | Availability | Capacity Check | Max - booked = remaining | Reserve | slots.booked, slots.capacity | check_time_availability | Checkout slots | Book overlapping slots |
| §15 Configurable pricing | Pricing | Price Calc | Pricing Engine | rate x headcount x hours | Reserve/Book | listings.pricing | computeCapacityPriceKobo | Checkout total | Different rates per listing |
| §17 Paystack fees | Billing | Payment | Fee Calculation | 1.5% + ₦100, cap ₦2,000 | Pay | payment_records | computePaystackFee | Checkout breakdown | Various amounts |
| §20 Multi-guest discount | Pricing | Discount | Guest Discount | Starts at 2 guests | Reserve | listings.pricing | computeMultiGuestDiscount | Checkout breakdown | 1, 2, 5 guests |
| §28 Atomic booking | Booking | Reservation | Atomic Hold | No race conditions | Reserve/Book | soft_holds | create_hold RPC | Checkout error | Concurrent bookings |
| §30 Idempotency | Booking | Reservation | Idempotency | Same key = same result | Book | bookings.idempotency_key | UNIQUE constraint | N/A | Double submit |
| §32 Receipt | Billing | Evidence | Receipt Generation | Server-generated | Payment | documents | generate_receipt | Booking detail | View receipt |
| §38 Shortlet Host | Provider | Onboarding | Role Selection | Housing Agent/Owner | Complete Profile | provider_profiles | POST /auth/complete-profile | Complete Profile | Sign up as shortlet |
| §42 Viewing workflow | Housing | Viewing | View Request | Separate from booking | Request Viewing | viewings | POST /viewings | Listing detail | Request, pay, view |
| §51 Auth enforcement | IAM | Security | Route Protection | Server-side check | All protected routes | sessions | middleware.ts | All pages | Unauth access |
| §62 Route protection | IAM | Security | Middleware Auth | Protected paths | Navigation | — | middleware.ts | Sidebar links | Direct URL access |

## 9.2 Traceability Matrix: State Machines

| State Machine | States | Transitions | Side Effects | Owner |
|---------------|--------|-------------|--------------|-------|
| Booking | 12 states | 20+ transitions | Capacity release, refund, notification, escrow | Booking Engine |
| Listing | 6 states | 7 transitions | Notification, search index update | Space Inventory |
| Payment | 6 states | 6 transitions | Booking state update, escrow | Pricing & Billing |
| Verification | 4 states | 5 transitions | Notification, provider status | Provider Management |

---

# PHASE 10 — DOMAIN INTERACTION MODEL (Context Map)

## 10.1 Synchronous Interactions

```
┌──────────┐  GET /api/listings/[id]  ┌──────────────┐
│  Guest   │─────────────────────────▶│Space Inventory│
│  Browser │◀─────────────────────────│              │
└──────────┘  Listing data            └──────────────┘

┌──────────┐  POST /api/soft-holds    ┌──────────────┐
│  Guest   │─────────────────────────▶│    Time      │
│  Browser │◀─────────────────────────│   Engine     │
└──────────┘  Hold confirmation       └──────────────┘

┌──────────┐  POST /api/bookings      ┌──────────────┐
│  Guest   │─────────────────────────▶│   Booking    │
│  Browser │◀─────────────────────────│   Engine     │
└──────────┘  Booking created         └──────┬───────┘
                                             │
                                    calls pricing
                                             │
                                      ┌──────▼───────┐
                                      │   Pricing    │
                                      │   Engine     │
                                      └──────────────┘

┌──────────┐  POST /api/payments/     ┌──────────────┐
│  Guest   │      initiate            │  Paystack    │
│  Browser │─────────────────────────▶│  (External)  │
└──────────┘◀─────────────────────────│              │
           │  Authorization URL       └──────────────┘
```

## 10.2 Asynchronous Interactions

```
┌──────────────┐  Webhook  ┌──────────────┐
│   Paystack   │──────────▶│   Pricing    │
│  (External)  │           │   & Billing  │
└──────────────┘           └──────┬───────┘
                                  │
                         updates booking
                                  │
                           ┌──────▼───────┐
                           │   Booking    │
                           │   Engine     │
                           └──────┬───────┘
                                  │
                        sends notification
                                  │
                           ┌──────▼───────┐
                           │Communication │
                           └──────────────┘
```

## 10.3 Data Ownership Map

| Data Object | Owner Context | Readers | Copies |
|-------------|---------------|---------|--------|
| users | IAM | All (via user ID) | None |
| provider_profiles | Provider Mgmt | Space Inventory, Booking Engine | None |
| listings | Space Inventory | Time Engine, Booking Engine, Search | listing_views (analytics) |
| availability_rules | Time Engine | Booking Engine | None |
| blocked_dates | Time Engine | Booking Engine | None |
| slots | Time Engine | Booking Engine | None |
| bookings | Booking Engine | Pricing, Communication, Trust | booking_transitions (audit) |
| payment_records | Pricing & Billing | Booking Engine, Admin | None |
| reviews | Trust & Safety | Space Inventory (display) | None |
| notifications | Communication | User (read) | None |
| audit_logs | Admin Operations | Admin (view only) | None |

---

# PHASE 11 — TECHNICAL ARCHITECTURE

## 11.1 Architecture Overview

**Pattern:** Modular Monolith (Next.js App Router)
**Rationale:** Single deployment, shared database, clear module boundaries without microservice overhead.

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    PRESENTATION LAYER                     │   │
│  │  Pages (App Router)  │  Components  │  API Routes        │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │                   APPLICATION LAYER                       │   │
│  │  Auth Helpers  │  Validation  │  Rate Limiting  │ CSRF   │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │                     DOMAIN LAYER                          │   │
│  │  Pricing Engine │ State Machine │ Time Engine │ Notifier  │   │
│  └──────────────────────────┬───────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────▼───────────────────────────────┐   │
│  │                  INFRASTRUCTURE LAYER                     │   │
│  │  Supabase Client │ Paystack │ Clerk │ Storage │ Audit    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 11.2 Frontend Architecture

```
src/app/
├── (auth)/                    # Authentication flows
│   ├── sign-in/
│   ├── sign-up/
│   └── complete-profile/
├── (host)/                    # Host flows (role-gated)
│   ├── host/
│   │   ├── dashboard/         # Host dashboard
│   │   ├── listings/          # Venue/Outdoor listing management
│   │   ├── bookings/          # Booking inbox
│   │   ├── calendar/          # Availability calendar
│   │   ├── reviews/           # Review management
│   │   ├── earnings/          # Earnings dashboard
│   │   ├── notifications/     # Notification center
│   │   ├── settings/          # Host settings
│   │   └── verification/      # Provider verification
│   └── properties/            # Shortlet Host property management
│       ├── new/
│       └── [id]/
├── (admin)/                   # Admin flows (admin-gated)
│   ├── admin/
│   │   ├── listings/pending/
│   │   ├── listings/active/
│   │   ├── verifications/
│   │   ├── users/
│   │   ├── disputes/
│   │   ├── audit/
│   │   └── monitoring/
├── (public)/                  # Public flows (no auth required)
│   ├── listings/              # Browse listings
│   │   └── [id]/              # Listing detail
│   │       ├── checkout/
│   │       └── exclusive-request/
│   ├── group-plans/           # Group booking
│   └── bookings/[id]/         # Booking detail + payment
├── dashboard/                 # Guest dashboard
├── profile/                   # Guest profile
└── middleware.ts              # Security + auth enforcement
```

## 11.3 Backend Architecture

```
src/lib/
├── auth/                      # Authentication infrastructure
│   ├── clerk.ts               # Clerk API client
│   ├── getSessionUser.ts      # Parse session token
│   ├── getUser.ts             # Fetch user from DB
│   ├── helpers.ts             # requireAuthenticatedUser, requireHost, requireAdmin
│   └── redirect.ts            # Role-based redirect logic
├── bookings/                  # Domain: Booking Engine
│   ├── state-machine.ts       # Booking state transitions
│   ├── pricing.ts             # Pricing calculations
│   ├── exclusive.ts           # Exclusive lock resolution
│   └── group-booking.ts       # Group plan management
├── db/                        # Infrastructure: Database
│   ├── connection.ts          # pg Pool connection
│   ├── supabase.ts            # Supabase client
│   ├── supabase-admin.ts      # Service-role client
│   ├── supabase-queries.ts    # Reusable query functions
│   ├── supabase-utils.ts      # ok(), fail(), toCamelCase()
│   └── audit.ts               # Audit logging
├── payments/                  # Infrastructure: Payments
│   ├── paystack.ts            # Paystack API client
│   └── verifyWebhookSignature.ts
├── pricing/                   # Domain: Pricing (housing)
│   └── housing.ts             # Housing-specific pricing
├── notifications.ts           # Domain: Communication (notifications)
├── validation.ts              # Application: Schema validation
├── csrf.ts                    # Application: CSRF protection
├── rate-limit.ts              # Application: Rate limiting
├── security.ts                # Application: Security headers
├── webhooks.ts                # Infrastructure: Webhook processing
├── cache.ts                   # Infrastructure: Caching
├── monitoring.ts              # Infrastructure: Monitoring
├── performance.ts             # Infrastructure: Performance
└── audit.ts                   # LEGACY — remove (use db/audit.ts)
```

## 11.4 API Architecture

### Pattern
- All routes use `ok()` / `fail()` response helpers
- All mutations validate CSRF via `validateCsrfOrigin()`
- All routes use `requireAuthenticatedUser()` / `requireHost()` / `requireAdmin()`
- Rate limiting via `checkRateLimit()`
- Audit logging via `logAudit()`

### Route Groups

| Group | Prefix | Auth Required | Role Required |
|-------|--------|---------------|---------------|
| Auth | /api/auth/* | Varies | None |
| Bookings | /api/bookings/* | Yes | Guest/Host |
| Listings | /api/listings/* | Varies | Varies |
| Payments | /api/payments/* | Yes | Guest |
| Admin | /api/admin/* | Yes | Admin |
| Notifications | /api/notifications/* | Yes | Any |
| Settings | /api/settings/* | Yes | Any |
| Housing | /api/housing/* | Yes | Guest |
| Viewings | /api/viewings/* | Yes | Guest/Host |
| Analytics | /api/analytics/* | Yes | Host/Admin |
| Search | /api/search | No | None |
| Health | /api/health | No | None |

## 11.5 Database Architecture

### Table Ownership by Domain

| Domain | Tables | Row Count Est. |
|--------|--------|---------------|
| IAM | users | ~10K |
| Provider Mgmt | provider_profiles, provider_verifications | ~1K |
| Space Inventory | listings, listing_media | ~500 |
| Time Engine | availability_rules, availability_exceptions, blocked_dates, slots | ~10K |
| Booking Engine | bookings, booking_transitions, soft_holds, exclusive_locks, group_plans, plan_members | ~50K |
| Pricing & Billing | payment_records, refund_records, escrow_releases, documents | ~50K |
| Communication | notifications, notification_preferences, conversations, messages, contact_access | ~100K |
| Trust & Safety | reviews, disputes, dispute_evidence, reports, content_flags, blocked_users | ~10K |
| Admin | audit_logs, system_health, error_logs, uptime_checks, request_metrics | ~500K |
| Analytics | search_analytics, listing_views | ~200K |
| Supporting | calendar_subscriptions, export_jobs, api_keys, api_usage, webhook_endpoints, webhook_events, webhook_deliveries, whatsapp_sessions, data_retention_policies, audit_archive | ~10K |

### Key Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| bookings | idx_bookings_guest_id | Guest booking lookup |
| bookings | idx_bookings_host_id | Host booking lookup |
| bookings | idx_bookings_status | Status filtering |
| bookings | idx_bookings_expires_at | Expiry cron job |
| listings | idx_one_listing_per_provider | One listing constraint |
| slots | no_overlapping_slots | Exclusion constraint |
| bookings | no_overlapping_exclusive_bookings | Exclusion constraint |
| processed_webhooks | processed_webhooks_gateway_transaction_ref_key | Idempotency |

## 11.6 Middleware Architecture

```
Request
  │
  ▼
┌─────────────────────────────┐
│ 1. Security Headers         │  CSP, X-Frame-Options, etc.
│ 2. Threat Detection         │  URL/query param scanning
│ 3. CSRF Origin Check        │  Origin/Referer validation
│ 4. Route Auth (NEW)         │  Clerk session validation
│ 5. Onboarding State (NEW)   │  Profile completion check
│ 6. Role Gate (NEW)          │  Role-based access control
└─────────────────────────────┘
  │
  ▼
Route Handler
```

## 11.7 Event Architecture

**Pattern:** In-process event emission (not message queue)

| Event | Trigger | Consumers |
|-------|---------|-----------|
| booking.created | Booking creation | Notification (host) |
| booking.approved | Host approval | Notification (guest) |
| booking.confirmed | Payment confirmed | Notification (guest + host), Escrow |
| booking.cancelled | Cancellation | Notification (other party), Capacity release |
| booking.completed | Host marks complete | Escrow release, Review prompt |
| listing.submitted | Host submits | Notification (admin) |
| listing.approved | Admin approves | Notification (host) |
| listing.rejected | Admin rejects | Notification (host) |
| payment.confirmed | Webhook | Booking state update, Notification |
| review.submitted | Guest reviews | Notification (host) |

---

# PHASE 12 — ARCHITECTURE TRACEABILITY

## 12.1 Why Does Each Component Exist?

| Component | Business Requirement | Domain Responsibility | Technical Responsibility |
|-----------|---------------------|----------------------|------------------------|
| pricing.ts | §15 Configurable pricing | Pricing Engine calculates prices | Single source of truth for price calculation |
| state-machine.ts | §28 Booking state machine | Booking Engine manages lifecycle | Enforce valid transitions, trigger side effects |
| notifications.ts | §76 Central notifications | Communication delivers messages | In-app notification creation and delivery |
| helpers.ts | §51 Auth + Authz | IAM enforces access | Guard functions for route protection |
| csrf.ts | §62 CSRF protection | IAM protects mutations | Origin/Referer validation |
| middleware.ts | §62 Route protection | IAM protects routes | Server-side auth enforcement |
| supabase-queries.ts | §54 DB constraints | Infrastructure layer | Reusable database operations |
| audit.ts | §50 Audit logging | Admin Operations records actions | Immutable audit trail |
| paystack.ts | §17 Payment processing | Pricing & Billing handles money | Paystack API integration |
| validation.ts | §63 Form validation | Application layer | Schema-based input validation |
| rate-limit.ts | §71 Concurrency | Application layer | API rate limiting |

## 12.2 Architecture Decisions Summary

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Modular Monolith | Single deployment, shared DB, clear boundaries | Microservices (overkill for current scale) |
| Next.js App Router | Server components, middleware, API routes in one framework | Express + React (more complex) |
| Supabase (pg pool) | Direct SQL control, RLS, PostGIS | Prisma (less control), raw pg only (more work) |
| Clerk auth | JWT-based, session management, metadata | NextAuth (less mature), Supabase Auth (RLS coupling) |
| Paystack | Nigerian market leader, split payments, webhooks | Flutterwave (less mature API), Stripe (limited NG) |
| In-process events | Simple, no infrastructure overhead | RabbitMQ/Kafka (overkill for current scale) |
| Server-generated receipts | Security, accuracy, no client manipulation | Client-generated (insecure) |
| Kobo for all money | Integer arithmetic, no floating-point errors | Naira with decimals (floating-point issues) |
