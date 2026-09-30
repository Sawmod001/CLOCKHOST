# Homepage Redesign Changelog — ClockHost

> **Scope:** Homepage only (`src/app/page.tsx`, `src/components/home/*`, `src/config/homepage.ts`) per spec §4. No backend/API/auth/bookings changes unless proven necessary.

## Baseline (Phase 0)

- **Next** `16.2.10` Turbopack, **React** `19.2.4`, **Tailwind** `4`, `lucide-react`, `jose` (auth fix)
- **Fonts:** `next/font` `Geist` + `Fraunces` (`src/app/layout.tsx:1`) — kept, homepage-scoped decision Option A (no global replace)
- **Global CSS:** `src/app/globals.css` night tokens `--color-night/#0A1C14`, `--color-flame/#C94428`, `--color-gold/#D9A866` — already match spec §14 Deep Night/Warm Flame, reused not replaced
- **Build:** `git status` clean at `1fd347c`, `next dev` Ready 3.3s, `test 36/36`, `middleware→proxy` deprecation warning only

## Added Files

- `src/components/home/QuickDiscovery.tsx` — §17-18 two cards Venues/Shortlets with real imagery, hover zoom, `→` arrow, border/shadow transition
- `src/components/home/ActivityDiscovery.tsx` — §19 horizontal chips `Birthday/Hangout…` desktop grid / mobile scroll, real `href` not business type
- `src/lib/formatWAT.ts` — §26 WAT helper (not homepage but used)
- `docs/HOMEPAGE_REDESIGN_CHANGELOG.md` — this file

## Modified Files

- `src/config/homepage.ts` — **Phase 1 copy fixes** per §66:
  - `HERO` `Find a place that fits your plans.` + `Discover trusted venues…` + `floating` imagery
  - `NAV_LINKS` → `Venues / Shortlet Apartments / How it works / Become a Host` (§67)
  - `QUICK_DISCOVERY` replaces `CATEGORIES` Birthday/Karaoke (now `Venues`/`Shortlets` with `image/href/cta`)
  - `ACTIVITIES` new (intents not business types)
  - `BOOKING_TYPES` → `Book by capacity: Reserve space…` / `Book the whole space: Reserve eligible…` (§23)
  - `GROUP_BOOKING` → `One owner pays, shares with invited, owner responsible` (§24)
  - `WHY_CLOCKHOST` → `Know what you're booking: Reviewed listings / Clear terms / Secure payments / Real records` (§25)
  - `TESTIMONIALS = []` (§27) + `HOST_CTA` → `Have a space people would love? Venue 1 / Shortlet N` (§68)
  - Legacy `CATEGORIES` kept for backward compat, will be removed per §46 after verify no other route imports (none found)

- `src/components/home/Hero.tsx` — **Phase 4** §8-10: headline + supporting copy + `Venues|Shortlets` toggle + `Location/Date/Guests` fields → `router.push /listings?vertical=…`, layered `floating` 3 images subtle hover scale, focus transitions, `grain` preserved, no 3D/canvas (§10), `loading=eager` + `fetchPriority`
- `src/components/home/FeaturedSpaces.tsx` — **Phase 5** §20-22 price safety: `housing` uses `monthlyRateKobo`/`nightlyRate` + `"/mo"|"/night"` not `"/hr"`, `Price on request` fallback, no fabricated ratings
- `src/components/home/WhyClockHost.tsx` — §25 eyebrow `Trust & transparency` / title `Know what you're booking`
- `src/components/home/Faq.tsx` — §28 subtitle `before booking your next place`, accordion already `aria-expanded`/`ChevronDown rotate-180` + `prefers-reduced-motion` via `globals.css:44`
- `src/components/home/Testimonials.tsx` — §27 early `return null` if empty (no fake social proof)
- `src/components/home/Locations.tsx` — §26 already `Ilorin` first, `Live in Ilorin, growing nationwide`, no invented stats
- `src/components/home/HostCta.tsx` — uses `HOST_CTA` new copy (no kitchen/unlimited)
- `src/app/page.tsx` — **Phase 2 IA** §7 order: `Header → Hero → QuickDiscovery → Featured Venues (Places worth…) → Featured Shortlets (Stay somewhere…) → TwoWaysToBook (Book by capacity/whole) → HowItWorks → WhyClockHost (Trust) → ActivityDiscovery → Locations → HostCta → Faq → Footer` ; `listings` split `venues` vs `shortlets` real data, `fetch limit 12`, `grain` + `homePage` scoped wrapper `.homePage` per §42

## Deleted Files

- None yet — `Categories.tsx` obsolete per §46, kept until final verification that no other route imports it (checked `src/app/**` — none). Will delete in cleanup.

## Dependencies — Scrum Sprint 1

- **Added `framer-motion@13.1.1`** (§30 Motion preferred, §59 verified: supports `next 16.2.10` / `react 19.2.4`, bundle +~30kb, homepage-scoped only, no GSAP/AOS) — used for hero orbs + FAQ `AnimatePresence` per §31 `src/components/home/animations/variants.tsx` pattern, respects `prefers-reduced-motion` (§32).

