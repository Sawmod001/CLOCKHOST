import Link from "next/link";
import { SectionContainer, SectionHeading } from "./Section";
import Reveal from "./Reveal";
import { ACTIVITIES } from "@/config/homepage";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface ActivityDiscoveryProps {
  gate: GateHandler;
}

export default function ActivityDiscovery({ gate }: ActivityDiscoveryProps) {
  return (
    <SectionContainer className="bg-[var(--color-night)] py-12 sm:py-16">
      <SectionHeading
        eyebrow="Explore by activity"
        title="Looking for something specific?"
        subtitle="Browse by how you want to spend your time not by internal business types."
      />

      {/* Desktop: horizontal cards, Mobile: horizontal scroll per §19 */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible sm:pb-0">
        {ACTIVITIES.map((act, i: number) => (
          <Reveal key={act.label} delay={i * 40} className="shrink-0 sm:shrink">
            <Link
              href={act.href}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, act.href)}
              className="flex h-[72px] w-[148px] shrink-0 items-center justify-center rounded-2xl border border-[var(--color-night-border)] bg-[var(--color-night-card)] px-4 text-sm font-semibold text-[var(--color-night-text)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-flame-bright)]/40 hover:bg-[var(--color-night-elevated)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-flame-bright)] sm:w-auto"
            >
              {act.label}
            </Link>
          </Reveal>
        ))}
      </div>
    </SectionContainer>
  );
}
