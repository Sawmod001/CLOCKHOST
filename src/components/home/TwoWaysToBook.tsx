"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import SeatMap, { type SeatMode } from "./SeatMap";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface StarPanel {
  mode: SeatMode;
  step: string;
  title: string;
  body: string;
  link: { label: string; href: string };
}

// Copy from docs/03-COPY.md (Two ways to book), condensed to panel shape.
const PANELS: StarPanel[] = [
  {
    mode: "capacity",
    step: "1",
    title: "Book a spot",
    body: "Reserve space for yourself or your group while the venue stays open to others. Priced per person, paid in naira. Best for hangouts, karaoke and game nights.",
    link: { label: "Browse spaces you can join", href: "/listings" },
  },
  {
    mode: "exclusive",
    step: "2",
    title: "Book the whole space",
    body: "Reserve an eligible space exclusively for the period you choose. If two guests request the same slot, the first payment wins. Best for birthdays and private gatherings.",
    link: { label: "Browse spaces you can book whole", href: "/listings" },
  },
  {
    mode: "group",
    step: "3",
    title: "Book together",
    body: "One person pays and shares the booking with invited guests. No split payments to chase, just one clear booking. Best for birthdays and group nights.",
    link: { label: "Find a group-friendly venue", href: "/group-plans" },
  },
];

interface TwoWaysToBookProps {
  gate: GateHandler;
}

/**
 * Star section — docs/02 (Star) + docs/03 (Two ways to book).
 * Zobo surface, sticky gradient stage, three text panels. Active panel via
 * IntersectionObserver (no scroll listeners). Below lg: stacked, each panel
 * carries its own small map. Reduced motion swaps states instantly (global
 * CSS kills the 300ms transitions).
 */
export default function TwoWaysToBook({ gate }: TwoWaysToBookProps) {
  const [active, setActive] = useState<SeatMode>("capacity");
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const mode = entry.target.getAttribute("data-mode");
            if (mode === "capacity" || mode === "exclusive" || mode === "group") {
              setActive(mode);
            }
          }
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    panelRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <section aria-labelledby="ways-title" className="surface-zobo surface-grain full-bleed">
      <div className="page section--lg">
        <div className="section-head">
          <h2 id="ways-title" className="section-title t-1 text-h2">
            Two ways to book.
          </h2>
          <p className="section-sub t-2">
            Every space uses one of two clear booking models. Choose what fits
            your plans.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Stage: sticky on desktop only */}
          <div className="hidden lg:block">
            <div
              className="gradient-strip gradient-panel surface-grain p-8"
              style={{
                position: "sticky",
                top: "calc(var(--header-h) + 2rem)",
                height: "min(70svh, 40rem)",
              }}
            >
              <SeatMap mode={active} />
            </div>
          </div>

          {/* Panels */}
          <div>
            {PANELS.map((panel, i) => (
              <div
                key={panel.mode}
                ref={(el) => {
                  panelRefs.current[i] = el;
                }}
                data-mode={panel.mode}
                className="flex min-h-[70svh] flex-col justify-center border-t py-10 first:border-t-0 first:pt-0 lg:py-6"
                style={{ borderColor: "var(--line)" }}
              >
                {/* Inline map for mobile (no sticky below lg) */}
                <div
                  className="gradient-strip gradient-panel surface-grain mb-8 p-6 lg:hidden"
                  style={{ maxWidth: "22rem" }}
                >
                  <SeatMap mode={panel.mode} />
                </div>
                <p className="t-3 text-small" aria-hidden="true">
                  {panel.step}
                </p>
                <h3 className="section-title t-1 mt-2 text-h3">{panel.title}</h3>
                <p className="section-sub t-2 mt-3">{panel.body}</p>
                <Link
                  href={panel.link.href}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, panel.link.href)}
                  className="link mt-5 inline-block w-fit py-2"
                >
                  {panel.link.label}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
