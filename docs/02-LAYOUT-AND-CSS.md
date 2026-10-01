# 02 — Layout, Modern CSS and Semantic Structure

Front-end only. Keep component names, exports and props (`gate`, `listings`, `loading`, etc.) unchanged. Change markup, classes and styles.

---

## 1. Layout concept

Left-aligned, asymmetric, editorial. Section headings sit in the left 7 columns and their supporting text sits in the right columns, aligned to the heading baseline. Lists are open (hairlines and whitespace), not boxed. Photography carries the warmth. The page is white with two dark moments.

Alignment: **left-aligned everywhere.** No centred paragraphs, no centred section headings.

## 2. Page grid

Named-line grid so any element can be content-width or full-bleed with one declaration.

```css
.page {
  display: grid;
  grid-template-columns:
    [full-start] minmax(var(--gutter), 1fr)
    [content-start] minmax(0, var(--content))
    [content-end] minmax(var(--gutter), 1fr)
    [full-end];
}
.page > * { grid-column: content; }
.page > .full-bleed { grid-column: full; }

.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  column-gap: var(--gap);
}
```

Section head pattern (used by every section after the hero):

```css
.section-head { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); column-gap: var(--gap); row-gap: var(--space-s); align-items: end; }
.section-head h2 { grid-column: 1 / span 7; text-wrap: balance; }
.section-head p  { grid-column: 9 / -1; max-inline-size: 38ch; }
@media (max-width: 900px) {
  .section-head h2, .section-head p { grid-column: 1 / -1; }
}
```

Section spacing:

```css
.section { padding-block: var(--space-section); }
.section--lg { padding-block: var(--space-section-lg); }
```

Never use margins between sections. One `.section` class owns padding. Do not also set padding through element selectors or utilities on the same node.

## 3. Modern CSS: what to use and how

Support notes come from current browser data as of September 2026. Re-check on caniuse or MDN before launch, since this moves quickly.

| Feature | Support | Use it for |
|---|---|---|
| Container queries (size) | Widely available | Listing cards and rows adapt to their column, not the viewport |
| Subgrid | Widely available | Aligning image, title, meta and price rows across cards in a row |
| `:has()` | Widely available | Header state, FAQ open styling, form group states with no JS |
| `text-wrap: balance` | Widely available | All headings |
| `text-wrap: pretty` | Partial | Paragraphs. Progressive: harmless where ignored |
| `color-mix()`, `clamp()`, `aspect-ratio`, logical properties | Widely available | Opacity ladder, fluid type, media boxes, RTL-safe spacing |
| `svh` / `dvh` units | Widely available | Hero height. Use `svh` for the hero, replace `min-h-screen` with `min-h-dvh` |
| `@layer` | Widely available | Keeps specificity predictable (see 5) |
| Popover API (`popover`) | Widely available | Mobile menu, nav dropdowns, without JS state |
| `<details name="...">` | Widely available | Exclusive FAQ accordion, no JS |
| CSS anchor positioning | Baseline newly available since Jan 2026 (Chrome 125, Edge 125, Firefox 147, Safari 26) | Nav dropdown and tooltips positioned to their trigger, with fallback |
| Scroll-driven animations (`animation-timeline`) | Chrome and Edge yes, Safari 26 yes, Firefox not enabled by default | Optional enhancement only, inside `@supports`. Nothing may depend on it |
| CSS Grid Lanes, CSS `if()` | Too new | **Do not use on the homepage** |

### Container query pattern (listings)

```css
.listing-row { container: listings / inline-size; display: grid; gap: var(--gap); grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr)); }
@container listings (min-width: 60rem) {
  .listing--lead { grid-column: span 2; }          /* first card is larger */
  .listing--lead .listing__media { aspect-ratio: 16 / 10; }
}
```

### Subgrid pattern (aligned card internals)

```css
.listing { display: grid; grid-row: span 3; grid-template-rows: subgrid; row-gap: var(--space-2xs); }
/* rows: media, title, meta. The parent defines the rows, so titles line up even when text wraps */
```

### Anchor positioning pattern (nav dropdown, with fallback)

