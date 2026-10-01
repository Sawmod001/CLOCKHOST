# ClockHost Rebrand Migration Report

## Summary

Product renamed from **HostMe** to **ClockHost**. This is a controlled brand migration preserving all functionality.

## Decisions

| Item | Decision | Reason |
|---|---|---|
| Supabase storage bucket | Keep as `HOSTME` | Prevents breaking existing production images |
| Payment reference prefix | Keep `hostme-` | Prevents breaking in-flight payments |
| WhatsApp intents | Replace with ClockHost | Clean break for user input patterns |
| Logo | `Clock` + colored `Host` | Matches original split treatment |
| Tagline | Primary: "Everything You Need to Book" / Supporting: "Discover, book and manage trusted spaces and stays in one place." | New brand positioning |
| TS identifiers | Rename (`WHY_HOSTME` → `WHY_CLOCKHOST`) | Consistent naming |
| Environment variables | Rename `HOSTME_BASE_URL` → `CLOCKHOST_BASE_URL` | Clean naming |
| Default email | `admin@clockhost.com` | Follows new brand |

## Files Changed

### Brand Config (NEW)
- `src/config/brand.ts` — Central brand configuration

### UI Components
- `src/components/Logo.tsx` — Clock + colored Host
- `src/components/ChatBot.tsx` — Brand name in UI
- `src/components/home/WhyHostMe.tsx` → `WhyClockHost.tsx` — Renamed component
- `src/components/home/Testimonials.tsx` — Brand name in heading
- `src/components/home/Faq.tsx` — Brand name in subtitle

### Pages
- `src/app/layout.tsx` — SEO metadata, title template
- `src/app/page.tsx` — Import renamed component
- `src/app/(auth)/sign-in/page.tsx` — Brand name
- `src/app/(auth)/sign-up/page.tsx` — Brand name
- `src/app/(auth)/complete-profile/page.tsx` — Brand name, terms
- `src/app/(public)/listings/[id]/checkout/page.tsx` — Login gate copy
- `src/app/(public)/listings/[id]/exclusive-request/page.tsx` — Login gate copy
- `src/app/(public)/group-plans/[id]/page.tsx` — Login gate copy
- `src/app/(public)/group-plans/new/page.tsx` — Login gate copy
- `src/app/admin-setup/page.tsx` — Default email
- `src/app/(admin)/admin/listings/pending/page.tsx` — Email subject

### Config
- `src/config/homepage.ts` — Site name, tagline, FAQ, testimonials, WHY_CLOCKHOST

### API Routes
- `src/app/api/chat/route.ts` — AI system prompt, fallback reply
- `src/app/api/whatsapp/webhook/route.ts` — Error message, env var

### Libraries
- `src/lib/whatsapp/bot.ts` — Intent strings, menu text, about text
- `src/lib/whatsapp/gemini.ts` — AI system prompt
- `src/lib/csrf.ts` — (No change — deployment URL stays until domain migration)

### Environment
- `.env` — Rename HOSTME_BASE_URL → CLOCKHOST_BASE_URL, update WhatsApp token

### Tests
- `tests/whatsapp-bot.test.ts` — Update test assertions

### Documentation
- `README.md` — Project title, env var docs
- `docs/BOOKING-ENGINE.md` — Brand name
- `docs/VERTICAL-NAMING.md` — Brand name
- `docs/RESTRUCTURING-GUIDE.md` — Brand name
- `docs/AUTH-GATE-FIXES-AND-AUDIT.md` — Brand name
- `docs/PROBLEMS-AND-LIMITATIONS.md` — Brand name
- `docs/BATCH-1-AUTH-AUTHORIZATION.md` — Brand name
- `docs/BATCH-3-PROVIDER-VERIFICATION.md` — Brand name
- `docs/BATCH-4-HOUSING-LISTING-CALENDAR.md` — Brand name

## Intentionally Retained (Legacy)

| Reference | Location | Reason |
|---|---|---|
| `HOSTME` (storage bucket) | upload/route.ts, listings/route.ts, migration.sql | Production data compatibility |
| `hostme-` (payment prefix) | initiate/route.ts, webhook/route.ts | In-flight payment compatibility |
| `hostme-xbhx.vercel.app` | csrf.ts, layout.tsx | Deployment URL — changes at domain migration |
| `hostme.example` | Test fixtures | Test-only, not user-facing |
| `host_id` (column name) | Database | Refers to business role, not product name |

## Not Changed (External Actions Required Later)

- GitHub repository name
- Vercel project name
- Production domain
- Clerk application name
- Paystack business name
- Supabase project name
- DNS records
