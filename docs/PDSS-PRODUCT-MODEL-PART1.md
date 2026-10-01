# ClockHost — Product Domain Intelligence & System Modeling Protocol
## The Authoritative Product Model | Version 1.0

> **Protocol:** 18-Phase Product Domain Intelligence & System Modeling
> **Product:** ClockHost — Nigerian marketplace for venue booking and rental housing
> **Date:** 2026-08-28
> **Status:** COMPLETE PRODUCT MODEL

---

# PHASE 0 — PRODUCT UNDERSTANDING

## 0.1 Product Purpose

ClockHost is a two-sided marketplace connecting **space providers** (venue hosts, outdoor space hosts, shortlet apartment hosts) with **space consumers** (guests seeking venues for events, outdoor spaces for gatherings, or short-term apartment rentals). The platform handles discovery, booking, payment, and post-transaction management.

**Core value proposition:** One account, two roles — discover, book, and manage trusted spaces and stays in Nigeria.

## 0.2 Problems Being Solved

| Problem | For Whom | How ClockHost Solves It |
|---------|----------|------------------------|
| Finding event venues is opaque | Guests | Structured listing with photos, pricing, availability |
| No trustworthy booking system | Guests, Hosts | Server-verified payments, booking state machine |
| Hosts cannot manage availability | Hosts | Calendar, availability rules, blocked dates |
| No secure payment escrow | Both | Paystack integration with escrow model |
| Housing viewings are risky | Guests | Viewing workflow with contact release after payment |
| Group bookings are chaotic | Guests | Group plans with single payer, shared cost |
| No accountability | Both | Reviews, verification, disputes, audit trail |
| Platform trust deficit | Both | Provider verification, listing approval, admin oversight |

## 0.3 Users and Roles

| Role | Count | Purpose |
|------|-------|---------|
| Guest | Many | Browse, book, pay, review |
| Venue Host | Many (1 listing each) | Manage physical venue (capacity + exclusive booking) |
| Shortlet Host — Housing Agent | Many (multiple properties) | Manage rental properties on behalf of owners |
| Shortlet Host — Property Owner | Many (multiple properties) | Manage own rental properties |
| Admin | Few | Platform oversight, listing approval, dispute resolution |

**RULE:** One account = one role. No multi-role architecture.

## 0.4 Business Domains (High Level)

1. **Identity & Access** — Signup, login, profile, role management
2. **Provider Management** — Host onboarding, verification, listing lifecycle
3. **Space Inventory** — Venue listings, outdoor space listings, housing listings
4. **Availability & Time** — Schedules, time slots, blocked dates, special dates
5. **Booking** — Reservation, state machine, group plans, check-in
6. **Pricing & Payments** — Pricing engine, Paystack integration, escrow, refunds
7. **Communication** — Messaging, notifications, contact release
8. **Trust & Safety** — Reviews, disputes, reports, suspension, audit
9. **Admin Operations** — Listing review, verification review, user management, monitoring
10. **Analytics & Reporting** — Revenue, performance, search analytics

## 0.5 External Systems

| System | Purpose | Integration Type |
|--------|---------|-----------------|
| Paystack | Payment processing, splits, refunds | REST API + Webhooks |
| Clerk | Authentication (JWT, session management) | REST API |
| Supabase | PostgreSQL database, PostGIS, RLS | Direct pg + JS client |
| Vercel | Deployment, hosting | Git-based CI/CD |
| WhatsApp (via Gemini) | AI chatbot for discovery | Webhook |
| Google Maps / Geocoding | Location services | Client-side |

## 0.6 Important Terminology

