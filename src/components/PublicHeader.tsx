import Link from "next/link";
import Logo from "@/components/Logo";

const DASHBOARD_BY_ROLE: Record<string, string> = {
  guest: "/dashboard",
  venue_host: "/host/dashboard",
  shortlet_host: "/host/dashboard",
  admin: "/admin",
};

interface PublicHeaderProps {
  backHref?: string;
  role?: string;
}

export default function PublicHeader({ backHref, role }: PublicHeaderProps) {
  const dashboardPath = (role && DASHBOARD_BY_ROLE[role]) || "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
        <Logo size="sm" href="/" />
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {backHref && (
            <Link href={backHref} className="flex min-h-[44px] items-center whitespace-nowrap text-sm font-semibold text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
              ← Back
            </Link>
          )}
          <Link href="/listings" className="flex min-h-[44px] items-center whitespace-nowrap text-sm font-semibold text-[var(--color-ink)] hover:text-[var(--color-primary)]">
            Browse
          </Link>
          <Link href={dashboardPath} className="flex min-h-[36px] items-center whitespace-nowrap rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white sm:py-1.5">
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}
