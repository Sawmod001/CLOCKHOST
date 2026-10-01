# ClockHost PDSS — Part 3: Missing Features & Architectural Gaps
## Master Tracking Protocol | Version 1.0

> **Purpose:** Track ALL missing features and architectural issues.
> **Rule:** Cross-reference with REMODEL-BLUEPRINT.md sections. Nothing is DONE without verification.
> **Last updated:** 2026-08-28
> **Status values:** MISSING | PARTIAL | IN_PROGRESS | DONE | BLOCKED

---

# PHASE 1: CRITICAL SAFETY (§28-31)

## C1. Atomic Exclusive Lock Creation
**Status:** PARTIAL | **Priority:** P0 | **Spec:** §26, §71

**Current:** Exclusive lock created via plain INSERT. No row-level locking.

**Required:** Atomic lock using PostgreSQL SELECT FOR UPDATE or advisory locks.

**Verification:**
- [ ] Two concurrent exclusive requests for same slot — only one succeeds
- [ ] Loser receives clear error message
- [ ] No double-booking possible

---

## C2. Idempotency Key Enforcement at DB Level
**Status:** PARTIAL | **Priority:** P0 | **Spec:** §30

**Current:** idempotency_key column exists with UNIQUE constraint. Key is stored.

**Required:** Ensure UNIQUE constraint enforced and duplicates rejected at DB level.

**Verification:**
- [ ] Duplicate idempotency_key returns existing booking, not error
- [ ] Race condition on duplicate key handled gracefully

---

## C3. Webhook Processing Transactional
**Status:** MISSING | **Priority:** P0 | **Spec:** §30

**Current:** processed_webhooks insert and booking update are separate operations.

**Required:** Wrap in single database transaction.

**Verification:**
- [ ] No lost confirmations on crash
- [ ] No double-confirmations
- [ ] Retry works correctly

---

## C4. Fix resolveExclusiveLock Error Handling
**Status:** BROKEN | **Priority:** P0 | **Spec:** §71

**Current:** Marks lost_race on ANY error including transient DB errors.

**Required:** Distinguish permanent conflicts from transient errors.

**Verification:**
- [ ] Transient DB error leads to retry, not lost_race
- [ ] Actual conflict leads to lost_race with clear message

---

# PHASE 2: CORE PRODUCT (§15-21)

## C5. Paystack Fee Calculation
**Status:** MISSING | **Priority:** P1 | **Spec:** §17

**Required:** 1.5% + ₦100 (waived below ₦2,500, capped at ₦2,000). Configurable.

**Verification:**
- [ ] Fee calculated correctly for various amounts
- [ ] ₦100 waived below ₦2,500
- [ ] Fee capped at ₦2,000
- [ ] Fee shown in pricing breakdown
- [ ] Fee configurable

---

## C6. Pricing Snapshot with Full Breakdown
**Status:** PARTIAL | **Priority:** P1 | **Spec:** §21, §69

**Required:** Save: base_amount, guest_count, duration, discount_amount, venue_spend_entitlement, venue_component, clockhost_component, payment_fee, total_amount, currency, pricing_rule_version.

**Verification:**
- [ ] Snapshot contains all required fields
- [ ] Snapshot immutable after confirmation
- [ ] Historical bookings auditable

---

## C7. Receipt/Booking Evidence Generation
**Status:** MISSING | **Priority:** P1 | **Spec:** §32

**Required:** Server-generated receipt with all §32 fields.

**Verification:**
- [ ] Receipt generated on payment confirmation
- [ ] Contains all required fields
- [ ] Downloadable or viewable
- [ ] Generated from server data

---

## C8. Outdoor Space Exclusive-Only Flow
**Status:** MISSING | **Priority:** P1 | **Spec:** §7, §27

**Required:** Separate listing creation flow for Outdoor Space.

**Verification:**
- [ ] Venue Host can choose Outdoor Space
- [ ] Form collects space-specific fields
- [ ] Only exclusive booking mode
- [ ] Time period labels work
- [ ] Actual start/end datetime stored

---

## C9. Structured Venue Description Sections
**Status:** PARTIAL | **Priority:** P1 | **Spec:** §13

**Required:** All 6 sections: About, Activities, Amenities, Food and Drinks, Rules, Booking Info.

**Verification:**
- [ ] All 6 sections in listing creation form
- [ ] All 6 sections on listing detail page
- [ ] Host can edit each section
- [ ] Sections are structured

---

# PHASE 3: AUTH AND ROUTE PROTECTION (§60-62)

## C10. Middleware Auth Enforcement
**Status:** MISSING | **Priority:** P0 | **Spec:** §62

**Required:** Middleware checks Clerk session for protected paths.

**Verification:**
- [ ] Unauthenticated leads to redirect to /sign-in
- [ ] Incomplete profile leads to redirect to /complete-profile
- [ ] Wrong role leads to redirect to correct dashboard
- [ ] Public pages unaffected

