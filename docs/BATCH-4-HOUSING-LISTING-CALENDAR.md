# Batch 4: Housing Listing + Calendar — Complete

## What Was Built

Housing listing support with nightly pricing, date-range availability, blocked dates calendar, and guest-facing housing detail page.

---

## Housing vs Venue Differences

| Aspect | Venue | Housing |
|---|---|---|
| Pricing | Hourly rate (`baseRatePerHour`) | Nightly rate (`housingDetails.nightlyRateKobo`) |
| Booking type | Capacity or Exclusive | Always Exclusive (entire property) |
| Availability | Slots (capacity) or Locks (exclusive) | Blocked dates calendar |
| Check-in/out | Event start/end times | Configurable times (default 2PM/11AM) |
| Stay rules | None | Min/max stay nights |
| Fees | None | Optional cleaning fee |
| Service fee | 5% | 5% |

---

## Schema Changes

### New table: `blocked_dates`
```sql
blocked_dates (
  id UUID PK,
  listing_id UUID FK -> listings(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason TEXT DEFAULT 'host_blocked',
  booking_id UUID FK -> bookings(id) DEFAULT NULL,
  created_at TIMESTAMPTZ,
  UNIQUE(listing_id, blocked_date)
)
```
- `reason`: `host_blocked` (host manually blocked) or `booking` (auto-blocked by booking)
- `booking_id`: NULL for host-blocked, set for booking-blocked
- Hosts can only delete host-blocked dates (not booking-blocked)

### New function: `check_housing_availability(p_listing_id, p_check_in, p_check_out)`
- Returns `{ available: boolean, blocked_dates: DATE[] }`
- Checks range `[checkIn, checkOut)` — check-out is exclusive

### RLS policies on `blocked_dates`:
- Public read (all users can see blocked dates for availability)
- Provider insert/delete own (host manages their calendar)

---

## Files Changed

### New Files
| File | Purpose |
|---|---|
| `src/lib/pricing/housing.ts` | `computeHousingPriceKobo()` + `validateStayDuration()` |
| `src/app/api/listings/[id]/blocked-dates/route.ts` | GET (list month), POST (block dates), DELETE (unblock) |
| `src/app/(host)/host/listings/[id]/calendar/page.tsx` | Interactive calendar UI for hosts |

### Modified Files
| File | Change |
|---|---|
| `supabase/migration.sql` | Added `blocked_dates` table, `check_housing_availability()` function, RLS policies |
| `src/lib/validation.ts` | Added `HousingDetailsSchema`, `ListingCreateSchema` refined for housing vs venue, `ListingUpdateSchema` manually defined (not `.partial()`) |
| `src/app/api/listings/[id]/availability/route.ts` | Rewritten for housing: date-range check with min/max stay validation |
| `src/app/(host)/host/listings/new/page.tsx` | Housing: nightly rate, weekly rate, cleaning fee, check-in/out times, min/max stay, max guests, house rules. Auto-sets bookingType to "exclusive" for housing. |
| `src/app/(host)/host/listings/[id]/page.tsx` | Added housingDetails to edit state, housing pricing section, "Manage Calendar" link for housing |
| `src/app/(public)/listings/[id]/page.tsx` | Housing: per-night pricing, housing-specific details (max guests, check-in/out, min stay, cleaning fee), house rules, availability calendar legend |
| `src/app/api/listings/route.ts` | Passes `housingDetails` to create |

---

## Housing Pricing Engine

`computeHousingPriceKobo({ nightlyRateKobo, weeklyRateKobo, cleaningFeeKobo, nights })`

```
nightlyTotal = nightlyRate × nights
If weeklyRate set and nights >= 7:
  weeklyDiscount = (nightlyRate × nights) - (weeklyRate × fullWeeks + nightlyRate × remaining)
subtotal = nightlyTotal - weeklyDiscount + cleaningFee
serviceFee = subtotal × 5%
total = subtotal + serviceFee
```

---

## Host Calendar Management

`/host/listings/[id]/calendar`
- Interactive month grid with navigation
- Click dates to select → "Block N Dates" button
- Red badges on blocked dates
- Unblock button (only for host-blocked, not booking-blocked)
- Checks for existing bookings before blocking (won't block dates with active bookings)
- Shows all blocked dates in a list below calendar

## Availability Check

`GET /api/listings/[id]/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD`
- Returns `{ available, nights, blockedDates, reason }`
- Validates min/max stay before checking database
- Used by guest-facing listing detail page

---

## Listing Create Form (Housing)

When vertical = "housing":
- Booking type auto-set to "Exclusive" (hidden dropdown)
- Pricing shows: Nightly Rate, Weekly Rate (optional), Cleaning Fee (optional), Max Guests
- Time Allowances section replaced with: Check-in Time, Check-out Time, Min Stay, Max Stay, House Rules
- BYOB toggle hidden
- Max Capacity field uses maxGuests from housingDetails

---

## Listing Detail Page (Housing)

- Shows "per night" pricing with optional weekly rate
- Details grid: Max Guests, Check-in/out times, Min Stay, Max Stay (if set), Cleaning Fee (if > 0), Cancellation
- House Rules section (if provided)
- Availability calendar with "available/blocked" legend
- Stay Details section with nightly rate, cleaning fee, check-in/out times

---

## Build Status

✅ Build passes — all routes registered:
- `/host/listings/[id]/calendar` — host calendar management
- `/api/listings/[id]/blocked-dates` — block/unblock API
- `/api/listings/[id]/availability` — availability check API
