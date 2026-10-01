# ClockHost PDSS — Part 2: Phases 4-7
## Differentiation, Boundaries, State Modeling, Workflows

---

# PHASE 4 — DIFFERENTIATION ANALYSIS

## 4.1 Venue Booking vs Outdoor Space Booking vs Housing Booking

These three booking types appear similar but are fundamentally different domain concepts.

### Comparison Matrix

| Dimension | Venue Booking | Outdoor Space Booking | Housing Booking |
|-----------|--------------|----------------------|-----------------|
| **Purpose** | Reserve space for event/gathering | Reserve outdoor area for event | Rent apartment for living |
| **Duration** | Hours (1-8 hours typical) | Hours (4-12 hours typical) | Months (1-12 months) |
| **Booking Modes** | Capacity OR Exclusive (or both) | Exclusive ONLY | Monthly rental ONLY |
| **Pricing Unit** | Per person per hour | Flat rate per period | Monthly rate |
| **Availability** | Day-of-week rules + special dates | Date-specific periods | Date range (blocked dates) |
| **Capacity Model** | Per-person with headcount | No per-person model | Max guests for property |
| **Group Booking** | YES — single payer, multiple attendees | NO — exclusive only | NO |
| **Discount Rules** | Multi-guest + multi-hour | Duration-based | Lease duration discount |
| **Viewing** | Not applicable | Not applicable | YES — separate workflow |
| **Check-in** | Token-based at venue | Token-based | Key/access handover |
| **Cancellation** | Hours before event | Hours before event | Notice period (days/weeks) |
| **Post-booking** | Review, dispute | Review, dispute | Review, dispute, tenancy management |

### Verdict: **C — Separate Bounded Contexts** (partially)

- Venue Booking and Outdoor Space Booking share the **Time Engine** and **Pricing Engine** but have different availability models, pricing formulas, and booking flows.
- Housing Booking is a completely different domain — monthly rental, lease duration, viewing workflow, tenancy management.
- **Recommendation:** Keep Venue and Outdoor Space in the same Inventory context (they share the same host), but separate their Booking flows. Housing Booking needs its own subdomain within Booking Engine.

### Specific Differences That Prevent Merging

1. **Capacity vs Exclusive:** Venue supports both; Outdoor is exclusive-only. This affects availability checking, pricing, and the booking form.
2. **Time Granularity:** Venue and Outdoor use hourly slots. Housing uses monthly periods.
3. **Viewing:** Only Housing has a viewing workflow. Venue and Outdoor don't.
4. **Pricing Formula:** Venue = rate × headcount × hours. Outdoor = flat rate × hours. Housing = monthly rate × months - discount.
5. **Group Booking:** Only Venue supports group plans. Outdoor and Housing don't.

## 4.2 Capacity Booking vs Exclusive Booking

| Dimension | Capacity Booking | Exclusive Booking |
|-----------|-----------------|-------------------|
| **Who books** | Individual guests | Single party |
| **Headcount** | 1-N guests | 1 (entire space) |
| **Availability check** | Slot capacity - booked >= headcount | No overlapping exclusive bookings |
| **Pricing** | rate × headcount × hours | Flat rate × hours (or rate × hours) |
| **Hold mechanism** | Soft hold (expires in 10 min) | Exclusive lock (atomic) |
| **Cancellation** | Guest or host | Guest or host |
| **Check-in** | Individual token | Group token |

### Verdict: **D — Share infrastructure, NOT domain logic**

- Both use the same Time Engine for availability checking
- Both use the same Pricing Engine (different inputs)
- Both use the same Booking State Machine (same states)
- But the **availability check logic** is fundamentally different
- And the **pricing formula** is fundamentally different

## 4.3 Venue Host vs Shortlet Host

