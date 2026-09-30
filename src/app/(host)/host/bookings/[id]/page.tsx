"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle2, Calendar, Users, Clock } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

const STATUS_STYLES = {
  pending_approval: "bg-[#FEF3C7] text-[#B45309]",
  awaiting_payment: "bg-[#DBEAFE] text-[#1E40AF]",
  confirmed: "bg-[#DCFCE7] text-[#166534]",
  rejected: "bg-[#FEE2E2] text-[#991B1B]",
  completed: "bg-[#F3F4F6] text-[#6B7280]",
  cancelled_by_guest: "bg-[#F3F4F6] text-[#6B7280]",
  cancelled_by_host: "bg-[#F3F4F6] text-[#6B7280]",
  expired: "bg-[#F3F4F6] text-[#6B7280]",
};

export default function HostBookingDetailPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState<Record<string, any> | null>(null);
  const [listing, setListing] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/bookings/${id}`).then((r) => r.json()),
    ])
      .then(([bData]) => {
        if (bData.error) throw new Error(bData.error);
        setBooking(bData);
        return fetch(`/api/listings/${bData.listingId}`).then((r) => r.json());
      })
      .then((lData) => {
        if (!lData.error) setListing(lData);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleComplete() {
    setCompleting(true);
    try {
      const res = await fetch(`/api/bookings/${id}/complete`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete");
      }
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}>
        <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
          <div className="mx-auto max-w-2xl space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl bg-white border border-[var(--color-border)]" />
            ))}
          </div>
        </main>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}>
        <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
          <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
            <p className="text-sm text-[var(--color-ink-muted)]">{error}</p>
            <Link href="/host/bookings" className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Back to Bookings</Link>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}>
      <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link href="/host/bookings" className="flex items-center gap-2 text-sm text-[var(--color-primary)]">
            <ArrowLeft size={16} /> Back to Booking Inbox
          </Link>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold">{listing?.title || "Booking Details"}</h1>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[(booking!.status as keyof typeof STATUS_STYLES)] || "bg-[#F3F4F6] text-[#6B7280]"}`}>
                  {booking!.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="shrink-0 text-xl font-bold whitespace-nowrap">₦{(booking!.totalAmountKobo / 100).toLocaleString()}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)] mb-3"><Calendar size={16} />Event</div>
              <p className="text-sm font-semibold">{new Date(booking!.eventStart as string).toLocaleString("en-NG", { timeZone: "Africa/Lagos",  weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {new Date(booking!.eventStart as string).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })} – {new Date(booking!.eventEnd).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
              <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)] mb-3"><Users size={16} />Guests</div>
              <p className="text-sm font-semibold">{booking!.headcount} guest{booking!.headcount > 1 ? "s" : ""}</p>
              <p className="text-xs text-[var(--color-ink-muted)] capitalize">{booking!.bookingType} booking</p>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)] mb-3"><Clock size={16} />Timeline</div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="shrink-0">Booked</span><span className="min-w-0 text-right break-words">{new Date(booking!.createdAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos",  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
              <div className="flex justify-between gap-4"><span className="shrink-0">Status</span><span className="min-w-0 text-right capitalize">{booking!.status.replace("_", " ")}</span></div>
              {booking!.gatewayTransactionRef && <div className="flex justify-between gap-4"><span className="shrink-0">Transaction</span><span className="min-w-0 text-right text-xs break-all">{booking!.gatewayTransactionRef}</span></div>}
            </div>
          </div>

          {booking!.status === "confirmed" && (
            <button onClick={handleComplete} disabled={completing} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#15803D] px-4 py-3 font-semibold text-white disabled:opacity-50">
              {completing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {completing ? "Completing..." : "Mark as Completed"}
            </button>
          )}

          {booking!.status === "pending_approval" && (
            <div className="rounded-xl bg-[#FEF3C7] p-4 text-sm text-[#92400E]">
              This booking is pending your approval. Go to <Link href="/host/bookings" className="font-semibold underline">Booking Inbox</Link> to approve or reject.
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  );
}