```css
.nav-trigger { anchor-name: --nav-trigger; }
.nav-menu[popover] {
  position: fixed;
  margin: 0;
  /* fallback first: works without anchor positioning */
  inset-block-start: var(--header-h);
  inset-inline-start: var(--gutter);
}
@supports (position-anchor: --nav-trigger) {
  .nav-menu[popover] {
    position-anchor: --nav-trigger;
    inset-block-start: calc(anchor(bottom) + 8px);
    inset-inline-start: anchor(start);
    position-try-fallbacks: flip-inline, flip-block;
  }
}
```

### Scroll-driven enhancement pattern (optional)

```css
@supports (animation-timeline: view()) {
  .hero__media img {
    animation: settle linear both;
    animation-timeline: view();
    animation-range: exit 0% exit 100%;
  }
  @keyframes settle { to { transform: translateY(4%) scale(1.03); } }
}
```

Everything must look correct with this block deleted.

## 4. Box model rules

- `box-sizing: border-box` is already set by Tailwind. Do not repeat it.
- Use `gap` for spacing between siblings. Avoid stacking margins.
- Use logical properties (`padding-inline`, `margin-block`, `inset-inline-start`) for new CSS.
- Media boxes reserve space with `aspect-ratio` to prevent layout shift.
- Images: `display: block; inline-size: 100%; block-size: 100%; object-fit: cover`.
- No fixed heights on text containers. Use `min-block-size`.
- Sticky elements need no `overflow: hidden` ancestor. The page root uses `overflow-x: clip`, which is safe; never change it to `hidden`.

## 5. CSS architecture

Use one layer order, and the same names Tailwind v4 uses:

```css
@layer theme, base, components, utilities;
```

- Tokens live in `@theme` and `:root` (`tokens.css`).
- Repeated patterns (`.btn`, `.link`, `.section`, `.section-head`, `.rule-list`, `.surface-*`) live in `@layer components`.
- One-off spacing and alignment uses Tailwind utilities.
- Never write a type selector and a class selector that set the same property on the same element (for example `.section` and `section`). One owner per property.
- Use `:where()` for low-specificity resets.
- No `!important` except the reduced-motion block.

## 6. Semantic structure

```html
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header>
    <nav aria-label="Primary"> ... </nav>
  </header>

  <main id="main">
    <section aria-labelledby="hero-title">       <h1 id="hero-title">
    <section aria-labelledby="proof-title">      <h2 id="proof-title" class="sr-only">
    <section aria-labelledby="ways-title">       <h2 id="ways-title">
    <section aria-labelledby="venues-title">     <h2>   <ul> of <li><article>
    <section aria-labelledby="stays-title">      <h2>   <ul> of <li><article>
    <section aria-labelledby="how-title">        <h2>   <ol> of <li>   (real sequence)
    <section aria-labelledby="trust-title">      <h2>   <ul> of <li>
    <section aria-labelledby="activities-title"> <h2>   <ul> of <li><a>
    <section aria-labelledby="cities-title">     <h2>   <ul> of <li>
    <section aria-labelledby="host-title">       <h2>
    <section aria-labelledby="faq-title">        <h2>   <details name="faq"> x N
  </main>

  <footer>
    <nav aria-label="Footer"> ... </nav>
    <address> ... </address>
  </footer>
</body>
```

Rules:

- One `h1` (hero). One `h2` per section. `h3` for items. Never skip a level.
- Hidden headings use a `sr-only` utility, not `display: none`.
- Listing cards are `<article>` inside `<li>`. Photos are `<figure>` with `<figcaption>` only if a caption is visible.
- Group booking comparison uses a description list (`<dl>`) for How / Payment / Confirmation / Best for.
- Any search form uses the `<search>` element wrapper.
- The FAQ uses `<details name="faq">` for exclusive open behaviour. No JS.
- Use `<button>` for actions, `<a>` for navigation. The `gate` handler must not turn links into non-focusable elements.

## 7. Section-by-section layout

Desktop wireframes. All are left-aligned on the 12-column grid.

### Header

```
+------------------------------------------------------------------------------+
| ClockHost      Venues   Shortlets   How it works           Become a host  Sign in |
+------------------------------------------------------------------------------+
```

- Height 72px, sticky, Paper background, `border-block-end: 1px solid var(--line)` only after the page scrolls (use a `:has()` or a tiny scroll observer; no blur, no shadow).
- No topbar. There is no real announcement, and an empty strip is noise.
- No filled button in the header. The hero owns the single primary action. "Become a host" and "Sign in" are quiet text links.
- Mobile: logo left, "Menu" button right opening a full-height `popover` sheet with large links (`text-h3`) and the two quiet links at the bottom.
- No sidebar on the homepage. Sidebars belong to the dashboard and are out of scope.

