# ClockHost PDSS — Part 2: Missing Pages
## Master Tracking Protocol | Version 1.0

> **Purpose:** Track ALL missing pages that need to be created.
> **Rule:** A page is not DONE until it exists, works, and passes verification.
> **Last updated:** 2026-08-28
> **Status values:** MISSING | IN_PROGRESS | DONE | BLOCKED

---

# HOST PAGES (§57 — Venue Host Dashboard)

## B1. Host Calendar Page
**Status:** MISSING | **Priority:** P1 | **Spec:** §57, §11

**Route:** /host/calendar

**Required features:**
- Shows availability calendar for host's listing
- Can manage time slots (add/edit/remove)
- Can view existing bookings on calendar
- Can see conflicts before saving
- Supports special dates override (§11)
- Supports blocked periods (§11)
- Day-of-week availability rules (e.g., Mon 5-11 PM, Fri 6 PM - 1 AM)
- Buffer/preparation time display

**UI requirements:**
- Month view calendar with day cells
- Click day to see/edit availability
- Color coding: available (green), booked (red), blocked (gray), special (purple)
- Add/edit/remove availability rules per day of week
- Special date management (different hours/pricing for specific dates)
- Blocked period management
- Existing bookings shown as events on calendar

**API needed:** Existing APIs:
- GET/POST /api/listings/[id]/availability-rules
- GET/POST /api/listings/[id]/blocked-dates
- GET /api/listings/[id]/slots
- GET /api/listings/[id]/availability

**Verification:**
- [ ] Page loads with host's listing calendar
- [ ] Month navigation works (prev/next month)
- [ ] Can add availability rules for each day of week
- [ ] Can set start/end times for each day
- [ ] Can add special dates with different hours
- [ ] Can block/unblock specific dates
- [ ] Existing bookings visible on calendar
- [ ] Conflicts detected and warned about before saving
- [ ] Works for both Venue and Outdoor Space listings

---

## B2. Host Reviews Page
**Status:** MISSING | **Priority:** P1 | **Spec:** §57

**Route:** /host/reviews

**Required features:**
- Shows all reviews for host's listings
- Average rating display (star rating)
- Individual reviews with guest name, rating, comment, date
- Host can respond to reviews (§17 batch17)
- Flag inappropriate reviews
- Filter/sort by rating, date

**UI requirements:**
- Summary card: average rating, total review count, rating distribution bar chart
- Review cards: guest avatar/name, star rating, comment text, date
- Response form: textarea + submit button per review
- Show existing host responses
- Flag button for inappropriate content

**API needed:** Existing APIs:
- GET /api/listings/[id]/reviews
- POST /api/reviews/[id]/respond

**Verification:**
- [ ] Page loads with all reviews
- [ ] Average rating calculated correctly
- [ ] Rating distribution shown
- [ ] Host can submit response to each review
- [ ] Responses saved and displayed
- [ ] Host can flag inappropriate reviews
- [ ] Works for listings with no reviews (empty state)

---

## B3. Host Earnings Page
**Status:** MISSING | **Priority:** P1 | **Spec:** §57

**Route:** /host/earnings

**Required features:**
- Total earnings display
- Earnings by period (this week, this month, this year)
- Pending payouts
- Transaction history with details
- Export capability (CSV/JSON)
- Breakdown: booking amount, commission, net earnings

**UI requirements:**
- Summary cards: total earnings, pending, this month, this week
- Period selector (week/month/year/all)
- Transaction table: date, booking ref, guest, amount, commission, net, status
- Export button
- Empty state when no earnings

**API needed:** Existing APIs:
- GET /api/analytics/host
- GET /api/analytics/revenue
- GET /api/export/bookings

**Verification:**
- [ ] Page loads with earnings data
- [ ] Total earnings correct
- [ ] Period breakdowns correct
- [ ] Transaction list shows all completed bookings
- [ ] Commission deducted correctly
- [ ] Export downloads CSV/JSON
- [ ] Works for hosts with no earnings (empty state)

---

## B4. Host Notifications Page
**Status:** MISSING | **Priority:** P1 | **Spec:** §57, §76

**Route:** /host/notifications

**Required features:**
- Lists all notifications for the host
- Mark as read/unread
- Filter by type (booking, payment, listing, etc.)
- Link to relevant pages
- Notification count badge
- Mark all as read

**UI requirements:**
- Notification list with icons per type
- Unread indicators (bold text, colored dot)
- Click to mark as read + navigate to link
- Filter tabs by type
- Mark all as read button
- Empty state when no notifications

**API needed:** Existing APIs:
- GET /api/notifications
- PATCH /api/notifications (mark read)

**Verification:**
- [ ] Page loads with all notifications
- [ ] Unread notifications visually distinct
- [ ] Click marks as read
- [ ] Filter by type works
- [ ] Mark all as read works
- [ ] Links navigate to correct pages
- [ ] Works when no notifications (empty state)

---

## B5. Host Settings Page
**Status:** MISSING | **Priority:** P1 | **Spec:** §57

**Route:** /host/settings

**Required features:**
- Cancellation policy settings (flexible/moderate/strict)
- Cancellation window (hours before event)
- Auto-approve bookings toggle
- Instant booking toggle
- Minimum notice hours
- Maximum advance booking days
- Response time hours
- Payout method (bank transfer)
- Bank account details
- Default cancellation policy

