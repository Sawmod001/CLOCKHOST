# ClockHost homepage rebrand: agent rules

Copy this file to the repo root as `CLAUDE.md` (Claude Code), `.cursorrules` (Cursor) or your tool's equivalent rules file. It applies to every task in this redesign.

Read first, in order: `docs/07-REVISION-FONTS-COLOR-GRADIENTS.md` (overrides everything below on conflict), then `docs/01-DESIGN.md`, `02-LAYOUT-AND-CSS.md`, `03-COPY.md`, `04-IMAGES.md`, and `docs/tokens-v2.css`.

---

## Scope

- **Front end only.** Change markup, classes, styles, copy, fonts and images on the home page and its `components/home/*` files.
- **Do not touch:** API routes, database code, auth logic, the `gate` function's behaviour, routing, environment variables, or anything under `app/api`, `lib/server` or similar.
- **Preserve interfaces:** keep component names, default exports and props (`gate`, `listings`, `loading`, `title`, `subtitle`, `emptyTitle`, `emptySubtitle`). If a prop is no longer used, keep it in the type and leave a short comment. Do not rename files.
- The home page stays functionally identical: same data fetching, same links, same gating. Only how it looks and reads changes. If a change would alter behaviour, stop and ask.
- Other routes (listings, dashboard, sign-in) keep the current look until told otherwise. Scope new tokens to the home page (`.homePage` wrapper) so nothing else shifts.

## Non-negotiables

1. Use only tokens from `tokens-v2.css`: colours (paper, haze, kola, zobo, guava, mango), type sizes, spacing, radii. No hard-coded hex values, pixel font sizes or ad-hoc spacing in components.
2. Exactly three font jobs plus one: `--font-display` (Padyakke Expanded One, H1/H2 at 28px+, H1 synthesised 700 + stroke), `--font-body` (Atkinson Hyperlegible Next, everything else), `--font-figures` (Teko, digits only), `--font-label` (Archivo 600, proof/label rows only — owner decision for a more editorial micro-voice). Remove Geist, Geist Mono, Bricolage, Fraunces, Manrope, Instrument Serif and Space Grotesk from the home page. Search the whole app for their variables and class names first and tell me where each is used; remove only what is unused. All prices use the `Price` component from 07 section 2.
3. Text has three levels only: 100% / 74% / 66% on light (`--fg-1`, `--fg-2`, `--fg-3`), 100% / 80% / 70% on dark. Headlines at 100%. Never lower than the level-3 floor.
4. One primary button per view. Light surfaces: Zobo fill, white label. On the Zobo star surface: white fill, Kola label. The hero has exactly one button: "Browse spaces".
5. No card backgrounds, borders, or shadows on content. Use whitespace and hairlines.
6. Left-aligned text. No centred paragraphs or section headings.
7. Copy comes from `03-COPY.md` verbatim. Do not rewrite it, add claims, or invent ratings, counts or testimonials.
8. Images come from `src/config/images.ts` via `next/image`. One `priority` image on the page (hero photo). No overlays or opacity on photos.
9. Semantic HTML as specified in `02-LAYOUT-AND-CSS.md`: one `h1`, one `h2` per section, `ol` for the steps, `details name="faq"` for the FAQ, `article` for listings.
10. Motion: only what `01-DESIGN.md` section 8 allows. Only `transform` and `opacity`. Respect reduced motion in CSS and with `<MotionConfig reducedMotion="user">`.
11. The oklch gradient (`--gradient-strip`) appears in exactly two places: the star stage panel and the 8px footer selvedge. Never on buttons, text, borders or page backgrounds. Grain on gradient panels to prevent banding.

## Banned (these read as templated, remove on sight)

- Small uppercase or tracked-out eyebrow labels above headings.
- Accenting one word in a headline (italic, colour, or bold).
- Arrows or `→` in button or link text. Middle-dot meta strings ("A · B · C"). Spaced em dashes.
- Identical rounded cards repeated as a grid. Gradient washes as decoration. Glassmorphism. Soft grey drop shadows under every element.
- Blurred morphing blobs, rotating rings, fixed full-screen grain layers, infinite animations (sole exceptions, owner-approved: the horizontal proof marquee and the hero photo crossfade, both frozen under reduced motion).
- Fade-and-slide-up on every section. Hover lift on every card.
- Autoplay video. Centre-aligned hero copy.
- Marigold or Mango text on light backgrounds. Guava or Mango marks smaller than a large graphic.
- Any colour outside the six named tokens. The old green, `flame`, `gold`, `night-*` colours are removed from the home page. Any purple, violet, indigo, blue-purple, cyan or teal; cream + terracotta; near-black + acid accent.
- Fonts: Inter, Geist, Space Grotesk, Plus Jakarta Sans, Manrope, Instrument Serif, Bricolage Grotesque, and any font not in the three-family system.
- Effects: glow, glassmorphism, aurora or mesh blobs, gradient text, animated gradients, gradient borders, dark-mode neon.

## CSS rules

- Layer order `theme, base, components, utilities`. Repeated patterns go in `@layer components`.
- One owner per property per element. Do not set padding through both a class and an element selector.
- Space between sections comes only from `.section` padding, never margins.
- Use `gap`, logical properties, `aspect-ratio`, `clamp()` tokens, `svh`/`dvh`.
- Use container queries and subgrid for listings. Use `popover` for menus. Use anchor positioning only with a fallback. Use scroll-driven animation only inside `@supports`, and never depend on it.
- Never use CSS Grid Lanes or CSS `if()`.
- Do not change `overflow-x: clip` on the page root to `hidden` (it breaks sticky).

## Performance rules

- The hero, proof strip, trust, activities, locations and FAQ ship no client JavaScript. Client components only for: header scroll state and mobile menu, the star section observer, and components that require `gate`.
- No new dependencies unless approved. Framer Motion may remain for the hero load sequence only.
- Lazy-load `<ChatBot />` with `next/dynamic` and keep it clear of the primary button on mobile.

## Definition of done (check every item, every section)

- [ ] Renders correctly at 360, 768, 1024 and 1440px, and at 200% zoom
- [ ] No horizontal scroll at any width
- [ ] Keyboard: every control reachable, visible focus ring, logical order
- [ ] Text contrast at least 4.5:1 (use the token levels)
- [ ] Reduced motion: everything visible instantly, nothing animates
- [ ] One `h1`, no skipped heading levels
- [ ] All images have alt text from the manifest and reserved dimensions
- [ ] Copy matches `03-COPY.md` exactly
- [ ] No banned pattern present
- [ ] Lighthouse mobile: Performance 90 or higher, Accessibility 100, CLS under 0.05
- [ ] Take a screenshot at 360 and 1440 and review it before saying "done"

## How to work

- Work one section at a time using the prompts in `06-PROMPTS.md` (after the 07 foundation prompt). Do not restyle the whole page in one pass.
- After each section: state what changed, list any deviation from the docs and why, and list any open question. Do not silently improvise.
- If something in the docs is ambiguous or missing (an asset, a route, an answer), stop and ask. Do not fabricate.
