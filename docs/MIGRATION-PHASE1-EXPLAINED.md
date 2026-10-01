# Migration Phase 1 — Critical Safety (Complete Explanation)

## File: `supabase/migration-phase1.sql`

This migration fixes **dangerous bugs** that could cause:
- Double-bookings (two guests booking the same slot)
- Lost payments (money taken but booking not created)
- Security holes (hackers manipulating data)

---

## What Is a "Race Condition"?

### The Problem

Imagine two guests trying to book the same venue slot at the same time:

```
Time 0: Guest A checks if slot is available → YES
Time 1: Guest B checks if slot is available → YES (still available!)
Time 2: Guest A books the slot → SUCCESS
Time 3: Guest B books the slot → SUCCESS (DOUBLE BOOKING!)
```

Both guests think they booked successfully, but only one slot exists. This is a **race condition** — when two processes race to do the same thing, and both think they won.

### The Fix

We created an **atomic database function** that does everything in one step:

```sql
-- This happens ALL AT ONCE, not step-by-step
1. Lock the row (prevent others from reading it)
2. Check if available
3. Create the booking
4. Mark the slot as taken
5. Release the lock
```

Now when Guest B tries to book, Guest A's booking has already locked the row. Guest B gets an error: "Slot no longer available."

---

## What Are "Missing Statuses"?

### The Problem

The original code only had 7 booking statuses:
```
pending, awaiting_payment, confirmed, completed, cancelled, rejected, lost_race
```

But the real booking lifecycle needs 12 states:

| Status | Meaning |
|--------|---------|
| `pending_approval` | Guest submitted, waiting for host to approve |
| `awaiting_payment` | Host approved, guest needs to pay |
| `payment_processing` | Paystack is processing the payment |
| `confirmed` | Payment successful, booking is final |
| `checked_in` | Guest arrived at the venue |
| `completed` | Event is over |
| `cancelled_by_guest` | Guest cancelled |
| `cancelled_by_host` | Host cancelled |
| `cancelled_system` | Auto-cancelled (e.g., payment timeout) |
| `expired` | Booking expired before payment |
| `rejected` | Host rejected the request |
| `lost_race` | Another guest booked first |

### Why This Matters

Without proper statuses:
- You can't tell WHO cancelled (guest vs host vs system)
- You can't track check-ins
- You can't tell if payment is processing
- The app crashes when it sees an unknown status

### The Fix

We updated the database to allow all 12 statuses:
```sql
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN (
    'pending_approval',
    'awaiting_payment',
    'payment_processing',
    'confirmed',
    'checked_in',
    'completed',
    'cancelled_by_guest',
    'cancelled_by_host',
    'cancelled_system',
    'expired',
    'rejected',
    'lost_race'
  ));
```

---

## What Is "CSRF"?

### The Problem

CSRF (Cross-Site Request Forgery) is an attack where:
1. You're logged into ClockHost
2. You visit a malicious website
3. That website secretly sends a request to ClockHost
4. ClockHost thinks it's you and performs the action

Example: A malicious site could silently cancel your bookings or change your settings.

### How CSRF Works

When you're logged in, your browser sends a **cookie** with every request. The cookie proves "this is the real user." But any website can send requests to ClockHost, and your browser will automatically attach the cookie.

### The Fix

We added CSRF validation to all mutation routes (POST, PUT, DELETE):

```javascript
import { validateCsrfOrigin } from "@/lib/csrf";

export async function POST(request) {
  // Check if this request came from our own website
  const csrfFail = validateCsrfOrigin(request);
  if (csrfFail) return csrfFail;  // Block if not from our site
  
  // ... rest of the code
}
```

The validation checks:
1. Does the request have an `Origin` header?
2. Does the `Origin` match our website's domain?
3. If not, reject the request

---

## What Is "Idempotency"?

### The Problem

Sometimes the same request gets sent twice:
- User clicks "Submit" twice quickly
- Network timeout causes retry
- Webhook from Paystack arrives twice

Without idempotency, each request creates a new booking. You end up with duplicates.

### The Fix

We added an `idempotency_key` column:

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
```

Now when a booking is created:
1. Client generates a unique key (e.g., `abc-123-def-456`)
2. Server checks: "Have I seen this key before?"
3. If YES: Return the existing booking (don't create duplicate)
4. If NO: Create the booking and store the key

---

## What Is "verifyTransaction"?

### The Problem

The webhook handler was trusting the payment data from Paystack without verifying it. A hacker could:
1. Send a fake webhook to your server
2. Claim a payment was successful
3. Your server confirms the booking
4. The guest gets the booking without paying

### The Fix

We added server-side verification:

```javascript
// Before: Trust the webhook payload
await supabase.from("bookings").update({ status: "confirmed" })

// After: Verify with Paystack first
const verification = await verifyTransaction(txRef);
if (verification.status !== "success") {
  return fail("Payment not verified", 402);
}
await supabase.from("bookings").update({ status: "confirmed" })
```

Now the server asks Paystack directly: "Did this payment actually happen?"

---

## What Is "resolveExclusiveLock"?

### The Problem

Exclusive bookings (entire venue for one group) had a bug:
```javascript
catch (error) {
  // ANY error marks the booking as "lost_race"
  await supabase.from("bookings").update({ status: "lost_race" })
}
```

This meant a temporary database error would permanently mark the booking as lost. The guest loses their booking even though nothing was wrong.

### The Fix

We now distinguish between real conflicts and transient errors:

```javascript
catch (error) {
  const isRealRace = error?.code === "40001" || error?.code === "23505";
  if (!isRealRace) {
    // Transient error — try again later
    return { ok: false, error: "Please retry" };
  }
  // Real conflict — mark as lost
  await supabase.from("bookings").update({ status: "lost_race" })
}
```

---

## What Is "host_id"?

### The Problem

To find the host for a booking, the old code had to:
1. Look up the listing from the booking
2. Look up the provider_profile from the listing
3. Look up the user from the provider_profile

That's **3 database queries** for every booking!

### The Fix

We added a `host_id` column directly to the bookings table:

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES users(id);
```

