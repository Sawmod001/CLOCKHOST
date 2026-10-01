# Migration Quick Reference — Complete Guide

## What Is a Migration?

A **migration** is a file containing SQL commands that change your database structure. Think of it as a "recipe" for updating your database.

When you run a migration, the database:
1. Reads the SQL commands
2. Executes them in order
3. Applies the changes permanently

---

## Why Two Phases?

### Phase 1: Critical Safety (Run First)

**Purpose:** Fix dangerous bugs that could cause data loss or security issues.

**What it fixes:**

| Bug | What Could Happen | Fix |
|-----|-------------------|-----|
| Race condition | Two guests book the same slot | Atomic database function |
| Missing statuses | App crashes on unknown states | 12-state status system |
| No idempotency | Duplicate bookings created | Idempotency key column |
| No CSRF | Hackers manipulate your app | Origin validation |
| Fake webhooks | Fraudsters get free bookings | Server-side verification |
| Exclusive lock errors | Real bookings marked as lost | Error classification |

**Risk level:** HIGH if not run. These are active bugs.

**Run this:** `supabase/migration-phase1.sql`

---

### Phase 2: New Features (Run After Phase 1)

**Purpose:** Add features that were designed but not implemented.

**What it adds:**

| Feature | What It Does | Why It Matters |
|---------|--------------|----------------|
| Availability Rules | Store when listings are open | Better search, auto-close |
| Configurable Pricing | Discounts, commissions | Flexible business model |
| Outdoor Space | New listing type | Covers more use cases |
| Structured Descriptions | Organized listing info | Better search/display |
| One Listing Trigger | Enforce business rule | Prevents abuse |
| Gateway Fee Tracking | Record Paystack fees | Accurate accounting |

**Risk level:** LOW. These are new features, not bug fixes.

**Run this:** `supabase/migration-phase2.sql`

---

## Order of Operations

```
1. Back up your database
   ↓
2. Run Phase 1 SQL in Supabase SQL Editor
   ↓
3. Verify app works (test bookings, payments)
   ↓
4. Run Phase 2 SQL in Supabase SQL Editor
   ↓
5. Verify new features (test pricing, availability)
```

---

## Detailed Concept Explanations

### What Is a Race Condition?

**Simple explanation:** Two people trying to do the same thing at the same time, and both think they succeeded.

**Real-world example:**
- Two guests try to book the same venue slot at 2:00 PM
- Both check if the slot is available → Both see "Available"
- Both submit their bookings → Both succeed
- Result: DOUBLE BOOKING — one slot, two guests

**How we fixed it:**
We created an **atomic function** that does everything in one step:
1. Lock the slot (prevent others from reading it)
2. Check availability
3. Create the booking
4. Mark the slot as taken
5. Release the lock

Now it's impossible for two guests to book the same slot.

---

### What Is CSRF?

**Simple explanation:** A hacker tricks your browser into making requests to a website you're logged into.

**Real-world example:**
1. You're logged into ClockHost
2. You visit a malicious website
3. That website has hidden code that sends a request to ClockHost
4. Your browser automatically attaches your login cookie
5. ClockHost thinks it's you and performs the action

**How we fixed it:**
We added **origin validation** to all mutation routes:
- Check the `Origin` header on every request
- If it doesn't match our website, reject it
- Hackers can't send requests from their malicious sites

---

### What Is Idempotency?

**Simple explanation:** Making sure the same request doesn't create duplicate results.

**Real-world example:**
1. Guest clicks "Submit Booking"
2. Network is slow, nothing happens
3. Guest clicks "Submit Booking" again
4. Without idempotency: TWO bookings created
5. With idempotency: Only ONE booking created

