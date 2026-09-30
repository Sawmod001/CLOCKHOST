"use client";

import { useEffect, useState } from "react";
import { TrendingUp, DollarSign } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

export default function HostEarningsPage() {
  const [bookings, setBookings] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/bookings");
        if (res.ok) {
          const data = await res.json();
          setBookings(data.data || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const completed = bookings.filter((b) => b.status === "completed");
  const totalEarnings = completed.reduce((sum, b) => sum + (b.totalAmountKobo || 0), 0);
  const totalCommission = completed.reduce((sum, b) => sum + (b.commissionKobo || 0), 0);
  const netEarnings = totalEarnings - totalCommission;
  const pendingPayout = bookings
    .filter((b) => b.status === "confirmed" || b.status === "checked_in")
    .reduce((sum, b) => sum + (b.totalAmountKobo || 0) - (b.commissionKobo || 0), 0);

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "earnings" }}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Earnings</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Track your revenue and payouts</p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#DCFCE7] p-2 text-[#166534]">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">Total Earnings</p>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">₦{(totalEarnings / 100).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#DBEAFE] p-2 text-[#1E40AF]">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">Net Earnings (after fees)</p>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">₦{(netEarnings / 100).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#FEF3C7] p-2 text-[#B45309]">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">Pending Payout</p>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">₦{(pendingPayout / 100).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#F3F4F6] p-2 text-[#6B7280]">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--color-ink-muted)]">Platform Fees</p>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">₦{(totalCommission / 100).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
              <h2 className="font-semibold text-[var(--color-ink)] mb-4">Recent Transactions</h2>
              {completed.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">No completed bookings yet.</p>
              ) : (
                <div className="space-y-2">
                  {completed.slice(0, 10).map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-alt)] p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
                          {b.bookingType === "exclusive" ? "Exclusive" : "Capacity"} booking
                        </p>
                        <p className="text-xs text-[var(--color-ink-muted)]">
                          {new Date(b.eventStart as string).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos",  day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold whitespace-nowrap text-green-600">+₦{((b.totalAmountKobo - b.commissionKobo) / 100).toLocaleString()}</p>
                        <p className="text-xs whitespace-nowrap text-[var(--color-ink-muted)]">fee: ₦{(b.commissionKobo / 100).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
