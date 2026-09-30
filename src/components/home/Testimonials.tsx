import { Quote } from "lucide-react";
import { SectionContainer, SectionHeading } from "./Section";
import Reveal from "./Reveal";
import { TESTIMONIALS } from "@/config/homepage";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Testimonials() {
  // §27 Do not redesign fake testimonials show only real eligible reviews, else hide section
  if (!TESTIMONIALS || TESTIMONIALS.length === 0) return null;

  return (
    <section className="border-t border-[var(--color-night-border-soft)] bg-[var(--color-night-soft)]">
      <SectionContainer className="py-16 sm:py-24">
        <SectionHeading
          eyebrow="Loved by guests and hosts"
          title="What people say about ClockHost"
          subtitle="Real experiences from people who found their space or hosted one."
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {TESTIMONIALS.map((t: any, i: number) => (
            <Reveal key={t.name} delay={i * 100} className="h-full">
              <figure className="flex h-full flex-col rounded-2xl border border-[var(--color-night-border)] bg-[var(--color-night-card)] p-6">
                <Quote size={28} className="mb-4 text-[var(--color-flame-bright)]" aria-hidden="true" />
                <blockquote className="flex-1 break-words text-sm leading-relaxed text-[var(--color-night-text)]">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-flame)] text-sm font-bold text-white">
                    {initials(t.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[var(--color-night-text)]">{t.name}</span>
                    <span className="block text-xs text-[var(--color-night-muted)]">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
