"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface HeaderProps {
  gate: GateHandler;
}

/**
 * Header — docs/02 (Header) + docs/03 (Header).
 * 72px sticky paper, hairline only after scroll, no filled button.
 * Mobile: "Menu" button opening a full-height sheet with large links.
 */
const LINKS = [
  { label: "Venues", href: "/listings?vertical=venue" },
  { label: "Shortlets", href: "/listings?vertical=housing" },
  { label: "How it works", href: "/#how-it-works" },
];

const QUIET_LINKS = [
  { label: "Become a host", href: "/sign-up", gated: true },
  { label: "Sign in", href: "/sign-in", gated: false },
];

export default function Header({ gate }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [scrolled, setScrolled] = useState<boolean>(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (href: string, gated: boolean) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (gated) gate(e, href);
    if (menuOpen) setMenuOpen(false);
  };

  return (
    <header
      className="surface-paper sticky top-0 z-40 transition-[border-color] duration-200"
      style={{ borderBlockEnd: `1px solid ${scrolled ? "var(--line)" : "transparent"}` }}
    >
      <div
        className="mx-auto flex items-center justify-between"
        style={{
          maxWidth: "var(--content)",
          paddingInline: "var(--gutter)",
          minHeight: "var(--header-h)",
        }}
      >
        <Logo href="/" variant="light" accentClassName="text-[var(--kola)]" />

        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleNav(link.href, true)}
              className="t-1 min-h-[44px] items-center text-[15px] font-medium transition-opacity hover:opacity-70"
              style={{ display: "inline-flex" }}
            >
              {link.label}
            </Link>
          ))}
          {QUIET_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={handleNav(link.href, link.gated)}
              className="t-2 min-h-[44px] text-[15px] font-medium transition-opacity hover:opacity-70"
              style={{ display: "inline-flex", alignItems: "center" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="t-1 min-h-[44px] min-w-[44px] px-2 text-[15px] font-semibold md:hidden"
        >
          Menu
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="surface-paper fixed inset-0 top-[var(--header-h)] z-40 overflow-y-auto md:hidden"
          style={{ borderBlockStart: "1px solid var(--line)" }}
        >
          <nav className="flex flex-col gap-1 px-[var(--gutter)] py-8" aria-label="Mobile">
            {[...LINKS.map((l) => ({ ...l, gated: true })), ...QUIET_LINKS].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={handleNav(link.href, link.gated)}
                className="font-display-face t-1 border-b py-4 text-h3"
                style={{ borderBlockEnd: "1px solid var(--line)" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
