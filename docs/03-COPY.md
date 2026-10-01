# 03 — Copy (corrected and final)

Use this text exactly. It fixes missing punctuation, inconsistent naming, internal jargon leaking into the UI, and claims the site cannot back up. Where a "Was" line is shown, that is the current text.

---

## Voice rules

- Plain words, sentence case, active voice. Say what happens.
- One noun per thing, everywhere: **space** (a venue or apartment), **venue**, **shortlet**, **host**, **guest**, **booking**. The current copy mixes "place", "space" and "housing". Use "space" for the generic term.
- Never use words the platform cannot prove: not "trusted", not "verified" (unless a real verification step exists), not "Nigeria's marketplace" while only Ilorin is live. Use "reviewed" because listings are reviewed before going live.
- No internal language in the interface ("internal business types", "verticals").
- No arrows or middle dots in strings. No em dashes. Use full stops.
- Currency: format with `Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })`, giving `₦25,000`.
- Button and link labels describe the result: "Browse spaces", "Become a host", "Sign in".

## Header

| Item | Text |
|---|---|
| Links | Venues, Shortlets, How it works |
| Quiet links | Become a host, Sign in |
| Mobile menu button | Menu |

Was: "Shortlet Apartments" in the nav (too long), and a filled "Get started" button. The nav now has no filled button.

## Hero

| Element | Final text |
|---|---|
| H1 | Find a space that fits your plans. (Padyakke, synthesised 700 + text stroke, one style) |
| Sub | Reviewed venues and shortlet apartments across Nigeria. Check real availability, compare what each space offers and book with confidence. (`.hero-sub`: body size, 400, 70% kola — deliberately quieter than level 2 so the H1 leads) |
| Button (the only one) | Browse spaces |

The sub animates word-by-word on load (CSS only). No fine print and no photo chip (removed by owner decision; the hero is headline, sub, button, photo).

Was: "Find a place that fits your plans." (mixed "place" and "space"), and the sub "Discover trusted venues and shortlet apartments check availability compare what each place offers and book with confidence." (missing punctuation, unproven "trusted").

Why the H1 stays close to the original: clarity beats cleverness, and it is already plain. Two alternatives if the client wants a different angle (pick one, do not mix):

- "Celebrate, stay, gather. Book it in Ilorin."
- "Real spaces. Real availability. Book with confidence."

Also fix in the markup: put an explicit space where the two headline lines join, so search snippets and screen readers do not read "thatfits". The line break comes from `display: block`, not from a missing space.

## Proof strip (three short labels)

- Venues and Shortlet apartments reviewed before going live
- Pay in naira with [Paystack mark]
- A receipt for every booking

### Proof rules (social proof)

Proof must be true, current and placed next to the decision it supports.

1. **Now:** process proof only (the strip above, the Trust section, the "Reviewed" tick on listings).
2. **Show a live count only when it is worth showing.** "12 spaces in Ilorin" appears only if the real count is 5 or more. Otherwise render nothing.
3. **Ratings:** show a listing rating only with 3 or more reviews from completed bookings, with the review count beside it. Never show empty or zero stars.
4. **Guest quote:** one real quote, with first name and area, and written permission. Place it near the featured listings or the booking section, not in a separate testimonials page.
5. **Host count:** show only at 10 or more.
6. **Paystack mark:** use the official asset and follow Paystack's brand guidelines. Do not recolour it.
7. Nothing is fabricated, rounded up, or hard-coded. Counts come from the API.

## Two ways to book (star section)

Section heading: **Two ways to book.**
Supporting line: Every space uses one of two clear booking models. Choose what fits your plans.

Was: "Book by capacity or book the whole space." and "Every space on ClockHost uses one of two clear booking models. Choose what fits your plans." (kept, punctuation fixed).

**Panel 1: Book a spot**
- Body: Reserve space for yourself or your group while the venue stays open to others.
- Price: Priced per person, paid in naira. One person pays for the group and shares the booking.
- Confirmation: The host approves your request first. Once you pay, your booking confirms automatically.
- Best for: Hangouts, karaoke, game nights and relaxing with friends.
- Link: Browse spaces you can join

**Panel 2: Book the whole space**
- Body: Reserve an eligible space exclusively for the period you choose.
- Price: Pay the rate for your period to secure the space. If two guests request the same slot, the first payment wins.
- Confirmation: The host approves exclusive requests before you pay.
- Best for: Birthdays, celebrations and private gatherings.
- Link: Browse spaces you can book whole

**Panel 3: Book together**
- Body: One person pays and shares the booking with invited guests. There are no split payments to chase, just one clear booking.
- Best for: Birthdays, hangouts and group nights.
- Link: Find a group-friendly venue

Was in the current code: "Reserve space for yourself/group..." (slash), "Pay per person in Naira with a short hold. Owner pays and shares with invited people." (contradicts itself), "Auto-confirms when payment clears." Note "Book a spot" is a suggested guest-facing label for "Book by capacity". If the client keeps "Book by capacity", use it consistently on every page and in the booking flow. Do not rename backend values.

The comparison uses a `<dl>` (How it works, Price, Confirmation, Best for) on the "Browse" pages or in a details expansion. Do not repeat the same text in the star panels and a second comparison block. Show it once.

## Featured venues

- H2: Places worth discovering
- Support: Real venues, real photos, real availability. No fake ratings.
- Link: Explore all venues
- Empty title: No venues yet
- Empty body: We are onboarding our first reviewed venues now. Own a space? List it on ClockHost.
- Empty actions: Become a host (`.btn`) plus Get notified (`.btn-quiet`)