| Term | Meaning | Context |
|------|---------|---------|
| Listing | A bookable space (venue, outdoor space, or housing property) | Inventory domain |
| Venue | Indoor space for events, entertainment | Venue Host domain |
| Outdoor Space | Open area for parties, gatherings | Venue Host domain |
| Housing/Shortlet | Apartment for short-term rental | Shortlet Host domain |
| Slot | A specific time window available for booking | Availability domain |
| Exclusive Lock | Reservation of entire space for a time period | Booking domain |
| Soft Hold | Temporary reservation of capacity (expires in minutes) | Booking domain |
| Venue Spend | Pre-included amount guest can spend at venue (not tracked) | Pricing domain |
| Capacity Booking | Per-person reservation within a venue | Booking domain |
| Exclusive Booking | Entire venue reservation for private use | Booking domain |
| Housing Booking | Monthly rental reservation | Booking domain |
| Provider Profile | Host's business profile (one per user) | Identity domain |
| Vertical | Listing category (venue, housing, outdoor) — DO NOT use in UI | Internal |
| Sub-vertical | Venue sub-type (birthday, karaoke, etc.) | Internal |

## 0.7 Assumptions

1. Nigeria is the primary market (Naira, Africa/Lagos timezone)
2. All payment processing through Paystack
3. Clerk is the sole authentication provider
4. Single-tenant deployment (one ClockHost instance)
5. Supabase is the sole database provider
6. No multi-language support needed yet
7. No mobile app — responsive web only
8. No real-time chat — async messaging only

## 0.8 Unknowns

1. What is the expected scale? (users, bookings per day)
2. What is the revenue model beyond commission? (subscription? featured listings?)
3. Is there a dispute resolution SLA?
4. What happens when a host wants to change from Venue to Outdoor Space?
5. Can a guest have multiple active bookings at the same time?
6. What is the maximum number of properties a Shortlet Host can manage?
7. Is there a cap on listing photos?
8. What happens to bookings when a listing is suspended?

## 0.9 Ambiguities

1. **"Venue spend entitlement"** — The spec says "NOT tracked by ClockHost" but the pricing engine has `venue_spend_entitlement` in the snapshot. Is it tracked or not?
2. **"Housing Agent vs Property Owner"** — The spec says different verification requirements but doesn't specify what each requires.
3. **"Outdoor Space time periods"** — Are Morning/Afternoon/Evening fixed time ranges or host-configurable?
4. **"Automatic suspension thresholds"** — What specific thresholds? 3 cancellations in 30 days? What about false positives?
5. **"Receipt as PDF"** — The spec says "receipt/booking evidence" but doesn't specify format (PDF, HTML, JSON).

## 0.10 Contradictions

1. **§16 vs Pricing Engine:** Spec says venue-spend is "NOT tracked" but pricing engine computes a venue-spend discount. These are different concepts — the discount is a loyalty mechanism, not the entitlement itself.
2. **§28 booking states vs actual DB states:** The spec defines `draft → pending_payment → payment_processing → confirmed` but the DB has `pending_approval → awaiting_payment → payment_processing → confirmed`. The `pending_approval` state is for host approval before payment.
3. **§47 listing status:** Spec says `draft → submitted → under_review → approved → rejected` but the actual flow is `draft → submitted → approved/rejected`. The `under_review` state exists in the CHECK constraint but is never used.

## 0.11 Missing Requirements

1. What happens when a host deletes a listing with active bookings?
2. What is the maximum booking duration?
3. Can a guest book the same venue twice for overlapping times?
4. What happens when payment webhook arrives after booking expiry?
5. How are partial refunds handled for group bookings?
6. What is the maximum group size for group plans?
7. Can a host reject a guest based on past behavior?
8. What happens when a host account is suspended mid-booking?

---

# PHASE 1 — DOMAIN DISCOVERY

## 1.1 Core Domains

These are the primary business capabilities that define ClockHost's value.

### Domain 1: Identity & Access Management (IAM)
- **Purpose:** Manage who can do what on the platform
- **Scope:** Signup, login, session, profile, role assignment, onboarding
- **Owns:** Users, sessions, roles, profile completion state
- **Does NOT do:** Business logic, payments, bookings

### Domain 2: Provider Management
- **Purpose:** Onboard, verify, and manage space providers
- **Scope:** Provider profiles, verification documents, business types, suspension
- **Owns:** Provider profiles, provider verifications, verification status
- **Does NOT do:** Listing management (that's Inventory), payments (that's Billing)

### Domain 3: Space Inventory
- **Purpose:** Represent and manage bookable spaces
- **Scope:** Listings (venue, outdoor, housing), listing media, listing lifecycle, listing approval
- **Owns:** Listings, listing media, listing status, structured descriptions
- **Does NOT do:** Availability (that's Time Engine), pricing calculations (that's Pricing)