| Dimension | Venue Host | Shortlet Host |
|-----------|-----------|---------------|
| **Listing limit** | ONE listing | MULTIPLE properties |
| **Listing type** | Venue OR Outdoor Space | Housing/Shortlet |
| **Sub-types** | None (business type = lounge, bar, etc.) | Housing Agent OR Property Owner |
| **Booking type** | Capacity + Exclusive | Monthly rental |
| **Verification** | Identity + Business (CAC) | Identity + Business OR Property Authority |
| **Availability** | Day-of-week rules + special dates | Blocked dates (available by default) |
| **Pricing** | Per person per hour | Monthly rate |
| **Calendar** | Slot-based | Date-range-based |
| **Earnings** | Per booking | Per month |
| **Dashboard** | Venue-specific | Property-specific |

### Verdict: **C — Separate Bounded Contexts**

- They share the same Provider Management context (profile, verification)
- But their Inventory, Availability, Pricing, and Booking flows are completely different
- The Host Dashboard should adapt per listing type (§59)

## 4.4 Guest Dashboard vs Host Dashboard vs Admin Dashboard

| Dimension | Guest Dashboard | Host Dashboard | Admin Dashboard |
|-----------|----------------|----------------|-----------------|
| **Primary view** | My bookings | My listings + bookings | Platform overview |
| **Actions** | Pay, cancel, review | Approve, reject, manage | Review, approve, suspend |
| **Data scope** | Own bookings only | Own listings + their bookings | All data |
| **Navigation** | Bookings, Profile | Listings, Calendar, Reservations, Reviews, Earnings | Users, Listings, Verifications, Disputes, Audit |

### Verdict: **D — Share infrastructure, NOT domain logic**

- All three use DashboardLayout
- All three use sidebar navigation
- But the content, data, and actions are completely different
- Each should have its own page components and data fetching

---

# PHASE 5 — RESPONSIBILITY BOUNDARIES

## 5.1 Identity & Access Management (IAM)

### MUST DO
- Authenticate users (Clerk integration)
- Manage session tokens
- Store user profiles
- Assign roles (guest, venue_host, shortlet_host, admin)
- Track profile completion state
- Redirect based on role and onboarding state

### MUST NOT DO
- Create provider profiles (Provider Management)
- Create listings (Space Inventory)
- Process payments (Pricing & Billing)
- Send notifications (Communication)

### DEPENDS ON
- Clerk (external auth provider)

### PROVIDES
- Authenticated user object
- Role verification
- Profile completion state

### OWNS
- users table
- Session management
- Role assignment

## 5.2 Provider Management

### MUST DO
- Create provider profiles
- Track verification status
- Store verification documents
- Support provider suspension
- Distinguish Housing Agent from Property Owner

### MUST NOT DO
- Create listings (Space Inventory)
- Check availability (Time Engine)
- Process payments (Pricing & Billing)

### DEPENDS ON
- IAM (user identity)

### PROVIDES
- Provider profile object
- Verification status

### OWNS
- provider_profiles table
- provider_verifications table

## 5.3 Space Inventory

### MUST DO
- Create, read, update, delete listings
- Manage listing media (photos)
- Track listing lifecycle (draft → submitted → approved → rejected)
- Store structured descriptions
- Enforce one-listing-per-venue-host

### MUST NOT DO
- Check availability (Time Engine)
- Calculate prices (Pricing Engine)
- Create bookings (Booking Engine)
- Process payments (Pricing & Billing)

### DEPENDS ON
- IAM (user identity)
- Provider Management (provider profile)

### PROVIDES
- Listing object
- Listing status
- Listing configuration (pricing, capacity, rules)

### OWNS
- listings table
- listing_media table

## 5.4 Time Engine

### MUST DO
- Store and query availability rules
- Store and query availability exceptions
- Store and query blocked dates
- Check availability for a given time range
- Generate time slots
- Detect scheduling conflicts
- Handle recurring schedules
- Handle special dates

### MUST NOT DO
- Create bookings (Booking Engine)
- Calculate prices (Pricing Engine)
- Manage listings (Space Inventory)

### DEPENDS ON
- Space Inventory (listing ID)

### PROVIDES
- Availability check result
- Available time slots
- Conflict detection