### Hero (see `03-COPY.md` for the words)

```
+------------------------------------------------------------------------------+
|                                                                              |
|  Find a space                    +---------------------------------------->  |
|  that fits                       |                                          |
|  your plans.                     |         PHOTO PANEL                      |
|                                  |         bleeds off the right edge        |
|  Reviewed venues and shortlet    |         28px radius on the left corners  |
|  apartments in Ilorin. ...       |                                          |
|                                  |                    +----------------+    |
|  [ Browse spaces ]               |                    | small inset    |    |
|  Every listing is reviewed...    |                    | (shortlet)     |    |
|                                  +--------------------+----------------+----+
+------------------------------------------------------------------------------+
```

- Two columns, copy about 45% and photo about 55%. Copy is vertically centred in a hero of `min-block-size: min(calc(100svh - var(--header-h)), 56rem)`.
- Headline at 100% opacity, `text-hero`, Padyakke with synthesised 700 (`.hero-title`), `text-wrap: balance`. One style, no accent word.
- Sub in `text-lead` at level 2 (74%). Max 46ch.
- One primary button (`.btn`). No second button, no arrow. No fine print, no photo chip: nothing sits under the button or on the photo.
- Photo panel: portrait 4:5 on desktop shaped as an arch (fully rounded top, 28px bottom-left radius), full-bleed to the right viewport edge. The arch keeps the panel from reading as another generic rectangle. Mobile keeps the arch top with a 28px bottom radius.
- The panel rotates three owner photos in a slow CSS-only crossfade (30s cycle, 10s each, gentle Ken Burns drift, no JS, loops forever). First photo is the LCP element (`priority`); the rest lazy-load. Reduced motion shows the first photo statically. No overlay, no chip, no inset: nothing sits on the photo. No overlay on the photo. The image is 100% opacity. Text never sits on the photo.
- Hero left padding uses the container edge:

```css
.hero { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); }
.hero__copy {
  align-self: center;
  padding-inline-start: max(var(--gutter), calc((100vw - var(--content)) / 2));
  padding-inline-end: var(--space-l);
  padding-block: var(--space-2xl);
}
.hero__media { position: relative; overflow: hidden; border-start-start-radius: 999px; border-start-end-radius: 999px; border-end-start-radius: var(--radius-panel); min-block-size: 32rem; }
@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; }
  .hero__copy { padding-inline: var(--gutter); }
  .hero__media { border-radius: 999px 999px var(--radius-panel) var(--radius-panel); margin-inline: var(--gutter); aspect-ratio: 4 / 5; min-block-size: 0; }
}
```

- The photo is the LCP element. One `next/image` with `priority`, `sizes="(min-width: 900px) 55vw, 100vw"`, AVIF/WebP. Everything else in the hero is text.
- No search bar in phase 1. See "Decision: search" below.

### Proof strip

```
+------------------------------------------------------------------------------+
| (icon) Reviewed before going live | (icon) Pay in naira with Paystack | (icon) A receipt for every booking |
+------------------------------------------------------------------------------+
```

- Paper, hairline top and bottom. The three items ride one slow horizontal marquee loop (framer-motion, ~26s linear, seamless duplicate, static stacked column under reduced motion), so nothing ever wraps mid-sentence. Never wrap, never truncate.
- Each item: 20px icon, label in Archivo 600 (`font-label-face`) at level 1. The Paystack mark rides at the end of its row at icon height.
- All statements must be true today. See `03-COPY.md` for the proof rules.

### Star: "Two ways to book" (Indigo, the one big moment)

```
+------------------------------------------------------------------------------+
|  Two ways to book.                                                           |
|                                                                              |
|  +------------------------+     1  Book a spot                               |
|  |                        |        Join a shared space ...                   |
|  |   SEAT MAP (sticky)    |                                                  |
|  |   changes state as     |     2  Book the whole space                      |
|  |   you scroll           |        Private for your period ...               |
|  |                        |                                                  |
|  +------------------------+     3  Book together                             |
|                                     One person pays for the group ...        |
+------------------------------------------------------------------------------+
```