### Domain 4: Time Engine
- **Purpose:** Model availability, schedules, and time-based constraints
- **Scope:** Availability rules, availability exceptions, blocked dates, special dates, time slots
- **Owns:** Availability rules, availability exceptions, blocked dates, slots
- **Does NOT do:** Booking logic, pricing

### Domain 5: Booking Engine
- **Purpose:** Manage the reservation lifecycle from request to completion
- **Scope:** Booking creation, state machine, group plans, check-in, cancellation
- **Owns:** Bookings, booking transitions, soft holds, exclusive locks, group plans, plan members
- **Does NOT do:** Payment processing (that's Billing), availability checking (that's Time Engine)

### Domain 6: Pricing & Billing
- **Purpose:** Calculate prices, process payments, manage financial records
- **Scope:** Pricing engine, Paystack integration, escrow, refunds, receipts, commission
- **Owns:** Pricing calculations, payment records, refund records, escrow releases, receipts
- **Does NOT do:** Booking state management, availability

### Domain 7: Communication
- **Purpose:** Enable messaging and notifications between parties
- **Scope:** In-app messaging, notifications, notification preferences, contact release
- **Owns:** Conversations, messages, notifications, notification preferences
- **Does NOT do:** Booking logic, payment processing

### Domain 8: Trust & Safety
- **Purpose:** Maintain platform integrity and resolve conflicts
- **Scope:** Reviews, disputes, reports, content flags, blocking, automatic suspension
- **Owns:** Reviews, disputes, dispute evidence, reports, content flags, blocked users
- **Does NOT do:** Listing approval (that's Admin), booking management

### Domain 9: Admin Operations
- **Purpose:** Platform oversight and governance
- **Scope:** Listing review/approval, provider verification review, user management, audit trail, monitoring
- **Owns:** Admin actions, audit logs, monitoring data
- **Does NOT do:** Day-to-day booking management, payment processing

### Domain 10: Search & Discovery
- **Purpose:** Help guests find relevant spaces
- **Scope:** Full-text search, proximity search, filtering, autocomplete, search analytics
- **Owns:** Search queries, search analytics, listing views
- **Does NOT do:** Booking, pricing

## 1.2 Supporting Domains

| Domain | Purpose |
|--------|---------|
| Media Management | Upload, store, serve listing photos |
| Export | CSV/JSON export of bookings, revenue, reviews |
| Calendar Integration | iCal export for external calendar sync |
| Analytics | Revenue reports, host analytics, listing analytics |
| API Key Management | External API access for integrations |

## 1.3 Generic Domains

| Domain | Purpose |
|--------|---------|
| Caching | Response caching for performance |
| Rate Limiting | API rate limiting |
| Security Headers | CSP, CSRF, threat detection |
| Logging | Application logging, error tracking |

## 1.4 Bounded Context Map

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOCKHOST PLATFORM                        │
│                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   IAM    │───▶│   Provider   │───▶│ Space Inventory  │  │
│  │          │    │  Management  │    │                  │  │
│  └────┬─────┘    └──────┬───────┘    └────────┬─────────┘  │
│       │                 │                      │             │
│       │                 │                      │             │
│       ▼                 ▼                      ▼             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Time   │◀──▶│   Booking    │◀──▶│   Pricing &      │  │
│  │  Engine  │    │   Engine     │    │   Billing        │  │
│  └──────────┘    └──────┬───────┘    └──────────────────┘  │
│                         │                                    │
│       ┌─────────────────┼─────────────────┐                 │
│       ▼                 ▼                 ▼                 │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Trust   │    │ Communication│    │    Admin         │  │
│  │ & Safety │    │              │    │   Operations     │  │
│  └──────────┘    └──────────────┘    └──────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Search & Discovery                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 1.5 Integration Boundaries Between Contexts

| From | To | What Crosses | Direction |
|------|----|-------------|-----------|
| IAM | Provider Mgmt | User ID, role | Push |
| IAM | Booking Engine | Guest ID, authentication | Push |
| Provider Mgmt | Space Inventory | Provider profile ID | Push |
| Space Inventory | Time Engine | Listing ID | Bidirectional |
| Time Engine | Booking Engine | Availability check result | Push |
| Booking Engine | Pricing & Billing | Booking details, price request | Push |
| Pricing & Billing | Booking Engine | Price result, payment status | Push |
| Booking Engine | Communication | Booking events | Push |
| Booking Engine | Trust & Safety | Booking completion event | Push |
| Admin | Space Inventory | Approval/rejection decision | Push |
| Admin | Provider Mgmt | Verification decision | Push |
| All | Admin (Audit) | Action records | Push |

---

# PHASE 2 — SEMANTIC UNDERSTANDING (Ubiquitous Language Dictionary)

## 2.1 Booking-Related Terms

| Term | Definition | Context | Must NOT Confuse With |
|------|-----------|---------|----------------------|
| **Booking** | A confirmed reservation of space for a specific time period | Booking Engine | "Hold" (temporary), "Reservation" (informal) |
| **Soft Hold** | A temporary capacity reservation that expires in 10 minutes if not converted to booking | Booking Engine | "Booking" (permanent), "Exclusive Lock" (different mechanism) |
| **Exclusive Lock** | An atomic reservation of entire venue/space for a time period | Booking Engine | "Soft Hold" (capacity-specific), "Block" (host-initiated) |
| **Group Plan** | A collaborative booking where one person pays and others contribute | Booking Engine | "Group Booking" (same thing, but "Plan" emphasizes the planning phase) |
| **Booking State** | The current status of a booking in its lifecycle | Booking Engine | "Payment Status" (separate concern) |
| **Check-in** | The act of verifying arrival at the venue | Booking Engine | "Booking Confirmation" (different event) |

## 2.2 Space-Related Terms

| Term | Definition | Context | Must NOT Confuse With |
|------|-----------|---------|----------------------|
| **Venue** | An indoor physical space for events, entertainment | Inventory | "Outdoor Space", "Housing" |
| **Outdoor Space** | An open area for parties, gatherings, celebrations | Inventory | "Venue" (indoor), "Housing" |
| **Housing/Shortlet** | An apartment for short-term rental | Inventory | "Venue", "Outdoor Space" |
| **Listing** | Any bookable space registered on the platform | Inventory | "Property" (housing-specific term) |
| **Vertical** | The category of listing (venue, housing, outdoor) — internal term | Inventory | Never use in UI; use "Space Type" |
| **Sub-vertical** | Venue sub-type (birthday, karaoke, etc.) | Inventory | "Booking Type" |

## 2.3 Time-Related Terms

| Term | Definition | Context | Must NOT Confuse With |
|------|-----------|---------|----------------------|
| **Availability Rule** | A recurring schedule (e.g., Monday 5-11 PM) | Time Engine | "Availability Exception" (one-time override) |
| **Availability Exception** | A one-time override of the normal schedule | Time Engine | "Availability Rule" (recurring), "Blocked Date" |
| **Blocked Date** | A date when the space is unavailable | Time Engine | "Availability Exception" (exception can make unavailable OR available) |
| **Special Date** | A date with different hours/pricing than normal | Time Engine | "Availability Exception" (similar but implies different pricing) |
| **Slot** | A specific bookable time window | Time Engine | "Availability Rule" (recurring pattern) |
| **Time Period** | Customer-friendly label for time ranges (Morning, Evening) | Time Engine | "Time Slot" (specific datetime) |

## 2.4 Payment-Related Terms

| Term | Definition | Context | Must NOT Confuse With |
|------|-----------|---------|----------------------|
| **Venue Spend Entitlement** | Pre-included amount guest can spend at venue (NOT tracked, NOT refundable) | Pricing | "Discount" (different mechanism), "Wallet Balance" |
| **Commission** | Platform's share of the booking amount | Pricing | "Service Fee" (Paystack's fee), "Platform Fee" (same as commission) |
| **Escrow** | Payment held by platform until booking completion | Billing | "Pending Payment" (different state) |
| **Pricing Snapshot** | Immutable record of price at time of booking | Pricing | "Current Price" (may change) |
| **Service Fee** | Paystack's processing fee (1.5% + ₦100) | Billing | "Commission" (platform's share) |

