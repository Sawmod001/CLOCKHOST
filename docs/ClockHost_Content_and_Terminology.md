# ClockHost Content & Terminology Standard

This document is the **single source of truth** for all user-facing language across ClockHost. Every UI string, email, notification, error message, and piece of copy must conform to this standard. Code may use different internal names — that is expected and correct.

---

## 1. Brand Identity

| Element | Value |
|---|---|
| Product name | **ClockHost** |
| Short name | **ClockHost** (never abbreviate to "CH" or "clock") |
| Tagline (primary) | **Everything You Need to Book** |
| Tagline (supporting) | Discover, book and manage trusted spaces and stays in one place |
| Logo | `Clock` + colored `Host` (flame color) |
| Default email | `admin@clockhost.com` |

---

## 2. Core Vocabulary

### 2.1 People & Roles

| Term | Use when | Never use |
|---|---|---|
| **Guest** | A person browsing or booking spaces | Customer, user, client, visitor |
| **Host** | A person who lists and manages a venue or property | Provider, seller, vendor, merchant |
| **Agent** | A person who manages listings on behalf of a property owner | Manager, representative, broker |
| **Property owner** | The actual owner of a housing listing | Landlord (implies tenancy), proprietor |
| **Admin** | A ClockHost team member with platform-level access | Moderator, operator, staff |

### 2.2 Spaces & Listings

| Term | Use when | Never use |
|---|---|---|
| **Venue** | A physical space for events (karaoke lounge, event center, party hall) | Vertical, resource, space (too vague alone) |
| **Housing** | A residential space for short or medium-term stays (apartment, shortlet) | Property (alone), accommodation, lodging |
| **Listing** | A published entry on the platform (venue or housing) | Item, card, entry, post |
| **Space** | Generic term when referring to either venue or housing together | Resource, entity, object |
| **Shortlet** | A furnished apartment rented out短期 | Short-term rental (use colloquial term) |

### 2.3 Booking & Scheduling

| Term | Use when | Never use |
|---|---|---|
| **Booking** | A confirmed reservation of a space | Transaction, order, reservation (acceptable but less preferred) |
| **Slot** | A specific time window within a venue's availability | Time block, session, period |
| **Availability** | Whether a space is open for a given date/time | Capacity (different concept), open slots |
| **Schedule** | The recurring or one-off time pattern for a listing | Calendar (ambiguous — could mean the UI element) |
| **Viewing** | A pre-booking visit to inspect a housing property | Inspection, tour, showing |
| **Group booking** | A booking where multiple people split the cost | Collective booking, group reservation, split booking |

### 2.4 Pricing & Payments

| Term | Use when | Never use |
|---|---|---|
| **Rate** | The price per unit (per hour, per night) | Price (too vague), fee, cost |
| **Service fee** | ClockHost's commission on a booking | Commission (internal term), platform fee, processing fee |
| **Total** | The final amount a guest pays | Grand total, amount due, payable |
| **Payout** | Money sent to a host after a booking | Settlement, disbursement, transfer |
| **Refund** | Money returned to a guest after cancellation | Reimbursement, credit, rebate |

### 2.5 Platform Features

| Term | Use when | Never use |
|---|---|---|
| **Dashboard** | The main control panel for hosts or admins | Panel, console, backend |
| **Calendar** | The date-picker UI for managing availability | Date picker (less specific), schedule view |
| **Listing review** | The admin approval process for new listings | Moderation, vetting, screening |
| **Verification** | Identity or document verification for hosts | Validation, authentication, KYC |

---

## 3. UI Text Guidelines

### 3.1 Voice & Tone

- **Clear**: Say exactly what happens. No marketing fluff.
- **Confident**: Use active voice. "You book a space" not "A space can be booked."
- **Warm but professional**: Friendly without being casual. No "Hey!" or "Awesome!"
- **Nigerian-aware**: Use Naira (₦), reference Nigerian cities, acknowledge local context.

### 3.2 Button Labels

- Use **verb + noun** format: "Browse spaces", "List your space", "Book now"
- Keep to **2-4 words** maximum
- Never use: "Click here", "Submit", "OK", "Got it" (too vague)

### 3.3 Error Messages

- **What happened**: "Your payment could not be processed."
- **Why it happened**: "Your card was declined by your bank."
- **What to do**: "Try a different card or pay via bank transfer."

Never show: "Something went wrong", "An error occurred", "Internal server error"

### 3.4 Empty States

- **What's missing**: "No listings found in this area."
- **What to do next**: "Try a different location or browse all spaces."

### 3.5 Confirmation Messages

- **What was done**: "Your booking is confirmed."
- **What it means**: "You'll receive a confirmation email with the venue details."
- **What's next**: "Show this confirmation at the door."

---

## 4. Code vs UI Naming

The database and code use technical names. The UI uses human names. This is correct and intentional.

