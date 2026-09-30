"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/home/Header";
import Hero from "@/components/home/Hero";
import QuickDiscovery from "@/components/home/QuickDiscovery";
import ActivityDiscovery from "@/components/home/ActivityDiscovery";
import FeaturedSpaces from "@/components/home/FeaturedSpaces";
import TwoWaysToBook from "@/components/home/TwoWaysToBook";
import HowItWorks from "@/components/home/HowItWorks";
import WhyClockHost from "@/components/home/WhyClockHost";
import Locations from "@/components/home/Locations";
import HostCta from "@/components/home/HostCta";
import Faq from "@/components/home/Faq";
import Footer from "@/components/home/Footer";

export default function HomePage() {
  const router = useRouter();
  const [listings, setListings] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    fetch("/api/listings?limit=12")
      .then((r) => r.json())
      .then((d) => setListings(d.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/auth/profile-status")
      .then((r) => r.json())
      .then((d) => setAuthenticated(!!d.authenticated))
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  const gate = (e: React.MouseEvent, href: string) => {
    if (!authChecked) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (authenticated) {
      if (e.currentTarget?.tagName === "BUTTON") {
        e.preventDefault();
        router.push(href);
      }
      return;
    }
    e.preventDefault();
    router.push(`/sign-up?next=${encodeURIComponent(href)}`);
  };

  // §20-21 Split featured by real vertical never fabricate
  const venues = listings.filter((l) => (l.vertical || l.listingType) !== "housing" && (l.vertical || l.listingType) !== "shortlet");
  const shortlets = listings.filter((l) => (l.vertical || l.listingType) === "housing" || (l.vertical || l.listingType) === "shortlet");

  return (
    <div className="homePage relative min-h-screen overflow-x-clip bg-[var(--color-night)] text-[var(--color-night-text)]">
      <div className="grain pointer-events-none fixed inset-0 z-[1]" aria-hidden="true" />
      <div className="relative z-[2]">
        <Header gate={gate} />
        <main>
          {/* §7 IA: Hero + Discovery Search */}
          <Hero gate={gate} />

          {/* §17 Quick Discovery Venues / Shortlets with real imagery */}
          <QuickDiscovery gate={gate} />

          {/* §20 Featured Venues Places worth discovering */}
          <FeaturedSpaces
            listings={loading ? [] : (venues.slice(0, 6) as any)}
            loading={loading}
            gate={gate}
            title="Places worth discovering"
            subtitle="Real venues, real photos, real availability no fake ratings."
            emptyTitle="Your next venue is coming"
            emptySubtitle="We're bringing trusted venues onto ClockHost in Ilorin."
          />

          {/* §21 Featured Shortlets Stay somewhere that feels right */}
          <FeaturedSpaces
            listings={loading ? [] : (shortlets.slice(0, 6) as any)}
            loading={loading}
            gate={gate}
            title="Stay somewhere that feels right"
            subtitle="Furnished apartments with honest pricing, location and amenities."
            emptyTitle="Your next stay is coming"
            emptySubtitle="We're onboarding shortlet hosts in Ilorin the first apartments go live soon."
          />

          {/* §23 Booking models Book by capacity / Book the whole space */}
          <TwoWaysToBook gate={gate} />

          {/* §7 How Venue Booking Works keep existing HowItWorks but now after booking models */}
          <HowItWorks gate={gate} />

          {/* §25 Trust Know what you're booking */}
          <WhyClockHost />

          {/* §19 Activity discovery */}
          <ActivityDiscovery gate={gate} />

          {/* §26 Location discovery Discover spaces in Ilorin, real data */}
          <Locations gate={gate} />

          {/* Host CTA §68 Have a space people would love? */}
          <HostCta gate={gate} />

          {/* §28 FAQ accordion */}
          <Faq />
        </main>
        <Footer gate={gate} />
      </div>
    </div>
  );
}
