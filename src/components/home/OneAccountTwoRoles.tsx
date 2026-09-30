import { Search, Store, ArrowRight } from "lucide-react";
import Reveal from "./Reveal";
import { ROLES } from "@/config/homepage";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface OneAccountTwoRolesProps {
  gate: GateHandler;
}

export default function OneAccountTwoRoles({ gate }: OneAccountTwoRolesProps) {
  const columns = [
    { ...ROLES.guest, accent: "flame" as const, href: "/sign-up?role=guest" },
    { ...ROLES.host, accent: "gold" as const, href: "/sign-up?role=host" },
  ];

  return (
    <section className="border-t border-[var(--color-night-border-soft)] bg-[var(--color-night)]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 text-center sm:mb-12">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">{ROLES.eyebrow}</p>
          <h2 className="font-serif-display text-3xl font-semibold tracking-tight text-[var(--color-night-text)] sm:text-4xl">
            {ROLES.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-[var(--color-night-muted)] sm:text-base">
            {ROLES.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {columns.map((col, i: number) => {
            const Icon = i === 0 ? Search : Store;
            const Accent = col.accent;
            return (
              <Reveal key={col.label} delay={i * 100} className="h-full">
                <div className="flex h-full flex-col rounded-2xl border border-[var(--color-night-border)] bg-[var(--color-night-card)] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-night-border-soft)] hover:bg-[var(--color-night-elevated)]">
                  <div className="mb-5 flex items-center gap-3">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        Accent === "gold"
                          ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
                          : "bg-[var(--color-flame)]/15 text-[var(--color-flame-bright)]"
                      }`}
                    >
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <h3 className="font-serif-display text-xl font-semibold text-[var(--color-night-text)]">
                      {col.label}
                    </h3>
                  </div>

                  <p className="mb-5 text-sm leading-relaxed text-[var(--color-night-muted)]">{col.desc}</p>

                  <ul className="mb-7 flex-1 space-y-3">
                    {col.features.map((f: string) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--color-night-text)]">
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                            Accent === "gold"
                              ? "bg-[var(--color-gold)]/15 text-[var(--color-gold)]"
                              : "bg-[var(--color-flame)]/15 text-[var(--color-flame-bright)]"
                          }`}
                          aria-hidden="true"
                        >
                          ✓
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => gate(e, col.href)}
                    className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                      Accent === "gold"
                        ? "bg-[var(--color-gold)] text-[var(--color-night)] hover:bg-[var(--color-gold)]/90"
                        : "bg-[var(--color-flame)] text-white hover:bg-[var(--color-flame-bright)]"
                    }`}
                  >
                    {col.label} <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-[var(--color-night-muted)] sm:text-sm">
          {ROLES.footnote}
        </p>
      </div>
    </section>
  );
}
