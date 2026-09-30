"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

const TABS = [
  { key: "", label: "All" },
  { key: "pending_approval", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "rejected", label: "Rejected" },
];

const STATUS_STYLES = {
  pending_approval: "bg-[#FEF3C7] text-[#B45309]",
  awaiting_payment: "bg-[#DBEAFE] text-[#1E40AF]",
  confirmed: "bg-[#DCFCE7] text-[#166534]",
  rejected: "bg-[#FEE2E2] text-[#991B1B]",
  completed: "bg-[#F3F4F6] text-[#6B7280]",
  cancelled_by_guest: "bg-[#F3F4F6] text-[#6B7280]",
  cancelled_by_host: "bg-[#F3F4F6] text-[#6B7280]",
  cancelled_system: "bg-[#F3F4F6] text-[#6B7280]",
  expired: "bg-[#F3F4F6] text-[#6B7280]",
};

export default function HostBookingsPage() {
  const [bookings, setBookings] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState("");

  const loadData = async (statusFilter?: string) => {
    try {
      const url = statusFilter ? `/api/bookings?status=${statusFilter}` : "/api/bookings";
      const bRes = await fetch(url);
      if (!bRes.ok) throw new Error("Unable to load bookings");
      const bData = await bRes.json();
      setBookings(bData.data || []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(activeTab); }, [activeTab]);

  const handleApprove = async (bookingId: string) => {
    setProcessingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/approve`, { method: "POST" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Unable to approve"); }
      await loadData(activeTab);
    } catch (err) { setError((err as Error).message); }
    finally { setProcessingId(null); }
  };

  const handleReject = async (bookingId: string) => {
    if (!rejectReason.trim()) return;
    setProcessingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || "Unable to reject"); }
      setRejectingId(null); setRejectReason("");
      await loadData(activeTab);
    } catch (err) { setError((err as Error).message); }
    finally { setProcessingId(null); }
  };

  if (loading) {
    return (
      <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "bookings" }}>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "bookings" }}>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">{error}</p>
          <button onClick={() => loadData(activeTab)} className="mt-4 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Try Again</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "bookings" }}>
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Booking Inbox</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Review pending requests and manage bookings</p>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white p-1">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${activeTab === tab.key ? "bg-[var(--color-primary)] text-white" : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {bookings.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center text-sm text-[var(--color-ink-muted)]">No bookings found.</div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div key={booking.id} className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-5">
                <Link href={`/host/bookings/${booking.id}`} className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-semibold text-[var(--color-ink)]">{booking.bookingType === "exclusive" ? "Exclusive" : "Capacity"}</p>
                      <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[booking.status as keyof typeof STATUS_STYLES] || "bg-[#F3F4F6] text-[#6B7280]"}`}>
                        {booking.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-xs break-words text-[var(--color-ink-muted)]">
                      {new Date(booking.eventStart as string).toLocaleString("en-NG", { timeZone: "Africa/Lagos",  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      {" – "}
                      {new Date(booking.eventEnd).toLocaleString("en-NG", { timeZone: "Africa/Lagos",  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold whitespace-nowrap">₦{(booking.totalAmountKobo / 100).toLocaleString()}</p>
                      <p className="text-xs whitespace-nowrap text-[var(--color-ink-muted)]">{booking.headcount} guest{booking.headcount > 1 ? "s" : ""}</p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-[var(--color-ink-muted)]" />
                  </div>
                </Link>

                {booking.status === "pending_approval" && (
                  <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                    {rejectingId === booking.id ? (
                      <div className="space-y-3">
                        <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." rows={2} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm" />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button onClick={() => handleReject(booking.id)} disabled={processingId === booking.id || !rejectReason.trim()} className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-[#B91C1C] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                            {processingId === booking.id ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Confirm Reject
                          </button>
                          <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="btn-outline min-h-[44px] px-4 py-2.5 text-sm">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button onClick={() => handleApprove(booking.id)} disabled={processingId === booking.id} className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-[#15803D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                          {processingId === booking.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Approve
                        </button>
                        <button onClick={() => setRejectingId(booking.id)} disabled={processingId === booking.id} className="btn-outline min-h-[44px] gap-1 px-4 py-2.5 text-sm disabled:opacity-50">
                          <XCircle size={14} /> Reject
                        </button>
                        <Link href={`/host/bookings/${booking.id}`} className="btn-outline min-h-[44px] px-4 py-2.5 text-center text-sm sm:ml-auto">Details</Link>
                      </div>
                    )}
                  </div>
                )}

                {booking.status === "rejected" && booking.rejectionReason && (
                  <p className="mt-2 text-xs text-[var(--color-ink-muted)]">Reason: {booking.rejectionReason}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
