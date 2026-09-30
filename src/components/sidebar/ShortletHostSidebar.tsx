"use client";

import Link from "next/link";
import { LogOut, X, Shield, Calendar, Star, DollarSign, Bell, Settings, Home } from "lucide-react";
import Logo from "@/components/Logo";

interface ShortletHostSidebarProps {
  activePage: string;
  onClose?: () => void;
}

export default function ShortletHostSidebar({ activePage, onClose }: ShortletHostSidebarProps) {
  const linkClass = (page: string): string =>
    `flex min-h-[44px] items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:py-2 ${
      activePage === page
        ? "bg-[var(--color-primary)] text-white"
        : "text-[var(--color-ink)] hover:bg-[var(--color-surface-alt)]"
    }`;

  return (
    <nav className="flex flex-col gap-2">
      <div className="mb-6 flex items-center justify-between">
        <Logo size="sm" />
        <button className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl lg:hidden" onClick={onClose} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>

      <Link href="/host/dashboard" className={linkClass("dashboard")}>Dashboard</Link>
      <Link href="/host/properties" className={linkClass("properties")}>
        <span className="flex items-center gap-2"><Home size={16} /> My Properties</span>
      </Link>
      <Link href="/host/bookings" className={linkClass("bookings")}>Reservations</Link>
      <Link href="/host/calendar" className={linkClass("calendar")}>
        <span className="flex items-center gap-2"><Calendar size={16} /> Calendar</span>
      </Link>
      <Link href="/host/reviews" className={linkClass("reviews")}>
        <span className="flex items-center gap-2"><Star size={16} /> Reviews</span>
      </Link>
      <Link href="/host/earnings" className={linkClass("earnings")}>
        <span className="flex items-center gap-2"><DollarSign size={16} /> Earnings</span>
      </Link>
      <Link href="/host/notifications" className={linkClass("notifications")}>
        <span className="flex items-center gap-2"><Bell size={16} /> Notifications</span>
      </Link>
      <Link href="/host/verification" className={linkClass("verification")}>
        <span className="flex items-center gap-2"><Shield size={16} /> Verification</span>
      </Link>
      <Link href="/host/settings" className={linkClass("settings")}>
        <span className="flex items-center gap-2"><Settings size={16} /> Settings</span>
      </Link>

      <div className="mt-auto pt-6">
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/sign-in";
          }}
          className="flex min-h-[44px] w-full items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-alt)]"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </nav>
  );
}
