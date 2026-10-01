# 07 — Revision: fonts, colour, gradients, natural feel

**This file overrides `01-DESIGN.md`, `02-LAYOUT-AND-CSS.md`, `05-AGENT-RULES.md`, `06-PROMPTS.md` and `tokens.css` wherever they conflict.** Use `tokens-v2.css` instead of `tokens.css`. Layout, copy, image and structure files are unchanged apart from the renames in section 8.

---

## 1. Why this revision

The first pack moved away from one generic look and landed in another. Research on documented "AI design tells" shows the current clusters:

- **Fonts flagged as overused:** Inter, Geist, Space Grotesk, Plus Jakarta Sans, and the newest reflex, Instrument Serif. The first pack used Geist. Your own list includes Instrument Serif. Both are out.
- **Colour:** purple and violet gradients, blue-to-purple, cyan on dark, glowing accents on dark, aurora and mesh blob backgrounds. Tailwind's default indigo is the root cause of the purple web, so the indigo in the first pack was in the same neighbourhood.
- **The trap after avoiding those:** telling a model "avoid purple" just moves it to the next dense cluster, which in 2026 is warm cream + high-contrast serif + terracotta, and near-black + one acid accent. So this revision avoids those too, and every choice below has a reason tied to ClockHost, not a taste for a look.
- **Gradients:** a gradient looks generic or expensive because of two decisions: how many hues it has, and which colour space the browser blends through. By default browsers blend in sRGB, which goes muddy in the middle. Blending `in oklch` keeps chroma and brightness even. This is supported in current Chrome, Safari and Firefox.

Test for every design choice: could this belong to any other website? If yes, it needs a reason or it goes.

## 2. Fonts

### Verdict on the seven you sent

| Font | Verdict | Reason |
|---|---|---|
| **Padyakke Expanded One** | **Use: display** | Wide, warm slab with teardrop terminals and swollen bottoms, designed alongside Aoife Mooney's BioRhyme Expanded for its Latin. Friendly, slightly vintage, not among the overused faces. One weight (400), Latin subset available |
| **Teko** | **Use: figures only** | Tall condensed numerals that read like a clock or time-slot display, which suits ClockHost. Limited to digits |
| Instrument Serif | Do not use | Flagged as the newest AI reflex, and a second serif would fight Padyakke. The current hero uses it, so removing it is part of the rebrand |
| JetBrains Mono | Do not use | A monospace for small labels is template chrome. Teko does the figures with more character |
| Lancelot | Do not use | Medieval calligraphic signal. Thin strokes also degrade on small mobile screens |
| Rubik Glitch | Do not use on this site | Deliberate distortion reads as broken or unsafe on a page where people pay money |
| Rubik Dirt | Do not use on this site | Same problem: distressed texture undermines trust |

Rubik Glitch and Rubik Dirt could suit a separate campaign page (for example a nightlife event landing page) where the mood is the point. Not the homepage.

None of your seven works for body text, so the system needs one more face.

### Final system: three families, three jobs — plus one label face

| Role | Family | Where |
|---|---|---|
| Display | **Padyakke Expanded One** (400; H1 synthesised 700 + text stroke) | H1 and H2 only, at 28px and above |
| Text and UI | **Archivo** (400, 500, 600) | Body, nav, buttons, forms, fine print, H3 item titles |

Why Archivo for text (owner decision, revising the Atkinson pick): Atkinson read generic at text sizes with no distinctive combo quality. Archivo's grotesque voice carries more character against Padyakke while staying highly readable on mid-range Android screens. One fewer family to load than keeping both.
| Figures | **Teko** (500, 600) | Prices (digits), time slots, counts, step numerals |
| Micro-labels | **Archivo** (500, 600, 700; `--font-label`) | Proof strip and label rows only (owner decision: a tighter editorial micro-voice) |

Why Atkinson Hyperlegible Next for text: it was designed by the Braille Institute for character distinction and readability, it is on Google Fonts, and it is far from the Inter/Geist cluster. That suits a mobile-first audience on varied screens and lighting. It is a real choice with a reason, not a filler.

### Rules