---

# PHASE 3 — FEATURE DECOMPOSITION

## 3.1 Guest Booking Flow

```
Product: ClockHost
├── Domain: Booking
│   ├── Capability: Space Discovery
│   │   ├── Feature: Browse Listings
│   │   │   ├── Sub-feature: Filter by type, location, price
│   │   │   ├── Sub-feature: Proximity search
│   │   │   └── Sub-feature: View listing detail
│   │   ├── Feature: View Availability
│   │   │   ├── Sub-feature: Calendar view
│   │   │   ├── Sub-feature: Time slot selection
│   │   │   └── Sub-feature: Availability check
│   │   └── Feature: View Pricing
│   │       ├── Sub-feature: Base rate display
│   │       ├── Sub-feature: Discount preview
│   │       └── Sub-feature: Total calculation
│   │
│   ├── Capability: Reservation
│   │   ├── Feature: Capacity Booking
│   │   │   ├── Sub-feature: Select date/time
│   │   │   ├── Sub-feature: Select headcount
│   │   │   ├── Sub-feature: Select add-ons
│   │   │   ├── Sub-feature: Create soft hold
│   │   │   ├── Sub-feature: Convert to booking
│   │   │   └── Sub-feature: Checkout page
│   │   ├── Feature: Exclusive Booking
│   │   │   ├── Sub-feature: Select date/time
│   │   │   ├── Sub-feature: Request exclusive lock
│   │   │   ├── Sub-feature: Checkout page
│   │   │   └── Sub-feature: Wait for host approval (optional)
│   │   ├── Feature: Group Booking
│   │   │   ├── Sub-feature: Create group plan
│   │   │   ├── Sub-feature: Invite members
│   │   │   ├── Sub-feature: Member payment
│   │   │   └── Sub-feature: Finalize plan
│   │   └── Feature: Housing Booking
│   │       ├── Sub-feature: Select lease duration
│   │       ├── Sub-feature: Monthly pricing
│   │       ├── Sub-feature: Request viewing (optional)
│   │       └── Sub-feature: Pay viewing fee
│   │
│   ├── Capability: Payment
│   │   ├── Feature: Paystack Integration
│   │   │   ├── Sub-feature: Initialize transaction
│   │   │   ├── Sub-feature: Redirect to Paystack
│   │   │   ├── Sub-feature: Webhook confirmation
│   │   │   └── Sub-feature: Server-side verification
│   │   └── Feature: Receipt Generation
│   │       ├── Sub-feature: Server-generated receipt
│   │       ├── Sub-feature: Download/view
│   │       └── Sub-feature: Booking evidence
│   │
│   └── Capability: Post-Booking
│       ├── Feature: Manage Booking
│       │   ├── Sub-feature: View booking details
│       │   ├── Sub-feature: Cancel booking
│       │   └── Sub-feature: Request refund
│       ├── Feature: Check-in
│       │   ├── Sub-feature: View check-in token
│       │   ├── Sub-feature: Show token at venue
│       │   └── Sub-feature: Server verification
│       └── Feature: Review
│           ├── Sub-feature: Rate after completion
│           ├── Sub-feature: Write review
│           └── Sub-feature: View host response
```

