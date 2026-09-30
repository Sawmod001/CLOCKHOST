import { SectionContainer, SectionHeading } from "./Section";
import Reveal from "./Reveal";
import { CATEGORIES } from "@/config/homepage";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface CategoriesProps {
  gate: GateHandler;
}

export default function Categories({ gate }: CategoriesProps) {
  return (
    <SectionContainer className="bg-[var(--color-night)] py-16 sm:py-24">
      <SectionHeading
        eyebrow="Browse by category"
        title="What are you looking for?"
        subtitle="From birthdays to group nights, find what fits your occasion."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((cat, i: number) => {
          const Icon = cat.icon;
          return (
            <Reveal key={cat.key} delay={(i % 3) * 80}>
              <a
                href={cat.href}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, cat.href)}
                className="group flex items-center gap-4 rounded-2xl border border-[var(--color-night-border)] bg-[var(--color-night-card)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-flame-bright)]/50 hover:bg-[var(--color-night-elevated)] hover:shadow-lg"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-flame)]/15 text-[var(--color-flame-bright)] transition-all duration-300 group-hover:bg-[var(--color-flame)] group-hover:text-white">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block break-words font-semibold text-[var(--color-night-text)] group-hover:text-[var(--color-flame-bright)]">
                    {cat.label}
                  </span>
                  <span className="block break-words text-xs text-[var(--color-night-muted)]">{cat.desc}</span>
                </span>
              </a>
            </Reveal>
          );
        })}
      </div>
    </SectionContainer>
  );
}