- **Padyakke:** never below 28px (its thin strokes need size), never for buttons, nav or body, never all-caps (the wide capitals get heavy). H1 alone uses a synthesised 700 plus a same-colour text stroke (`-webkit-text-stroke: 0.03em`, `.hero-title`) because the family ships only a 400 and the unboldered headline reads too thin at hero size. Nowhere else may synthesise weights or stroke text. Use `text-wrap: balance`. Line-height 1.0, letter-spacing `-0.02em` on the H1. Expanded letters are wide, so headlines get fewer characters per line (see tokens: `text-hero` 44px to 80px).
- **Teko:** digits and numerals only, never sentences, never lowercase words. Weight 500 or 600.
- **Naira sign (₦):** I could not confirm glyph coverage for U+20A6 in Teko or Padyakke. Do not depend on it. The `Price` component renders `₦` in the text font and only the digits in Teko (spec below). Check the rendered symbol at 360px and 1440px.
- **Atkinson:** body 400, UI 500, emphasis 600. Never fake weights.
- Three families is the ceiling. Padyakke ships one weight, Teko two, Atkinson variable, so the payload stays small. Preload only the display face.

### Wiring (`app/layout.tsx`)

```tsx
import { Padyakke_Expanded_One, Teko, Archivo } from "next/font/google";

const display = Padyakke_Expanded_One({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const body = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const figures = Teko({
  variable: "--font-figures",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

// <html lang="en" className={`${display.variable} ${body.variable} ${figures.variable}`}>
```

If `Atkinson_Hyperlegible_Next` is not exported by the installed Next version, install `@fontsource-variable/atkinson-hyperlegible-next` and import `wght.css`, mapping `--font-body` to `'Atkinson Hyperlegible Next Variable'`. Remove Geist, Geist Mono, Bricolage, Fraunces, Manrope, Instrument Serif and Space Grotesk from the home page (search the app before removing any the dashboard uses).

### `Price` component

```tsx
export function Price({ amount, unit }: { amount: number; unit?: string }) {
  return (
    <span className="price">
      <span className="price__cur" aria-hidden="true">₦</span>
      <span className="price__num">{new Intl.NumberFormat("en-NG").format(amount)}</span>
      {unit ? <span className="price__unit">{unit}</span> : null}
      <span className="sr-only"> naira</span>
    </span>
  );
}
```

Styles are in `tokens-v2.css`. Use it for every price on the page.

## 3. Colour

Six named values, derived in OKLCH and converted to sRGB (all inside the sRGB gamut). Contrast figures are computed, not estimated, and should still be re-checked in a tool before launch.

| Token | Hex | OKLCH | Role |
|---|---|---|---|
| `paper` | `#FFFFFF` | | Default page background |
| `haze` | `#F0F4F7` | `oklch(0.965 0.006 230)` | Alternate section background. A cool harmattan-haze neutral. Carries grain |
| `kola` | `#291411` | `oklch(0.22 0.035 28)` | All text on light surfaces. Very dark red-brown, not navy, not neutral black. Also the footer surface |
| `zobo` | `#80183D` | `oklch(0.40 0.14 5)` | Primary button on light, the star section surface, focus ring on light |
| `guava` | `#DB546D` | `oklch(0.63 0.17 12)` | Gradient middle stop only. Graphics and large elements, never small text |
| `mango` | `#F1AF57` | `oklch(0.80 0.13 72)` | Gradient end stop, seat-map "yours" state, focus ring on dark. Graphics only |

Also: `line` = `rgb(41 20 17 / 0.12)` on light, `rgb(255 255 255 / 0.16)` on dark.

### Why these colours

Zobo is the hibiscus drink served at Nigerian gatherings, and chapman is the red-to-citrus drink of every party. The palette is that: deep hibiscus red, the pink-red of guava, the amber of mango, on a mostly white page. It says celebration and hospitality without leaning on the usual blue, purple, green or cream. Kola (the nut offered to guests) gives the ink a warm, dark, slightly red-brown depth that sits with all of it. It is not a wellness-green, a fintech-blue or an "editorial cream" brand.

### Contrast (computed)

| Pair | Ratio | Use |
|---|---|---|
| Kola on Paper | 17.5:1 | All text on white |
| Kola on Haze | 15.8:1 | All text on tinted sections |
| Kola at 74% on Paper / Haze | 7.5:1 / 7.1:1 | Level 2 text |
| Kola at 66% on Paper / Haze | 5.7:1 / 5.4:1 | Level 3 text (minimum) |
| White on Zobo | 9.9:1 | Text on the star section and primary button |
| White at 80% on Zobo | 6.8:1 | Level 2 text on Zobo |
| White at 70% on Zobo | 5.6:1 | Level 3 text on Zobo (minimum) |
| White on Kola | 17.5:1 | Footer text |
| White at 70% on Kola | 9.0:1 | Footer level 3 |
| Mango on Zobo | 5.2:1 | Graphics and large marks on Zobo |
| Mango on Kola | 9.2:1 | Graphics on the footer |
| Zobo on Paper | 9.9:1 | Focus ring, primary button fill |
| Guava on Paper | 3.8:1 | **Large graphics only** |
| Mango on Paper | 1.9:1 | **Never on light backgrounds** |
| White on Guava | 3.8:1 | **Not for text** |