## 3.2 Host Management Flow

```
Product: ClockHost
├── Domain: Provider Management
│   ├── Capability: Onboarding
│   │   ├── Feature: Complete Profile
│   │   │   ├── Sub-feature: Role selection
│   │   │   ├── Sub-feature: Business info
│   │   │   └── Sub-feature: Terms acceptance
│   │   └── Feature: Provider Verification
│   │       ├── Sub-feature: Identity verification
│   │       ├── Sub-feature: Business verification
│   │       └── Sub-feature: Document upload
│   │
│   ├── Capability: Listing Management
│   │   ├── Feature: Create Listing
│   │   │   ├── Sub-feature: Choose Venue/Outdoor/Housing
│   │   │   ├── Sub-feature: Fill listing form
│   │   │   ├── Sub-feature: Upload photos
│   │   │   ├── Sub-feature: Set pricing
│   │   │   ├── Sub-feature: Set availability
│   │   │   └── Sub-feature: Submit for review
│   │   ├── Feature: Edit Listing
│   │   │   ├── Sub-feature: Update details
│   │   │   ├── Sub-feature: Manage photos
│   │   │   └── Sub-feature: Update pricing
│   │   └── Feature: Manage Calendar
│   │       ├── Sub-feature: Set availability rules
│   │       ├── Sub-feature: Add special dates
│   │       ├── Sub-feature: Block dates
│   │       └── Sub-feature: View bookings on calendar
│   │
│   ├── Capability: Booking Management
│   │   ├── Feature: Review Requests
│   │   │   ├── Sub-feature: View pending bookings
│   │   │   ├── Sub-feature: Approve booking
│   │   │   └── Sub-feature: Reject booking with reason
│   │   ├── Feature: Manage Confirmed Bookings
│   │   │   ├── Sub-feature: View booking details
│   │   │   ├── Sub-feature: Mark as completed
│   │   │   ├── Sub-feature: Mark as no-show
│   │   │   └── Sub-feature: Cancel booking
│   │   └── Feature: Check-in Management
│   │       ├── Sub-feature: Verify guest tokens
│   │       ├── Sub-feature: Mark attendance
│   │       └── Sub-feature: Handle group check-in
│   │
│   └── Capability: Financial Management
│       ├── Feature: Earnings Dashboard
│       │   ├── Sub-feature: Total earnings
│       │   ├── Sub-feature: Period breakdown
│       │   ├── Sub-feature: Transaction history
│       │   └── Sub-feature: Export
│       └── Feature: Payout Settings
│           ├── Sub-feature: Bank details
│           └── Sub-feature: Payout method
```

