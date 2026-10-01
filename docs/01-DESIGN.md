# 01 — ClockHost Design System (Homepage Rebrand)

Read this before touching any component. Every visual value in the build must come from this file or `tokens.css`. If a value is not here, ask; do not invent one.

---

## 1. Brief

- **Subject:** ClockHost is a Nigerian marketplace for booking venues (hangouts, birthdays, karaoke, games, celebrations) and shortlet apartments. Ilorin is live; other cities are not.
- **Audience:** guests planning a gathering or a stay, mostly on mid-range Android phones and limited data. Second audience: people with a space to list (hosts).
- **Primary job of the homepage:** get a guest to browse real listings with confidence. Secondary job: get a host to sign up.
- **The memorable thing (spend boldness here, keep the rest quiet):** (1) real photography in a large rounded panel in the hero, and (2) one "Two ways to book" section that explains the product with a floor-plan seat map.
- **Personality:** calm, clear, expensive. Lots of white. Confident type. Warmth comes from photography and one accent colour, not from decoration.

## 2. Design plan, reviewed against generic defaults

The plan, then what was changed because it looked like a default:

| Axis | Decision |
|---|---|
| Colour | Paper white base, cool Mist tint, Indigo Ink for text/CTA/dark sections, Marigold accent used sparingly |
| Type | Display: Bricolage Grotesque. Text/UI: Geist. Two families, clearly different in voice |
| Layout | Left-aligned, asymmetric 12-column grid, split hero with photo panel bleeding off the right edge, one sticky "star" section, typographic lists instead of card grids |
| Principles | One loud headline per view, quieter support, quietest fine print. No boxes without a job. Proof placed at the point of doubt. Motion only where it explains something |

Changes made after review (these were drifting toward templated looks):

- Dropped the cream background + serif display + terracotta combination. Warm cream reads as a default; cool Mist and pure white are calmer and more "expensive".
- Dropped the italic-accent-word headline (the current hero italicises "fits your plans"). One headline, one style, 100% opacity.
- Dropped small uppercase eyebrow labels above every H2 ("Quick discovery", "Featured spaces", "Support"...). They add nothing the heading does not already say.
- Dropped the arrow icon on buttons and the middle-dot meta strings ("A · B · C").
- Dropped identical rounded cards everywhere. Cards are replaced by open layouts, hairlines and photography.
- Dropped the fade-and-slide-up reveal on every section and the always-on gradient blobs.

## 3. Colour

Five named values. Nothing else.

| Token | Hex | Role |
|---|---|---|
| `paper` | `#FFFFFF` | Default page background. Most of the page. |
| `mist` | `#F1F3F9` | Alternate section background. Indigo-tinted, cool. Carries the grain texture. |
| `indigo-ink` | `#1B1F4B` | All text on light surfaces, primary button, dark sections (star, footer). |
| `marigold` | `#F2A93B` | Accent: primary button on dark, seat-map "yours" state, small marks, focus ring on dark. |
| `line` | `rgba(27,31,75,0.12)` | Hairlines and dividers. On dark surfaces use `rgba(255,255,255,0.16)`. |

Why indigo and marigold: indigo has deep roots in Yoruba cloth (adire), which suits an Ilorin-first brand, and it gives the highest-contrast text and button on white. Marigold is warm, celebratory and reads as hospitality without leaning on the red/orange the old brand used. The old green is removed entirely.

### Contrast (computed with the WCAG formula; re-check in a tool before launch)

| Pair | Ratio | Use |
|---|---|---|
| Indigo Ink on Paper | about 15.6:1 | All body and headline text, primary button |
| Indigo Ink on Mist | about 14.1:1 | Same, on tinted sections |
| White on Indigo Ink | about 15.6:1 | Text on dark sections |
| Marigold on Indigo Ink | about 7.8:1 | Accent on dark |
| Indigo Ink on Marigold | about 7.8:1 | Button label on marigold |
| Marigold on Paper | about 2.0:1 | **Never for text or focus rings on light.** Fills and graphics only |

### Rules

1. The single highest-contrast filled element in any view is the primary action. On light surfaces: Indigo fill, white label. On indigo surfaces: Marigold fill, Indigo label.
2. Never put marigold text on a light background.
3. No gradients as decoration. No colour washes behind sections. Flat colour plus grain.
4. Status colours (success/danger) are not part of the homepage brand. Leave them to the app.

