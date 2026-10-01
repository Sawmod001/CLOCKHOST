# ClockHost PDSS — Sprint Tracker
## Agile Development Progress | Version 1.0

> **Methodology:** Scrum/Agile — 10 sprints, each with clear goals and acceptance criteria.
> **Rule:** Sprint is not DONE until ALL tasks pass verification.
> **Last updated:** 2026-08-28

---

## Sprint Board

| Sprint | Name | Status | Progress |
|--------|------|--------|----------|
| 0 | Foundation Fixes | NOT STARTED | 0/7 |
| 1 | Pricing Engine Integration | NOT STARTED | 0/6 |
| 2 | Auth and Route Protection | NOT STARTED | 0/5 |
| 3 | Host Dashboard and Navigation | NOT STARTED | 0/7 |
| 4 | Venue Listing Creation Flow | NOT STARTED | 0/6 |
| 5 | Booking Flow Completion | NOT STARTED | 0/6 |
| 6 | Housing and Shortlet Host | NOT STARTED | 0/6 |
| 7 | Admin and Notifications | NOT STARTED | 0/6 |
| 8 | Testing and Cleanup | NOT STARTED | 0/9 |
| 9 | UI Polish and UX | NOT STARTED | 0/7 |

---

## SPRINT 0: Foundation Fixes
**Goal:** Fix all critical bugs that make the app unusable.
**Estimated:** 1 day | **Priority:** P0

| # | Task | PDSS Ref | Files to Change | Verification |
|---|------|----------|----------------|--------------|
| 0.1 | Fix shortlet_host routing | A1 | redirect.ts, RoleGate.tsx, layout.tsx | Shortlet Host can access host pages |
| 0.2 | Fix shortlet_host listing creation | A2 | api/listings/route.ts | Shortlet Host can create listings |
| 0.3 | Fix guest dashboard status filters | A5 | dashboard/page.tsx | Bookings show in all tabs |
| 0.4 | Fix host bookings status filters | A6 | host/bookings/page.tsx | Booking counts correct |
| 0.5 | Fix complete-profile redirect | A8 | api/auth/complete-profile/route.ts | Redirect matches role |
| 0.6 | Remove debug route | A9 | api/debug/db/route.ts | Returns 404 |
| 0.7 | Fix reserve route pricing | A3 | api/listings/[id]/reserve/route.ts | Uses pricing engine |

**Sprint 0 Done When:**
- [ ] Shortlet Host can sign up and access host dashboard
- [ ] Shortlet Host can create listings
- [ ] Guest dashboard shows bookings in all tabs
- [ ] Host booking inbox shows correct counts
- [ ] Profile completion redirects correctly
- [ ] Debug route returns 404
- [ ] Reserve route uses pricing engine

---

## SPRINT 1: Pricing Engine Integration
**Goal:** Single source of truth for all pricing calculations.
**Estimated:** 2 days | **Priority:** P0

| # | Task | PDSS Ref | Files to Change | Verification |
|---|------|----------|----------------|--------------|
| 1.1 | Reserve route uses computeCapacityPriceKobo | A3, C27 | api/listings/[id]/reserve/route.ts | Same price as checkout |
| 1.2 | Reserve route uses computeCommissionKobo | A3 | api/listings/[id]/reserve/route.ts | Configurable rate |
| 1.3 | Bookings route uses computeCommissionKobo | A4 | api/bookings/route.ts | Configurable rate |
| 1.4 | Add Paystack fee calculation | C5 | lib/bookings/pricing.ts | Fee shown in checkout |
| 1.5 | Pricing snapshot full breakdown | C6 | api/bookings/route.ts | All fields saved |
| 1.6 | Checkout validates price server-side | A10 | checkout/page.tsx, api endpoint | Server price used |

**Sprint 1 Done When:**
- [ ] Reserve route calls pricing engine
- [ ] Bookings route calls pricing engine
- [ ] Paystack fee calculated correctly
- [ ] Pricing snapshot has all fields
- [ ] Checkout shows server price
- [ ] All prices consistent across routes

---

## SPRINT 2: Auth and Route Protection
**Goal:** Enforce security per spec sections 60-62.
**Estimated:** 2 days | **Priority:** P0

| # | Task | PDSS Ref | Files to Change | Verification |
|---|------|----------|----------------|--------------|
| 2.1 | Middleware auth for protected paths | C10 | middleware.ts | Unauth blocked |
| 2.2 | Onboarding state enforcement | C10 | middleware.ts | Incomplete redirected |
| 2.3 | Booking bypass protection | C11 | api routes, homepage | Server rejects unauth |
| 2.4 | Role gate on all protected routes | C10 | layouts, middleware | No bypass via URL |
| 2.5 | Public pages unaffected | C10 | middleware.ts | /listings works for all |

