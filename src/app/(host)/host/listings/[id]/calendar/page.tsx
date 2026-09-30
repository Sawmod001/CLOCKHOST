"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, Trash2, Ban } from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

export default function HousingCalendarPage() {
  const { id } = useParams();
  const [listing, setListing] = useState<Record<string, any> | null>(null);
  const [blockedDates, setBlockedDates] = useState<Record<string, any>[]>([]);
  const [calMonth, setCalMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [id, calMonth]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const month = `${calMonth.getFullYear()}-${String(calMonth.getMonth() + 1).padStart(2, "0")}`;

      const [listingRes, blockedRes] = await Promise.all([
        fetch(`/api/listings/${id}`),
        fetch(`/api/listings/${id}/blocked-dates?month=${month}`),
      ]);

      if (!listingRes.ok) throw new Error("Failed to load listing");
      const listingData = await listingRes.json();
      setListing(listingData);

      if (!blockedRes.ok) throw new Error("Failed to load calendar");
      const blockedData = await blockedRes.json();
      setBlockedDates(blockedData.data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function toggleDate(dateStr: string) {
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  }

  async function handleBlockDates() {
    if (selectedDates.length === 0) return;
    setBlocking(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/listings/${id}/blocked-dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: selectedDates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to block dates");
      setMessage(`Blocked ${data.blocked.length} date(s)`);
      setSelectedDates([]);
      await fetchData();
    } catch (err) {
      setMessage("Error: " + (err as Error).message);
    } finally {
      setBlocking(false);
    }
  }

  async function handleUnblockDate(dateStr: string) {
    try {
      const res = await fetch(`/api/listings/${id}/blocked-dates`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dates: [dateStr] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to unblock");
      setMessage(`Unblocked ${data.unblocked.length} date(s)`);
      await fetchData();
    } catch (err) {
      setMessage("Error: " + (err as Error).message);
    }
  }

  // Generate calendar days
  const year = calMonth.getFullYear();
  const monthIdx = calMonth.getMonth();
  const firstDay = new Date(year, monthIdx, 1).getDay();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const blockedSet = new Set(blockedDates.map((b) => b.blocked_date));

  function getDateStr(day: number) {
    return `${year}-${String(monthIdx + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  if (loading && !listing) {
    return (
      <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}>
      <div className="space-y-6">
        <Link href={`/host/listings/${id}`} className="flex items-center gap-2 text-[var(--color-primary)] text-sm">
          <ArrowLeft size={18} />
          Back to listing
        </Link>

        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Manage Calendar</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">{listing?.title || "Loading..."}</p>
        </div>

        {error && <div className="rounded-xl border border-[#B91C1C] bg-[#FEE2E2] p-4 text-sm text-[#7F1D1D]">{error}</div>}
        {message && <div className={`rounded-xl border p-4 text-sm ${message.startsWith("Error") ? "border-[#B91C1C] bg-[#FEE2E2] text-[#7F1D1D]" : "border-[#15803D] bg-[#DCFCE7] text-[#166534]"}`}>{message}</div>}

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => setCalMonth(new Date(year, monthIdx - 1, 1))} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-[var(--color-surface-alt)]">
              <ChevronLeft size={20} />
            </button>
            <h2 className="font-semibold text-[var(--color-ink)]">
              {calMonth.toLocaleString("en-NG", { timeZone: "Africa/Lagos", month: "long", year: "numeric" })}
            </h2>
            <button onClick={() => setCalMonth(new Date(year, monthIdx + 1, 1))} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-[var(--color-surface-alt)]">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2 font-semibold text-[var(--color-ink-muted)]">{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />;
              const dateStr = getDateStr(day);
              const isPast = new Date(dateStr) < today;
              const isBlocked = blockedSet.has(dateStr);
              const isSelected = selectedDates.includes(dateStr);

              return (
                <button
                  key={day}
                  onClick={() => !isPast && toggleDate(dateStr)}
                  disabled={isPast}
                  className={`relative flex min-h-[44px] items-center justify-center rounded-lg p-1 text-sm transition-colors sm:p-2 ${
                    isPast
                      ? "text-[var(--color-ink-muted)]/50 cursor-not-allowed"
                      : isBlocked
                        ? "bg-[#B91C1C] text-white font-semibold"
                        : isSelected
                          ? "bg-[var(--color-primary)] text-white font-semibold"
                          : "hover:bg-[var(--color-surface-alt)] text-[var(--color-ink)]"
                  }`}
                >
                  {day}
                  {isBlocked && !isPast && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#B91C1C] text-white">
                      <Ban size={8} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--color-ink-muted)]">
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[var(--color-primary)]" /> Selected</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-[#B91C1C]" /> Blocked</span>
            <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded border border-[var(--color-border)]" /> Available</span>
          </div>

          {selectedDates.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-center">
              <button
                onClick={handleBlockDates}
                disabled={blocking}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {blocking ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                Block {selectedDates.length} Date{selectedDates.length > 1 ? "s" : ""}
              </button>
              <button onClick={() => setSelectedDates([])} className="text-sm text-[var(--color-ink-muted)] hover:underline">
                Clear selection
              </button>
            </div>
          )}

          {blockedDates.length > 0 && (
            <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Blocked Dates This Month</p>
              <div className="flex flex-wrap gap-2">
                {blockedDates.map((b) => (
                  <div key={b.id} className="flex items-center gap-1 rounded-lg bg-red-50 border border-red-200 px-2 py-1 text-xs text-red-700">
                    <span>{new Date(b.blocked_date).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos",  day: "numeric", month: "short" })}</span>
                    {b.booking_id ? (
                      <span className="text-[10px] text-red-500">(booking)</span>
                    ) : (
                      <button onClick={() => handleUnblockDate(b.blocked_date)} className="ml-1 hover:text-red-900">
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
