/**
 * ClockHost — Central Brand Configuration
 * Single source of truth for product name, tagline, and brand references.
 * Import from here instead of hardcoding strings across the codebase.
 */

export interface BrandConfig {
  name: string;
  shortName: string;
  tagline: string;
  subtitle: string;
  title: string;
  description: string;
  keywords: string[];
  siteName: string;
  ogImage: string;
  supportEmail: string;
  senderName: string;
  aiName: string;
  whatsappDeskName: string;
  legalName: string;
  termsLabel: string;
  emailFrom: string;
}

export const BRAND: BrandConfig = {
  name: "ClockHost",
  shortName: "ClockHost",

  /** Primary tagline — used in hero, meta description, etc. */
  tagline: "Everything You Need to Book",

  /** Supporting tagline — used on homepage, about sections */
  subtitle: "Discover, book and manage trusted spaces and stays in one place.",

  /** SEO */
  title: "ClockHost — Book Spaces & Housing in Nigeria",
  description:
    "ClockHost is Nigeria's marketplace for discovering and booking unique spaces — venues, shortlets, and housing.",
  keywords: [
    "ClockHost",
    "Nigeria",
    "spaces",
    "venues",
    "housing",
    "shortlets",
    "booking",
    "rent",
    "event venue",
    "Ilorin",
    "Lagos",
    "Abuja",
  ],

  /** Open Graph */
  siteName: "ClockHost",
  ogImage: "/og.png",

  /** Contact / Support */
  supportEmail: "support@clockhost.com",
  senderName: "ClockHost",

  /** AI Assistant */
  aiName: "ClockHost AI",

  /** WhatsApp Bot */
  whatsappDeskName: "ClockHost",

  /** Legal */
  legalName: "ClockHost",
  termsLabel: "ClockHost's Terms and Conditions",

  /** Email sender */
  emailFrom: "ClockHost <bookings@clockhost.com>",
};