### OWNS
- availability_rules table
- availability_exceptions table
- blocked_dates table
- slots table

## 5.5 Booking Engine

### MUST DO
- Create bookings (capacity, exclusive, housing)
- Manage booking state machine
- Handle soft holds and exclusive locks
- Manage group plans
- Handle check-in/check-out
- Handle cancellation
- Record booking transitions

### MUST NOT DO
- Calculate prices (Pricing Engine — receives price from Pricing)
- Process payments (Pricing & Billing — receives payment status from Billing)
- Check availability (Time Engine — receives availability from Time)
- Manage listings (Space Inventory)

### DEPENDS ON
- Time Engine (availability check)
- Pricing Engine (price calculation)
- Pricing & Billing (payment processing)
- Space Inventory (listing details)
- Communication (notifications on state changes)

### PROVIDES
- Booking object
- Booking state
- Booking transitions

### OWNS
- bookings table
- booking_transitions table
- soft_holds table
- exclusive_locks table
- group_plans table
- plan_members table

## 5.6 Pricing & Billing

### MUST DO
- Calculate prices (capacity, exclusive, housing)
- Apply discounts (multi-guest, hourly, lease duration)
- Calculate Paystack fees
- Calculate commission
- Initialize Paystack transactions
- Process webhooks
- Manage escrow
- Process refunds
- Generate receipts

### MUST NOT DO
- Create bookings (Booking Engine)
- Check availability (Time Engine)
- Manage listings (Space Inventory)

### DEPENDS ON
- Space Inventory (listing pricing config)
- Booking Engine (booking details for receipt)

### PROVIDES
- Price calculation result
- Payment status
- Receipt

### OWNS
- payment_records table
- refund_records table
- escrow_releases table
- documents table (receipts)
- Pricing engine (pricing.ts)

## 5.7 Communication

### MUST DO
- Send in-app notifications
- Store notification preferences
- Manage conversations
- Store messages
- Release contact information after viewing payment

### MUST NOT DO
- Create bookings (Booking Engine)
- Process payments (Pricing & Billing)
- Manage listings (Space Inventory)

### DEPENDS ON
- Booking Engine (booking events trigger notifications)
- Provider Management (host identity for messaging)

### PROVIDES
- Notification delivery
- Conversation management
- Contact information (after payment)

### OWNS
- notifications table
- notification_preferences table
- conversations table
- messages table
- contact_access table

## 5.8 Trust & Safety

### MUST DO
- Store reviews
- Handle dispute filing
- Store dispute evidence
- Handle reports
- Flag content
- Block users
- Apply automatic suspension

### MUST NOT DO
- Approve listings (Admin Operations)
- Approve providers (Admin Operations)
- Process payments (Pricing & Billing)
- Create bookings (Booking Engine)

### DEPENDS ON
- Booking Engine (booking completion triggers review eligibility)
- IAM (user identity)

### PROVIDES
- Review records
- Dispute records
- Report records

### OWNS
- reviews table
- disputes table
- dispute_evidence table
- reports table
- content_flags table
- blocked_users table

## 5.9 Admin Operations

### MUST DO
- Review and approve/reject listings
- Review and approve/reject provider verifications
- Manage users (role changes, suspension)
- View audit trail
- View monitoring data
- Resolve disputes (decision, not filing)

### MUST NOT DO
- Create listings (Space Inventory)
- Create bookings (Booking Engine)
- Process payments (Pricing & Billing)
- File disputes (Trust & Safety)

### DEPENDS ON
- Space Inventory (listing details for review)
- Provider Management (verification details for review)
- Trust & Safety (dispute details for resolution)
- IAM (user details)

### PROVIDES
- Approval/rejection decisions
- Audit records
- Monitoring data

### OWNS
- audit_logs table
- monitoring tables (system_health, error_logs, uptime_checks, request_metrics)

---

# PHASE 6 — STATE & BEHAVIOR MODELING

## 6.1 Booking State Machine