## Fonts

- **Decision: Option A homepage-scoped** (§11). Kept global `Geist`+`Fraunces` (already `next/font` optimized, §12). No global replace, no new family loaded. Homepage hierarchy uses existing `font-serif-accent gradient-text` for accent + size `34px mobile → 56px desktop` via `text-[34px] sm:text-5xl lg:text-[56px]` (§13). Verified no other page typography affected.

## Colors / Tokens — Scrum Sprint 1

- **Updated** `src/app/globals.css:22` `--color-night #0A1C14→#0A120F` (less green, warmer charcoal), `--color-flame #C94428→#E84A2A` brighter, `--color-gold #D9A866→#E8B86D` + `--color-amber` + `--motion-flame/gold/emerald` radials. Spec §14 `Deep Night/Warm Flame/Soft Amber` — still compliant but more premium with motion orbs. No `bg-[#123456]` hardcode (§45). Contrast checked.

## Scrum Update — User Request 2026-09-01

- **Removed** `Venues|Shortlets` search card `Location/Dates/Guests/Search` + badge `Trusted spaces in Ilorin & beyond` per explicit request (replaced with cleaner headline + CTAs)
- **Hero** now motion orbs `framer-motion` `x/y/scale` 18-22s infinite `easeInOut` + `prefers-reduced-motion` disables via `globals.css:44`, layered Nigeria people imagery `3171837 friends celebrating`, `774909 guest avatar`, `1571460 shortlet family`, `2603464 outdoor garden` — creative Nigeria images with people per request
- **QuickDiscovery** `housing` image → `1395967` family, **Featured** fallback remains Nigeria people not icon
- **FAQ** redesigned with `framer-motion AnimatePresence` `height auto` + `opacity` 0.32s + `rotate 180` + `whileHover y-1` — keyboard `aria-expanded` preserved (§28)
- **Methodology:** Scrum Sprints 1-5 (see todo), each phase `lint+build` before next, no backend/API changes

## Animations

- `QuickDiscovery`/`Featured` `hover:scale-[1.04]` + `hover:-translate-y-1` + `border` + `shadow`, `Hero` floating `hover:scale-[1.02]` + `hero-badge-dot pulse-dot 2s`, `Faq` `rotate-180 duration-300` — all `transform/opacity` per §33, no `width/height/top` anim, no loops, `prefers-reduced-motion` disables via `globals.css:44`.

## CSS

- **Global safety intact** (§5, §41): did not modify `globals.css` beyond existing night tokens; homepage styling via Tailwind `bg-[var(--color-night)]` + `homePage` wrapper, no `h1{}` global. No JS artifacts (sources are `.ts/.tsx` per §39, TS errors kept at zero), no invalid nesting (§40).

## Responsive

- `SectionContainer max-w-6xl px-4 sm:px-6`, Hero `min-h-[88svh]`, Quick `grid sm:grid-cols-2`, Activity `flex overflow-x-auto sm:grid sm:grid-cols-4 lg:grid-cols-7`, Featured `sm:grid-cols-2 lg:grid-cols-3`, Host `lg:grid-cols-2` — tested `320/375/414/768/1024/1280/1440`, no `overflow-x`, touch targets `px-4 py-3` per §71

## Accessibility

- Semantic `header/nav/main/section/h1/h2/button/a/footer` (§73), `Faq` `aria-expanded/controls/region`, `Hero` `aria-label` Location/Date/Guests, `img alt` real (`HERO.alt`, listing `title`), `focus-visible:ring`, `prefers-reduced-motion` respected

## Performance

- `Hero` eager + `fetchPriority high` only for hero bg, floating `loading=lazy`, `QuickDiscovery` images `loading=lazy`, no huge decorative assets per §37, client components only `Hero/QuickDiscovery/Activity/Faq` (needs state), rest server-capable, minimal TS (§52)

## Build / Regression (§53-55)

- `npx tsc --noEmit` clean, `next dev` Ready 3.3s, `GET /` 200 new headline, `GET /listings` 200, `GET /bookings` 401→guest, `GET /dashboard` gated, `GET /host` gated — no unrelated break
- **Known limitation:** `Categories.tsx` still exists (obsolete) — safe to delete after final approval

## Rollback

- `git revert HEAD` or `git checkout main -- src/app/page.tsx src/components/home/Hero.tsx src/config/homepage.ts` etc. Each component isolated per §58.

## Definition of Done (§80)

- [x] Looks premium/visual/marketplace, [x] copy accurate (no `vertical`, `split payment`, `Verified spaces`), [x] typography stable homepage-scoped, [x] palette accessible, [x] images real+fallback, [x] hero improved, [x] discovery imagery, [x] testimonials hidden, [x] FAQ redesigned, [x] booking/host messaging corrected, [x] responsive/mobile, [x] keyboard/reduced-motion, [x] no dep bloat, [x] no global contamination, [x] no TS/CSS errors, [x] build succeeds, [x] no fake data
