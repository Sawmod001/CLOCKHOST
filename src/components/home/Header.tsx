"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import Logo from "@/components/Logo";
import { NAV_LINKS } from "@/config/homepage";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface HeaderProps {
  gate: GateHandler;
}

export default function Header({ gate }: HeaderProps) {
  const [mobileMenu, setMobileMenu] = useState<boolean>(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-night-border)] bg-[var(--color-night)]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
        <Logo href="/" variant="dark" />

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, link.href)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--color-night-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-night-text)]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/sign-in"
            className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--color-night-muted)] transition-colors hover:bg-white/5 hover:text-[var(--color-night-text)]"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="ml-2 rounded-xl bg-[var(--color-flame)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-flame-bright)]"
          >
            Get started
          </Link>
        </nav>

        <button
          onClick={() => setMobileMenu((v) => !v)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-[var(--color-night-text)] sm:hidden"
          aria-label="Toggle menu"
          aria-expanded={mobileMenu}
        >
          {mobileMenu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileMenu && (
        <div className="border-t border-[var(--color-night-border)] bg-[var(--color-night)] px-4 py-4 sm:hidden animate-fade-in">
          <nav className="flex flex-col gap-2" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  setMobileMenu(false);
                  gate(e, link.href);
                }}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-[var(--color-night-text)] hover:bg-white/5"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/sign-in"
              onClick={() => setMobileMenu(false)}
              className="rounded-xl px-4 py-3 text-sm font-semibold text-[var(--color-night-muted)] hover:bg-white/5"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              onClick={() => setMobileMenu(false)}
              className="rounded-xl bg-[var(--color-flame)] px-4 py-3 text-center text-sm font-semibold text-white"
            >
              Get started
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
