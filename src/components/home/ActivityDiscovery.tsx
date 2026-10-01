"use client";

import Link from "next/link";
import { ACTIVITIES } from "@/config/homepage";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface ActivityDiscoveryProps {
  gate: GateHandler;
}

/**
 * ActivityDiscovery — docs/02 (Activities) + docs/03.
 * Typographic index, not chips. Hairline rows, hover shifts 8px with
 * underline. No counts rendered (none are real yet). No motion library.
 */
export default function ActivityDiscovery({ gate }: ActivityDiscoveryProps) {
  return (
    <section aria-labelledby="activities-title" className="surface-paper">
      <div className="page section">
        <div className="section-head">
          <h2 id="activities-title" className="section-title t-1 text-h2">
            Browse by activity
          </h2>
          <p className="section-sub t-2">Choose by how you want to spend your time.</p>
        </div>

        <ul className="rule-list mt-10">
          {ACTIVITIES.map((act) => (
            <li key={act.label}>
              <Link
                href={act.href}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, act.href)}
                className="group flex min-h-[64px] items-center py-4"
              >
                <span className="font-display-face t-1 text-h3 transition-transform duration-200 ease-out group-hover:translate-x-2 group-focus-visible:translate-x-2">
                  {act.label}
                </span>
                <span
                  aria-hidden="true"
                  className="t-3 ml-4 h-px w-8 self-center transition-all duration-200 group-hover:w-12"
                  style={{ background: "currentColor", opacity: 0.4 }}
                />
                <span className="t-2 ml-auto text-small underline-offset-4 group-hover:underline">
                  Explore
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