### Rules

1. Primary action on light surfaces: Zobo fill, white label. On the Zobo star surface: white fill, Kola label. Nothing else on the page is a filled button.
2. Guava and Mango are never text colours and never appear on Paper as marks smaller than a large graphic.
3. Level 1, 2, 3 text opacity ladder stays (100 / 74 / 66 on light; 100 / 80 / 70 on dark).
4. Focus ring: 2px Zobo, 3px offset on light; 2px Mango on dark.
5. No other colours. Status colours belong to the app, not the homepage.

### Surface rhythm (updated)

| # | Section | Surface |
|---|---|---|
| 1 | Header + Hero | Paper |
| 2 | Proof strip | Paper |
| 3 | Two ways to book (star) | **Zobo**, with the gradient stage panel |
| 4 | Featured venues | Paper |
| 5 | Featured shortlets | Haze + grain |
| 6 | How it works | Paper |
| 7 | Trust | Haze + grain |
| 8 | Activities | Paper |
| 9 | Locations | Haze + grain |
| 10 | Host call to action | Paper |
| 11 | FAQ | Haze + grain |
| 12 | Footer | **Kola**, with a gradient selvedge band at the top |

## 4. Gradients

Gradients are rare, physical and lit from one direction. They are not wallpaper.

### The one gradient family

Three stops, all analogous (a hue span of about 67 degrees: 5 to 72), blended `in oklch`:

```css
--gradient-strip: linear-gradient(in oklch 105deg, var(--zobo) 0%, var(--guava) 55%, var(--mango) 100%);
```

Sampled in OKLCH, the ramp runs `#80183D` at 0%, `#AD3655` at 25%, `#DB546D` at 50%, `#EF8052` at 75% and `#F1AF57` at 100%. It stays saturated the whole way instead of going grey. Always declare a plain sRGB fallback line first (see `tokens-v2.css`).

### The "strip" texture (what makes it specific to this brand)

Strip-woven cloth, such as aso-oke, is made from narrow bands sewn edge to edge. The gradient borrows only that structure: faint vertical seams (1px, 6% white) every 52px over the gradient, plus paper grain. It gives the gradient a woven, made-by-hand surface instead of a smooth digital one. Use the structure only. Do not copy any real cloth pattern or symbol, and ask a person from the community to review it before launch.

### Where it appears (two places, no more)

1. **The star section stage panel:** a rounded panel (28px radius) behind the seat map, on the Zobo surface. No text on it. The seat map draws white lines and Mango seats over it.
2. **The footer selvedge:** an 8px band across the top edge of the Kola footer, like the finished edge of a woven strip.

### Rules

- Light always comes from the right: every gradient runs at `105deg`. The hero photo should be lit from the right or front so the page has one consistent light (see `04-IMAGES.md`).
- Maximum three stops, hue span under 70 degrees, always `in oklch`.
- Text never sits on the Guava or Mango part. White text is allowed only on the first 30% of the ramp (6.1:1 at 25%) or on flat Zobo.
- Never behind body copy, never on buttons, never as a page background, never a border, never `background-clip: text`, never animated.
- Banned outright: mesh or aurora blobs, radial glows, blue-purple or purple-pink ramps, cyan on dark, rainbow or conic ramps, glassmorphism, glowing accents, gradient text.
- Always add grain (`.surface-grain`) to gradient panels to prevent banding on 8-bit screens.
- Optional quiet wash for Haze sections: `linear-gradient(in oklab 180deg, var(--paper), var(--haze) 35%)`. Almost invisible, only softens the section edge.
- Check for banding on a low-quality Android screen at low brightness.

### Tuning to the real photo

When real hero photos arrive, sample the photo's warm highlight and deep shadow in an OKLCH picker, then shift `guava` and `mango` hue by up to 8 degrees to sit with it. The gradient should look like it belongs to the photography.

## 5. Texture (updated)

- **Grain** stays as in the first pack (inline SVG noise on Haze and gradient panels, static, never a fixed full-screen layer).
- **Strip seams** on gradient panels as described above.
- Paper sections stay perfectly clean.

## 6. Making it feel natural and considered

Practical principles behind the choices above. Apply them when the tool has a free decision.