**How we fixed it:**
We added an `idempotency_key` column:
- Client generates a unique key for each request
- Server checks: "Have I seen this key before?"
- If YES: Return existing result (don't create duplicate)
- If NO: Process the request and store the key

---

### What Is verifyTransaction?

**Simple explanation:** Checking with Paystack directly to confirm a payment actually happened.

**Real-world example:**
1. Hacker sends a fake webhook to your server
2. The webhook says "Payment successful for ₦100,000"
3. Without verification: You confirm the booking
4. The guest gets the booking without paying
5. With verification: You ask Paystack "Did this payment happen?"
6. Paystack says "No" → You reject the webhook

**How we fixed it:**
We added a server-side check:
```javascript
const verification = await verifyTransaction(txRef);
if (verification.status !== "success") {
  return fail("Payment not verified");
}
```

---

### What Is an Atomic Operation?

**Simple explanation:** Doing multiple things as one indivisible unit. Either ALL succeed or ALL fail.

**Real-world example:**
Without atomicity:
1. Check capacity → OK
2. Create booking → SUCCESS
3. Update slot → FAIL (database error)
4. Result: Booking exists but slot not updated → INCONSISTENT

With atomicity:
1. All three steps happen as one unit
2. If ANY step fails, ALL are undone
3. Result: Either everything is correct or nothing changed

**How we fixed it:**
We created PostgreSQL functions that run in a single transaction:
```sql
BEGIN
  -- All steps here
COMMIT
```

If anything fails, PostgreSQL automatically rolls back everything.

---

### What Are Availability Rules?

**Simple explanation:** A schedule that says when a listing is open for bookings.

**Real-world example:**
A venue is open:
- Monday-Friday: 9 AM - 5 PM
- Saturday: 10 AM - 10 PM
- Sunday: Closed

This is stored as 6 rows in the `availability_rules` table:
```sql
(1, '09:00', '17:00')  -- Monday
(2, '09:00', '17:00')  -- Tuesday
(3, '09:00', '17:00')  -- Wednesday
(4, '09:00', '17:00')  -- Thursday
(5, '09:00', '17:00')  -- Friday
(6, '10:00', '22:00')  -- Saturday
```

**How it's used:**
- Guest searches for "venues open now" → Only matching listings shown
- Host tries to book outside hours → Rejected: "Venue is closed"

---

### What Is Configurable Pricing?

**Simple explanation:** Allowing each listing to have its own pricing rules instead of a fixed 5% commission.

**Real-world example:**
- Venue A: 5% commission (default)
- Venue B: 3% commission (negotiated for high volume)
- Venue C: 7% commission + ₦500 exclusive fee
- Venue D: 5% commission + 10% discount for 5+ guests

**How it works:**
Each listing has pricing columns:
```sql
commission_rate_percent = 5.00
exclusive_flat_fee_kobo = 50000
multi_guest_discount_percent = 10
hourly_discount_tiers = '[{"minHours": 4, "percent": 5}]'
```

The pricing engine reads these values and calculates the final price.

---

### What Is the One Listing Per Provider Rule?

**Simple explanation:** Each host can only have ONE active listing at a time.

**Real-world example:**
- Host creates "Lekki Beach House" → OK
- Host tries to create "Victoria Island Loft" → REJECTED
- Host must archive "Lekki Beach House" first → THEN create "Victoria Island Loft"

**How we enforce it:**
Two layers:
1. **Database index** — Prevents duplicates at the database level
2. **Trigger** — Provides a clear error message

---

## Verification Checklist

### After Running Phase 1:
- [ ] Can create a booking
- [ ] Can approve/reject bookings
- [ ] Can cancel bookings (guest and host)
- [ ] Payments work (initiate + webhook)
- [ ] No double-bookings possible
- [ ] Exclusive bookings work
- [ ] Booking statuses display correctly

### After Running Phase 2:
- [ ] Can create listings with `outdoor_space` type
- [ ] Pricing tiers work (multi-guest, hourly)
- [ ] Availability rules can be created
- [ ] Structured descriptions display on listing pages
- [ ] Only one listing per provider enforced
- [ ] Commission rate is configurable
- [ ] Gateway fees are tracked

---

## What If Something Goes Wrong?

### Before Running
- Take a backup in Supabase Dashboard → Database → Backups

### After Running Phase 1
- If app breaks: Check the error message
- Common issue: Code still uses old statuses (e.g., "pending" instead of "pending_approval")
- Fix: Update the code to handle new statuses

### After Running Phase 2
- If new features don't work: Check the column types
- Common issue: Code expects a different JSON structure
- Fix: Check the structured_description format

### Emergency Rollback
- Go to Supabase Dashboard → Database → Backups
- Restore to the backup you took before running migrations
- This will undo ALL changes

---

## Common Questions

### Q: Can I run Phase 2 without Phase 1?
**A:** No. Phase 2 depends on Phase 1's changes (especially the status rename).

### Q: Can I run Phase 1 multiple times?
**A:** Yes. All commands use `IF NOT EXISTS` or `IF EXISTS`, so they're idempotent.

### Q: Will this delete my existing data?
**A:** No. We only ADD columns and tables. We never DELETE data.

### Q: How long does it take?
**A:** Usually under 1 minute for both phases combined.

### Q: Do I need to restart my app?
**A:** No. The database changes are immediate. But you should test to make sure everything works.

### Q: What if I get an error?
**A:** Read the error message carefully. It will tell you which line failed and why. If you're stuck, ask for help with the specific error message.
