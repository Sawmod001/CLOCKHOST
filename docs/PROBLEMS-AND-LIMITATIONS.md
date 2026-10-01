# ClockHost — Problems, Limitations & Improvement Areas

## Table of Contents

1. [Critical Bugs](#critical-bugs)
2. [Security Issues](#security-issues)
3. [Architecture Problems](#architecture-problems)
4. [UX Issues](#ux-issues)
5. [Missing Features](#missing-features)
6. [Performance Concerns](#performance-concerns)
7. [Operational Gaps](#operational-gaps)

---

## Critical Bugs

### 1. Auth Gate Race Condition (FIXED)
**Severity**: HIGH
**Location**: `src/app/page.tsx:39-44`

The original `gate()` function returned early when `authChecked` was `false`, meaning ALL gated links on the homepage were completely unprotected during the first 100-500ms after page load. An unauthenticated user could click any link and navigate freely before the auth check completed.

**Fix**: Added `e.preventDefault()` + `e.stopPropagation()` when auth is still loading.

### 2. Button CTAs Broken for Authenticated Users (FIXED)
**Severity**: HIGH
**Location**: `src/components/home/TwoWaysToBook.tsx`, `src/components/home/OneAccountTwoRoles.tsx`

The `gate()` function returned early for authenticated users without navigating. Since buttons have no default navigation behavior, clicking them did nothing. Users who were logged in could not reach the intended destinations.

**Fix**: Added explicit `router.push(href)` for button elements when authenticated.

### 3. HostCta Primary CTA Missing Gate (FIXED)
**Severity**: HIGH
**Location**: `src/components/home/HostCta.tsx:32-35`

The "List your space" primary CTA was a plain `<Link>` with zero `onClick` handler. No gate protection at all.

**Fix**: Added `onClick={(e) => gate(e, HOST_CTA.primaryCta.href)}`.

### 4. Reviews API 500 Error (FIXED)
**Severity**: HIGH
**Location**: `src/lib/db/supabase-queries.ts:120`

The `listReviews()` function used `select("*, guest:guest_id(name)")` which failed because Supabase could not resolve the foreign key join automatically.

**Fix**: Simplified to `select("*")` without the join.

### 5. addOns Shape Mismatch (FIXED)
**Severity**: MEDIUM
**Location**: `src/app/(public)/listings/[id]/page.tsx:349`

The listings table stores `add_ons` as JSONB. When empty, it could be `{}` (object) or `[]` (array). The detail page checked `listing.addOns?.length > 0` which returns `undefined` for objects.

**Fix**: Added `Array.isArray(listing.addOns)` check before accessing `.length`.

### 6. No Time Slots Created
**Severity**: CRITICAL (data issue, not code)
**Location**: Database

Both existing listings had `bookingType: "capacity"` but zero slots in the `slots` table. Every day showed "No slots available." Users could not book anything.

**Status**: Database was cleaned. Slots need to be created when new listings are added.

---

## Security Issues

### 1. No CSRF Protection on State-Changing Endpoints
**Severity**: MEDIUM
**Location**: All POST API routes

The API routes rely on Clerk session cookies for auth but do not implement CSRF tokens. While SameSite cookies provide some protection, a sophisticated attacker could potentially craft cross-origin requests.

**Recommendation**: Add CSRF token validation or verify `Origin`/`Referer` headers on state-changing endpoints.

### 2. Rate Limiting is In-Memory Only
**Severity**: MEDIUM
**Location**: `src/lib/rate-limit.ts`

The rate limiter uses an in-memory Map. In a serverless environment (Vercel), each invocation has its own memory space, making the rate limiter ineffective across instances.

**Recommendation**: Use Upstash Redis or similar for distributed rate limiting.

### 3. No Input Sanitization on User-Generated Content
**Severity**: LOW
**Location**: Listing titles, descriptions, reviews

User input is validated with Zod for structure but not sanitized for XSS. While React escapes output by default, any use of `dangerouslySetInnerHTML` or URL construction from user input could be exploited.

**Recommendation**: Add DOMPurify or similar for any rich content rendering.

### 4. Admin Setup Endpoint is Protected by env Var Only
**Severity**: LOW
**Location**: `src/app/api/auth/admin-setup/route.ts`

The admin setup endpoint is guarded by `ADMIN_SETUP_SECRET` from env vars. If this secret is compromised, anyone can create an admin account.

**Recommendation**: Add additional protections (IP whitelist, one-time-use token, or remove the endpoint after first use).

---

## Architecture Problems

### 1. Two Separate Booking Engines with Different UX Flows
**Severity**: HIGH

The per-seat and exclusive booking types have completely different user flows, different API endpoints, different host management pages, and different payment flows. This creates confusion for both users and developers.

**Impact**:
- Guests don't understand why some listings show "Book Now" and others show "Request to Book"
- Hosts need to manage slots AND exclusive locks separately
- The checkout page handles capacity bookings; the exclusive-request page handles exclusive bookings — two completely different pages
- The webhook handler has branching logic for capacity vs exclusive

**Recommendation**: Unify the booking flow. Consider a single "Request to Book" flow where the host approves, then payment happens. This simplifies the codebase significantly.

### 2. Soft Hold Architecture is Over-Complex
**Severity**: MEDIUM

The two-step process (soft hold → booking) adds complexity:
1. POST /api/soft-holds (creates hold)
2. POST /api/bookings (creates booking from hold)

This means the guest sees a loading state between steps, and if step 2 fails, the hold is wasted (expires in 10 minutes).

**Recommendation**: Combine into a single atomic operation. Create the booking and hold simultaneously in one transaction.

### 3. Group Booking is Not Production-Ready
**Severity**: HIGH

The group booking system has several issues:
- No real payment integration (only mock-confirm)
- No email/notification system for plan members
- The invite link is just a URL with no expiry or access control
- No way to remove a member from a plan
- No way to cancel a plan before expiry
- The finalize logic runs after every payment, causing N+1 database queries

**Recommendation**: Either build it properly with notifications and real payments, or remove it entirely until ready.

### 4. No Webhook Retry/Cleanup Mechanism
**Severity**: MEDIUM

If the Paystack webhook fails (e.g., server error), there is no retry mechanism. The booking stays in "awaiting_payment" indefinitely.

**Recommendation**: Implement a cron job that checks for bookings stuck in "awaiting_payment" for > 30 minutes and either retries or expires them.

### 5. Custom Supabase Client vs Official SDK
**Severity**: LOW

The codebase uses a custom `PgQuery` class (`src/lib/db/supabase.ts`) instead of the official Supabase JS SDK. This means:
- No automatic type safety
- No real-time subscriptions
- No built-in auth integration
- Custom code to maintain

**Recommendation**: Migrate to the official Supabase JS SDK for better maintainability.

### 6. Monolithic Listing Detail Page
**Severity**: MEDIUM

`src/app/(public)/listings/[id]/page.tsx` is 470 lines with inline sub-components (CalendarGrid, MediaCarousel). It handles:
- Listing display
- Calendar grid
- Slot listing
- Availability display
- Reviews
- Booking CTAs
- Auth state

**Recommendation**: Extract into smaller components: ListingHeader, BookingCalendar, SlotList, ReviewList, BookingActions.

---

## UX Issues

### 1. Calendar Shows No Dots When No Slots Exist
**Severity**: MEDIUM

When a listing has no slots, the calendar shows no dots at all. Users don't know if the space is available or if slots haven't been created yet.

**Recommendation**: Show a message like "No available dates" or "Contact host to check availability."

### 2. No Loading State on Booking Actions
**Severity**: LOW

When a guest clicks "Reserve & Pay," there's no intermediate loading state between the soft hold creation and the booking creation. The user sees a blank screen.

**Recommendation**: Add a loading spinner with "Reserving your spot..." messaging.

### 3. No Real-Time Slot Updates
**Severity**: MEDIUM

If two guests view the same listing simultaneously, they see the same slot availability. When one books, the other doesn't see the update until they refresh.

**Recommendation**: Use Supabase real-time or polling to update slot availability in real-time.

### 4. Exclusive Request Page Requires Manual Lock Selection
**Severity**: MEDIUM

The exclusive-request page asks guests to manually enter a lock ID. This is a developer-facing input, not a user-facing UX.

**Recommendation**: Show available time windows as clickable options, not raw IDs.

### 5. No Price Summary Before Payment
**Severity**: LOW

The checkout page shows an estimated total computed client-side, but the actual total is computed server-side. There's no confirmation step showing the exact amount before payment.

**Recommendation**: Add a "Review & Confirm" step that shows the server-computed total.

---

## Missing Features

### 1. No Email Notifications
No email system for:
- Booking confirmation
- Host approval/rejection
- Payment receipt
- Group plan invites
- Booking reminders

### 2. No Search/Filter on Homepage
The homepage shows categories and locations but no search bar. Users must navigate to `/listings` to search.

### 3. No Map View
No geographic/map view of listings. The PostGIS `coordinates` field exists but is unused in the UI.

### 4. No Reviews Display on Listing Cards
Reviews exist in the database but are only shown on the listing detail page, not on listing cards in search results.

### 5. No Cancellation Flow
There is no UI for guests to cancel a booking. The cancellation policy exists in the data but is not enforced.

### 6. No Host Availability Calendar
Hosts create slots one-by-one. There's no bulk availability management or recurring slot creation.

### 7. No Mobile App
The web app is responsive but has no native mobile experience.

---

## Performance Concerns

### 1. Client-Side Data Fetching on Every Page
All pages use `useEffect` + `fetch()` for data loading. This means:
- No SEO (pages are empty on first render)
- No caching (every visit re-fetches)
- Loading spinners on every navigation

**Recommendation**: Use Server Components for initial data loading, client-side only for interactive updates.

### 2. No Image Optimization
Listing images are served directly from Supabase Storage with no optimization. Large images load slowly on mobile.

**Recommendation**: Use Next.js `<Image>` component with `fill` and `sizes` props for automatic optimization.

### 3. No Pagination on Listings
The listings API supports cursor-based pagination, but the UI uses a "Load More" button. For large catalogs, this leads to slow page loads.

**Recommendation**: Implement infinite scroll or virtual scrolling.

---

## Operational Gaps

### 1. No Monitoring/Alerting
No error tracking (Sentry, etc.), no performance monitoring, no alerting for failed payments or stuck bookings.

### 2. No Backup Strategy
No automated database backups beyond Supabase's defaults.

### 3. No CI/CD Pipeline
No automated testing, linting, or deployment pipeline. All deployments are manual via `vercel --prod`.

### 4. No Environment Variable Management
No `.env.example` template. New developers must guess which variables are needed.

### 5. No Database Migrations System
Migrations are a single `migration.sql` file. No versioning, no rollback, no up/down migrations.