### Surface rhythm (top to bottom)

Never place two sections with the same background next to each other. Dark surfaces appear only twice on the page.

| # | Section | Surface |
|---|---|---|
| 1 | Header + Hero | Paper |
| 2 | Proof strip | Paper (hairline top and bottom) |
| 3 | Two ways to book (star) | **Indigo Ink** (first dark moment) |
| 4 | Featured venues | Paper |
| 5 | Featured shortlets | Mist + grain |
| 6 | How it works | Paper |
| 7 | Trust (what you are booking) | Mist + grain |
| 8 | Activities | Paper |
| 9 | Locations | Mist + grain |
| 10 | Host call to action | Paper |
| 11 | FAQ | Mist + grain |
| 12 | Footer | **Indigo Ink** (second dark moment) |

## 4. Opacity ladder (visual hierarchy)

Hierarchy is controlled by size, weight and opacity together. Three levels of text, always.

| Level | Role | On light (ink) | On dark (white) | Size |
|---|---|---|---|---|
| 1 | Headlines, key labels, prices | 100% | 100% | display scale |
| 2 | Supporting paragraphs, descriptions | 74% (about 6.7:1 on Paper) | 78% | `step-0` / `step-1` |
| 3 | Fine print, captions, meta | 66% (about 5.2:1 on Paper, about 4.9:1 on tinted) | 66% | `step--1` |

Do not go below level 3. Do not use opacity on images or whole sections; use it only on text colour via the tokens `--fg-1`, `--fg-2`, `--fg-3`.

Squint test: blur the page. The headline must lead, then the support text, then the fine print. If two levels look the same, increase the size difference, not just the opacity.

## 5. Typography

Two families, clearly different.

- **Display (`--font-display`): Bricolage Grotesque.** Characterful grotesque with an optical-size axis. Weights 600-700 for headlines. Tight tracking (`-0.03em` to `-0.04em`) and tight leading at large sizes. Never used for body text.
- **Text and UI (`--font-body`): Geist.** Neutral and readable. Body, buttons, navigation, forms, fine print. Weights 400, 500, 600.
- **Alternative pairing (if the client prefers a serif voice):** Fraunces for display + Geist. Same slots, same rules. Do not run both pairings.
- The client may supply their own two fonts. Slot them into the same two variables in `layout.tsx` and change nothing else.

Remove `Manrope`, `Instrument Serif` and `Space Grotesk` from the layout. Before removing `Fraunces`, search the whole app for `font-serif`, `font-fraunces`, `font-serif-accent` and `font-serif-display`; the dashboard may use them.

### Scale (fluid, defined in `tokens.css`)

| Token | Range | Use |
|---|---|---|
| `text-hero` | 52px to 96px, line-height 0.98, tracking -0.035em | Hero H1 only |
| `text-section` | 40px to 72px, line-height 1.02 | H2 on big moments (star, host) |
| `text-h2` | 32px to 52px, line-height 1.08 | Standard H2 |
| `text-h3` | 24px to 34px, line-height 1.15 | Item titles |
| `text-lead` | 18px to 22px, line-height 1.5 | Hero sub, section intros |
| `text-body` | 16px to 18px, line-height 1.6 | Paragraphs |
| `text-small` | 13px to 14px, line-height 1.5 | Fine print, captions |

Rules:

- Line length: 65 characters maximum for paragraphs. Use `max-inline-size: 62ch`.
- Headlines: `text-wrap: balance`. Paragraphs: `text-wrap: pretty` (progressive; ignored where unsupported).
- Sentence case everywhere. No all-caps labels. No tracked-out small caps.
- Left-aligned text. Centre alignment only for a single short line inside a component (for example a badge). Never centre paragraphs.
- Use `font-variant-numeric: tabular-nums` on prices and counts.
- Minimum 16px for any interactive label on mobile.

## 6. Space, grid, radii