Was: "Real venues, real photos, real availability no fake ratings." (missing full stop). Empty: "Your next venue is coming" (mood, no direction).

## Featured shortlets

- H2: Stay somewhere that feels right
- Support: Furnished apartments with honest pricing, location and amenities.
- Link: Explore all shortlets
- Empty title: No shortlets yet
- Empty body: We are onboarding shortlet hosts now, and the first apartments go live soon.
- Empty actions: Become a host (`.btn`) plus Get notified (`.btn-quiet`)

Was: "We're onboarding shortlet hosts in Ilorin the first apartments go live soon." (run-on).

## How it works

- H2: Book a space in three steps
- Support: Search, reserve and go. No phone calls, no guesswork.

1. **Discover a space.** Browse reviewed venues and apartments with clear photos, pricing and availability. Every listing is reviewed before it goes live.
2. **Check availability and book.** Book a spot for a shared experience, or the whole space for private use. Pay securely through Paystack.
3. **Show up and enjoy.** Your booking record and receipt arrive right away. Check in with your host and enjoy your time.

Was: "Search, reserve and go. No phone calls, no guesswork. Every step is verified." (unproven claim removed), step 1 "...all reviewed before going live" (awkward).

## Trust

- H2: Know what you're booking
- Support: Reviewed listings, clear terms, secure payments and real records from completed bookings.

| Title | Text |
|---|---|
| Reviewed listings | Our team reviews every listing before it goes live, so photos and terms match the real space. |
| Clear booking terms | Availability, capacity, timing and cancellation terms are shown before you pay. No surprises. |
| Secure payments | Pay in naira through Paystack and get a booking record and receipt to show at the venue. |
| Real booking records | Reviews come only from completed bookings, so what you read is from real visits. |

Was: "Availability, capacity, time and cancellation terms are shown before you pay no surprises." (missing punctuation).

## Activities

- H2: Browse by activity
- Support: Choose by how you want to spend your time.
- Rows: Birthday, Hangout, Relaxation, Karaoke, Games, Celebration, Recreation

Was: "Looking for something specific?" with "Browse by how you want to spend your time not by internal business types." The "internal business types" phrase exposed internal language. Removed.

## Locations

- H2: Now in Ilorin. More cities soon.
- Support: Browse spaces in Ilorin today. More cities are on the way.
- Ilorin row: Ilorin, Kwara State (link)
- Others (not links): Lagos, Abuja, Ibadan, Port Harcourt, Kaduna, Enugu, Kano
- Shared note: Coming soon

Was: "Live in Ilorin, growing nationwide" with eight linked cities, seven of which have no listings.

## Host call to action

- H2: Have a space people would love?
- Body: List it on ClockHost. Reach guests in Ilorin and get paid securely through Paystack.
- Button: Become a host
- Quiet link: See how hosting works (only if a real destination exists)

| Type | Text |
|---|---|
| Venue host | List one venue or outdoor space, with clear availability and pricing. |
| Shortlet host | List several apartments, with monthly pricing and viewings. |

Was: "Become a Venue Host with one listing, or a Shortlet Host with multiple apartments. Reach guests in Ilorin and get paid securely through Paystack. See how hosting works." and two link targets that both pointed to `/sign-up` and `/listings`. "See how hosting works" must not point to `/listings`. Also removed the duplicated "Reviewed before live" and "Secure payments" host tiles, which repeated the Trust section.

## FAQ

- H2: Questions before you book
- Keep these questions in this order, with these edits. Keep the substance of each existing answer and rewrite for clarity (60 words maximum, plain language, no new promises).

1. What is ClockHost?
2. How do I book a space?
3. What is group booking?
4. What types of spaces are available?
5. How do payments work?
6. Can I list my own space?
7. Can I be both a host and a guest?
8. What is the difference between booking a spot and booking the whole space?
9. Is ClockHost available outside Ilorin?
10. What if I need to cancel a booking?

Was: question 8 "What is the difference between capacity and exclusive booking?" (backend terms). Use the same labels as the star section.

## Footer

- Tagline: Discover, book and manage spaces and stays in one place.
- Groups: Explore (Venues, Shortlets), Host (Become a host), Company and Legal (only links that resolve to real pages)
- Line: © 2026 ClockHost. All rights reserved.
- Location note: Ilorin, Nigeria

Was: "Discover, book and manage trusted spaces and stays in one place.." (double full stop, unproven "trusted").

## Page metadata

| Field | Final |
|---|---|
| Title | ClockHost: Book venues and shortlets in Ilorin |
| Description | Book reviewed venues and shortlet apartments in Ilorin, Nigeria. Check real availability, pay in naira with Paystack, and get a receipt for every booking. |
| OG title | Same as title |
| OG description | Same as description |

Was: title "Book Spaces & Housing in Nigeria" and description "ClockHost is Nigeria's marketplace..." Both claim national coverage while only Ilorin is live. Update them when more cities open.

Also fix: the OG image is declared 1200 x 1500, which is portrait. Twitter and most link previews expect 1200 x 630. Generate a branded `opengraph-image` at 1200 x 630 (use the star-section floor-plan motif, the wordmark and the H1). Remove the hotlinked Pexels image. Set `metadataBase` from `CLOCKHOST_BASE_URL` with a fallback of `https://clockhost.vercel.app`, not the leftover `hostme-xbhx.vercel.app`.

## Alt text (short rules; full guidance in `04-IMAGES.md`)

Describe what is visible and useful. Example: "Guests at a long table on a terrace in the evening, with string lights overhead." Never "image of" or "photo of". Never keyword-stuff.
