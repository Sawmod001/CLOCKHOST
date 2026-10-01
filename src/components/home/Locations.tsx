"use client";

import Link from "next/link";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface LocationsProps {
  gate: GateHandler;
}

const COMING_SOON = ["Lagos", "Abuja", "Ibadan", "Port Harcourt", "Kaduna", "Enugu", "Kano"];

/**
 * Locations — docs/02 (Locations) + docs/03.
 * Haze with grain. Ilorin is the only link (the only live city); the rest
 * are plain text with one shared "Coming soon" note. No links to empty
 * listing pages. No motion library.
 */
export default function Locations({ gate }: LocationsProps) {
  return (
    <section aria-labelledby="cities-title" className="surface-haze surface-grain">
      <div className="page section">
        <div className="section-head">
          <h2 id="cities-title" className="section-title t-1 text-h2">
            Now in Ilorin. More cities soon.
          </h2>
          <p className="section-sub t-2">
            Browse spaces in Ilorin today. More cities are on the way.
          </p>
        </div>

        <div className="mt-10">
          <Link
            href="/listings?area=Ilorin"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, "/listings?area=Ilorin")}
            className="font-display-face t-1 inline-block min-h-[44px] py-2 text-section"
          >
            Ilorin, Kwara State
          </Link>
          <p className="t-3 mt-6 text-small">
            {COMING_SOON.join(", ")} — <span>Coming soon</span>
          </p>
        </div>
      </div>
    </section>
  );
}
