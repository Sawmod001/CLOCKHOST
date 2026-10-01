# ClockHost PDSS — Part 1: Critical Bugs
## Master Tracking Protocol | Version 1.0

> **Purpose:** Single source of truth for ALL critical bugs found in the audit.
> **Rule:** Nothing gets marked done without verification. Every fix must be tested.
> **Last updated:** 2026-08-28
> **Status values:** BROKEN | IN_PROGRESS | DONE | BLOCKED

---

## How to use
1. Before coding — find the bug here. Read the fix required.
2. While coding — reference the file paths and line numbers.
3. After coding — check off verification criteria. Move status to DONE.

---

## A1. Shortlet Host Cannot Access Host Pages
**Status:** BROKEN | **Priority:** P0 | **Spec:** §2, §38, §60

**What's broken:**
- `src/lib/auth/redirect.ts:9` — shortlet_host not handled, falls through to /dashboard (guest page)
- `src/components/RoleGate.tsx` — REDIRECT_MAP missing shortlet_host entry, defaults to /dashboard
- `src/app/(host)/layout.tsx:3` — allowedRoles has housing_agent (old role) instead of shortlet_host

**Impact:** Any user who signs up as Shortlet Host cannot access host functionality at all.

**Fix required:**
1. redirect.ts: Add shortlet_host → /host/dashboard
2. RoleGate.tsx: Add shortlet_host: "/host/dashboard" to REDIRECT_MAP
3. Host layout: Change allowedRoles from ["venue_host", "housing_agent", "admin"] to ["venue_host", "shortlet_host", "admin"]

**Verification:**
- [ ] Sign up as Shortlet Host → redirected to /host/dashboard
- [ ] Can access all host pages
- [ ] Guest users cannot access host pages
- [ ] Venue Host still works correctly

---

## A2. Shortlet Host Cannot Create Listings
**Status:** BROKEN | **Priority:** P0 | **Spec:** §38, §40

**What's broken:**
- `src/app/api/listings/route.ts:92` — Checks user.role !== "venue_host" && user.role !== "housing_agent" but housing_agent is the OLD role name. shortlet_host is rejected.

**Impact:** Shortlet Hosts cannot create any listings.

**Fix required:**
1. Change check to user.role !== "venue_host" && user.role !== "shortlet_host"

**Verification:**
- [ ] Shortlet Host can create listings
- [ ] Guest users cannot create listings

---

## A3. Reserve Route Ignores Pricing Engine
**Status:** BROKEN | **Priority:** P0 | **Spec:** §15, §17, §20, §21

**What's broken:**
- `src/app/api/listings/[id]/reserve/route.ts:86-100` — Manually calculates baseRate * headcount * hours without calling the pricing engine
- Multi-guest discount (§20) — NOT applied
- Hourly discount (§21) — NOT applied
- Venue-spend entitlement (§16) — NOT applied
- Configurable commission (§15) — NOT used (hardcoded 5%)

**Impact:** All pricing rules from the spec are ignored during reservation. Customers see wrong prices.

**Fix required:**
1. Import computeCapacityPriceKobo, computeCommissionKobo from @/lib/bookings/pricing
2. Replace manual calculation with computeCapacityPriceKobo({ listing, eventStart, eventEnd, headcount, addOnIds })
3. Replace hardcoded 5% with computeCommissionKobo(totalAmountKobo, listing)
4. Include full pricing breakdown in response

**Verification:**
- [ ] Reserve route calls computeCapacityPriceKobo
- [ ] Multi-guest discount applied (5% for 2-4 guests, 10% for 5+)
- [ ] Hourly discount applied (tiers from listing config)
- [ ] Commission uses listing's commission_rate_percent
- [ ] Price matches checkout page calculation
- [ ] Price matches booking creation calculation

---

## A4. Bookings Route Ignores Configurable Commission
**Status:** BROKEN | **Priority:** P0 | **Spec:** §15

**What's broken:**
- `src/app/api/bookings/route.ts:96` — Math.round(totalAmountKobo * 0.05) ignores listing's configured commission rate

**Impact:** Commission always 5% regardless of host configuration.

**Fix required:**
1. Import computeCommissionKobo from @/lib/bookings/pricing
2. Replace hardcoded Math.round(totalAmountKobo * 0.05) with computeCommissionKobo(totalAmountKobo, listing)

**Verification:**
- [ ] Commission rate comes from listing configuration
- [ ] Default is 5% if not configured
- [ ] Commission matches what reserve route calculates

---

## A5. Guest Dashboard Uses Wrong Status Names
**Status:** BROKEN | **Priority:** P0 | **Spec:** §28

**What's broken:**
- `src/app/dashboard/page.tsx:45-53` — Filters for old statuses: "pending", "cancelled", "rejected"
- Current statuses are: "pending_approval", "cancelled_by_guest", "cancelled_by_host", "cancelled_system", "rejected"

**Impact:** Guest dashboard shows 0 bookings in all tabs.