1. **One light source.** Gradients at 105 degrees, photos lit consistently, any shadow falling the same way.
2. **Colour from the real world.** Zobo, guava, mango, kola, harmattan haze are things people in Ilorin know. Photography carries most of the colour, the palette supports it.
3. **Material, not effect.** Grain and woven seams suggest paper and cloth. Blur, glow and shine suggest software.
4. **Controlled irregularity.** Not everything is a perfect row. The lead listing is larger. One host photo is offset 24px lower than the other. Stagger a couple of image heights. Symmetry everywhere feels generated.
5. **Restraint.** The gradient appears twice, the Zobo surface once, the display face only in headings. The quiet parts make the loud parts loud.
6. **Local specificity.** Real Ilorin names and areas, naira formatting, real listing photos, honest counts. Specifics are what a template cannot fake.
7. **Motion with weight.** Ease-out curves (`cubic-bezier(0.22, 1, 0.36, 1)`), short durations, no bounce, no infinite loops.

## 7. Updated banned list (adds to `05-AGENT-RULES.md`)

- Fonts: Inter, Geist, Space Grotesk, Plus Jakarta Sans, Manrope, Instrument Serif, Bricolage Grotesque, and any font not in the three-family system.
- Colours: any purple, violet, indigo, blue-purple, cyan or teal; cream + terracotta; near-black + acid accent; the old green, flame red and gold; Mango or Guava as text.
- Effects: glow, glassmorphism, aurora or mesh blobs, gradient text, animated gradients, gradient borders, dark-mode neon.

## 8. Renames and overrides for the earlier files

| In files 01 to 06 | Now |
|---|---|
| Indigo Ink (`indigo-ink`) | `kola` for text and footer; `zobo` for the primary button and star surface |
| Marigold (`marigold`) | `mango` (graphics only) |
| Mist (`mist`) | `haze` |
| Bricolage Grotesque, Geist | Padyakke Expanded One, Atkinson Hyperlegible Next, Teko |
| `--font-display`, `--font-body` | Same names, plus `--font-figures` |
| Star section "Indigo surface" | Zobo surface with a gradient stage panel |
| Footer "Indigo surface" | Kola surface with a gradient selvedge |
| Primary button on dark: Marigold fill | White fill, Kola label |
| `text-hero` 52px to 96px | 44px to 80px (expanded display face is wider; H1 synthesised 700 for presence) |
| Step numerals in Bricolage | Teko figures |
| `tokens.css` | `tokens-v2.css` |

Everything about layout, grid, sections, copy, images and semantics stays as written.

## 9. Prompt for the AI coding tool

Paste this before any other prompt, and again if the tool has already built anything from the first pack.

```
Read docs/redesign/07-REVISION-FONTS-COLOR-GRADIENTS.md and tokens-v2.css. File 07 overrides files 01 to 06 and tokens.css wherever they conflict.

Task: apply the revision to the foundation only.
1. Replace tokens.css with tokens-v2.css (merge into app/globals.css, scoped to the home page wrapper).
2. In app/layout.tsx load Padyakke_Expanded_One (--font-display), Atkinson_Hyperlegible_Next (--font-body) and Teko (--font-figures) exactly as in section 2 of file 07. If Atkinson_Hyperlegible_Next is not exported, use @fontsource-variable/atkinson-hyperlegible-next. Remove Geist, Bricolage, Manrope, Instrument Serif and Space Grotesk from the home page; search the whole repo first and tell me which the rest of the app uses.
3. Create the Price component from section 2 and use it wherever a price is shown.
4. Apply the rename table in section 8 across any component already built (colours, fonts, star surface, footer surface, primary button on dark).
5. Do not add any colour, font, gradient or effect not in file 07.

Then screenshot the hero at 360px and 1440px. Confirm the H1 fits in three lines at 360px, the naira sign renders correctly, and no banned item from section 7 is present. Report deviations before fixing them.
```

## 10. Verification checklist

- [ ] H1 fits in three lines at 360px and does not overflow the left column at 1440px (the width figures in the tokens are estimates; adjust `--text-hero` from the screenshot)
- [ ] Padyakke is never below 28px; only the H1 synthesises 700 + text stroke, nothing else fakes weights
- [ ] ₦ renders correctly at 360px and 1440px
- [ ] Contrast recheck in a tool: kola text levels, white on zobo, Mango and Guava only as graphics
- [ ] Gradient panel shows no banding on a low-quality screen at low brightness
- [ ] Gradient appears in exactly two places
- [ ] Covering the logo, the page could not be mistaken for a generic template
- [ ] No banned font, colour or effect from section 7