- Indigo surface with grain. Left column: a sticky "stage" (`position: sticky; top: calc(var(--header-h) + 2rem)`), height `min(70svh, 40rem)`. Right column: three text panels, each `min-block-size: 70svh`, content vertically centred.
- The stage is an inline SVG floor plan (a room outline, tables, 12 seat dots), not a photograph. Three states:
  1. **Book a spot:** room outline in white at 40%; 4 seat dots filled Marigold ("yours"); other seats outlined, some filled white at 50% ("other guests"). The room stays open.
  2. **Book the whole space:** room outline fills Marigold at 14% with a solid outline; all seats filled; a small padlock glyph.
  3. **Book together:** 6 seats filled Marigold; one seat has a ring ("the person who pays"); thin lines link it to the other five.
- A tiny `SeatMap` component takes `mode: "capacity" | "exclusive" | "group"`. Use `data-mode` and CSS transitions (300ms, fill and opacity only).
- Active panel detection: an `IntersectionObserver` with `rootMargin: "-45% 0px -45% 0px"`. No scroll listeners, no scroll hijacking.
- Numbers 1, 2, 3 are allowed here only because the panels are a sequence of choices the stage responds to. Keep them as plain text at level 3, not big graphic numerals.
- Below 900px: no sticky. Stack each panel with its own small inline SeatMap above the text.
- Reduced motion: states swap instantly.
- The section has one secondary text link per panel ("Browse spaces you can join", "Browse spaces you can book whole"). Button style is not used here (the hero owns the primary action).

### Featured venues and shortlets

```
+------------------------------------------------------------------------------+
| Places worth discovering                         Real venues, real photos... |
|                                                                              |
| +---------------------------+  +----------------+  +----------------+       |
| |                           |  |                |  |                |       |
| |   LEAD PHOTO 16:10        |  |   PHOTO 4:5    |  |   PHOTO 4:5    |       |
| |                           |  |                |  |                |       |
| +---------------------------+  +----------------+  +----------------+       |
|  The Terrace                    Name               Name                     |
|  Ilorin, from N25,000 / hour    Ilorin, from ...   Ilorin, from ...         |
+------------------------------------------------------------------------------+
| Explore all venues (text link)                                               |
+------------------------------------------------------------------------------+
```

- Listing = image + text on the section surface. No card background, no border, no shadow. Only the image has a radius (`--radius-control`, or `--radius-panel` for the lead).
- Title at level 1 (`text-h3` for the lead, `text-lead` weight 600 for others). Meta (area, price) at level 2. A small "Reviewed" tick at level 3.
- First card is the lead (spans 2 columns, 16:10). The rest are 4:5. Uses container queries and subgrid (section 3).
- Mobile: horizontal scroll-snap row (`scroll-snap-type: x mandatory`, cards `flex: 0 0 80%`), no arrows.
- Loading: skeleton blocks in Mist with no shimmer animation.
- Empty state: an invitation to act, not a mood. See `03-COPY.md`.
- Shortlets section uses Mist with grain and the same pattern. Show price as monthly or nightly exactly as the listing data says.
- Never fabricate ratings or counts. Render no rating UI when there are fewer than 3 completed-booking reviews.

### How it works (a real sequence, so numbers are allowed)

```
+------------------------------------------------------------------------------+
| Book a space in three steps                                                  |
|                                                                              |
|  1                      2                          3                         |
|  Discover a space       Check availability         Show up and enjoy         |
|  ...                    and book                   ...                       |
+------------------------------------------------------------------------------+
```

- `<ol>` in three columns separated by hairlines. Numerals in `text-h3` at level 1, with a short 6px Marigold bar beneath each (graphic, not text).
- No icons here. No card backgrounds.

### Trust: what you are booking

```
+------------------------------------------------------------------------------+
| Know what you're booking                                                     |
|                                                                              |
|  Reviewed listings          Clear booking terms                              |
|  ...                        ...                                              |
|  Secure payments            Real booking records                             |
|  ...                        ...                                              |
+------------------------------------------------------------------------------+
```

- Mist with grain. 2 x 2 grid on desktop with hairlines between rows and columns, single column on mobile. 24px Lucide icon (stroke 1.5) at level 1, title at level 1, description at level 2.
- This is the expanded version of the proof strip. Keep both: the strip is glanceable, this explains.

### Activities (typographic index, not chips)

