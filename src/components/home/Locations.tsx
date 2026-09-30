import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { SectionContainer, SectionHeading } from "./Section";
import Reveal from "./Reveal";
import { LOCATIONS } from "@/config/homepage";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface LocationsProps {
  gate: GateHandler;
}

export default function Locations({ gate }: LocationsProps) {
  return (
    <SectionContainer className="bg-[var(--color-night)] py-16 sm:py-24">
      <SectionHeading
        eyebrow="Popular locations"
        title="Live in Ilorin, growing nationwide"
        subtitle="Browse spaces in your city or explore what is coming to the cities below."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {LOCATIONS.map((loc, i: number) => (
          <Reveal key={loc.name} delay={(i % 4) * 60} className="h-full">
            <Link
              href={`/listings?area=${encodeURIComponent(loc.query)}`}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, `/listings?area=${encodeURIComponent(loc.query)}`)}
              className="group flex h-full items-center gap-3 rounded-2xl border border-[var(--color-night-border)] bg-[var(--color-night-card)] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-flame-bright)]/50 hover:bg-[var(--color-night-elevated)]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-flame)]/15 text-[var(--color-flame-bright)]">
                <MapPin size={16} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-[var(--color-night-text)] group-hover:text-[var(--color-flame-bright)]">
                  {loc.name}
                </span>
                <span className="block truncate text-[11px] text-[var(--color-night-muted)]">{loc.area}</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/listings"
          onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, "/listings")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-gold)] transition-colors hover:text-[var(--color-night-text)]"
        >
          Explore all spaces <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </SectionContainer>
  );
}