- **Base unit:** 4px. Use the tokens; never hardcode spacing.
- **Section padding (block):** `--space-section` (80px to 152px, fluid). Big moments use `--space-section-lg` (104px to 208px). Space between sections comes from section padding only, never from margins (avoids collapsing-margin surprises).
- **Container:** content max 1240px (`--content`), gutter `clamp(20px, 4vw, 48px)`. Full-bleed is allowed for backgrounds and the hero photo.
- **Radii, two only:** `--radius-panel` 28px for photo panels and large media. `--radius-control` 12px for inputs and small media. Buttons are pills (`9999px`). No other radii.
- **Shadows:** none on content. A single soft shadow only on floating layers (menus, popovers): `0 12px 32px rgba(27,31,75,0.14)`.
- **No card backgrounds.** A listing is an image plus text on the section surface. Groups are separated by whitespace and hairlines (`1px solid var(--line)`), not boxes.

## 7. Texture (real-world feel)

One texture, used with restraint:

- **Paper grain** on Mist and Indigo sections: an inline SVG `feTurbulence` noise tile (`160x160`), applied through a `::before` pseudo-element on the section, `opacity: 0.05` on Mist with `mix-blend-mode: multiply`, `opacity: 0.08` on Indigo with `mix-blend-mode: screen`. The CSS is in `tokens.css` under `.surface-grain`.
- **Not** a fixed full-screen overlay (that repaints on scroll and costs battery). Grain lives inside sections, static, never animated.
- Paper white sections stay perfectly clean. White space is the luxury.
- **Brand line motif:** thin (1.5px) architectural floor-plan lines, used only in the star section illustration and, optionally, one faint plan drawing behind the host section. Never as wallpaper.

## 8. Motion

Motion is used to show what changed, not to decorate.

Allowed:

1. **One hero load sequence:** headline, sub, button and photo fade in together in under 600ms, with the photo doing a very slight settle (`scale(1.02)` to `1`). Runs once.
2. **The star section:** the seat-map illustration changes state as the reader moves between the three steps (crossfade and dot fill, 300ms).
3. **Interaction feedback:** button press, link underline, FAQ open/close, menu open.
4. **Optional, progressive:** a thin scroll progress indicator or a subtle parallax on the hero photo using `animation-timeline: view()` inside `@supports (animation-timeline: view())`. Chrome and Safari 26 support it; Firefox does not enable it by default yet, so nothing may depend on it.

Not allowed: infinite animations, blurred morphing blobs, rotating decorative elements, fade-up on every section, hover lift on every card, scroll hijacking, autoplay video.

Only animate `transform` and `opacity`. Respect `prefers-reduced-motion` in both CSS and Framer Motion (`<MotionConfig reducedMotion="user">`). With reduced motion, everything renders in its final state instantly.

## 9. Icons

Lucide, stroke width 1.5, 20px inline with text or 24px standalone. Colour follows the text level (100% or 74%). No coloured circles or boxes behind icons. No decorative icons where a word is enough.

## 10. Focus and states

- Focus ring on light surfaces: `outline: 2px solid var(--indigo-ink); outline-offset: 3px`.
- Focus ring on dark surfaces: `outline: 2px solid var(--marigold); outline-offset: 3px`.
- Hover on primary button: darken by 8% (light) or reduce marigold saturation slightly (dark). No lift, no shadow growth.
- Disabled: 40% opacity plus `cursor: not-allowed`.
- Minimum touch target: 44x44px.

## 11. Font wiring (`app/layout.tsx`)

```tsx
import { Bricolage_Grotesque, Geist } from "next/font/google";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  axes: ["opsz"],        // if the build complains about axes, remove this line
  display: "swap",
});

const body = Geist({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// <html lang="en" className={`${display.variable} ${body.variable}`}>
```

If Geist Mono is used elsewhere in the app, keep it. Otherwise remove it.

## 12. Accessibility floor

- Text contrast 4.5:1 minimum (large text 3:1). Values in section 3 already comply.
- Visible keyboard focus everywhere.
- One `h1`. No skipped heading levels.
- Every image has meaningful alt text (see `04-IMAGES.md`). Decorative SVG gets `aria-hidden="true"`.
- `prefers-reduced-motion` respected.
- All interactive targets at least 44px.
- Test at 360px, 768px, 1024px and 1440px widths, and at 200% browser zoom.

## 13. What was deliberately cut (the "remove one accessory" list)

Blurred blobs, rotating ring, grain overlay across the whole viewport, italic accent word, eyebrow labels, arrow icons in buttons, second hero button, card backgrounds, per-section fade-up, green palette, three extra font families, hero photo at 10% opacity.