---

## C11. Booking Bypass Protection
**Status:** MISSING | **Priority:** P0 | **Spec:** §61

**Required:** Server rejects unauthorized booking requests.

**Verification:**
- [ ] Unauthenticated Book Now leads to redirect to sign-in
- [ ] API call to /api/bookings without auth returns 401
- [ ] API call to /api/payments/initiate without auth returns 401
- [ ] Server rejects, not just UI hiding

---

# PHASE 4: HOUSING AND VIEWING (§40-45)

## C12. Housing Monthly Pricing
**Status:** PARTIAL | **Priority:** P1 | **Spec:** §41

**Required:** Monthly price as base. Lease options: 6, 12 months with discounts.

**Verification:**
- [ ] Monthly price field in listing form
- [ ] Lease duration selection
- [ ] Discount per lease duration configurable
- [ ] Price calculated correctly

---

## C13. Viewing Workflow
**Status:** PARTIAL | **Priority:** P1 | **Spec:** §42

**Required:** Full workflow: Request, Pay fee, Receive contact, View, Decide.

**Verification:**
- [ ] Guest can request viewing
- [ ] Host receives notification
- [ ] Host can confirm/cancel
- [ ] Status updates correctly
- [ ] Viewing does NOT become housing booking

---

## C14. Viewing Fee Handling
**Status:** MISSING | **Priority:** P1 | **Spec:** §43

**Required:** Host sets fee, ClockHost adds component, contact info released after payment.

**Verification:**
- [ ] Host can set viewing fee
- [ ] ClockHost component added
- [ ] Guest sees total before payment
- [ ] Payment triggers contact release

---

# PHASE 5: ADMIN AND NOTIFICATIONS (§46-50)

## C15. Automatic Suspension Based on Thresholds
**Status:** MISSING | **Priority:** P2 | **Spec:** §49

**Required:** Temporary suspension based on thresholds. Not permanent ban.

**Verification:**
- [ ] Suspension triggered at threshold
- [ ] Temporary, not permanent
- [ ] Admin notified for review
- [ ] Affected account notified

---

## C16. Admin Suspension with Reason
**Status:** MISSING | **Priority:** P2 | **Spec:** §46

**Required:** Admin must provide reason when suspending.

**Verification:**
- [ ] Reason field required in suspend API
- [ ] Reason stored in database
- [ ] Reason visible to affected party

---

## C17. Notification Preferences Wiring
**Status:** PARTIAL | **Priority:** P2 | **Spec:** §76

**Required:** User can toggle preferences. Sending respects preferences.

**Verification:**
- [ ] Settings page shows preferences
- [ ] User can toggle each preference
- [ ] Preferences saved
- [ ] Sending checks preferences

---

# PHASE 6: TESTING AND CLEANUP

## C18. Remove Duplicate Audit System
**Status:** BROKEN | **Priority:** P2 | **Spec:** §50

**Required:** Remove src/lib/audit.ts. Use src/lib/db/audit.ts only.

**Verification:**
- [ ] src/lib/audit.ts deleted
- [ ] All imports point to db/audit.ts
- [ ] No broken imports
- [ ] Tests pass

---

## C19. Consolidate Database Access Patterns
**Status:** BROKEN | **Priority:** P2 | **Spec:** Architecture

**Required:** Single database access pattern throughout.

**Verification:**
- [ ] All files use same DB access pattern
- [ ] No raw pg pool outside connection.ts
- [ ] No mixed patterns in same file

---

## C20. Standardize Response Helpers
**Status:** BROKEN | **Priority:** P2 | **Spec:** §70

**Required:** All routes use ok()/fail() consistently.

**Verification:**
- [ ] All API routes use ok() and fail()
- [ ] No direct NextResponse.json() in route handlers
- [ ] Consistent error response format

---

## C21. Enable RLS on whatsapp_sessions
**Status:** UNKNOWN | **Priority:** P2 | **Spec:** §52

**Required:** Enable RLS on whatsapp_sessions table.

**Verification:**
- [ ] RLS enabled
- [ ] Policies defined
- [ ] No unauthorized access

---

# PHASE 7: UI AND UX

## C22. Pricing Breakdown at Checkout
**Status:** MISSING | **Priority:** P1 | **Spec:** §21

**Required:** Show: Base amount, Discount, Venue-spend, Fee, Total.

**Verification:**
- [ ] Checkout shows base amount
- [ ] Discount shown if applicable
- [ ] Venue-spend shown
- [ ] Payment fee shown
- [ ] Total matches server calculation

---

## C23. Venue-Spend Entitlement Display
**Status:** MISSING | **Priority:** P1 | **Spec:** §16

**Required:** Customer-facing: Includes ₦X venue spend. NOT tracked by ClockHost.

