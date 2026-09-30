import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Manrope, Instrument_Serif, Space_Grotesk } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.CLOCKHOST_BASE_URL || "https://hostme-xbhx.vercel.app"),
  title: {
    default: BRAND.title,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  keywords: BRAND.keywords,
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: process.env.CLOCKHOST_BASE_URL || "https://hostme-xbhx.vercel.app",
    siteName: BRAND.siteName,
    title: BRAND.title,
    description: BRAND.description,
    images: [
      {
        url: "https://images.pexels.com/photos/29692582/pexels-photo-29692582.jpeg?auto=compress&cs=tinysrgb&w=1200",
        width: 1200,
        height: 1500,
        alt: "Elegant event space in Ilorin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.title,
    description: BRAND.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${manrope.variable} ${instrumentSerif.variable} ${spaceGrotesk.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}<ChatBot /></body>
      </html>
  );
}