## 3.3 Admin Operations Flow

```
Product: ClockHost
├── Domain: Admin Operations
│   ├── Capability: Listing Governance
│   │   ├── Feature: Listing Review
│   │   │   ├── Sub-feature: View submitted listings
│   │   │   ├── Sub-feature: Review listing details
│   │   │   ├── Sub-feature: Approve listing
│   │   │   ├── Sub-feature: Reject with reason
│   │   │   └── Sub-feature: Suspend listing
│   │   └── Feature: Active Listing Management
│   │       ├── Sub-feature: View active listings
│   │       ├── Sub-feature: Suspend listing
│   │       └── Sub-feature: Archive listing
│   │
│   ├── Capability: Provider Governance
│   │   ├── Feature: Verification Review
│   │   │   ├── Sub-feature: View pending verifications
│   │   │   ├── Sub-feature: Review documents
│   │   │   ├── Sub-feature: Approve/reject
│   │   │   └── Sub-feature: Request re-submission
│   │   └── Feature: User Management
│   │       ├── Sub-feature: View users
│   │       ├── Sub-feature: Change roles
│   │       └── Sub-feature: Suspend users
│   │
│   ├── Capability: Platform Oversight
│   │   ├── Feature: Dispute Resolution
│   │   │   ├── Sub-feature: View disputes
│   │   │   ├── Sub-feature: Review evidence
│   │   │   ├── Sub-feature: Make decision
│   │   │   └── Sub-feature: Process refund if needed
│   │   ├── Feature: Audit Trail
│   │   │   ├── Sub-feature: View all actions
│   │   │   ├── Sub-feature: Filter by actor/action/resource
│   │   │   └── Sub-feature: Export
│   │   └── Feature: Monitoring
│   │       ├── Sub-feature: System health
│   │       ├── Sub-feature: Error logs
│   │       └── Sub-feature: Uptime checks
│   │
│   └── Capability: Analytics
│       ├── Feature: Platform Stats
│       │   ├── Sub-feature: User counts
│       │   ├── Sub-feature: Booking counts
│       │   ├── Sub-feature: Revenue totals
│       │   └── Sub-feature: Materialized views
│       └── Feature: Reports
│           ├── Sub-feature: Revenue reports
│           ├── Sub-feature: Host performance
│           └── Sub-feature: Search analytics
```
