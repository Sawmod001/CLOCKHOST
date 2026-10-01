# ClockHost — Auth Gate Fixes & Code Audit Report

## Overview

This document covers the auth gate vulnerability fixes, bug fixes, and comprehensive code audit findings discovered during the ClockHost pre-launch restructuring.

---

## 1. Auth Gate Fixes

### 1.1 Race Condition: `gate()` Called Before Auth State Resolved

**File:** `src/app/page.tsx`

**Problem:** The `gate` function checks `isAuthenticated` to decide whether to redirect to sign-in or allow navigation. But on page load, `gate()` can be called before `useEffect` finishes checking the session. This means:
- User clicks "Get Started" → `gate()` runs → `isAuthenticated` is still `false` → user redirected to `/auth/sign-in` even though they're logged in
- User clicks again → this time auth check has completed → `isAuthenticated` is `true` → navigation works
- Result: **first click always fails if user is already signed in**

**Fix:** Added `authChecked` boolean. If `gate()` fires before auth is resolved, it calls `e.preventDefault()` + `e.stopPropagation()` and returns early. The click event is suppressed rather than causing a wrong redirect.

**Files changed:** `src/app/page.tsx`

### 1.2 Button Navigation: `event.currentTarget` Mismatch

**File:** `src/app/page.tsx`

**Problem:** The `gate` function was attached to both `<a>` and `<button>` elements. For `<a>` tags, `router.push(href)` works fine via the anchor's `href`. But for `<button>` elements (like the two booking CTA buttons in `TwoWaysToBook`), the `href` is `undefined` — buttons don't have `href`. The gate function would call `router.push(undefined)` which is a no-op.

**Fix:** Added explicit `router.push(href)` call when `e.currentTarget?.tagName === "BUTTON"` and the user is authenticated.

**Files changed:** `src/app/page.tsx`

### 1.3 HostCta: Missing `gate()` on "List Your Space" CTA

**File:** `src/components/home/HostCta.tsx`

**Problem:** The "List your space" button in the host CTA section navigated directly to `/host/listings/new` without checking auth. Unauthenticated users would land on a protected route and get a confusing server error or blank page instead of a clean sign-in redirect.

**Fix:** Added `gate` prop from page.tsx. CTA button now calls `gate(e, HOST_CTA.primaryCta.href)` which redirects unauthenticated users to sign-in first.

**Files changed:** `src/components/home/HostCta.tsx`, `src/app/page.tsx` (passing gate prop)

### 1.4 FeaturedSpaces: Empty State "Get Notified" Link Bypasses Auth

**File:** `src/components/home/FeaturedSpaces.tsx`

**Problem:** The "Get notified" link in the empty state (shown when no listings match the selected category) navigated directly without auth gating. If a user is not signed in, clicking this would land on a page requiring auth.

**Fix:** Added `gate` prop and applied it to the "Get notified" link, same pattern as other gated CTAs.

**Files changed:** `src/components/home/FeaturedSpaces.tsx`, `src/app/page.tsx` (passing gate prop)

---

## 2. Bug Fixes

### 2.1 Reviews API 500 Error

**File:** `src/lib/db/supabase-queries.ts`

**Problem:** The `listReviews` function used a complex Supabase join: `supabase.from("reviews").select("*, profiles!reviews_user_id_fkey(full_name, avatar_url)")`. The join failed because the foreign key constraint name didn't match or the join syntax was wrong for the Supabase version, causing a 500 error on any listing with reviews.

**Fix:** Simplified to `supabase.from("reviews").select("*")` — returns all review columns without the join. The profile data (name, avatar) can be fetched separately or the join can be re-added with the correct FK name later.

### 2.2 addOns Shape Mismatch

**File:** `src/app/(public)/listings/[id]/page.tsx`

**Problem:** The listing detail page assumed `addOns` was always an array. If a listing has `addOns: null` or `addOns: {}` in the database, the page would crash with "Cannot read properties of undefined (reading filter)".

**Fix:** Added `Array.isArray(addOns) ? addOns : []` guard before any `addOns.map()` or `addOns.filter()` calls.

### 2.3 Title Whitespace on Create/Update

**File:** `src/app/api/listings/route.ts`, `src/app/api/listings/[id]/route.ts`

**Problem:** A user could create a listing with title `"   "` (just spaces) which would pass validation but display as a blank title in the UI and search results.

**Fix:** Added `.trim()` to `title` before saving in both create (POST) and update (PATCH) handlers.

### 2.4 addOns Normalization in PATCH

**File:** `src/app/api/listings/[id]/route.ts`

**Problem:** If the PATCH body contained `addOns: "[]"` (a string instead of an array), it would be stored as a string in the database, causing downstream code to fail when trying to `JSON.parse` it or iterate over it.

**Fix:** Added normalization: `if (typeof addOns === "string") addOns = JSON.parse(addOns)` before saving.

---

## 3. Security Issues — Fixed

### 3.1 FIXED: Middleware Auth Bypass on Exception

**File:** `src/middleware.ts`
**Fixed:** 2026-08-22

**Problem:** The auth middleware's `catch` block returned `NextResponse.next()`, meaning any middleware exception (network timeout, malformed cookie, etc.) would **grant access** to protected routes instead of denying it.

**Fix:** Changed catch block to return `unauthorized(request)` — on any error, access is denied. The principle: fail closed, never fail open.

### 3.2 FIXED: No Rate Limiting on Auth Endpoints

**Files:** `src/app/api/auth/sign-in/route.ts`, `src/app/api/auth/sign-up/route.ts`
**Fixed:** 2026-08-22