```
                          ┌─────────────┐
                          │    draft     │ (auto-created on hold)
                          └──────┬──────┘
                                 │
                          ┌──────▼──────┐
                 ┌───────│pending_approval│◄───────┐
                 │       └──────┬──────┘         │
                 │              │                  │
                 │    host approves          host rejects
                 │              │                  │
                 │       ┌──────▼──────┐    ┌─────▼─────┐
                 │       │awaiting_     │    │ rejected   │
                 │       │payment       │    └───────────┘
                 │       └──────┬──────┘
                 │              │
                 │    payment confirmed
                 │    (webhook)
                 │              │
                 │       ┌──────▼──────┐
                 │       │payment_      │
                 │       │processing    │
                 │       └──────┬──────┘
                 │              │
                 │    booking confirmed
                 │              │
                 │       ┌──────▼──────┐
                 │       │ confirmed    │──────────────────┐
                 │       └──────┬──────┘                  │
                 │              │                          │
                 │    guest checks in              host marks complete
                 │              │                          │
                 │       ┌──────▼──────┐          ┌───────▼──────┐
                 │       │ checked_in   │          │  completed   │
                 │       └──────┬──────┘          └──────────────┘
                 │              │                          │
                 │    host marks complete                   │
                 │              │                          │
                 │       ┌──────▼──────┐                   │
                 └──────▶│  completed   │◀──────────────────┘
                         └──────────────┘

Cancellation paths (from confirmed or awaiting_payment):
  confirmed → cancelled_by_guest → cancelled
  confirmed → cancelled_by_host → cancelled
  awaiting_payment → cancelled_by_guest → cancelled
  awaiting_payment → cancelled_by_host → cancelled
  awaiting_payment → expired (system)

Special states:
  confirmed → no_show (host or system)
  awaiting_payment → lost_race (system, for exclusive booking conflicts)
```

### State Transition Rules

| From | To | Trigger | Actor | Side Effects |
|------|-----|---------|-------|--------------|
| draft | pending_approval | Submit for review | Host | Notify admin |
| pending_approval | awaiting_payment | Host approves | Host | Notify guest |
| pending_approval | rejected | Host rejects | Host | Notify guest, record reason |
| awaiting_payment | payment_processing | Payment webhook | System | Record payment |
| payment_processing | confirmed | Payment verified | System | Notify guest + host |
| confirmed | checked_in | Check-in | Guest/Host | Record check-in time |
| confirmed | completed | Mark done | Host | Release escrow, notify |
| confirmed | cancelled_by_guest | Cancel | Guest | Release capacity, refund |
| confirmed | cancelled_by_host | Cancel | Host | Release capacity, refund |
| confirmed | no_show | No show | Host/System | Release capacity |
| awaiting_payment | expired | Timeout | System | Release hold |
| awaiting_payment | lost_race | Conflict | System | Release hold |

## 6.2 Listing State Machine

```
  ┌──────┐    submit    ┌────────────┐    approve    ┌──────────┐
  │ draft │────────────▶│ submitted  │─────────────▶│ approved  │
  └──────┘              └─────┬──────┘              └────┬─────┘
                              │                          │
                         reject│                    suspend│
                              │                          │
                        ┌─────▼──────┐            ┌──────▼─────┐
                        │ rejected   │            │ suspended   │
                        └────────────┘            └──────┬─────┘
                                                         │
                                                    archive│
                                                         │
                                                   ┌─────▼──────┐
                                                   │ archived    │
                                                   └────────────┘
```

### State Transition Rules

| From | To | Trigger | Actor | Side Effects |
|------|-----|---------|-------|--------------|
| draft | submitted | Submit | Host | Notify admin |
| submitted | approved | Approve | Admin | Notify host, listing becomes bookable |
| submitted | rejected | Reject | Admin | Notify host, record reason |
| approved | suspended | Suspend | Admin | Notify host, listing becomes unbookable |
| rejected | submitted | Re-submit | Host | Notify admin |
| suspended | submitted | Re-submit | Host | Notify admin |
| Any | archived | Archive | Admin/Host | Remove from search |

## 6.3 Payment State Machine

