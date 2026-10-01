/**
 * Image manifest — single source of truth (docs/04-IMAGES.md section 6).
 * Components import from here, never hard-code image paths.
 *
 * NOTE (2026-09-30): real Ilorin photography is pending from the owner.
 * Entries below are tracked `stock-placeholder`s with `replaceBy` dates.
 * Swap `src`/`source`/`credit` when real photos land; keep ids stable.
 */

export type ImageSource =
  | "commissioned"
  | "host-supplied"
  | "owner-supplied"
  | "stock-placeholder";

export interface SiteImage {
  id: string;
  src: string;
  width: number;
  height: number;
  /** Describes what is visible; empty string only if purely decorative. */
  alt: string;
  /** Focal point, e.g. "60% 40%". */
  objectPosition?: string;
  blurDataURL?: string;
  source: ImageSource;
  /** Photographer + URL for stock. */
  credit?: string;
  /** ISO date to replace placeholders. */
  replaceBy?: string;
}

const PLACEHOLDER_CREDIT = "TODO: photographer and URL";
const REPLACE_BY = "2026-11-30";

export const IMAGES: Record<string, SiteImage> = {
  heroPrimary: {
    id: "hero-primary",
    src: "/images/hero/hero-primary-4x5.jpg",
    width: 736,
    height: 920,
    alt: "Two guests toasting drinks at a warmly lit bar",
    objectPosition: "50% 28%",
    source: "owner-supplied",
  },
  heroInset: {
    id: "hero-inset",
    src: "/images/hero/hero-inset-4x3.jpg",
    width: 474,
    height: 474,
    alt: "Bright furnished apartment sitting room with natural window light",
    objectPosition: "50% 40%",
    source: "owner-supplied",
  },
  heroSecond: {
    id: "hero-second",
    src: "/images/hero/hero-second-4x5.jpg",
    width: 736,
    height: 894,
    alt: "Friends laughing together over drinks in a lounge",
    objectPosition: "50% 35%",
    source: "owner-supplied",
  },
  heroThird: {
    id: "hero-third",
    src: "/images/hero/hero-third-4x5.jpg",
    width: 736,
    height: 920,
    alt: "Group of friends relaxing together in a warmly lit room",
    objectPosition: "50% 30%",
    source: "owner-supplied",
  },
  hostVenue: {
    id: "host-venue",
    src: "/images/hosts/host-venue-4x5.jpg",
    width: 736,
    height: 1104,
    alt: "Warm restaurant interior with set tables and string lights",
    source: "owner-supplied",
  },
  hostShortlet: {
    id: "host-shortlet",
    src: "/images/hosts/host-shortlet-4x3.jpg",
    width: 474,
    height: 474,
    alt: "Bright furnished shortlet sitting room with natural window light",
    source: "owner-supplied",
  },
  ogDefault: {
    id: "og-default",
    src: "/images/og/og-default-1200x630.png",
    width: 1200,
    height: 630,
    alt: "ClockHost: book venues and shortlets in Ilorin",
    source: "stock-placeholder",
    replaceBy: REPLACE_BY,
  },
};