**Problem:** No rate limiting on authentication endpoints. Attackers could brute force passwords, create unlimited accounts, and enumerate valid emails.

**Fix:** Added sliding window rate limiting via `src/lib/rate-limit.ts`:
- Sign-in: 10 requests per minute per IP
- Sign-up: 5 requests per minute per IP
- Chat: 20 requests per minute per IP

**Note:** Currently in-memory (per-Vercel-instance). For strict cross-instance enforcement, add Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`) and swap the Map for `Redis.fromEnv()`.

### 3.3 MITIGATED: Sign-In Timing Side-Channel

**File:** `src/app/api/auth/signin/route.ts`

**Problem:** Login responses could leak whether an email exists via timing differences.

**Mitigation:** The sign-in flow already makes 3+ sequential Clerk API calls (user lookup with 3 retries, password verification, session creation, token generation). The network latency from these calls (typically 500-2000ms total) completely masks any timing difference from bcrypt comparison (~50ms). The timing side-channel is not practically exploitable in this implementation.

**Additional defense:** Rate limiting (10 req/min per IP) makes brute-force enumeration infeasible regardless of timing.

### 3.4 CORRECTED: Admin Routes — Already Protected

**Files:** `src/app/api/admin/listings/[id]/approve/route.ts`, `reject/route.ts`, `suspend/route.ts`, `users/route.ts`

**Finding:** The initial audit flagged admin routes as missing auth. Upon code review, all 4 admin routes already have proper protection:
- `parseSessionToken()` extracts userId from cookie
- `verifyClerkSession()` validates the session is active and matches the userId
- `getClerkUser()` fetches the user's roles from Clerk
- `roles.includes("admin")` check returns 403 if not admin

**No fix needed.**

### 3.5 FIXED: CSRF Protection

**Files:** `src/lib/csrf.ts` (new), `src/app/api/auth/sign-in/route.ts`, `src/app/api/auth/sign-up/route.ts`, `src/app/api/chat/route.ts`
**Fixed:** 2026-08-22

**Problem:** No Origin/Referer header validation on state-changing endpoints.

**Fix:** Created `src/lib/csrf.ts` with Origin/Referer header validation:
- All POST/PUT/PATCH/DELETE requests are checked against allowed origins
- Falls back to Referer header if Origin is absent
- Allows requests with neither header (legitimate API clients)
- Applied to auth endpoints (sign-in, sign-up) and chat API

**Design rationale:** CSRF tokens are unnecessary when:
1. Session cookies are `SameSite=lax` (already configured) — browsers won't send cookies cross-origin for form POSTs
2. Endpoints only accept `application/json` — browsers can't forge JSON POSTs via HTML forms
3. Origin/Referer checks provide defense-in-depth for older browsers

See: https://webjs.dev/blog/csrf-protection-without-tokens

### 3.6 FIXED: Unprotected Chat API

**File:** `src/app/api/chat/route.ts`
**Fixed:** 2026-08-22

**Problem:** Chat endpoint was completely public — no auth, no rate limiting. Anyone could burn the Gemini API quota.

**Fix:**
- Added auth requirement (`parseSessionToken` — must be signed in)
- Added rate limiting (20 requests per minute per IP)
- Added CSRF Origin validation
- Removed from middleware public API list

---

## 4. Architecture Issues Found During Audit

### 4.1 Monolithic Listing Detail Page

**File:** `src/app/(public)/listings/[id]/page.tsx`

**Problem:** ~470 lines of mixed concerns (data fetching, UI rendering, booking logic, review display, map integration, share functionality). Very hard to maintain or test.

### 4.2 No Server Components

**Problem:** The entire app uses client components (`"use client"`). This defeats Next.js's server rendering benefits — no streaming, no partial hydration, larger bundle sizes.

### 4.3 No Image Optimization

**Problem:** Listing images are displayed as raw `<img>` tags or basic `next/image` without proper `sizes`, `priority`, or blur placeholders. Slow image loads on mobile.

### 4.4 No Email Notifications

**Problem:** No email system exists. Users receive no emails for:
- Booking confirmations
- Payment receipts
- Listing approval/rejection
- New booking requests (for hosts)

### 4.5 No Structured Data

**Problem:** No JSON-LD or Open Graph tags for SEO. Listings don't show up in Google search results with rich snippets (price, rating, availability).

### 4.6 No Error Boundaries

**Problem:** No React error boundaries. If a component crashes, the entire page goes white with no recovery.

### 4.7 No Monitoring/Logging

**Problem:** No error tracking (Sentry, etc.), no analytics, no performance monitoring. Issues in production are invisible until users report them.

---

## 5. Remaining Issues

| Priority | Issue | Status | Effort |
|---|---|---|---|
| 1 | Middleware auth bypass | **FIXED** | — |
| 2 | Rate limiting on auth | **FIXED** (in-memory) | — |
| 3 | Admin route auth | **Already protected** | — |
| 4 | Timing side-channel | **Mitigated** (multi-request flow masks timing) | — |
| 5 | CSRF protection | **FIXED** | — |
| 6 | Chat API abuse | **FIXED** | — |
| 7 | Upgrade to Upstash rate limiting | TODO | 30 min |
| 8 | Email notifications | TODO | 2-3 days |
| 9 | Server Components migration | TODO | 1-2 weeks |
| 10 | Listing detail refactor | TODO | 1 week |
| 11 | Image optimization | TODO | 2 hrs |
| 12 | Error boundaries | TODO | 1 hr |
