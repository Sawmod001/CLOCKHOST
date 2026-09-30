"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Calendar, Users, Clock, Receipt, MapPin } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import GuestSidebar from "@/components/sidebar/GuestSidebar";

const STATUS_STYLES = {
  pending_approval: "bg-[#FEF3C7] text-[#B45309]",
  awaiting_payment: "bg-[#DBEAFE] text-[#1E40AF]",
  confirmed: "bg-[#DCFCE7] text-[#166534]",
  checked_in: "bg-[#DCFCE7] text-[#166534]",
  completed: "bg-[#F3F4F6] text-[#6B7280]",
  rejected: "bg-[#FEE2E2] text-[#991B1B]",
  cancelled_by_guest: "bg-[#F3F4F6] text-[#6B7280]",
  cancelled_by_host: "bg-[#F3F4F6] text-[#6B7280]",
  cancelled_system: "bg-[#F3F4F6] text-[#6B7280]",
  expired: "bg-[#F3F4F6] text-[#6B7280]",
  lost_race: "bg-[#FEE2E2] text-[#991B1B]",
};

export default function GuestBookingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Record<string, any> | null>(null);
  const [receipt, setReceipt] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBooking(data);
        if (["confirmed", "checked_in", "completed"].includes(data.status)) {
          return fetch(`/api/bookings/${id}/receipt`).then((r) => r.ok ? r.json() : null);
        }
        return null;
      })
      .then((rData) => {
        if (rData?.data) setReceipt(rData.data);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel");
      }
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout sidebar={GuestSidebar} sidebarProps={{ activePage: "bookings" }}>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-white border border-[var(--color-border)]" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout sidebar={GuestSidebar} sidebarProps={{ activePage: "bookings" }}>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">{error}</p>
          <Link href="/dashboard" className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Back to Dashboard</Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={GuestSidebar} sidebarProps={{ activePage: "bookings" }}>
      <div className="space-y-6">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--color-primary)]">
          <ArrowLeft size={16} /> Back to Bookings
        </Link>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-semibold text-[var(--color-ink)]">{booking!.listingTitle || "Booking Details"}</h1>
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${(STATUS_STYLES as Record<string, string>)[booking!.status] || "bg-[#F3F4F6] text-[#6B7280]"}`}>
                {booking!.status.replace(/_/g, " ")}
              </span>
            </div>
            <p className="shrink-0 whitespace-nowrap text-xl font-bold text-[var(--color-ink)]">₦{(booking!.totalAmountKobo / 100).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)] mb-3"><Calendar size={16} />Event</div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">{new Date(booking!.eventStart as string).toLocaleString("en-NG", { timeZone: "Africa/Lagos",  weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
            <p className="text-xs text-[var(--color-ink-muted)]">
              {new Date(booking!.eventStart as string).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })} – {new Date(booking!.eventEnd as string).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)] mb-3"><Users size={16} />Guests</div>
            <p className="text-sm font-semibold text-[var(--color-ink)]">{booking!.headcount} guest{booking!.headcount > 1 ? "s" : ""}</p>
            <p className="text-xs text-[var(--color-ink-muted)] capitalize">{booking!.bookingType} booking</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)] mb-3"><Clock size={16} />Timeline</div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-3"><span className="shrink-0 text-[var(--color-ink-muted)]">Booked</span><span className="min-w-0 break-words text-right text-[var(--color-ink)]">{new Date(booking!.createdAt as string).toLocaleString("en-NG", { timeZone: "Africa/Lagos",  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
            {booking!.paidAt && <div className="flex justify-between gap-3"><span className="shrink-0 text-[var(--color-ink-muted)]">Paid</span><span className="min-w-0 break-words text-right text-[var(--color-ink)]">{new Date(booking!.paidAt as string).toLocaleString("en-NG", { timeZone: "Africa/Lagos",  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>}
            {booking!.gatewayTransactionRef && <div className="flex justify-between gap-3"><span className="shrink-0 text-[var(--color-ink-muted)]">Transaction</span><span className="min-w-0 break-all text-right text-xs text-[var(--color-ink)]">{booking!.gatewayTransactionRef}</span></div>}
          </div>
        </div>

        {receipt && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-5">
            <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)] mb-3"><Receipt size={16} />Receipt</div>
            <div className="space-y-2 text-sm">
              {receipt.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 break-words text-[var(--color-ink-muted)]">{item.label}</span>
                  <span className={`shrink-0 whitespace-nowrap font-semibold ${item.amountKobo < 0 ? "text-green-600" : "text-[var(--color-ink)]"}`}>
                    {item.amountKobo < 0 ? "-" : ""}₦{(Math.abs(item.amountKobo) / 100).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-[var(--color-border)] pt-2 font-semibold">
                <span className="text-[var(--color-ink)]">Total Paid</span>
                <span className="text-[var(--color-ink)]">₦{(receipt.totalPaidKobo / 100).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {booking!.status === "awaiting_payment" && (
          <Link href={`/bookings/${booking!.id}/pay`} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white">
            Pay Now
          </Link>
        )}

        {["pending_approval", "awaiting_payment", "confirmed"].includes(booking!.status) && (
          <button onClick={handleCancel} disabled={cancelling} className="min-h-[44px] w-full rounded-xl border border-[#B91C1C] px-4 py-3 text-sm font-semibold text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-50">
            {cancelling ? "Cancelling..." : "Cancel Booking"}
          </button>
        )}
      </div>
    </DashboardLayout>
  );
}
