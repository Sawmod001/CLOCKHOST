"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, MapPin } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import GuestSidebar from "@/components/sidebar/GuestSidebar";

const STATUS_STYLES = {
  pending: "bg-[#FEF3C7] text-[#B45309]",
  confirmed: "bg-[#DCFCE7] text-[#166534]",
  completed: "bg-[#F3F4F6] text-[#6B7280]",
  cancelled: "bg-[#F3F4F6] text-[#6B7280]",
  no_show: "bg-[#FEE2E2] text-[#991B1B]",
};

export default function ViewingsPage() {
  const [viewings, setViewings] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/viewings")
      .then((r) => r.json())
      .then((data) => setViewings(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout sidebar={GuestSidebar} sidebarProps={{ activePage: "viewings" }}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">My Viewings</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Property viewing requests and schedules</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
            ))}
          </div>
        ) : viewings.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
            <Calendar size={32} className="mx-auto mb-3 text-[var(--color-ink-muted)]" />
            <p className="text-sm font-semibold text-[var(--color-ink)]">No viewings yet</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Browse housing listings to request a viewing</p>
            <Link href="/listings?vertical=housing" className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">
              Browse Properties
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {viewings.map((v) => (
              <div key={v.id} className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-[var(--color-ink)]">{v.listing?.title || "Property"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm break-words text-[var(--color-ink-muted)]">
                      <Calendar size={14} className="shrink-0" />
                      {new Date(v.scheduledAt).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos",  weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
                      <Clock size={14} />
                      {new Date(v.scheduledAt).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })}
                      {" · "}{v.durationMinutes || 30} min
                    </div>
                    {v.listing?.location && (
                      <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
                        <MapPin size={14} />
                        {v.listing.location.cityArea}
                      </div>
                    )}
                  </div>
                  <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[v.status as keyof typeof STATUS_STYLES] || "bg-[#F3F4F6] text-[#6B7280]"}`}>
                    {v.status}
                  </span>
                </div>
                {v.guestNote && <p className="mt-2 text-xs text-[var(--color-ink-muted)]">Note: {v.guestNote}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
