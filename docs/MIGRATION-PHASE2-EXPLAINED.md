# Migration Phase 2 — New Features (Complete Explanation)

## File: `supabase/migration-phase2.sql`

This migration adds **new features** that were designed but not implemented:
1. Structured availability rules (when listings are open)
2. Configurable pricing engine (discounts, commissions)
3. Outdoor space listing type
4. Structured descriptions (highlights, ideal for, etc.)

---

## What Are "Availability Rules"?

### The Problem

Previously, there was no structured way to say when a listing is available. Hosts could only say "I'm open" but not "I'm open Monday-Friday 9am-5pm."

This meant:
- Guests couldn't search by "open now"
- Hosts couldn't set different hours for different days
- The system couldn't auto-close bookings outside business hours

### The Solution

We created a new table called `availability_rules`:

```sql
CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
```

### How It Works

Each row represents one availability window:

| Column | Example | Meaning |
|--------|---------|---------|
| `listing_id` | `abc-123` | Which listing this rule is for |
| `day_of_week` | `1` | Monday (0=Sunday, 1=Monday, ..., 6=Saturday) |
| `start_time` | `09:00` | Opens at 9:00 AM |
| `end_time` | `17:00` | Closes at 5:00 PM |
| `is_active` | `true` | Rule is currently active |

### Example: A Venue Open Monday-Friday 9am-5pm

```sql
INSERT INTO availability_rules (listing_id, day_of_week, start_time, end_time) VALUES
  ('listing-uuid', 1, '09:00', '17:00'),  -- Monday
  ('listing-uuid', 2, '09:00', '17:00'),  -- Tuesday
  ('listing-uuid', 3, '09:00', '17:00'),  -- Wednesday
  ('listing-uuid', 4, '09:00', '17:00'),  -- Thursday
  ('listing-uuid', 5, '09:00', '17:00');  -- Friday
```

### Example: A Venue Open Weekends 10am-10pm

```sql
INSERT INTO availability_rules (listing_id, day_of_week, start_time, end_time) VALUES
  ('listing-uuid', 6, '10:00', '22:00'),  -- Saturday
  ('listing-uuid', 0, '10:00', '22:00');  -- Sunday
```

### How the App Uses This

When a guest searches for venues:
1. The app checks the current day and time
2. It queries `availability_rules` to find listings that are open now
3. Only matching listings are shown in search results

When a host creates a booking:
1. The app checks if the requested time falls within availability rules
2. If not, the booking is rejected: "Venue is not available at that time"

### Why "ON DELETE CASCADE"?

```sql
listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE
```

This means: "If the listing is deleted, delete all its availability rules too." You don't want orphaned rules for listings that no longer exist.

### Why the Trigger?

```sql
CREATE TRIGGER availability_rules_updated_at
  BEFORE UPDATE ON availability_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_rules_updated_at();
```

This automatically sets `updated_at` to the current time whenever a rule is modified. You always want to know when data was last changed.

---

## What Is "Configurable Pricing"?

### The Problem

The original pricing was hardcoded:
- 5% commission on all bookings
- No discounts for large groups
- No discounts for long bookings
- No special pricing for returning guests

This was too rigid for real-world use.

### The Solution

We added 5 new columns to the `listings` table:

```sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS commission_rate_percent NUMERIC(5,2) DEFAULT 5.00;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS exclusive_flat_fee_kobo INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS multi_guest_discount_percent NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS hourly_discount_tiers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS venue_spend_entitlement JSONB;
```

### How Each Column Works

#### 1. Commission Rate

```sql
commission_rate_percent NUMERIC(5,2) DEFAULT 5.00
```

**What:** The percentage the platform takes from each booking.

**Default:** 5% (same as before)

**Example:** A ₦100,000 booking → Platform gets ₦5,000

**Custom:** A host can negotiate a lower rate (e.g., 3% for high-volume venues)

---

#### 2. Exclusive Flat Fee