```
  ┌─────────┐    initialize    ┌───────────┐    webhook    ┌───────────┐
  │ pending  │────────────────▶│processing │──────────────▶│ successful │
  └─────────┘                  └─────┬─────┘               └───────────┘
                                     │
                                fail │
                                     │
                               ┌─────▼─────┐
                               │  failed    │
                               └───────────┘

  ┌───────────┐    refund    ┌───────────┐
  │ successful │─────────────▶│ refunded  │
  └───────────┘              └───────────┘

  ┌───────────┐    dispute    ┌───────────┐
  │ successful │──────────────▶│ disputed  │
  └───────────┘               └───────────┘
```

## 6.4 Provider Verification State Machine

```
  ┌─────────┐    submit    ┌─────────┐    approve    ┌──────────┐
  │  none   │─────────────▶│ pending │──────────────▶│ verified │
  └─────────┘              └────┬────┘              └──────────┘
                                │
                           reject│
                                │
                          ┌─────▼──────┐
                          │ rejected   │
                          └────────────┘
                                │
                          re-submit│
                                │
                          ┌─────▼──────┐
                          │  pending   │ (back to pending)
                          └────────────┘

  ┌──────────┐    suspend    ┌───────────┐
  │ verified │───────────────▶│ suspended │
  └──────────┘               └───────────┘
```

---

# PHASE 7 — WORKFLOW MODELING

## 7.1 Guest Books a Venue (Capacity Booking)

```
Actor: Guest
│
├── 1. Browse listings (/listings)
│   └── API: GET /api/listings?vertical=venue&bookingType=capacity
│
├── 2. View listing detail (/listings/[id])
│   └── API: GET /api/listings/[id]
│   └── Shows: photos, description, pricing, availability calendar
│
├── 3. Select date and time slot
│   └── API: GET /api/listings/[id]/slots?date=...
│   └── Shows available time slots with capacity
│
├── 4. Click "Book Now"
│   └── IF NOT authenticated → redirect to /sign-in
│   └── IF authenticated → proceed to checkout
│
├── 5. Checkout page (/listings/[id]/checkout)
│   ├── Select date
│   ├── Select time slot
│   ├── Select headcount (1 to max capacity)
│   ├── Select add-ons (optional)
│   └── Shows estimated total (client-side calculation)
│
├── 6. Submit booking
│   ├── API: POST /api/soft-holds (creates 10-min hold)
│   │   └── Server validates: slot exists, capacity available
│   │   └── Server creates: soft_hold with expires_at
│   │
│   ├── API: POST /api/bookings (converts hold to booking)
│   │   └── Server validates: hold active, not expired, correct guest
│   │   └── Server calculates: pricing via computeCapacityPriceKobo
│   │   └── Server creates: booking with status=awaiting_payment
│   │   └── Server releases: soft_hold
│   │   └── Server increments: slot.booked
│   │
│   └── Redirect to /bookings/[id]/pay
│
├── 7. Payment page (/bookings/[id]/pay)
│   └── API: POST /api/payments/initiate
│       └── Server validates: booking awaiting_payment, not expired
│       └── Server creates: payment_record with status=pending
│       └── Server calls: Paystack initializeTransaction
│       └── Returns: authorization_url for redirect
│
├── 8. Paystack payment
│   └── Guest completes payment on Paystack
│   └── Paystack redirects back to callback URL
│
├── 9. Webhook confirmation
│   └── API: POST /api/payments/webhook/paystack
│       └── Server verifies: HMAC signature
│       └── Server checks: processed_webhooks for dedup
│       └── Server verifies: transaction with Paystack API
│       └── Server validates: booking awaiting_payment, amount matches
│       └── Server updates: booking status → confirmed
│       └── Server updates: payment_record status → successful
│       └── Server sends: notification to guest
│
├── 10. Booking confirmed
│   └── Guest sees: booking details, receipt, check-in info
│
├── 11. Check-in at venue
│   └── Guest shows: check-in token
│   └── Host verifies: token via API
│   └── Server updates: booking checked_in_at
│
└── 12. Post-booking
    ├── Host marks complete → escrow released
    ├── Guest leaves review
    └── Either party can file dispute
```

