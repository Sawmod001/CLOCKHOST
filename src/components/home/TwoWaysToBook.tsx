import { Armchair as SeatsIcon, LockKeyhole as LockIcon } from "lucide-react";
import Reveal from "./Reveal";
import { BOOKING_TYPES } from "@/config/homepage";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface BookingColumn {
  key: string;
  icon?: string;
  tagline?: string;
  label: string;
  href: string;
  cta: string;
}

interface ColumnHeaderProps {
  col: BookingColumn;
}

function ColumnHeader({ col }: ColumnHeaderProps) {
  const Icon = ICONS[col.icon ?? ""] || SeatsIcon;
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-flame)]/15 text-[var(--color-flame-bright)]">
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-night-muted)]">{col.tagline}</p>
        <h3 className="font-serif-display text-lg font-semibold text-[var(--color-night-text)]">{col.label}</h3>
      </div>
    </div>
  );
}

const ICONS: Record<string, typeof SeatsIcon> = { seats: SeatsIcon, lock: LockIcon };

interface ColumnCtaProps {
  col: BookingColumn;
  gate: GateHandler;
}

function ColumnCta({ col, gate }: ColumnCtaProps) {
  return (
    <button
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => gate(e, col.href)}
      className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-flame)] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-flame-bright)]"
    >
      {col.cta}
    </button>
  );
}

interface TwoWaysToBookProps {
  gate: GateHandler;
}

export default function TwoWaysToBook({ gate }: TwoWaysToBookProps) {
  const [capacity, exclusive] = BOOKING_TYPES.columns as unknown as [BookingColumn, BookingColumn];

  return (
    <section className="border-t border-[var(--color-night-border-soft)] bg-[var(--color-night-soft)]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">
                {BOOKING_TYPES.eyebrow}
              </p>
              <h2 className="font-serif-display text-3xl font-semibold tracking-tight text-[var(--color-night-text)] sm:text-4xl">
                {BOOKING_TYPES.title}
              </h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <p className="max-w-xl text-sm leading-relaxed text-[var(--color-night-muted)] sm:text-base lg:ml-auto">
              {BOOKING_TYPES.subtitle}
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-5 lg:hidden">
          {[capacity, exclusive].map((col, i: number) => (
            <Reveal key={col.key} delay={i * 80} className="h-full">
              <div className="flex h-full flex-col gap-5 rounded-3xl border border-[var(--color-night-border)] bg-[var(--color-night-elevated)] p-6">
                <ColumnHeader col={col} />
                <dl className="divide-y divide-[var(--color-night-border-soft)]">
                  {BOOKING_TYPES.rows.map((row) => (
                    <div key={row.label} className="py-3.5">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
                        {row.label}
                      </dt>
                      <dd className="mt-1 text-sm leading-relaxed text-[var(--color-night-text)]">
                        {col.key === "capacity" ? row.capacity : row.exclusive}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto pt-1">
                  <ColumnCta col={col} gate={gate} />
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <div className="mt-12 hidden overflow-hidden rounded-3xl border border-[var(--color-night-border)] lg:block">
            <div className="grid grid-cols-3">
              <div className="p-6" />
              {[capacity, exclusive].map((col) => (
                <div key={col.key} className="border-l border-[var(--color-night-border)] bg-[var(--color-night-elevated)] p-6">
                  <ColumnHeader col={col} />
                </div>
              ))}
            </div>

            {BOOKING_TYPES.rows.map((row, i: number) => (
              <div key={row.label} className={`grid grid-cols-3 ${i % 2 ? "bg-[var(--color-night-card)]/60" : ""}`}>
                <div className="px-6 py-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-gold)]">{row.label}</p>
                </div>
                <div className="border-l border-[var(--color-night-border)] px-6 py-5 text-sm leading-relaxed text-[var(--color-night-text)]">
                  {row.capacity}
                </div>
                <div className="border-l border-[var(--color-night-border)] px-6 py-5 text-sm leading-relaxed text-[var(--color-night-text)]">
                  {row.exclusive}
                </div>
              </div>
            ))}

            <div className="grid grid-cols-3">
              <div className="p-6" />
              {[capacity, exclusive].map((col) => (
                <div key={col.key} className="border-l border-[var(--color-night-border)] p-6">
                  <ColumnCta col={col} gate={gate} />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
