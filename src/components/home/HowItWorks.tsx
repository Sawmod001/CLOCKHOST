"use client";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface HowItWorksProps {
  gate: GateHandler;
}

const STEPS = [
  {
    title: "Discover a space",
    body: "Browse reviewed venues and apartments with clear photos, pricing and availability. Every listing is reviewed before it goes live.",
  },
  {
    title: "Check availability and book",
    body: "Book a spot for a shared experience, or the whole space for private use. Pay securely through Paystack.",
  },
  {
    title: "Show up and enjoy",
    body: "Your booking record and receipt arrive right away. Check in with your host and enjoy your time.",
  },
];

/**
 * HowItWorks — docs/02 (How it works) + docs/03 + docs/06 Prompt 7.
 * Paper with a faint blueprint grid (the floor-plan motif as backdrop).
 * Real <ol> sequence: Teko numerals, 6px mango bar, hairlines. No icons,
 * no cards, no motion. The old group-booking CTA block is dropped — the
 * star section's third panel already covers group booking.
 */
export default function HowItWorks({ gate }: HowItWorksProps) {
  void gate;
  return (
    <section aria-labelledby="how-title" className="surface-paper texture-grid">
      <div className="page section" id="how-it-works">
        <div className="section-head">
          <h2 id="how-title" className="section-title t-1 text-h2">
            Book a space in three steps
          </h2>
          <p className="section-sub t-2">Search, reserve and go. No phone calls, no guesswork.</p>
        </div>

        <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="border-t-2 pt-6"
              style={{ borderColor: "var(--line)" }}
            >
              <span className="fig text-figure t-1" aria-hidden="true">
                {i + 1}
              </span>
              <span
                aria-hidden="true"
                className="mt-3 block h-[6px] w-10 rounded-full"
                style={{ background: "var(--mango)" }}
              />
              <h3 className="t-1 mt-4 text-h3 font-semibold">{step.title}</h3>
              <p className="section-sub t-2 mt-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