### Failure Paths

| Step | Failure | Recovery |
|------|---------|----------|
| 6a | Soft hold creation fails (capacity taken) | Show error, retry with different slot |
| 6b | Booking creation fails (hold expired) | Create new hold |
| 6c | Slot capacity exceeded during creation | Reject booking, release hold |
| 7a | Payment initiation fails | Show error, retry |
| 7b | Booking expires before payment | Mark expired, release capacity |
| 8a | Payment fails on Paystack | Guest retries or abandons |
| 9a | Webhook signature invalid | Reject webhook, log security event |
| 9b | Webhook duplicate | Idempotent — return existing result |
| 9c | Amount mismatch | Reject webhook, log discrepancy |
| 9d | Booking already confirmed | Idempotent — return existing result |
| 9e | VerifyTransaction fails | Reject webhook, do not confirm |

## 7.2 Host Creates a Venue Listing

```
Actor: Venue Host
│
├── 1. Navigate to /host/listings/new
│   └── IF NOT host role → redirect
│
├── 2. Select listing type
│   ├── "Venue" → venue listing form
│   └── "Outdoor Space" → outdoor listing form
│
├── 3. Fill venue listing form
│   ├── Title, description
│   ├── Venue sub-types (birthday, karaoke, etc.)
│   ├── Structured description (6 sections)
│   ├── Location (state, city, address, coordinates)
│   ├── Pricing (base rate per hour)
│   ├── Capacity (max guests)
│   ├── Booking modes (capacity, exclusive, or both)
│   ├── Features (per sub-type)
│   ├── Add-ons (name, price, required)
│   ├── Cancellation policy
│   ├── Photos (drag-and-drop upload)
│   └── BYOB setting
│
├── 4. Upload photos
│   └── API: POST /api/upload
│   └── Server: stores file, returns URL
│   └── Client: adds URL to media array
│
├── 5. Save as draft
│   └── API: POST /api/listings
│   └── Server validates: all required fields
│   └── Server creates: listing with status=draft
│   └── Server enforces: one-listing-per-host
│   └── Server audits: listing.created
│
├── 6. Set availability
│   └── Navigate to /host/calendar
│   └── API: POST /api/listings/[id]/availability-rules
│   └── Set day-of-week rules (e.g., Mon 5-11 PM)
│   └── Add special dates (e.g., Dec 18 6 PM - 2 AM)
│   └── Block dates (e.g., maintenance day)
│
├── 7. Submit for review
│   └── API: POST /api/listings/[id]/submit-review
│   └── Server updates: status → submitted
│   └── Server audits: listing.submitted
│   └── Server notifies: admin
│
├── 8. Wait for admin review
│   └── Listing shows "Pending Review"
│   └── Cannot edit while under review
│
├── 9. Admin approves
│   └── Server updates: status → approved (active)
│   └── Server notifies: host
│   └── Listing becomes bookable
│
└── 10. OR Admin rejects
    └── Server updates: status → rejected
    └── Server records: rejection_reason
    └── Server notifies: host
    └── Host can edit and re-submit
```

## 7.3 Shortlet Host Creates a Housing Listing

```
Actor: Shortlet Host
│
├── 1. Navigate to /host/properties/new
│   └── IF NOT shortlet_host role → redirect
│
├── 2. Fill housing listing form
│   ├── Title, description
│   ├── Property type (apartment, house, duplex, etc.)
│   ├── Location (state, city, address)
│   ├── Rooms, bedrooms, bathrooms
│   ├── Furnished/unfurnished
│   ├── Amenities (WiFi, parking, AC, etc.)
│   ├── Monthly rate (₦)
│   ├── Lease duration options (6 months, 12 months)
│   ├── Lease discounts per duration
│   ├── Deposit amount
│   ├── Max guests
│   ├── Check-in/out times
│   ├── Min/max stay
│   ├── House rules
│   ├── Photos
│   └── Viewing fee (optional)
│
├── 3. Save as draft
│   └── API: POST /api/listings
│   └── Server creates: listing with status=draft, vertical=housing
│   └── Server allows: multiple properties per host
│
├── 4. Set availability
│   └── API: POST /api/listings/[id]/blocked-dates
│   └── Block dates when property is unavailable
│   └── Property is available by default
│
├── 5. Submit for review
│   └── Same flow as venue listing
│
└── 6-10. Same as venue listing flow
```

