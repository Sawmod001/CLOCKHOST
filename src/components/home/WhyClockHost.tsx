import { SectionContainer, SectionHeading } from "./Section";
import Reveal from "./Reveal";
import { WHY_CLOCKHOST } from "@/config/homepage";

export default function WhyClockHost() {
  return (
    <section className="border-t border-[var(--color-night-border-soft)] bg-[var(--color-night-soft)]">
      <SectionContainer className="py-16 sm:py-24">
        <SectionHeading
          eyebrow="Trust & transparency"
          title="Know what you're booking"
          subtitle="Reviewed listings, clear terms, secure payments and real records from completed bookings"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_CLOCKHOST.map((item, i: number) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={i * 80} className="h-full">
                <div className="h-full rounded-2xl border border-[var(--color-night-border)] bg-[var(--color-night-card)] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-flame-bright)]/40 hover:shadow-lg">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-flame)]/15 text-[var(--color-flame-bright)]">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-[var(--color-night-text)]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-night-muted)]">{item.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </SectionContainer>
    </section>
  );
}
