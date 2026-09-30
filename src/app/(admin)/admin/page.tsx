"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Users, Calendar } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import AdminSidebar from "@/components/sidebar/AdminSidebar";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchStats(); }, []);

  async function fetchStats() {
    try {
      const [pendingRes, activeRes, usersRes, bookingsRes] = await Promise.all([
        fetch("/api/listings?status=pending_review&limit=1"),
        fetch("/api/listings?status=active&limit=1"),
        fetch("/api/admin/users?limit=1"),
        fetch("/api/bookings?limit=1"),
      ]);
      const pending = await pendingRes.json();
      const active = await activeRes.json();
      const users = await usersRes.json();
      const bookings = await bookingsRes.json();

      setStats({
        pendingCount: pending.data?.length || 0,
        activeCount: active.data?.length || 0,
        totalUsers: users.pagination?.total || 0,
        totalBookings: bookings.data?.length || 0,
      });
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout sidebar={AdminSidebar} sidebarProps={{ activePage: "dashboard" }}>
      <main className="flex-1 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Admin Dashboard</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Monitor and manage the platform</p>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
            <p className="text-sm text-[var(--color-ink-muted)]">{error}</p>
            <button onClick={fetchStats} className="mt-4 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-white font-semibold">Try Again</button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#DBEAFE] p-2 text-[#1E40AF]"><Loader2 size={20} /></div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">{stats?.pendingCount || 0}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">Pending review</p>
                  </div>
                </div>
                <Link href="/admin/listings/pending" className="mt-3 block text-sm font-semibold text-[var(--color-primary)]">
                  Review now →
                </Link>
              </div>

              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#DCFCE7] p-2 text-[#166534]"><CheckCircle2 size={20} /></div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">{stats?.activeCount || 0}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">Active listings</p>
                  </div>
                </div>
                <Link href="/admin/listings/active" className="mt-3 block text-sm font-semibold text-[var(--color-primary)]">
                  Manage →
                </Link>
              </div>

              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#F3E8FF] p-2 text-[#7C3AED]"><Users size={20} /></div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">{stats?.totalUsers || 0}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">Total users</p>
                  </div>
                </div>
                <Link href="/admin/users" className="mt-3 block text-sm font-semibold text-[var(--color-primary)]">
                  View all →
                </Link>
              </div>

              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-[#FEF3C7] p-2 text-[#D97706]"><Calendar size={20} /></div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">{stats?.totalBookings || 0}</p>
                    <p className="text-xs text-[var(--color-ink-muted)]">Total bookings</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/admin/listings/pending" className="rounded-2xl border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-primary)]">
                <p className="font-semibold text-[var(--color-ink)]">Pending Approvals</p>
                <p className="text-sm text-[var(--color-ink-muted)]">Review and approve new listings</p>
              </Link>
              <Link href="/admin/listings/active" className="rounded-2xl border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-primary)]">
                <p className="font-semibold text-[var(--color-ink)]">Active Listings</p>
                <p className="text-sm text-[var(--color-ink-muted)]">View and suspend active listings</p>
              </Link>
              <Link href="/admin/verifications" className="rounded-2xl border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-primary)]">
                <p className="font-semibold text-[var(--color-ink)]">Verifications</p>
                <p className="text-sm text-[var(--color-ink-muted)]">Review provider documents</p>
              </Link>
              <Link href="/admin/audit" className="rounded-2xl border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-primary)]">
                <p className="font-semibold text-[var(--color-ink)]">Audit Trail</p>
                <p className="text-sm text-[var(--color-ink-muted)]">Platform activity logs</p>
              </Link>
            </div>
          </>
        )}
      </main>
    </DashboardLayout>
  );
}
