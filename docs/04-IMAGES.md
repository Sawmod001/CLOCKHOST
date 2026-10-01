# 04 — Images: hero direction, search guide, specs and organisation

---

## 1. The honest recommendation

The page says "Real venues, real photos". A stock photo in the hero contradicts that line in the first second.

- **Best:** use a real Ilorin listing photo (with the host's permission) as the hero, populated from the first featured listing, with a commissioned or supplied fallback.
- **Second best:** commission a short shoot (half a day) of two partner spaces: one venue in use, one shortlet interior. This gives you a hero, an inset, host-section photos and an OG image from one session.
- **Placeholder only:** stock photography, clearly tracked in the manifest (section 5) and replaced as soon as real photos exist. Never leave the OG image or hero as stock at launch if you can avoid it.

## 2. Hero photo brief

The hero graphic changes from a faded background image to a large, full-opacity photograph in a rounded panel (4:5 portrait on both desktop and mobile).

**What it should show:** people using a space, or a space ready to be used. The feeling is "I can picture my plan here".

- Warm natural or golden-hour light, or warm evening light with string lights. Not dark and moody (it clashes with the white brand).
- One clear subject, in the centre or centre-right, with calm space around it (the panel crops on different screens).
- Candid, not staged. People mid-laugh, mid-conversation, mid-toast. Faces are welcome and should reflect the real Ilorin audience.
- Colours that sit well with Indigo Ink and Marigold: warm neutrals, deep blues, greens from plants, gold from lights. Avoid heavy red or orange dominance, and avoid saturated filters.
- Sharp, high resolution, no visible watermark, no text or logos in the frame.

**The optional inset (4:3):** a shortlet interior. A bed or sofa corner with natural window light. Shows the second product vertical.

**Do not use:** generic hotel lobbies, empty white rooms, over-staged corporate parties, nightclub strobe lighting, heavy HDR, obvious stock-photo poses (thumbs up, fake laughing at salad), clip-art illustrations, or a photo that shows a place that is not on ClockHost.

## 3. Search terms (for placeholders on Pexels, Unsplash or similar)

Check each site's licence for commercial use and record the photographer and URL in the manifest.

**Hero (portrait, people):**
- `friends laughing long dinner table terrace evening`
- `birthday celebration friends warm light`
- `african friends hangout lounge`
- `outdoor event string lights friends`
- `friends game night around table`

**Hero (space, no people):**
- `terrace tables string lights evening`
- `event hall table setting daylight`
- `rooftop lounge seating golden hour`

**Inset and shortlets:**
- `furnished apartment living room natural light`
- `cozy bedroom minimal white linen window`
- `apartment balcony morning`

**Activity images (phase 2 preview or other pages):**
- `karaoke night friends microphone`
- `board games friends table`
- `spa relaxation room towels` (only if it matches real listings)
- `birthday table cake balloons daytime`
- `outdoor recreation friends football` (only if it matches real listings)

Tips: add "Nigeria", "Lagos" or "African" to searches for more representative results, use portrait orientation filters, sort by newest, and reject anything that looks like an advertisement.

## 4. Technical specs

| Asset | Source size | Ratio | Delivered as | Target weight |
|---|---|---|---|---|
| Hero photo | 1600 x 2000 minimum | 4:5 | AVIF + WebP + JPEG fallback via `next/image` | 120 KB or less (AVIF) |
| Hero inset | 1200 x 900 | 4:3 | Same | 60 KB or less |
| Listing cards (lead) | 1600 x 1000 | 16:10 | Same | 90 KB or less |
| Listing cards | 1000 x 1250 | 4:5 | Same | 60 KB or less |
| Host section photos | 1200 x 1500 | 4:5 | Same | 80 KB each |
| Open Graph image | 1200 x 630 | 1.91:1 | PNG or JPEG | 200 KB or less |

Rules:

1. Exactly **one** image on the page has `priority` (the hero photo). Everything else is lazy.
2. Use `next/image` with `sizes`, for example hero: `(min-width: 900px) 55vw, 100vw`; listings: `(min-width: 900px) 33vw, 80vw`.
3. Configure `images.remotePatterns` for the listing image host. Do not hotlink from Pexels in production. Download, compress and self-host stock placeholders.
4. Every image has explicit `width` and `height` (or `fill` inside an `aspect-ratio` box) to prevent layout shift.
5. Provide a `placeholder="blur"` with a tiny `blurDataURL` for the hero and listing images.
6. No overlays, tints or opacity on photos. The photo is 100% opacity.
7. Set the focal point with `object-position` per image (in the manifest), not one global value.
8. No autoplay video. If motion is wanted later, use a poster image and load the video only on interaction.

## 5. Folder structure for the AI coding tool

```
public/
  images/
    hero/
      hero-primary-4x5.avif
      hero-primary-4x5.webp
      hero-primary-4x5.jpg
      hero-inset-4x3.avif
    listings/
      venues/
      shortlets/
    hosts/
      host-venue-4x5.avif
      host-shortlet-4x5.avif
    activities/
      birthday-4x3.avif
      hangout-4x3.avif
      relaxation-4x3.avif
      karaoke-4x3.avif
      games-4x3.avif
      celebration-4x3.avif
      recreation-4x3.avif
    og/
      og-default-1200x630.png
    textures/
      (none: grain is an inline SVG in tokens.css)
  icons/
    logo.svg
    paystack-mark.svg     (official asset only)
```

Naming: `subject-purpose-ratio.ext`, lowercase, hyphens, no spaces.

## 6. Image manifest (single source of truth)

Create `src/config/images.ts`. Components import from it, never hard-code paths.

```ts
export type SiteImage = {
  id: string;
  src: string;
  width: number;
  height: number;
  alt: string;               // describes what is visible; empty string only if purely decorative
  objectPosition?: string;   // focal point, e.g. "60% 40%"
  blurDataURL?: string;
  source: "commissioned" | "host-supplied" | "stock-placeholder";
  credit?: string;           // photographer + URL for stock
  replaceBy?: string;        // ISO date to replace placeholders
};

export const IMAGES: Record<string, SiteImage> = {
  heroPrimary: {
    id: "hero-primary",
    src: "/images/hero/hero-primary-4x5.jpg",
    width: 1600,
    height: 2000,
    alt: "Friends laughing around a long table on a terrace in the evening",
    objectPosition: "55% 45%",
    source: "stock-placeholder",
    credit: "TODO: photographer and URL",
    replaceBy: "2026-11-30",
  },
  heroInset: {
    id: "hero-inset",
    src: "/images/hero/hero-inset-4x3.jpg",
    width: 1200,
    height: 900,
    alt: "Bright furnished apartment living room with a sofa by a window",
    source: "stock-placeholder",
    credit: "TODO",
    replaceBy: "2026-11-30",
  },
  // hostVenue, hostShortlet, og, activity images follow the same shape
};
```

## 7. Alt text guide

- Describe what is visible and relevant: who, where, what is happening.
- Under about 125 characters. No "image of" or "photo of".
- Listings: `"{Listing name}, {area}: {what the photo shows}"` for the cover; the gallery describes each view.
- Decorative images (grain, flourishes) use `alt=""`. SVG illustrations that explain (the seat map) get an accessible name, for example `role="img"` with `aria-label="Floor plan showing four seats reserved in a shared venue"`, updated for each state.

## 8. Illustration (the seat map)

The star section uses an inline SVG, not a photo. Draw it with simple shapes, 1.5px strokes, no gradients, no shadows. Colours from tokens only: white at 40% for outlines, marigold for "yours", white at 50% for "others". It weighs a few kilobytes and works offline. Build it once as `SeatMap` with three modes (see `02-LAYOUT-AND-CSS.md`).
