# 06 — Prompts for the AI coding tool

Paste these one at a time, in order. Finish and review each before starting the next. Each prompt assumes the rules in `05-AGENT-RULES.md` are loaded and the spec files plus `tokens-v2.css` are in `docs/`.

> Start with the 07 foundation prompt (`07-REVISION-FONTS-COLOR-GRADIENTS.md`
> section 9) before Prompt 0. File 07 overrides every prompt below on conflict:
> palette is Paper/Haze/Kola/Zobo/Guava/Mango, fonts are Padyakke + Atkinson +
> Teko, the star surface is Zobo with a gradient stage panel, the footer is
> Kola with a gradient selvedge, and primary-on-dark is white fill with Kola
> label. Where a prompt below still says Indigo, Marigold, Mist, Bricolage or
> Geist, read Kola/Zobo, Mango, Haze, Padyakke or Atkinson instead.

After every prompt, ask the tool for screenshots at 360px and 1440px and check them against `01-DESIGN.md`.

---

## Prompt 0: foundation (tokens and fonts)

```
Read docs/07-REVISION-FONTS-COLOR-GRADIENTS.md, docs/01-DESIGN.md, docs/02-LAYOUT-AND-CSS.md and docs/tokens-v2.css.

Task: set up the foundation only. Do not change any section yet.
1. Merge tokens-v2.css into app/globals.css (the @theme block and the rest). Keep the existing app tokens working for other routes. Scope all new surface, text-level and component classes so they only affect the home page (.homePage wrapper).
2. In app/layout.tsx load Padyakke_Expanded_One (--font-display), Archivo (--font-body, weights 400/500/600) and Teko (--font-figures) with next/font/google, exactly as in 07 section 2 (as revised: Archivo replaced Atkinson for body text). If Atkinson_Hyperlegible_Next is not exported, use @fontsource-variable/atkinson-hyperlegible-next. Before removing Geist, Geist Mono, Bricolage, Fraunces, Manrope, Instrument_Serif or Space_Grotesk, search the whole repo for their CSS variables and class names and tell me where each is used. Remove only what is unused.
3. Create the Price component from 07 section 2 and use it wherever a price is shown.
4. Add the .page and .grid-12 grid classes and .section / .section--lg / .section-head from 02-LAYOUT-AND-CSS.md as @layer components.
5. Add a skip link and an sr-only utility.
6. Fix metadata in layout.tsx per 03-COPY.md (title, description, metadataBase fallback to https://clockhost.vercel.app). Do not add the OG image yet.

Report: files changed, font usage findings, anything ambiguous.
```

## Prompt 1: page shell

```
Task: restructure app/page.tsx layout only.
- Keep all data fetching, state and the gate function exactly as they are.
- Replace the dark wrapper with the surface rhythm in 01-DESIGN.md section 3 as revised by 07 (Paper, Haze + grain, Zobo star, Kola footer). Each section receives its surface class (surface-paper, surface-haze + surface-grain, surface-zobo + surface-grain, surface-kola + surface-grain).
- Remove the fixed full-screen grain layer.
- Wrap everything in <div className="homePage page"> and keep <main id="main">.
- Do not change section components' props.

Report: the final section order and each section's surface.
```

## Prompt 2: header

```
Rebuild components/home/Header.tsx per 02-LAYOUT-AND-CSS.md (Header) and 03-COPY.md (Header).
- 72px sticky, Paper background, hairline appears only after scroll.
- Links: Venues, Shortlets, How it works. Quiet text links: Become a host, Sign in. NO filled button.
- Mobile: "Menu" button opening a popover sheet with large links.
- Keep using the gate prop on every link that used it. Links must stay real <a> elements.
- No topbar, no sidebar.
```

## Prompt 3: hero

```
Rebuild components/home/Hero.tsx per 02-LAYOUT-AND-CSS.md (Hero), 03-COPY.md (Hero) and 04-IMAGES.md.
- Two-column split hero, left-aligned copy, photo panel bleeding off the right edge with 28px radius on its left corners.
- H1 "Find a space that fits your plans." at text-hero, 100% opacity, one style, **synthesised 700 for presence** (`.hero-title`; the family ships only a 400). No accent word. Put an explicit space where the two lines join.
- Sub at level 2 (74%). ONE button: "Browse spaces" (.btn, no arrow, keeps the gate handler). No fine print under the button. No photo chip on the image.
- Photo from IMAGES.heroPrimary via next/image with priority and correct sizes, plus heroSecond and heroThird in a CSS-only crossfade stack (30s cycle, 10s each, Ken Burns drift, reduced-motion static). No overlay, no opacity, no text, chip or inset on the photo. Chip text is Kola on Paper, `text-small`.
- Remove ALL blobs, the rotating ring, the parallax opacity fade and every infinite animation. Keep only one load sequence under 600ms, run once, with MotionConfig reducedMotion="user". The hero must ship no more JS than the load animation needs; if you can do the load sequence in CSS instead of Framer Motion, do that and make Hero a server component.
- The Hero component's exported name and its `gate` prop stay the same.

Deliver screenshots at 360 and 1440, and report the LCP element.
```

## Prompt 4: proof strip

```
Create components/home/ProofStrip.tsx (server component) per 02-LAYOUT-AND-CSS.md (Proof strip) and 03-COPY.md (Proof strip and Proof rules).
- Three labels with 20px Lucide icons (stroke 1.5), hairline top and bottom, no boxes.
- Accept optional props liveListings and completedBookings, and render extra items only when the thresholds in 03-COPY.md are met. With no data, render only the three labels.
- Heading is an h2 with the sr-only class.
```