```sql
exclusive_flat_fee_kobo INTEGER DEFAULT 0
```

**What:** An extra fee added to exclusive bookings (entire venue rental).

**Why:** Exclusive bookings block ALL other bookings for that time. The host deserves extra compensation.

**Example:**
- Regular booking: ₦10,000/hour × 4 hours = ₦40,000
- Exclusive booking: ₦40,000 + ₦50,000 flat fee = ₦90,000

---

#### 3. Multi-Guest Discount

```sql
multi_guest_discount_percent NUMERIC(5,2) DEFAULT 0.00
```

**What:** Discount percentage when booking for large groups.

**Why:** Encourages bigger bookings. A group of 10 is more profitable than 2 individuals.

**Example:**
- 1-4 guests: No discount
- 5-9 guests: 5% off
- 10+ guests: 10% off

---

#### 4. Hourly Discount Tiers

```sql
hourly_discount_tiers JSONB DEFAULT '[]'::jsonb
```

**What:** Discount percentages for longer bookings.

**Format:** JSON array of tier objects:
```json
[
  {"minHours": 4, "percent": 5},
  {"minHours": 8, "percent": 10},
  {"minHours": 12, "percent": 15}
]
```

**How it works:**
- Book 1-3 hours: No discount
- Book 4-7 hours: 5% off
- Book 8-11 hours: 10% off
- Book 12+ hours: 15% off

**Why:** Longer bookings mean less turnover for the host. Discounting encourages guests to book longer.

---

#### 5. Venue-Spend Entitlement

```sql
venue_spend_entitlement JSONB
```

**What:** Discount for guests who have spent a certain amount at this venue.

**Format:** JSON object:
```json
{
  "thresholdKobo": 500000,
  "discountPercent": 5
}
```

**How it works:**
1. Guest has spent ₦500,000+ at this venue
2. They get 5% off all future bookings
3. The discount applies automatically at checkout

**Why:** Rewards loyal customers. Encourages repeat business.

---

### Example: Full Pricing Configuration

```sql
UPDATE listings SET
  commission_rate_percent = 7.5,        -- 7.5% commission (negotiated)
  exclusive_flat_fee_kobo = 50000,      -- ₦500 flat fee for exclusive
  multi_guest_discount_percent = 10,    -- 10% off for large groups
  hourly_discount_tiers = '[
    {"minHours": 4, "percent": 5},
    {"minHours": 8, "percent": 10},
    {"minHours": 12, "percent": 15}
  ]'::jsonb,
  venue_spend_entitlement = '{
    "thresholdKobo": 500000,
    "discountPercent": 5
  }'::jsonb
WHERE id = 'listing-uuid';
```

### How Pricing Is Calculated

```
Base Price = Base Rate × Hours × Guests
  ↓
Apply Multi-Guest Discount (if applicable)
  ↓
Apply Hourly Discount (if applicable)
  ↓
Apply Venue-Spend Discount (if applicable)
  ↓
Add Exclusive Flat Fee (if exclusive booking)
  ↓
Calculate Commission (commission_rate_percent% of total)
  ↓
Final Price = Total - Commission
```

---

## What Is "Outdoor Space"?

### The Problem

The original code only supported two listing types:
- `venue` — Indoor spaces (restaurants, halls, bars)
- `housing` — Residential properties (apartments, houses)

But there's a whole category of spaces that don't fit either:
- Beaches
- Parks
- Rooftops
- Gardens
- Parking lots (for events)
- Campgrounds

### The Solution

We added a third vertical: `outdoor_space`

```sql
-- No database change needed! The vertical column is TEXT, not enum
-- We just updated the validation schema:
vertical: z.enum(["venue", "housing", "outdoor_space"])
```

### How It's Different

| Feature | Venue | Housing | Outdoor Space |
|---------|-------|---------|---------------|
| Booking type | Capacity or Exclusive | Exclusive only | Capacity or Exclusive |
| Weather dependency | No | No | Yes |
| Permits required | Sometimes | No | Often |
| Noise restrictions | Varies | Yes | Yes |
| Pricing | Per hour | Per night | Per hour or per day |

