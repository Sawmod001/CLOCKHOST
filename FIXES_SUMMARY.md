# HOSTME Fixes Summary — 2026-08-31 to 2026-09-01

> Saved checkpoint before homepage frontend redesign. All changes below are committed and pushed. Next work: homepage frontend only.

## 1. Auth / Fetch Failed (User Reported)

**Symptom:** `sign-in/sign-up → fetch failed`, ChatBot `UnauthorizedRetry`

**Root causes:**
- `src/lib/csrf.ts:16` `ALLOWED_ORIGINS=[localhost]` blocked Vercel (`hostme.in`, `*.vercel.app`) with 403
- `src/lib/auth/clerk.ts:12` 30s timeout > Vercel 10s + 9× retries → gateway timeout, `fetch failed` swallowed as 401
- `src/app/api/chat:30` + `src/middleware.ts:76` required auth for guests → 401

**Fixes:**
- `csrf.ts` dynamic `CLOCKHOST/HOSTME/VERCEL_URL` + strict `originHost===host`, no wildcard, `middleware 130` exact host, missing Origin → 403 if cookie present
- `clerk.ts` 8s + `503` mapping for `AbortError/ECONN`, `sign-in/up route` 2 variants fail-fast, client pages `sign-in/up:60` distinct 503/403 handling
- `middleware 24` move `/api/chat` → `PUBLIC_API_PREFIXES`, `chat:31` public `10/20/min`, `ChatBot:54` `x-goog-api-key` header + friendly fallback
- `src/app/bookings → (public)/bookings` fixes Next 16.2 parallel-route crash (`Ready 2.5s`)
- Verified: `npm test` 36/36, `GET /sign-in` 200, guest `POST /api/chat` 200, `evil.com` 403

## 2. Security Hardening (AUDIT-SEC-001 TRUTH-1)

- `src/lib/auth/clerkJwt.ts` (new) `jose` JWKS verify cached 1h, `getSessionUser:8` async `verifyClerkJwt` + `alg≠none` + `user_*` + `exp/iat`
- `src/middleware.ts:109` async `await parseSessionToken`, RSC now `await` + still `isProtectedApi` 401 JSON (no bypass), onboarding via verified `payload.public_metadata`
- `src/lib/auth/helpers:14` + 15 routes `await parseSessionToken`
- `src/lib/db/supabase.ts:139` `_validateIdentifier` + table/col checks (SQLi fix)
- `src/lib/csrf` tightened same-host only, `src/middleware` exact host
- `src/lib/db/supabase-admin:6` pooler regex `postgres.<20>` for `pooler.supabase.com`

## 3. Product Truth Fixes

- **TRUTH-3 venue_spend** `src/lib/bookings/pricing:32` `computeVenueSpendEntitlement` display-only, never subtracted, `breakdown.venueSpendEntitlementKobo` added
- **TRUTH-10 Paystack** `pricing:140` `min(1.5%+₦100,2000)` waived `<2500`
- **TRUTH-5 pending_approval** `src/app/api/bookings:148` capacity `pending_approval` 48h (was `awaiting_payment`), exclusive stays `awaiting_payment`
- **State-machine** `src/lib/bookings/state-machine:123` optimistic `eq(status, old)` + `maybeSingle` check (`CODE-001`)
- **Booking race** `src/app/api/bookings:77` atomic claim `eq(state active)` + fresh `slots` `gte(capacity)` (was stale read)
- **getUser** `src/lib/auth/getUser:18` no longer `catch{return null}` on DB outage → throw `503`
- **Listings cache** `src/lib/db/supabase-utils:27` `privateOk` vs `cachedOk` `src/app/api/listings:73` draft not cached public
- **Cron** `vercel.json:3` `0 0` → `*/5` + `auto-suspend`
- **Complete-profile** `src/app/api/auth/complete-profile:1` `getRedirectPath` (A8)
- **Checkout** already uses `POST /api/pricing/preview` server price (A10)

## 4. WAT Timezone (AUDIT-UI-002 E1)

- `src/lib/formatWAT.ts` new, 21 files patched: `toLocale*(en-NG,{timeZone:Africa/Lagos})` — `dashboard`, `host/bookings`, `listings/[id]/checkout`, `bookings/[id]`, `group-plans`, `calendar`, `admin/audit`, `viewings`, etc.

## 5. Housing Monthly Model (HOUS-001 §41)

- `src/lib/pricing/housing:22` added `computeHousingMonthlyPriceKobo` monthly 6/12 lease discounts + backward nightly compat

## 6. Notifications

- `src/lib/notifications:16` respects `notification_preferences` (channel/type/quiet hours), `src/app/api/viewings:194` via `sendNotification`

## 7. Build / Config

- `next.config.ts:6` `*.supabase` → `**.supabase`
- `package.json` + `package-lock.json` added `jose@6.1.3`
- `vercel.json` + `src/lib/db/supabase.ts` + `src/app/api/search:98` `.catch` + `src/app/api/payments/initiate:48` `VERCEL_URL` fallback

## 8. PDSS Status

- **A1** shortlet routing, **A2** listing, **A4** commission, **A5/A6** dashboard statuses — already DONE, verified
- **A3** reserve → already uses `computeCapacityPriceKobo`, **A7** route protection → DONE via middleware, **A9** debug deleted, **A10** preview DONE
- **P0** all DONE. Remaining P2 (Outdoor exclusive UI already DONE `listings/new:179`, structured description 4/6 fields, group share `C24`, check-in token `C25`, dashboard per-type `C26`) tracked for next sprint — not blocking fetch

## 9. Tests & Deployed State

- `npm test` 36/36 pass, dev `LISTENING 0.0.0.0:3000`, `GET /sign-in` 200, guest `POST /api/chat` 200
- Branch: `main` (or current), pushed to `origin https://github.com/Sawmod001/HOSTME.git`
- Next step as requested: **homepage frontend only** — no backend/auth/bookings changes unless needed for homepage data

---
*Checkpoint commit below includes all above. Next: send homepage redesign details.*
