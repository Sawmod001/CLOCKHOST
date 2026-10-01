"use client";

import Link from "next/link";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface FooterProps {
  gate: GateHandler;
}

/**
 * Footer — docs/02 (Footer) + docs/03 + docs/06 Prompt 10.
 * Kola surface with grain and the 8px gradient selvedge. Large wordmark,
 * tagline, link groups. Only links that resolve are rendered.
 * TODO: About, Contact, Terms, Privacy, Hosting guide — render once the
 * routes exist.
 */
export default function Footer({ gate }: FooterProps) {
  return (
    <footer className="surface-kola surface-grain full-bleed">
      <div className="gradient-selvedge gradient-strip" aria-hidden="true" />
      <div className="page section">
        <p className="font-display-face t-1 text-section">ClockHost</p>
        <p className="section-sub t-2 mt-3">
          Discover, book and manage spaces and stays in one place.
        </p>

        <nav className="mt-10 grid gap-8 sm:grid-cols-2" aria-label="Footer">
          <div>
            <p className="t-3 text-small font-semibold">Explore</p>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link
                  href="/listings?vertical=venue"
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, "/listings?vertical=venue")}
                  className="t-2 py-1 text-[15px] transition-opacity hover:opacity-70"
                >
                  Venues
                </Link>
              </li>
              <li>
                <Link
                  href="/listings?vertical=housing"
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, "/listings?vertical=housing")}
                  className="t-2 py-1 text-[15px] transition-opacity hover:opacity-70"
                >
                  Shortlets
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="t-3 text-small font-semibold">Host</p>
            <ul className="mt-3 space-y-2.5">
              <li>
                <Link
                  href="/sign-up"
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, "/sign-up")}
                  className="t-2 py-1 text-[15px] transition-opacity hover:opacity-70"
                >
                  Become a host
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <div
          className="mt-12 flex flex-col gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--line)" }}
        >
          <p className="t-3 text-small">© 2026 ClockHost. All rights reserved.</p>
          <p className="t-3 text-small">Ilorin, Nigeria</p>
        </div>
      </div>
    </footer>
  );
}