## Prompt 5: star section ("Two ways to book")

```
Rebuild components/home/TwoWaysToBook.tsx per 02-LAYOUT-AND-CSS.md (Star) and 03-COPY.md (Two ways to book).
- Zobo surface with grain. Left: sticky stage — a rounded gradient-strip panel (no text on it) with an inline SVG SeatMap (create components/home/SeatMap.tsx with mode "capacity" | "exclusive" | "group"; white lines at 40%, Mango "yours" seats, white "others"). Right: three text panels.
- Active panel via IntersectionObserver in a small client component. No scroll listeners.
- Below 900px: no sticky, each panel shows its own small SeatMap.
- Reduced motion: instant state swap.
- Use the gate handler on the three text links. No filled button here (white-fill Kola-label button styling only if a single link must be a button).
- SeatMap has role="img" and an aria-label per state.
```

## Prompt 6: featured venues and shortlets

```
Rebuild components/home/FeaturedSpaces.tsx per 02-LAYOUT-AND-CSS.md (Featured) and 03-COPY.md.
- Keep the props (listings, loading, gate, title, subtitle, emptyTitle, emptySubtitle).
- Listing = image + text on the section surface. No background, border or shadow. First item is the lead (16:10, spans 2 columns), others 4:5.
- Container query and subgrid so titles and meta rows align.
- Mobile: horizontal scroll-snap row.
- Loading: static Mist skeletons, no shimmer.
- Empty state: title, body and a "Become a host" text link from 03-COPY.md.
- Show no rating UI unless the listing has 3 or more completed-booking reviews.
- Each item is <li><article>. Format prices with Intl.NumberFormat en-NG NGN.
```

## Prompt 7: how it works, trust

```
Rebuild components/home/HowItWorks.tsx and components/home/WhyClockHost.tsx.
- HowItWorks: <ol> in three columns with hairlines, step numerals in Teko figures with a 6px mango bar under each. Copy from 03-COPY.md.
- WhyClockHost (Trust): 2 x 2 grid on Haze + grain, hairlines only, 24px Lucide icons, title level 1, description level 2.
- No card backgrounds. No icon containers.
```

## Prompt 8: activities, locations

```
Rebuild components/home/ActivityDiscovery.tsx and components/home/Locations.tsx per 02-LAYOUT-AND-CSS.md.
- Activities: typographic index rows (text-h2, Bricolage) with hairlines and a live listing count at the right only if the count is real and above zero. Hover/focus shifts the text 8px and shows an underline. Keep the same links and the gate prop.
- Locations: "Ilorin" is the only link, set large. The other seven cities render as plain text at level 3 with a single "Coming soon" note. No links to empty listing pages.
```

## Prompt 9: host call to action, FAQ

```
Rebuild components/home/HostCta.tsx and components/home/Faq.tsx.
- HostCta: Paper surface, H2 and body from 03-COPY.md, ONE primary button "Become a host" (keeps gate), quiet link "See how hosting works" ONLY if a real destination exists (it must not point to /listings; if there is none, omit it and leave a TODO comment). Two overlapping rounded photos on the right from the manifest. Venue host and Shortlet host as a two-column open list.
- Faq: Haze + grain, sticky heading left, <details name="faq"> accordion right, hairlines between items, plus/minus made with a CSS pseudo-element rotating on [open]. Keep every existing answer's substance, rewrite each for clarity in 60 words or fewer per 03-COPY.md, invent nothing. No JS. Keep the FAQ JSON-LD schema script.
```

## Prompt 10: footer, metadata image

```
Rebuild components/home/Footer.tsx per 02-LAYOUT-AND-CSS.md (Footer) and 03-COPY.md (Footer).
- Kola surface with grain plus the 8px gradient selvedge band at the top edge. Large wordmark, tagline, link groups, legal line.
- Render only links that resolve to real routes. For About, Contact, Terms, Privacy and Hosting guide, do not render them; leave a TODO comment listing them.
Then create app/opengraph-image.tsx (1200 x 630) using the wordmark, the H1 and the floor-plan motif on paper white with indigo text. Remove the hotlinked Pexels OG image from layout.tsx metadata.
```

## Prompt 11: quality pass

```
Run a full audit against 05-AGENT-RULES.md "Definition of done" and "Banned".
1. Grep the home page components for banned patterns: uppercase tracking classes, italic in headings, arrow icons in buttons, hard-coded hex values, opacity below the level-3 floor on text, fixed positioning grain, infinite animations, gradient text/borders, glow, and any font other than --font-display, --font-body and --font-figures.
2. Check heading order, alt text, focus rings and touch targets.
3. Run Lighthouse mobile and report Performance, Accessibility, CLS and LCP.
4. Test 360px on a real phone if possible; report anything that overflows.
5. List every deviation from the docs, every TODO and every open question.
Do not fix anything silently. Report first, then fix what I approve.
```

## If you supply your own fonts

```
Replace Bricolage_Grotesque and Geist in app/layout.tsx with my two fonts, keeping the CSS variable names --font-display and --font-body. If the fonts are files, use next/font/local with variable or 400/500/600/700 weights and display: "swap". Change nothing else, then screenshot the hero at 360 and 1440 and check that the headline still fits in three lines at 360px.
```