Now finding the host is just **1 query**:
```javascript
const { data: booking } = await supabase
  .from("bookings")
  .select("host_id")
  .eq("id", bookingId);
```

---

## What Are "Check-in Tokens"?

### The Problem

When a guest arrives at a venue, how does the host know they're the real guest? They could show a screenshot of their booking confirmation.

### The Fix

We added a token system:

1. Before the event, the system generates a unique token
2. The token is sent to the guest (email/SMS)
3. The guest shows the token to the host
4. The host verifies it in the app

```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_token TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_token_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
```

---

## What Is "One Listing Per Provider"?

### The Problem

The design says each venue host can only list ONE space. But nothing in the database prevented them from creating multiple listings.

### The Fix

We added a database rule:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_listing_per_provider
  ON listings (provider_profile_id)
  WHERE status != 'archived';
```

This says: "For each provider_profile_id, there can only be ONE row where status is not 'archived'."

If a host tries to create a second active listing, the database rejects it with an error.

---

## What Is the "Atomic Booking Function"?

### The Problem

The old booking creation was done in multiple steps:
```javascript
// Step 1: Check capacity
const { data: slot } = await supabase.from("slots").select("capacity, booked")

// Step 2: Create booking
const { data: booking } = await supabase.from("bookings").insert(...)

// Step 3: Update slot
await supabase.from("slots").update({ booked: slot.booked + 1 })
```

Between Step 1 and Step 2, another request could sneak in and book the same slot.

### The Fix

We created a PostgreSQL function that does everything atomically:

```sql
CREATE OR REPLACE FUNCTION convert_hold_to_booking(...)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  -- ALL of this happens in ONE database transaction
  -- No other request can see intermediate states
  
  1. Lock the soft hold row
  2. Validate everything
  3. Create the booking
  4. Update the slot
  5. Log the transition
  
  RETURN result;
END;
$$;
```

Now it's impossible for two guests to book the same slot.

---

## Section-by-Section Breakdown

### Section 1: Transaction
```sql
BEGIN;
```
Start a transaction. Everything after this is one "unit of work."

### Section 2: Booking Statuses
```sql
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
  CHECK (status IN ('pending_approval', 'awaiting_payment', ...));
```
Replace the old 7-status constraint with a new 12-status constraint.

### Section 3: host_id Column
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES users(id);
UPDATE bookings SET host_id = ...;
ALTER TABLE bookings ALTER COLUMN host_id SET NOT NULL;
```
Add the host_id column, fill existing data, then make it required.

### Section 4: One Listing Index
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_listing_per_provider
  ON listings (provider_profile_id)
  WHERE status != 'archived';
```
Prevent multiple active listings per provider.

### Section 5: Exclusive Locks
```sql
ALTER TABLE exclusive_locks ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE exclusive_locks ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES listings(id);
```
Add expiration and listing reference to exclusive locks.

### Section 6: Payment Status
```sql
ALTER TABLE payment_records ADD CONSTRAINT payment_records_status_check
  CHECK (status IN ('pending', 'processing', 'successful', ...));
```
Add 'processing' to allowed payment statuses.

### Section 7: Idempotency Key
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;
```
Add column for preventing duplicate bookings.

### Section 8: Check-in Tokens
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_token TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_token_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
```
Add columns for guest verification at venues.

### Section 9: Listing Statuses
```sql
UPDATE listings SET status = 'under_review' WHERE status = 'pending_review';
ALTER TABLE listings ADD CONSTRAINT listings_status_check
  CHECK (status IN ('draft', 'submitted', 'under_review', ...));
```
Rename listing statuses to match the design spec.

### Section 10: Atomic Booking Function
```sql
CREATE OR REPLACE FUNCTION convert_hold_to_booking(...)
RETURNS JSONB LANGUAGE plpgsql AS $$ ... $$;
```
Create a function that atomically converts a soft hold to a booking.

### Section 11: Atomic Exclusive Function
```sql
CREATE OR REPLACE FUNCTION create_exclusive_booking(...)
RETURNS JSONB LANGUAGE plpgsql AS $$ ... $$;
```
Create a function that atomically creates an exclusive booking.

### Section 12: Cleanup Function
```sql
CREATE OR REPLACE FUNCTION cleanup_expired_holds_and_locks()
RETURNS INTEGER LANGUAGE plpgsql AS $$ ... $$;
```
Create a maintenance function for expired data.

### Section 13: WhatsApp RLS
```sql
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_sessions_admin_read ON whatsapp_sessions ...
```
Enable security on the whatsapp_sessions table.

### Section 14: Commit
```sql
COMMIT;
```
Save all changes permanently.

---

## Summary: What Phase 1 Fixed

| Problem | Solution | Impact |
|---------|----------|--------|
| Race condition (double bookings) | Atomic booking function | No more double-bookings |
| Missing statuses (7 → 12) | Updated CHECK constraint | Proper booking lifecycle |
| No idempotency | Added idempotency_key column | No duplicate bookings |
| CSRF vulnerability | Added validation to all routes | Prevents attack |
| Fake webhooks | Added verifyTransaction call | Prevents payment fraud |
| Exclusive lock errors | Distinguish race vs transient | Fewer lost bookings |
| Slow queries | Added host_id column | 3x faster queries |
| No check-in verification | Added token columns | Secure venue access |
| Multiple listings per provider | Added unique index | Enforces business rule |
