import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Manrope, Instrument_Serif, Space_Grotesk, Padyakke_Expanded_One, Teko, Archivo } from "next/font/google";
import "./globals.css";
import ChatBot from "@/components/ChatBot";
import { BRAND } from "@/config/brand";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: ["400"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// ── Rebrand v2 faces (docs/07). Wired additively; the homepage rebuild will
// switch components onto these, then the legacy faces above can be removed. ──
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

// Micro-labels: Archivo grotesque 600. Chosen over Atkinson for proof/label
// rows where a tighter, more editorial voice is needed (owner decision).
const labels = Archivo({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.CLOCKHOST_BASE_URL || "https://clockhost.vercel.app"),
  title: {
    default: "ClockHost: Book venues and shortlets in Ilorin",
    template: `%s | ${BRAND.name}`,
  },
  description:
    "Book reviewed venues and shortlet apartments in Ilorin, Nigeria. Check real availability, pay in naira with Paystack, and get a receipt for every booking.",
  keywords: BRAND.keywords,
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: process.env.CLOCKHOST_BASE_URL || "https://clockhost.vercel.app",
    siteName: BRAND.siteName,
    title: "ClockHost: Book venues and shortlets in Ilorin",
    description:
      "Book reviewed venues and shortlet apartments in Ilorin, Nigeria. Check real availability, pay in naira with Paystack, and get a receipt for every booking.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClockHost: Book venues and shortlets in Ilorin",
    description:
      "Book reviewed venues and shortlet apartments in Ilorin, Nigeria. Check real availability, pay in naira with Paystack, and get a receipt for every booking.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${manrope.variable} ${instrumentSerif.variable} ${spaceGrotesk.variable} ${display.variable} ${body.variable} ${figures.variable} ${labels.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}<ChatBot /></body>
      </html>
  );
}