## 7.4 Guest Requests a Housing Viewing

```
Actor: Guest
│
├── 1. View housing listing (/listings/[id])
│   └── Shows: property details, monthly rate, viewing info
│
├── 2. Click "Request Viewing"
│   └── API: POST /api/viewings
│   └── Server creates: viewing with status=pending
│   └── Server notifies: host
│
├── 3. Host confirms viewing
│   └── API: PATCH /api/viewings/[id]
│   └── Server updates: status=confirmed
│   └── Server notifies: guest
│
├── 4. Guest pays viewing fee
│   └── API: POST /api/payments/initiate (viewing fee)
│   └── Paystack processes payment
│   └── Webhook confirms payment
│
├── 5. Contact info released
│   └── Server updates: contact_access (host phone, email)
│   └── Server notifies: guest with contact info
│
├── 6. Guest views property
│   └── Guest contacts host directly
│   └── Guest visits property
│
├── 7. Guest decides
│   ├── If proceeding → book housing (separate flow)
│   └── If not → viewing complete
│
└── 8. Viewing completed
    └── API: PATCH /api/viewings/[id]
    └── Server updates: status=completed
```

## 7.5 Host Approves/Rejects a Booking

```
Actor: Venue Host
│
├── 1. View booking inbox (/host/bookings)
│   └── API: GET /api/bookings?status=pending_approval
│   └── Shows: pending bookings with guest info
│
├── 2a. Approve booking
│   └── API: POST /api/bookings/[id]/approve
│   └── Server validates: host owns listing, booking is pending_approval
│   └── Server transitions: pending_approval → awaiting_payment
│   └── Server audits: booking.approved
│   └── Server notifies: guest "Booking approved, proceed to payment"
│
├── 2b. Reject booking
│   └── API: POST /api/bookings/[id]/reject
│   └── Body: { reason: "Schedule conflict" }
│   └── Server validates: host owns listing, booking is pending_approval
│   └── Server transitions: pending_approval → rejected
│   └── Server records: rejection_reason
│   └── Server audits: booking.rejected
│   └── Server notifies: guest "Booking rejected: {reason}"
│
└── 3. Guest responds
    ├── If approved → guest proceeds to payment
    └── If rejected → guest can book different slot
```

## 7.6 Admin Reviews a Listing

```
Actor: Admin
│
├── 1. View pending listings (/admin/listings/pending)
│   └── API: GET /api/admin/listings/review?status=submitted
│   └── Shows: listings awaiting review with provider info
│
├── 2. Review listing details
│   └── View: title, description, photos, location, pricing
│   └── View: provider profile and verification status
│
├── 3a. Approve listing
│   └── API: POST /api/admin/listings/review
│   └── Body: { listingId, decision: "approved" }
│   └── Server updates: status → active
│   └── Server notifies: host "Listing approved"
│   └── Server audits: listing.approved
│   └── Listing becomes bookable
│
├── 3b. Reject listing
│   └── API: POST /api/admin/listings/review
│   └── Body: { listingId, decision: "rejected", reason: "..." }
│   └── Server updates: status → rejected
│   └── Server records: rejection_reason
│   └── Server notifies: host "Listing rejected: {reason}"
│   └── Server audits: listing.rejected
│
└── 3c. Suspend listing
    └── API: POST /api/admin/listings/[id]/suspend
    └── Body: { reason: "..." }
    └── Server updates: status → suspended
    └── Server notifies: host
    └── Listing becomes unbookable
```