| Code / DB name | UI display |
|---|---|
| `vertical` (in code) | Venue or Housing (never show "vertical" to users) |
| `subVertical` | Venue type (Birthday, Karaoke, etc.) |
| `max_capacity` | Maximum guest capacity |
| `base_rate_per_hour` | Hourly rate |
| `nightly_rate` | Price per night |
| `booking_type` | Capacity or Exclusive (on the listing card) |
| `status: active` | Available |
| `status: draft` | Draft (in host dashboard only) |
| `status: pending_review` | Under review |
| `status: inactive` | Unlisted |
| `provider_profile` | Host profile (in UI) |
| `verification_status` | Verified / Pending / Not verified |

---

## 5. Content by Page

### 5.1 Homepage

- Hero: "Discover unique spaces in [City]"
- Subtitle: "Everything You Need to Book"
- CTA: "Browse spaces" / "List your space"
- Categories: Venue, Housing (never "verticals")

### 5.2 Listing Cards

- Title + Location + Price/hr or Price/night
- Tags: Capacity, Exclusive, Birthday, Karaoke, etc.
- Never show: `vertical`, `subVertical`, `baseRatePerHour` as raw text

### 5.3 Booking Flow

- Step 1: "Select your date and time"
- Step 2: "Review your booking" (show rate, duration, total)
- Step 3: "Pay securely" (show Paystack badge)
- Step 4: "Booking confirmed!" (show confirmation details)

### 5.4 Host Dashboard

- "Your listings" (not "My resources")
- "Booking requests" (not "Incoming transactions")
- "Earnings" (not "Settlement summary")
- "Calendar" (not "Availability management")

### 5.5 Admin Dashboard

- "Listing review" (not "Content moderation")
- "User management" (not "Account administration")
- "Platform analytics" (not "System metrics")

---

## 6. Email Templates

### 6.1 Booking Confirmation

- Subject: "Your booking at [Venue Name] is confirmed"
- Body: "Hi [Name], your booking for [Date] at [Time] is confirmed. Here are the details..."

### 6.2 Booking Request (Exclusive)

- Subject: "[Host Name] wants to confirm your booking"
- Body: "Hi [Name], [Host Name] has received your request for [Venue Name] on [Date]. You'll be charged once they confirm."

### 6.3 Payout Notification

- Subject: "Your payout of ₦[Amount] is on the way"
- Body: "Hi [Name], we've processed your payout for [Booking Reference]. It will arrive in your bank account within 24 hours."

---

## 7. Notifications

| Trigger | In-app message | Email? |
|---|---|---|
| New booking | "You have a new booking at [Venue]" | Yes |
| Booking confirmed | "Your booking at [Venue] is confirmed" | Yes |
| Booking cancelled | "Your booking at [Venue] has been cancelled" | Yes |
| Payout processed | "Your payout of ₦[Amount] is on the way" | Yes |
| Listing approved | "Your listing [Title] is now live" | Yes |
| Listing rejected | "Your listing [Title] needs changes" | Yes |
| Viewing scheduled | "You have a viewing at [Property] on [Date]" | Yes |
| Verification approved | "Your identity has been verified" | Yes |

---

## 8. Multilingual Considerations

ClockHost currently operates in English only. When localization is added:

- All strings must come from this document's canonical English versions
- Machine translation is NOT acceptable for UI copy
- Nigerian Pidgin may be considered for marketing (not UI) in the future
- Date formats: "Mon, Jan 15, 2026" or "15 January 2026" (never "01/15/2026")
- Currency: Always ₦ followed by amount with comma separators (₦45,000)
- Time: 12-hour format with am/pm (2:00 pm, not 14:00)

---

## 9. Forbidden Terms

These words must NEVER appear in user-facing copy:

| Forbidden | Why | Use instead |
|---|---|---|
| Vertical | Internal architecture term | Venue, Housing |
| Resource | Too generic | Space, Listing |
| Entity | Database term | Listing, Booking |
| Transaction object | Technical | Booking, Payment |
| User | Too generic | Guest, Host, Admin |
| Customer | Implies retail | Guest |
| Vendor | Implies marketplace seller | Host |
| Landlord | Implies tenancy only | Host, Property owner |
| Mod | Abbreviation | Admin, Moderator |
| Internal error | Unhelpful | Specific error message |
| Something went wrong | Unhelpful | Describe what happened |

---

## 10. Copy Review Checklist

Before any user-facing text goes live, verify:

- [ ] Uses approved terms from this document
- [ ] No forbidden terms appear
- [ ] Button labels are verb + noun, 2-4 words
- [ ] Error messages explain what happened + what to do
- [ ] Empty states explain what's missing + what to do next
- [ ] Price is shown in ₦ with comma separators
- [ ] Date/time format is consistent
- [ ] No marketing fluff in functional UI
- [ ] Nigerian context is acknowledged where relevant
- [ ] ClockHost is spelled correctly (not "Clock Host", "clockhost", "Clockhost")