---

## What Are "Structured Descriptions"?

### The Problem

Listings only had a free-form description field:

```
"Beautiful beachfront venue with stunning views. Perfect for birthday parties and corporate events. We have a bar, dance floor, and outdoor seating."
```

This is hard to:
- Search (can't filter by "has parking")
- Compare (have to read entire description)
- Display (no consistent format)

### The Solution

We added a JSONB column for structured data:

```sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS structured_description JSONB;
```

### Format

```json
{
  "highlights": [
    "Ocean view",
    "Private pool",
    "Free parking",
    "24/7 security"
  ],
  "idealFor": [
    "Birthday parties",
    "Corporate events",
    "Date nights",
    "Family gatherings"
  ],
  "houseRules": [
    "No smoking indoors",
    "Quiet hours after 10pm",
    "No pets allowed",
    "Maximum 50 guests"
  ],
  "gettingAround": "5 min walk from Lekki Phase 1 bus stop. Uber and Bolt available. Free parking for 20 cars."
}
```

### Why This Is Better

**For guests:**
- Can scan "Highlights" to see key features
- Can check "Ideal For" to see if it fits their needs
- Can read "House Rules" before booking

**For search:**
- Can filter by "has parking" (from highlights)
- Can filter by "pet friendly" (from house rules)
- Can recommend based on "ideal for" matching

**For display:**
- Consistent formatting across all listings
- Can show highlights in search results
- Can create visual badges from the data

---

## What Is "One Listing Per Provider Trigger"?

### The Problem

We had a unique index (from Phase 1) that prevented multiple active listings per provider. But the error message was confusing:

```
ERROR: duplicate key value violates unique constraint "idx_one_listing_per_provider"
```

Users wouldn't understand what this means.

### The Solution

We added a trigger with a clear error message:

```sql
CREATE OR REPLACE FUNCTION enforce_one_listing_per_provider()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != 'archived' THEN
    IF EXISTS (
      SELECT 1 FROM listings
      WHERE provider_profile_id = NEW.provider_profile_id
        AND status != 'archived'
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Provider can only have one active listing. Archive or delete the existing listing first.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### How It Works

1. Fires `BEFORE INSERT OR UPDATE` — Before any listing is saved
2. Checks if the new listing's status is NOT 'archived'
3. If so, checks if the provider already has another non-archived listing
4. If they do, raises an exception with a helpful message

### Example

```sql
-- Provider already has an active listing
INSERT INTO listings (provider_profile_id, status, ...) VALUES
  ('provider-uuid', 'active', ...);
-- ERROR: Provider can only have one active listing.

-- But they can have an archived listing
INSERT INTO listings (provider_profile_id, status, ...) VALUES
  ('provider-uuid', 'archived', ...);
-- OK (archived listings are excluded from the check)
```

---

## What Is "Gateway Fee Tracking"?

### The Problem

The original code didn't track how much Paystack charged in fees. You only knew the booking amount, not the net amount received.

### The Solution

We added two columns:

```sql
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS gateway_fee_kobo INTEGER DEFAULT 0;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS net_amount_kobo INTEGER DEFAULT 0;
```

### How It Works

When a payment is confirmed:
1. Paystack charges a fee (e.g., 1.5% + ₦100)
2. The fee is recorded in `gateway_fee_kobo`
3. The net amount (booking amount - fee) is recorded in `net_amount_kobo`

**Example:**
- Booking amount: ₦100,000
- Paystack fee: ₦1,600 (1.5% + ₦100)
- Net amount: ₦98,400

This is important for accounting and reconciliation.

---

## Section-by-Section Breakdown

### Section 1: Transaction
```sql
BEGIN;
```
Start a transaction.

### Section 2: Availability Rules Table
```sql
CREATE TABLE IF NOT EXISTS availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
```
Create a table for listing availability schedules.

### Section 3: Availability Rules Indexes
```sql
CREATE INDEX IF NOT EXISTS idx_availability_rules_listing ON availability_rules(listing_id);
CREATE INDEX IF NOT EXISTS idx_availability_rules_day ON availability_rules(listing_id, day_of_week);
```
Create indexes for fast queries.

### Section 4: Availability Rules RLS
```sql
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY availability_rules_public_read ON availability_rules FOR SELECT USING (true);
CREATE POLICY availability_rules_owner_insert ON availability_rules FOR INSERT WITH CHECK (...);
CREATE POLICY availability_rules_owner_update ON availability_rules FOR UPDATE USING (...);
CREATE POLICY availability_rules_owner_delete ON availability_rules FOR DELETE USING (...);
```
Enable security: everyone can read, only owners can modify.

### Section 5: Pricing Configuration
```sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS commission_rate_percent NUMERIC(5,2) DEFAULT 5.00;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS exclusive_flat_fee_kobo INTEGER DEFAULT 0;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS multi_guest_discount_percent NUMERIC(5,2) DEFAULT 0.00;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS hourly_discount_tiers JSONB DEFAULT '[]'::jsonb;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS venue_spend_entitlement JSONB;
```
Add pricing configuration columns to listings.

### Section 6: Pricing Snapshot Version
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pricing_snapshot_version INTEGER DEFAULT 1;
```
Add version tracking for pricing snapshots.

### Section 7: Gateway Fee Tracking
```sql
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS gateway_fee_kobo INTEGER DEFAULT 0;
ALTER TABLE payment_records ADD COLUMN IF NOT EXISTS net_amount_kobo INTEGER DEFAULT 0;
```
Add columns to track Paystack fees.

### Section 8: Structured Description
```sql
ALTER TABLE listings ADD COLUMN IF NOT EXISTS structured_description JSONB;
```
Add JSONB column for structured listing descriptions.

### Section 9: Check-in Tokens (Safety Net)
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_token TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS check_in_token_expires_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;
```
Safety net — these were also added in Phase 1.

### Section 10: Updated At Trigger
```sql
CREATE OR REPLACE FUNCTION update_availability_rules_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER availability_rules_updated_at
  BEFORE UPDATE ON availability_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_rules_updated_at();
```
Auto-update the `updated_at` column when rows are modified.

### Section 11: One Listing Trigger
```sql
CREATE OR REPLACE FUNCTION enforce_one_listing_per_provider()
RETURNS TRIGGER AS $$ ... $$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_one_listing
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_one_listing_per_provider();
```
Prevent providers from having multiple active listings.

### Section 12: Commit
```sql
COMMIT;
```
Save all changes permanently.

---

## Summary: What Phase 2 Added

| Feature | What It Does | Why It Matters |
|---------|--------------|----------------|
| Availability Rules | Store when listings are open | Better search, auto-close bookings |
| Configurable Pricing | Discounts, commissions, fees | Flexible business model |
| Outdoor Space | New listing type | Covers more use cases |
| Structured Descriptions | Organized listing info | Better search and display |
| One Listing Trigger | Enforce business rule | Prevents abuse |
| Gateway Fee Tracking | Record Paystack fees | Accurate accounting |

---

## After Running Both Migrations

Your database now has:

**New tables:**
- `availability_rules` — When each listing is available

**Modified tables:**
- `bookings` — 12 statuses, host_id, idempotency, check-in tokens
- `listings` — Outdoor space, pricing config, structured descriptions
- `payment_records` — Gateway fees, net amounts
- `exclusive_locks` — Expiration, listing reference

**New functions:**
- `convert_hold_to_booking()` — Atomic hold-to-booking conversion
- `create_exclusive_booking()` — Atomic exclusive booking creation
- `cleanup_expired_holds_and_locks()` — Maintenance function

**New triggers:**
- `update_availability_rules_updated_at` — Auto-timestamp
- `enforce_one_listing` — One listing per provider