```
+------------------------------------------------------------------------------+
| Browse by activity                                                           |
|                                                                              |
|  Birthday          --------------------------------------------------------  |
|  Hangout           --------------------------------------------------------  |
|  Relaxation        --------------------------------------------------------  |
|  Karaoke           --------------------------------------------------------  |
|  Games             --------------------------------------------------------  |
|  Celebration       --------------------------------------------------------  |
|  Recreation        --------------------------------------------------------  |
+------------------------------------------------------------------------------+
```

- Each row is a link: activity name in `text-h2` Bricolage at level 1, count of live listings at the right in `text-small` level 3 (only when the count is real; hide when zero). Hairline between rows.
- Hover and focus: the row text shifts 8px right and underline appears. Optional enhancement in phase 2: a 4:3 photo preview appears beside the row using anchor positioning.
- Mobile: same list, `text-h3`.

### Locations

```
+------------------------------------------------------------------------------+
| Now in Ilorin. More cities soon.                                             |
|                                                                              |
|  Ilorin  (large, links to listings, shows live space count)                  |
|                                                                              |
|  Lagos   Abuja   Ibadan   Port Harcourt   Kaduna   Enugu   Kano   Coming soon|
+------------------------------------------------------------------------------+
```

- Ilorin is the only link, set large (`text-section`). The other cities are plain text at level 3, not links, with one shared "Coming soon" note. Do not link to empty listing pages.

### Host call to action

```
+------------------------------------------------------------------------------+
| Have a space people would love?                     +-------+ +---------+    |
| List it on ClockHost ...                            | photo | |  photo  |    |
| [ Become a host ]   See how hosting works           +-------+ +---------+    |
|                                                                              |
| Venue host          Shortlet host                                            |
| ...                 ...                                                      |
+------------------------------------------------------------------------------+
```

- Paper surface. One primary button (`Become a host`) and one quiet text link. Two overlapping rounded photos on the right (a venue and an apartment, real listings when available).
- The two host types are a two-column open list with hairline, no boxes.
- "See how hosting works" must not link to `/listings`. Link to a real hosting page or an in-page anchor. If neither exists yet, remove the link.

### FAQ

```
+------------------------------------------------------------------------------+
| Questions before you book        +-----------------------------------------+ |
| (heading, sticky on desktop)     | What is ClockHost?                    + | |
|                                  | -----------------------------------------| |
|                                  | How do I book a space?                + | |
+------------------------------------------------------------------------------+
```

- Mist with grain. Heading in the left 4 columns, sticky. Accordion in the right 8 columns using `<details name="faq">`. Hairline between items. The plus/minus is a CSS pseudo-element that rotates on `[open]`.
- The answers exist in the current code. Keep every answer's substance, and rewrite for clarity (60 words max each). Do not invent answers.

### Footer (Indigo)

```
+------------------------------------------------------------------------------+
|  ClockHost                                                                   |
|  Discover, book and manage spaces and stays in one place.                    |
|                                                                              |
|  Explore          Host             Company          Legal                    |
|  Venues           Become a host    About            Terms                    |
|  Shortlets        Hosting guide    Contact          Privacy                  |
|                                                                              |
|  (c) 2026 ClockHost. All rights reserved.                       Ilorin, Nigeria|
+------------------------------------------------------------------------------+
```

- Only include links that resolve to real pages. Drop About/Contact/Terms/Privacy/Hosting guide from the render until the routes exist, and list them in a TODO comment.
- Wordmark large in Bricolage (`text-section`) at level 1. Link text level 2, fine print level 3.

## 8. Decision: search in the hero

Phase 1 ships without a search bar. With few listings live, a search form over a handful of results promises more than the inventory delivers, and the brief calls for a single call to action. Revisit when there are roughly 30 or more live listings. The pattern then: wrap a compact form in `<search>`, make the submit button the single primary action and remove "Browse spaces".

## 9. Performance budget

- LCP under 2.5s on a throttled 4G mid-range Android profile. The hero photo is the LCP element: AVIF at or below about 120 KB.
- CLS under 0.05. Every image has reserved dimensions.
- No client-side JS for the hero, proof strip, trust, activities, locations or FAQ. Client components only for: header scroll state and menu, the star section observer, and any component that needs `gate`.
- No infinite animations. No video.
- `<ChatBot />` loads lazily (`next/dynamic`, `ssr: false`) and must not overlap the primary button on mobile (offset it above 96px from the bottom edge).
