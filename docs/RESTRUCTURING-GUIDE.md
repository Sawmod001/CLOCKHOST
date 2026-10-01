# ClockHost — Restructuring & Rebuilding Guide

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Assessment](#current-state-assessment)
3. [Recommended Architecture](#recommended-architecture)
4. [Phase 1: Fix Critical Issues](#phase-1-fix-critical-issues)
5. [Phase 2: Simplify Booking Engine](#phase-2-simplify-booking-engine)
6. [Phase 3: Modernize Tech Stack](#phase-3-modernize-tech-stack)
7. [Phase 4: Production Readiness](#phase-4-production-readiness)
8. [Global Standards Comparison](#global-standards-comparison)
9. [Implementation Roadmap](#implementation-roadmap)

---

## Executive Summary

ClockHost has a solid foundation: PostgreSQL with PostGIS, atomic booking functions, two distinct booking engines, and a modern Next.js frontend. However, the codebase has accumulated complexity that makes it hard to maintain and extend. This guide provides a phased approach to restructuring for global standards.

**Key principle**: Simplify first, then build. Don't add features on top of a complex foundation.

---

## Current State Assessment

### What Works Well
- ✅ Atomic booking functions in Postgres (`reserve_capacity_slot`, `resolve_exclusive_lock`)
- ✅ Idempotent payment webhooks with `processed_webhooks` table
- ✅ Soft hold TTL prevents indefinite capacity holding
- ✅ Group booking with crowdfunded shares
- ✅ Zod validation on all inputs
- ✅ Server-side pricing (never client-supplied totals)
- ✅ Clerk auth with role-based access control

### What Needs Work
- ❌ Two completely separate booking flows (capacity vs exclusive)
- ❌ Over-complex soft hold → booking two-step process
- ❌ Group booking not production-ready
- ❌ No email notifications
- ❌ Client-side rendering for all pages (no SEO)
- ❌ Custom Supabase client instead of official SDK
- ❌ No real-time updates
- ❌ No monitoring or error tracking
- ❌ In-memory rate limiting (ineffective on Vercel)

---

## Recommended Architecture

### Target Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│  Next.js 16 App Router + Server Components           │
│  Tailwind CSS v4 + Shadcn UI                        │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  API Layer                           │
│  Route Handlers + Middleware                         │
│  Zod Validation + Clerk Auth                         │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               Business Logic                         │
│  Booking Engine (unified flow)                       │
│  Pricing Service                                     │
│  Notification Service                                │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  Data Layer                          │
│  Supabase PostgreSQL + PostGIS                       │
│  Supabase Storage                                    │
│  Upstash Redis (rate limiting + caching)             │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│               External Services                      │
│  Clerk (auth)                                        │
│  Paystack (payments)                                 │
│  Resend (email)                                      │
│  Vercel (deployment)                                 │
└─────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Unified Booking Flow**: One flow for all booking types. Host approves, then guest pays. No separate capacity/exclusive paths.

2. **Server Components by Default**: Every page loads data server-side. Client components only for interactivity.

3. **Official Supabase SDK**: Replace custom PgQuery with `@supabase/supabase-js` for type safety and maintainability.

4. **Email Notifications**: Use Resend for transactional emails (booking confirmations, approvals, receipts).

5. **Redis for Rate Limiting**: Use Upstash Redis for distributed rate limiting that works on Vercel.

---

## Phase 1: Fix Critical Issues

**Timeline**: 1-2 days
**Risk**: Low
**Impact**: High

### 1.1 Fix Auth Gate (DONE)
- Fixed race condition in `gate()` function
- Added gate to all unprotected CTAs
- Fixed button navigation for authenticated users

### 1.2 Fix Reviews API (DONE)
- Simplified Supabase query to avoid broken foreign key join

### 1.3 Fix addOns Shape (DONE)
- Added `Array.isArray()` check before accessing `.length`

### 1.4 Fix Title Whitespace (DONE)
- Added `.trim()` on title in create and update API routes

### 1.5 Create Time Slots for Listings
- Write a seed script or admin UI for creating recurring time slots
- Default slots: 10:00-13:00, 14:00-17:00, 18:00-21:00

---

## Phase 2: Simplify Booking Engine

**Timeline**: 1-2 weeks
**Risk**: Medium
**Impact**: Very High

### 2.1 Unify Booking Flow

**Current**: Two separate flows
- Capacity: checkout → soft hold → booking → payment
- Exclusive: exclusive-request → booking (pending) → approve → payment → lock resolve

**Proposed**: One unified flow
```
Guest selects time → Clicks "Book" → Booking created (pending approval)
→ Host approves → Guest pays → Booking confirmed
```

This eliminates:
- Soft hold complexity
- Separate exclusive-request page
- Separate checkout page
- Branching webhook logic

### 2.2 Remove Soft Hold Layer

**Current**: Two-step process (hold → booking)
**Proposed**: Single atomic booking creation

The soft hold was designed to prevent overselling during the payment window. But the atomic `reserve_capacity_slot()` function already handles this. The hold is redundant.

**New flow**:
1. Guest clicks "Book" → booking created with status "pending_approval"
2. Host approves → status changes to "awaiting_payment"
3. Guest pays → status changes to "confirmed"
4. If slot becomes full during this time, the atomic function rejects the reservation

### 2.3 Simplify Exclusive Bookings

**Current**: Exclusive locks are separate database objects with race conditions
**Proposed**: Use the same booking flow as capacity

For exclusive listings:
1. Guest selects time window → booking created (pending_approval)
2. Host approves → status changes to "awaiting_payment"
3. Guest pays → booking confirmed
4. No lock needed — the host approved specifically for this guest

This eliminates the entire `exclusive_locks` table and `resolve_exclusive_lock()` function.

### 2.4 Simplify Group Booking

**Current**: Complex crowdfunded flow with plan_members, finalize, etc.
**Proposed**: Two options

**Option A (Recommended)**: Remove group booking entirely
- It's not production-ready
- No real payments, no notifications
- High complexity for low usage
- Rebuild later when the core platform is solid

**Option B**: Keep but simplify
- Remove the finalize mechanism
- Each member pays independently
- When all members have paid, auto-create the booking
- Use a simpler "group code" instead of invite links

---

## Phase 3: Modernize Tech Stack

**Timeline**: 2-3 weeks
**Risk**: Medium
**Impact**: High

### 3.1 Migrate to Server Components

**Current**: All pages are `"use client"` with `useEffect` + `fetch()`
**Proposed**: Server Components by default

```tsx
// BEFORE (client component)
"use client";
export default function ListingsPage(): React.JSX.Element {
  const [listings, setListings] = useState<Listing[]>([]);
  useEffect(() => {
    fetch("/api/listings").then((r: Response) => r.json()).then((d: { data: Listing[] }) => setListings(d.data));
  }, []);
  return <div>{listings.map((l: Listing) => <ListingCard key={l.id} listing={l} />)}</div>;
}

// AFTER (server component)
import { listListings } from "@/lib/db/supabase-queries";
export default async function ListingsPage(): Promise<React.JSX.Element> {
  const listings: Listing[] = await listListings({ status: "active" });
  return <div>{listings.map((l: Listing) => <ListingCard key={l.id} listing={l} />)}</div>;
}
```

Benefits:
- SEO (pages render with data on first load)
- No loading spinners
- Better performance
- Smaller client bundle

### 3.2 Replace Custom Supabase Client

**Current**: Custom `PgQuery` class
**Proposed**: Official `@supabase/supabase-js`

```ts
// BEFORE
import { supabase } from "@/lib/db/supabase";
const { data }: { data: Listing[] | null } = await supabase.from("listings").select().eq("id", id).maybeSingle();

// AFTER
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const { data }: { data: Listing | null } = await supabase.from("listings").select("*").eq("id", id).single();
```

### 3.3 Add Email Notifications

Use Resend for transactional emails:

```ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

// On booking confirmed
await resend.emails.send({
  from: "ClockHost <bookings@clockhost.ng>",
  to: guest.email,
  subject: "Booking Confirmed",
  template: "booking-confirmed",
  props: { listing, booking, guest },
});
```

Templates needed:
- Booking confirmed (guest + host)
- Booking approved (guest)
- Booking rejected (guest)
- Payment receipt (guest)
- Group plan invite (members)
- Booking reminder (24h before event)

### 3.4 Add Image Optimization

Replace `<img>` with Next.js `<Image>`:

```tsx
// BEFORE
<img src={listing.media[0]} alt={listing.title} className="h-full w-full object-cover" />

// AFTER
import Image from "next/image";
<Image
  src={listing.media[0]}
  alt={listing.title}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
  className="object-cover"
/>
```

### 3.5 Add Redis Rate Limiting

Replace in-memory rate limiter with Upstash Redis:

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 h"),
});

export async function rateLimitOk(identifier: string): Promise<boolean> {
  const { success }: { success: boolean } = await ratelimit.limit(identifier);
  return success;
}
```

---

## Phase 4: Production Readiness

**Timeline**: 2-4 weeks
**Risk**: Low
**Impact**: Medium

### 4.1 Add Error Tracking

Integrate Sentry for error monitoring:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
});
```

### 4.2 Add Monitoring Dashboards

Track key metrics:
- Bookings per day/week/month
- Revenue per listing
- Conversion rate (listing view → booking)
- Payment success rate
- Average booking value

### 4.3 Add CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

### 4.4 Add Database Migrations

Use a proper migration system:

```bash
npx supabase migration new add_notifications_table
# Edit the migration file
npx supabase db push
```

### 4.5 Add Environment Variable Documentation

Create `.env.example`:

```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...

# Auth
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...

# Payments
PAYSTACK_SECRET_KEY=...
PAYSTACK_PUBLIC_KEY=...

# Email
RESEND_API_KEY=...

# AI
GEMINI_API_KEY=...

# Monitoring
SENTRY_DSN=...
```

---

## Global Standards Comparison

### How Peerspace Does It

| Aspect | Peerspace | ClockHost (Current) | ClockHost (Proposed) |
|--------|-----------|-------------------|-------------------|
| Booking flow | Single "Request to Book" | Two separate flows | Single unified flow |
| Payment | Stripe (pre-authorization) | Paystack (webhook) | Paystack (webhook) |
| Host approval | Required for all bookings | Only for exclusive | Required for all |
| Cancellation | 24h policy, automated | Manual only | Automated with policy |
| Reviews | Post-booking, verified | Post-booking, verified | Post-booking, verified |
| Search | Location + date + capacity | Keyword + filters | Location + date + capacity |
| Mobile app | Yes (iOS + Android) | No | PWA (Phase 4) |

### How Airbnb Does It

| Aspect | Airbnb | ClockHost (Current) | ClockHost (Proposed) |
|--------|--------|-------------------|-------------------|
| Instant book | Yes (for some listings) | No | Optional |
| Pricing | Dynamic (seasonal, demand) | Fixed hourly | Fixed hourly (Phase 4: dynamic) |
| Messaging | In-app messaging | None | In-app messaging (Phase 4) |
| Superhost | Quality program | None | None (Phase 4) |

### How Tagvenue Does It

| Aspect | Tagvenue | ClockHost (Current) | ClockHost (Proposed) |
|--------|----------|-------------------|-------------------|
| Venue types | 40+ sub-types | 4 sub-verticals | Expandable |
| Booking types | Shared + Private | Capacity + Exclusive | Unified |
| Instant quote | Yes | No | Yes |
| Venue tours | Virtual tours | Photos only | Photos + video |

---

## Implementation Roadmap

### Week 1-2: Foundation
- [ ] Fix all critical bugs (Phase 1 - DONE)
- [ ] Unify booking flow (Phase 2.1)
- [ ] Remove soft hold layer (Phase 2.2)
- [ ] Simplify exclusive bookings (Phase 2.3)

### Week 3-4: Modernization
- [ ] Migrate to Server Components (Phase 3.1)
- [ ] Replace custom Supabase client (Phase 3.2)
- [ ] Add image optimization (Phase 3.4)

### Week 5-6: Production
- [ ] Add email notifications (Phase 3.3)
- [ ] Add Redis rate limiting (Phase 3.5)
- [ ] Add error tracking (Phase 4.1)
- [ ] Add CI/CD pipeline (Phase 4.3)

### Week 7-8: Polish
- [ ] Add monitoring dashboards (Phase 4.2)
- [ ] Add database migrations system (Phase 4.4)
- [ ] Add environment documentation (Phase 4.5)
- [ ] Performance testing and optimization

### Future Phases
- Phase 5: In-app messaging
- Phase 6: Dynamic pricing
- Phase 7: Mobile PWA
- Phase 8: Virtual tours
- Phase 9: Superhost program

---

## Vertical Naming Recommendations

Based on industry research (Peerspace, Splacer, Giggster, Tagvenue, Airbnb):

| Current | Recommended | Rationale |
|---------|-------------|-----------|
| `venue` | `spaces` | Industry standard; broader, more inclusive |
| `housing` | `stays` | Airbnb uses "Stays"; modern, intuitive |
| `capacity` | `per_seat` | "Capacity" is backend term; "Per-Seat" communicates pay-per-head |
| `exclusive` | Keep enum, label "Private Hire" | "Private Hire" is global standard |
| `exclusive_space` | `private_event` | Avoids confusion with booking type |
| `group_night` | `hangout` | Natural Nigerian usage |

### Sub-Vertical Improvements

| Current | Recommended | Rationale |
|---------|-------------|-----------|
| `birthday` | `birthday` (no change) | Universal term |
| `exclusive_space` | `private_event` | Avoids confusion with booking type |
| `karaoke` | `karaoke` (no change) | Distinct activity type |
| `group_night` | `hangout` | More natural Nigerian usage |

---

## Cost Estimates

### Monthly Infrastructure Costs (Vercel + Supabase)

| Service | Current | Proposed |
|---------|---------|----------|
| Vercel Pro | $20/mo | $20/mo |
| Supabase Pro | $25/mo | $25/mo |
| Upstash Redis | - | $10/mo |
| Resend (email) | - | $20/mo |
| Sentry | - | $26/mo |
| Domain | ~$15/yr | ~$15/yr |
| **Total** | **~$45/mo** | **~$101/mo** |

### Development Effort

| Phase | Effort | Impact |
|-------|--------|--------|
| Phase 1: Fix bugs | 1-2 days | Critical |
| Phase 2: Simplify booking | 1-2 weeks | Very High |
| Phase 3: Modernize | 2-3 weeks | High |
| Phase 4: Production | 2-4 weeks | Medium |
| **Total** | **6-9 weeks** | **Complete overhaul** |