**Fix required:**
1. Update filter for upcoming: ["confirmed", "checked_in"]
2. Update filter for pending: ["pending_approval", "awaiting_payment", "payment_processing"]
3. Update filter for past: ["completed", "cancelled_by_guest", "cancelled_by_host", "cancelled_system", "expired", "rejected", "no_show", "lost_race"]

**Verification:**
- [ ] Upcoming tab shows confirmed and checked-in bookings
- [ ] Pending tab shows bookings awaiting action
- [ ] Past tab shows completed/cancelled/expired bookings
- [ ] Booking count in stat cards matches filtered lists

---

## A6. Host Bookings Page May Have Wrong Status Names
**Status:** BROKEN | **Priority:** P0 | **Spec:** §28

**What's broken:**
- `src/app/(host)/host/bookings/page.tsx` — Filter tabs likely use old status names

**Impact:** Host booking inbox shows incorrect counts.

**Fix required:**
1. Read file and check filter logic
2. Update to use current status names

**Verification:**
- [ ] All filter tabs show correct booking counts
- [ ] Status badges show correct colors
- [ ] Approve/reject buttons work for pending bookings

---

## A7. No Server-Side Route Protection
**Status:** BROKEN | **Priority:** P0 | **Spec:** §61, §62

**What's broken:**
- `src/middleware.ts` — Only does security headers, threat detection, CSRF origin check
- Does NOT check auth on protected routes (/dashboard/*, /host/*, /admin/*)
- Does NOT enforce onboarding state
- Does NOT prevent booking bypass from homepage

**Impact:** Anyone can access protected routes by typing the URL directly. Unauthenticated users can initiate bookings.

**Fix required:**
1. Add auth check in middleware for protected paths
2. Check Clerk session cookie validity
3. Redirect unauthenticated users to /sign-in
4. Check profileCompleted metadata — redirect incomplete profiles to /complete-profile
5. Server-side rejection of booking API calls from unauthenticated users

**Verification:**
- [ ] Unauthenticated access to /host/dashboard → redirect to /sign-in
- [ ] Unauthenticated access to /admin → redirect to /sign-in
- [ ] Incomplete profile access to /host/dashboard → redirect to /complete-profile
- [ ] Direct booking API call without auth → 401 response
- [ ] Homepage "Book Now" button → requires auth before proceeding

---

## A8. Complete-Profile API Inconsistent Redirect
**Status:** BROKEN | **Priority:** P0 | **Spec:** §60

**What's broken:**
- `src/app/api/auth/complete-profile/route.ts:172` — Returns redirectTo: "/dashboard" for non-providers
- Should use getRedirectPath from @/lib/auth/redirect for consistency

**Impact:** Redirect logic duplicated and may diverge.

**Fix required:**
1. Import getRedirectPath from @/lib/auth/redirect
2. Use it instead of hardcoded ternary

**Verification:**
- [ ] After profile completion, redirect matches role
- [ ] Guest → /dashboard
- [ ] Venue Host → /host/dashboard
- [ ] Shortlet Host → /host/dashboard
- [ ] Admin → /admin

---

## A9. Debug Route Exposes Database Info
**Status:** BROKEN | **Priority:** P0 | **Spec:** Security

**What's broken:**
- `src/app/api/debug/db/route.ts` — Exposes database connection info to anyone

**Impact:** Security vulnerability.

**Fix required:**
1. Delete the file or add admin-only auth

**Verification:**
- [ ] /api/debug/db returns 404 or 403
- [ ] No database info exposed

---

## A10. Checkout Page Calculates Price Client-Side Only
**Status:** BROKEN | **Priority:** P0 | **Spec:** §29, §53

**What's broken:**
- `src/app/(public)/listings/[id]/checkout/page.tsx:55-80` — Client-side price shown to user is never validated against server-side calculation
- User can manipulate the price before submitting

**Impact:** Price mismatch between what user sees and what they pay. Violates "Never trust browser" rule.

**Fix required:**
1. Checkout page should fetch price from server (via reserve route or dedicated endpoint)
2. Display server-returned price, not client-calculated price
3. Submit booking with server-validated price

**Verification:**
- [ ] Price displayed is from server calculation
- [ ] Tampering with client-side price has no effect on amount charged
- [ ] Price shown matches price charged

---

## SUMMARY: 10 Critical Bugs

| ID | Bug | Status | Priority |
|----|-----|--------|----------|
| A1 | Shortlet Host routing broken | BROKEN | P0 |
| A2 | Shortlet Host cannot create listings | BROKEN | P0 |
| A3 | Reserve ignores pricing engine | BROKEN | P0 |
| A4 | Bookings ignores configurable commission | BROKEN | P0 |
| A5 | Guest dashboard wrong status names | BROKEN | P0 |
| A6 | Host bookings wrong status names | BROKEN | P0 |
| A7 | No server-side route protection | BROKEN | P0 |
| A8 | Complete-profile inconsistent redirect | BROKEN | P0 |
| A9 | Debug route exposes DB info | BROKEN | P0 |
| A10 | Checkout client-side price only | BROKEN | P0 |