**UI requirements:**
- Settings form with sections
- Save button per section
- Success/error feedback
- Current values pre-filled

**API needed:** Existing API:
- GET/POST /api/settings/host

**Verification:**
- [ ] Page loads with current settings
- [ ] Can update cancellation policy
- [ ] Can update cancellation window
- [ ] Can toggle auto-approve
- [ ] Can toggle instant booking
- [ ] Can update notice hours
- [ ] Can update bank details
- [ ] Settings persist after page reload

---

# SHORTLET HOST PAGES (§58)

## B6. My Properties Page
**Status:** MISSING | **Priority:** P1 | **Spec:** §58

**Route:** /host/properties

**Required features:**
- Lists all properties for the shortlet host
- Property cards with status, price, location
- Can add new property
- Can edit existing property
- Property status badges (draft/active/pending)

**UI requirements:**
- Property cards in grid/list view
- Status badges
- Quick actions (edit, view, delete)
- Empty state for new hosts
- "Add Property" button

**Verification:**
- [ ] Page loads with all properties
- [ ] Status badges correct
- [ ] Can navigate to add property
- [ ] Can navigate to edit property
- [ ] Empty state works

---

## B7. Add Property Page
**Status:** MISSING | **Priority:** P1 | **Spec:** §37, §40

**Route:** /host/properties/new

**Required features:**
- Structured property form per §37 and §40
- Title, type, address, description
- Rooms, bedrooms, bathrooms
- Furnished/unfurnished
- Amenities, facilities
- Photos upload
- Availability settings
- Monthly pricing (§41)
- Lease duration options (6/12 months)
- Deposit amount
- House rules
- Contact process
- Viewing info

**Verification:**
- [ ] Form collects all required fields
- [ ] Can upload photos
- [ ] Can set pricing
- [ ] Can set availability
- [ ] Submission creates draft listing
- [ ] Validation prevents invalid submissions

---

## B8. Property Detail/Edit Page
**Status:** MISSING | **Priority:** P1 | **Spec:** §40

**Route:** /host/properties/[id]

**Required features:**
- View property details
- Edit property fields
- Manage photos
- View bookings
- Manage calendar
- Submit for review

**Verification:**
- [ ] Page loads with property data
- [ ] Can edit all fields
- [ ] Can manage photos
- [ ] Can submit for review
- [ ] Status management works

---

# GUEST PAGES

## B9. Booking Detail Page (Guest)
**Status:** MISSING | **Priority:** P1 | **Spec:** §32

**Route:** /bookings/[id]

**Required features:**
- Full booking details
- Receipt/booking evidence (§32)
- Booking status
- Cancellation option
- Check-in instructions
- Contact host option
- Group booking info (if applicable)

**Verification:**
- [ ] Page loads with booking details
- [ ] Receipt shows all required fields (§32)
- [ ] Cancel button works for eligible bookings
- [ ] Check-in info visible when available

---

## B10. Profile Page (Guest)
**Status:** MISSING | **Priority:** P2 | **Spec:** §34

**Route:** /profile

**Required features:**
- View/edit profile info
- Phone, location, gender
- Referral source
- Account settings
- Notification preferences
- Delete account option

**Verification:**
- [ ] Page loads with current profile data
- [ ] Can update phone
- [ ] Can update location
- [ ] Can update gender
- [ ] Changes persist

---

# ADMIN PAGES

## B11. Admin Disputes Page
**Status:** MISSING | **Priority:** P2 | **Spec:** §74

**Route:** /admin/disputes

**Required features:**
- List all disputes
- Filter by status
- View dispute details
- Review evidence
- Make decision
- Record resolution

**Verification:**
- [ ] Page loads with all disputes
- [ ] Filter by status works
- [ ] Can view dispute details
- [ ] Can review evidence
- [ ] Can make and save decision

---

## B12. Admin Audit Trail Page
**Status:** MISSING | **Priority:** P2 | **Spec:** §50

**Route:** /admin/audit

**Required features:**
- List all audit logs
- Filter by actor, action, resource, date
- View audit details (before/after, metadata)
- Search functionality
- Export capability

**Verification:**
- [ ] Page loads with audit logs
- [ ] Filters work correctly
- [ ] Search finds relevant entries
- [ ] Details show full metadata
- [ ] Export works

---

## SUMMARY: 12 Missing Pages

| ID | Page | Route | Status | Priority |
|----|------|-------|--------|----------|
| B1 | Host Calendar | /host/calendar | MISSING | P1 |
| B2 | Host Reviews | /host/reviews | MISSING | P1 |
| B3 | Host Earnings | /host/earnings | MISSING | P1 |
| B4 | Host Notifications | /host/notifications | MISSING | P1 |
| B5 | Host Settings | /host/settings | MISSING | P1 |
| B6 | My Properties | /host/properties | MISSING | P1 |
| B7 | Add Property | /host/properties/new | MISSING | P1 |
| B8 | Property Detail | /host/properties/[id] | MISSING | P1 |
| B9 | Booking Detail | /bookings/[id] | MISSING | P1 |
| B10 | Profile | /profile | MISSING | P2 |
| B11 | Admin Disputes | /admin/disputes | MISSING | P2 |
| B12 | Admin Audit | /admin/audit | MISSING | P2 |
