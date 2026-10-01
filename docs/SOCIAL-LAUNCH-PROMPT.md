# ClockHost — ChatGPT launch-report pack

Goal: paste **Part 1** into ChatGPT (with the fact sheet in Part 2) and get
back a comprehensive, post-ready project report: the problem, how it works,
features, tech stack, problems faced, solutions, and what makes it different.
Fill in every `[FILL IN]` in Part 3 first — ChatGPT cannot know those.

---

## Part 1 — copy-paste master prompt

```
You are my technical co-writer. Using ONLY the fact sheet I paste below (plus
my filled-in blanks), write a comprehensive launch report for my project,
ClockHost, that I can post on social media (X, LinkedIn, Facebook).

Structure it exactly like this:
1. Hook (2 lines that stop the scroll)
2. The problem (what is broken about booking venues/shortlets in Nigeria today)
3. What ClockHost is and how it works (guest journey + host journey, plain language)
4. Key features (as benefits, not jargon)
5. The build journey: hardest problems I faced and how I solved each one
   (the TypeScript migration, the mobile sign-up bug, email without a domain,
   telling real listings from fake ones, making it premium on mid-range Androids)
6. Tech stack (one line per layer, with WHY each was chosen)
7. What makes ClockHost different (no fake ratings, proof rules, real receipts)
8. Call to action (visit the live site, get notified, list a space)

Rules:
- Sound like a Nigerian builder talking to Nigerians, not a press release.
- No hype words you cannot prove (no "best", "first", "revolutionary").
- Keep every technical claim traceable to the fact sheet. Where I marked
  [FILL IN], use my answers word-for-word.
- Give me THREE versions: (a) long-form LinkedIn/Facebook post, (b) a 7-post
  X thread, (c) a 2-line WhatsApp status.
- End with 5 honest questions my audience might ask, with suggested answers.

FACT SHEET:
<paste Part 2 here>

MY ANSWERS:
<paste your filled-in Part 3 here>
```

---

## Part 2 — ClockHost fact sheet (verified from the repo)

**What it is:** ClockHost (formerly HostMe) is a Nigerian marketplace for
booking event venues (hangouts, birthdays, karaoke, games, celebrations) and
shortlet apartments. Live in Ilorin, Kwara State; more cities coming.

**How it works — guest:** browse real listings with photos, pricing and live
availability → book a spot in a shared experience, book a whole space
privately, or book together as a group → pay in naira through Paystack → get
a booking record and receipt. Sign-up verifies your email with a code first.

**How it works — host:** sign up as venue host or shortlet host → list a
space with photos, pricing and availability → listing is reviewed before it
goes live → manage bookings, calendar, earnings and payouts from the host
dashboard. Admins review listings, verifications, disputes and reports.

**Key features:**
- Three booking models: capacity (per-person spots), exclusive (whole space,
  first-payment-wins races), group plans (one person pays, friends join)
- Real availability engine (Africa/Lagos time, blocked dates, calendar sync,
  iCal export) with double-booking guards at the database level
- Kobo-integer pricing engine (no float errors), commission + Paystack fee math
- Email-verified sign-up, Clerk JWT sessions, role gates (guest/host/admin)
- Host verification flow, reviews only from completed bookings, disputes with evidence
- WhatsApp assistant bot (venue search, slot availability, group booking) with AI fallback
- Notifications, soft holds, expiring listings sweeps, audit logging, CSV exports
- "Get notified" list for launch/city alerts (Brevo email, no account needed)
- Mobile-first: 44px targets, 360px layouts, works on mid-range Androids

**Tech stack (and why):**
- Next.js 16 App Router + React 19 + strict TypeScript — one codebase, server rendering, type-safe end to end
- PostgreSQL (via Supabase) with a thin hand-rolled `PgQuery` client — parameterized queries, identifier allow-listing
- Clerk (RS256 JWT sessions) — auth without building password infrastructure
- Paystack — Nigerian payments (cards, USSD, transfers) in naira
- Tailwind CSS v4 + Framer Motion (restrained) + Lucide icons — fast, token-driven UI
- Brevo REST API for email — sends without owning a custom domain
- Gemini AI — free-form WhatsApp questions the rule engine can't answer
- Vercel — hosting, previews per push, cron jobs

**Hard problems faced → solutions:**
1. 193 JavaScript files, zero types → full TypeScript migration (strict mode,
   1,161 errors at peak → zero), all green: typecheck, lint, build, 36/36 tests.
2. Mobile sign-up silently dumped new users into guest accounts → traced to a
   fail-open profile check on flaky networks; flipped it to fail-closed.
3. No custom domain, so Resend was unusable → researched and shipped Brevo
   (verified Gmail sender, HTTPS API), with SHA-256-hashed codes and expiry.
4. Fake listings/ratings plague marketplaces → proof rules: review-before-live,
   no rating UI under 3 real reviews, no fabricated counts, receipts for all.
5. Generic "AI look" (purple blobs, serif-italic heroes, card grids) → full
   rebrand: kola/zobo palette from hibiscus and kola nut, Padyakke display
   face, hairlines over boxes, hand-drawn SVG seat maps.

**What makes it different:** proof over promises (everything shown is real or
it isn't shown), money math in integer kobo, time engine pinned to
Africa/Lagos, hosts reviewed before going live, receipts for every booking.

---

## Part 3 — blanks only you can fill (do this before pasting)

- `[FILL IN]` Your name + role (e.g. "Sawmod, builder of ClockHost"):
- `[FILL IN]` Live URL (e.g. https://clockhost.vercel.app):
- `[FILL IN]` Real numbers (users, listings, bookings — or write "pre-launch"):
- `[FILL IN]` One personal line: why did YOU start ClockHost? (a bad venue experience?)
- `[FILL IN]` Launch status + ask (e.g. "live in Ilorin, Lagos next — join the notify list"):
- `[FILL IN]` Handle to tag (your X/Instagram handle):

---

## Part 4 — after ChatGPT replies

1. Fact-check every number and claim against this file before posting.
2. Post version (b) as a thread first, then (a) on LinkedIn/Facebook next day.
3. Pin the post; link it in your bio with the live URL.