**Sprint 2 Done When:**
- [ ] Unauthenticated user cannot access /host/*
- [ ] Unauthenticated user cannot access /admin/*
- [ ] Incomplete profile redirected to /complete-profile
- [ ] Booking API requires auth
- [ ] /listings works without auth

---

## SPRINT 3: Host Dashboard and Navigation
**Goal:** Host can navigate to all required pages.
**Estimated:** 3 days | **Priority:** P1

| # | Task | PDSS Ref | Files to Create | Verification |
|---|------|----------|----------------|--------------|
| 3.1 | Host Calendar page | B1 | host/calendar/page.tsx | Calendar loads |
| 3.2 | Host Reviews page | B2 | host/reviews/page.tsx | Reviews load |
| 3.3 | Host Earnings page | B3 | host/earnings/page.tsx | Earnings load |
| 3.4 | Host Notifications page | B4 | host/notifications/page.tsx | Notifications load |
| 3.5 | Host Settings page | B5 | host/settings/page.tsx | Settings load |
| 3.6 | Update HostSidebar | B1-B5 | sidebar/HostSidebar.tsx | All links work |
| 3.7 | Shortlet Host sidebar variant | B6-B8 | sidebar/ShortletHostSidebar.tsx | Different nav for shortlet |

**Sprint 3 Done When:**
- [ ] All 5 new host pages load and work
- [ ] Sidebar has all links
- [ ] Shortlet Host has appropriate sidebar
- [ ] All pages use DashboardLayout

---

## SPRINT 4: Venue Listing Creation Flow
**Goal:** Host can create proper venue listing per spec section 36.
**Estimated:** 3 days | **Priority:** P1

| # | Task | PDSS Ref | Files to Change | Verification |
|---|------|----------|----------------|--------------|
| 4.1 | Venue vs Outdoor Space selection | C8 | host/listings/new/page.tsx | Type selection works |
| 4.2 | Venue listing form all fields | C9 | host/listings/new/page.tsx | All §36 fields present |
| 4.3 | Outdoor Space listing form | C8 | host/listings/new/page.tsx | Outdoor-specific fields |
| 4.4 | Availability rules UI | B1 | host/calendar/page.tsx | Rules management works |
| 4.5 | Structured description sections | C9 | host/listings/new/page.tsx | 6 sections present |
| 4.6 | Submit for review flow | B1 | host/listings/new/page.tsx | Draft to submitted works |

**Sprint 4 Done When:**
- [ ] Can choose Venue or Outdoor Space
- [ ] Venue form has all required fields
- [ ] Outdoor Space form is exclusive-only
- [ ] Availability rules can be set
- [ ] Structured description sections work
- [ ] Submission for review works

---

## SPRINT 5: Booking Flow Completion
**Goal:** End-to-end booking works correctly.
**Estimated:** 3 days | **Priority:** P1

| # | Task | PDSS Ref | Files to Change | Verification |
|---|------|----------|----------------|--------------|
| 5.1 | Atomic exclusive lock | C1 | exclusive.ts, api routes | No race condition |
| 5.2 | Transactional webhook | C3 | webhook handler | Crash-safe |
| 5.3 | Fix resolveExclusiveLock | C4 | exclusive.ts | Correct error handling |
| 5.4 | Booking expiry check | C2 | api/bookings/route.ts | Expired holds rejected |
| 5.5 | Receipt generation | C7 | lib/receipt.ts, api | Receipt created |
| 5.6 | Booking detail page | B9 | bookings/[id]/page.tsx | Full details shown |

**Sprint 5 Done When:**
- [ ] Exclusive bookings atomic
- [ ] Webhook crash-safe
- [ ] resolveExclusiveLock handles errors correctly
- [ ] Expired holds rejected
- [ ] Receipts generated
- [ ] Booking detail page works

---

## SPRINT 6: Housing and Shortlet Host
**Goal:** Shortlet Host can manage properties per spec sections 38-45.
**Estimated:** 3 days | **Priority:** P1

| # | Task | PDSS Ref | Files to Create | Verification |
|---|------|----------|----------------|--------------|
| 6.1 | Housing monthly pricing | C12 | forms, pricing | Monthly price works |
| 6.2 | Lease duration options | C12 | forms | 6/12 month options |
| 6.3 | Viewing workflow UI | C13 | viewings pages | Full workflow works |
| 6.4 | Viewing fee handling | C14 | api, forms | Fee collected |
| 6.5 | My Properties page | B6 | host/properties/page.tsx | Properties list |
| 6.6 | Add Property page | B7 | host/properties/new/page.tsx | Property creation |

**Sprint 6 Done When:**
- [ ] Monthly pricing works
- [ ] Lease duration selectable
- [ ] Viewing workflow complete
- [ ] Viewing fee collected
- [ ] Properties page loads
- [ ] Can add new property

---

## SPRINT 7: Admin and Notifications
**Goal:** Admin can manage platform, notifications work.
**Estimated:** 2 days | **Priority:** P2

| # | Task | PDSS Ref | Files to Change | Verification |
|---|------|----------|----------------|--------------|
| 7.1 | Admin audit trail view | B12 | admin/audit/page.tsx | Audit logs shown |
| 7.2 | Notification preferences UI | C17 | settings pages | Preferences work |
| 7.3 | Auto suspension | C15 | api, admin | Threshold triggers |
| 7.4 | Suspension with reason | C16 | api/admin/suspend | Reason required |
| 7.5 | Fix notification triggers | C17 | notifications.ts | All events trigger |
| 7.6 | Admin dashboard stats | B12 | admin/page.tsx | Real-time stats |

**Sprint 7 Done When:**
- [ ] Audit trail viewable
- [ ] Notification preferences work
- [ ] Auto suspension triggers
- [ ] Suspension requires reason
- [ ] Notifications trigger correctly
- [ ] Admin stats accurate

---

## SPRINT 8: Testing and Cleanup
**Goal:** Code quality and reliability.
**Estimated:** 2 days | **Priority:** P2

| # | Task | PDSS Ref | Files to Change | Verification |
|---|------|----------|----------------|--------------|
| 8.1 | API route tests for bookings | C18 | tests/ | Tests pass |
| 8.2 | API route tests for pricing | C18 | tests/ | Tests pass |
| 8.3 | API route tests for auth | C18 | tests/ | Tests pass |
| 8.4 | Concurrency tests | C18 | tests/ | Tests pass |
| 8.5 | Remove dead code | C18, C30 | lib/audit.ts | File deleted |
| 8.6 | Consolidate DB access | C19 | lib/booking.ts, exclusive.ts | Single pattern |
| 8.7 | Standardize responses | C20 | api routes | ok/fail used |
| 8.8 | Enable RLS whatsapp | C21 | migration | RLS enabled |
| 8.9 | Remove HostMe references | — | search all files | None found |

**Sprint 8 Done When:**
- [ ] All tests pass
- [ ] Dead code removed
- [ ] DB access consolidated
- [ ] Responses standardized
- [ ] RLS enabled
- [ ] No HostMe references

---

## SPRINT 9: UI Polish and UX
**Goal:** Production-ready user experience.
**Estimated:** 3 days | **Priority:** P2

| # | Task | PDSS Ref | Files to Change | Verification |
|---|------|----------|----------------|--------------|
| 9.1 | Pricing breakdown at checkout | C22 | checkout/page.tsx | Full breakdown shown |
| 9.2 | Venue-spend display | C23 | listing detail, checkout | Shown correctly |
| 9.3 | Group booking share view | C24 | group-plans pages | Shareable link works |
| 9.4 | Check-in token system | C25 | api, booking detail | Tokens work |
| 9.5 | Dashboard per listing type | C26 | host dashboards | Adapted per type |
| 9.6 | Error pages | — | error.tsx, not-found.tsx | User-friendly |
| 9.7 | Mobile responsive audit | — | all pages | Works on mobile |

**Sprint 9 Done When:**
- [ ] Checkout shows full pricing breakdown
- [ ] Venue-spend displayed
- [ ] Group booking shareable
- [ ] Check-in tokens work
- [ ] Dashboard adapts per listing type
- [ ] Error pages user-friendly
- [ ] All pages mobile responsive

---

## Dependency Graph

```
Sprint 0 (Foundation) — MUST be first
    |
    +---> Sprint 1 (Pricing) — Depends on Sprint 0
    |         |
    |         +---> Sprint 5 (Booking Flow) — Depends on Sprint 1
    |
    +---> Sprint 2 (Auth) — Can run parallel with Sprint 1
    |         |
    |         +---> Sprint 7 (Admin) — Depends on Sprint 2
    |
    +---> Sprint 3 (Host Dashboard) — Depends on Sprint 0
    |         |
    |         +---> Sprint 4 (Venue Listing) — Depends on Sprint 1
    |
    +---> Sprint 6 (Housing) — Depends on Sprint 0
    |
    +---> Sprint 8 (Testing) — After all features
    |
    +---> Sprint 9 (UI Polish) — After all features
```

---

## Progress Log

| Date | Sprint | Task | Status | Notes |
|------|--------|------|--------|-------|
| 2026-08-28 | — | PDSS Created | DONE | 52 items tracked |
| 2026-08-28 | 0 | — | NOT STARTED | Awaiting user approval |
