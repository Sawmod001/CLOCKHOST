import Link from "next/link";
import Logo from "@/components/Logo";
import { NAV_LINKS, SITE } from "@/config/homepage";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface FooterProps {
  gate: GateHandler;
}

export default function Footer({ gate }: FooterProps) {
  return (
    <footer className="border-t border-[var(--color-night-border)] bg-[var(--color-night-soft)]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Logo size="sm" variant="dark" />
          <nav className="flex flex-wrap justify-center gap-4 text-sm text-[var(--color-night-muted)]" aria-label="Footer">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, link.href)} className="hover:text-[var(--color-flame-bright)]">
                {link.label}
              </Link>
            ))}
            <Link href="/sign-up" className="hover:text-[var(--color-flame-bright)]">
              List your space
            </Link>
            <Link href="/sign-in" className="hover:text-[var(--color-flame-bright)]">
              Sign in
            </Link>
          </nav>
        </div>
        <div className="mt-6 border-t border-[var(--color-night-border)] pt-6 text-center text-xs text-[var(--color-night-muted)]">
          <p>
            &copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="mt-1">{SITE.tagline}.</p>
        </div>
      </div>
    </footer>
  );
}
