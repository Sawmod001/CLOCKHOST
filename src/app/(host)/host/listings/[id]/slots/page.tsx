"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

export default function HostSlotsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [listing, setListing] = useState<Record<string, any> | null>(null);
  const [slots, setSlots] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState(new Date().toISOString().split("T")[0]);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({ eventStart: "", eventEnd: "", capacity: 10 });

  const fetchSlots = async () => {
    try {
      const [listingRes, slotsRes] = await Promise.all([
        fetch(`/api/listings/${id}`),
        fetch(`/api/listings/${id}/slots?date=${dateStr}`),
      ]);
      if (!listingRes.ok) throw new Error("Listing not found");
      const listingData = await listingRes.json();
      setListing(listingData);
      if (listingRes.ok) {
        const slotsData = await slotsRes.json();
        setSlots(slotsData.data || []);
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSlots(); }, [id, dateStr]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const start = new Date(`${dateStr}T${form.eventStart}:00`);
      const end = new Date(`${dateStr}T${form.eventEnd}:00`);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error("Invalid time");
      if (start >= end) throw new Error("End time must be after start time");

      const res = await fetch(`/api/listings/${id}/slots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventStart: start.toISOString(),
          eventEnd: end.toISOString(),
          capacity: parseInt(String(form.capacity)),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create slot");
      setShowForm(false);
      setForm({ eventStart: "", eventEnd: "", capacity: 10 });
      fetchSlots();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (slotId: string) => {
    if (!confirm("Delete this slot?")) return;
    try {
      const res = await fetch(`/api/listings/${id}/slots/${slotId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      fetchSlots();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}>
        <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
          <div className="mx-auto max-w-2xl space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
            ))}
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}>
      <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link href={`/host/listings/${id}`} className="flex items-center gap-2 text-sm text-[var(--color-primary)]">
            <ArrowLeft size={16} /> Back to listing
          </Link>

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6 space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h1 className="break-words text-xl font-semibold text-[var(--color-ink)]">Slots for {listing?.title || "Listing"}</h1>
                <p className="text-sm text-[var(--color-ink-muted)]">Capacity-based time slots</p>
              </div>
              <button onClick={() => setShowForm(!showForm)}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white sm:w-auto">
                <Plus size={16} /> {showForm ? "Cancel" : "Add Slot"}
              </button>
            </div>

            {showForm && (
              <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Start Time</label>
                    <input type="time" value={form.eventStart}
                      onChange={(e) => setForm({ ...form, eventStart: e.target.value })}
                      className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">End Time</label>
                    <input type="time" value={form.eventEnd}
                      onChange={(e) => setForm({ ...form, eventEnd: e.target.value })}
                      className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Capacity</label>
                    <input type="number" min="1" value={form.capacity}
                      onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                      onFocus={(e) => e.target.select()}
                      className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                  </div>
                </div>
                <button onClick={handleCreate} disabled={creating}
                  className="flex items-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Create Slot
                </button>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold block mb-1">Date</label>
              <input type="date" value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
            </div>

            {error ? (
              <p className="text-sm text-[var(--color-ink-muted)]">{error}</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-[var(--color-ink-muted)] text-center py-8">No slots for this date</p>
            ) : (
              <div className="space-y-2">
                {slots.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {new Date(slot.eventStart as string).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })}
                        {" — "}
                        {new Date(slot.eventEnd).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        Capacity: {slot.capacity} | Booked: {slot.booked}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(slot.id)} disabled={slot.booked > 0}
                      className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl p-2 text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-30">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
}