**Verification:**
- [ ] Shown on listing detail
- [ ] Shown in checkout breakdown
- [ ] Shown in receipt
- [ ] NOT shown as wallet/balance

---

## C24. Group Booking Share View
**Status:** MISSING | **Priority:** P2 | **Spec:** §23

**Required:** Safe to share: venue, date, time, count, status. NEVER: payment secrets.

**Verification:**
- [ ] Shareable link generated
- [ ] Shows only safe information
- [ ] Read-only

---

## C25. Check-In Token System
**Status:** MISSING | **Priority:** P2 | **Spec:** §24

**Required:** Rotating tokens. Must expire, not be predictable, validated server-side.

**Verification:**
- [ ] Token generated on confirmation
- [ ] Token expires
- [ ] Validated server-side
- [ ] Cannot be reused after check-in

---

## C26. Dashboard Adaptation per Listing Type
**Status:** MISSING | **Priority:** P2 | **Spec:** §59

**Required:** Venue, Outdoor Space, Housing each get adapted dashboard.

**Verification:**
- [ ] Venue host sees venue-specific dashboard
- [ ] Outdoor Space host sees outdoor-specific dashboard
- [ ] Housing host sees housing-specific dashboard

---

# ARCHITECTURAL GAPS

## C27. Dual Pricing Calculation
**Status:** BROKEN | **Priority:** P0 | **Spec:** §65

**Current:** Reserve and bookings routes calculate prices differently. Pricing engine exists but not used consistently.

**Required:** Single pricing calculation path through pricing engine.

**Verification:**
- [ ] Reserve and bookings routes produce same price
- [ ] Pricing engine is single source of truth
- [ ] No manual price calculations in routes

---

## C28. Status Enum Mismatch Between TS and SQL
**Status:** BROKEN | **Priority:** P0 | **Spec:** §28

**Current:** TS state machine uses pending_approval, cancelled_by_guest etc. SQL booking_valid_transitions may use different statuses.

**Required:** Align TS and SQL status enums.

**Verification:**
- [ ] All TS statuses exist in SQL
- [ ] All SQL statuses exist in TS
- [ ] Transitions work end-to-end

---

## C29. blocked_dates Only Supports Full-Day Blocks
**Status:** BROKEN | **Priority:** P1 | **Spec:** §10, §11

**Current:** blocked_dates.blocked_date is DATE type. Cannot block specific hours.

**Required:** Support start_time + end_time granularity for blocking.

**Verification:**
- [ ] Can block 5 PM - 11 PM on a specific day
- [ ] Can block full days
- [ ] Existing bookings respected

---

## C30. Two Audit Systems Coexist
**Status:** BROKEN | **Priority:** P2 | **Spec:** §50

**Current:** src/lib/audit.ts and src/lib/db/audit.ts both exist.

**Required:** Single audit system.

**Verification:**
- [ ] One audit file
- [ ] All routes use same audit function
- [ ] Audit records consistent

---

# SUMMARY: 30 Missing Features / Gaps

| ID | Feature | Status | Priority |
|----|---------|--------|----------|
| C1 | Atomic exclusive lock | PARTIAL | P0 |
| C2 | Idempotency enforcement | PARTIAL | P0 |
| C3 | Transactional webhook | MISSING | P0 |
| C4 | Fix resolveExclusiveLock | BROKEN | P0 |
| C5 | Paystack fee calculation | MISSING | P1 |
| C6 | Full pricing snapshot | PARTIAL | P1 |
| C7 | Receipt generation | MISSING | P1 |
| C8 | Outdoor Space flow | MISSING | P1 |
| C9 | Structured description | PARTIAL | P1 |
| C10 | Middleware auth | MISSING | P0 |
| C11 | Booking bypass protection | MISSING | P0 |
| C12 | Housing monthly pricing | PARTIAL | P1 |
| C13 | Viewing workflow | PARTIAL | P1 |
| C14 | Viewing fee | MISSING | P1 |
| C15 | Auto suspension | MISSING | P2 |
| C16 | Suspension reason | MISSING | P2 |
| C17 | Notification prefs | PARTIAL | P2 |
| C18 | Remove duplicate audit | BROKEN | P2 |
| C19 | Consolidate DB access | BROKEN | P2 |
| C20 | Standardize responses | BROKEN | P2 |
| C21 | RLS whatsapp_sessions | UNKNOWN | P2 |
| C22 | Checkout breakdown | MISSING | P1 |
| C23 | Venue-spend display | MISSING | P1 |
| C24 | Group share view | MISSING | P2 |
| C25 | Check-in tokens | MISSING | P2 |
| C26 | Dashboard per type | MISSING | P2 |
| C27 | Dual pricing fix | BROKEN | P0 |
| C28 | Status enum mismatch | BROKEN | P0 |
| C29 | blocked_dates hours | BROKEN | P1 |
| C30 | Audit consolidation | BROKEN | P2 |
