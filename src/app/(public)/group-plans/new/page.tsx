"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Users } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import BackButton from "@/components/BackButton";

const toLocalDateInput = (d: Date) => {
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().split("T")[0];
};

export default function NewGroupPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingId = searchParams.get("listingId");

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [listing, setListing] = useState<Record<string, any> | null>(null);
  const [slots, setSlots] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState(() => toLocalDateInput(new Date()));
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [targetHeadcount, setTargetHeadcount] = useState(1);
  const [myHeadcount, setMyHeadcount] = useState(1);
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
  });
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/profile-status")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setIsAuthenticated(!!data.authenticated);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!listingId) return;
      try {
        const [listingRes, slotsRes] = await Promise.all([
          fetch(`/api/listings/${listingId}`),
          fetch(`/api/listings/${listingId}/slots?date=${selectedDate}`),
        ]);
        if (!listingRes.ok) throw new Error("Listing not found");
        const listingData = await listingRes.json();
        setListing(listingData);
        if (listingData.bookingType !== "capacity") throw new Error("Group booking is only for capacity venues");

        if (slotsRes.ok) {
          const d = await slotsRes.json();
          const open = (d.data || []).filter((s: any) => Number(s.available || 0) > 0);
          setSlots(open);
          if (open.length && !selectedSlotId) setSelectedSlotId(open[0].id);
        }
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [listingId, selectedDate, selectedSlotId]);

  const selectedSlot = useMemo(() => slots.find((s) => s.id === selectedSlotId) || null, [slots, selectedSlotId]);
  const slotAvailable = Number(selectedSlot?.available || 0);

  const toggleAddon = (addonId: string) => {
    setSelectedAddOns((current) =>
      current.includes(addonId) ? current.filter((value) => value !== addonId) : [...current, addonId]
    );
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!listingId || !selectedSlotId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/group-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          slotId: selectedSlotId,
          targetHeadcount: Number(targetHeadcount),
          headcount: Number(myHeadcount),
          expiresAt: new Date(deadline).toISOString(),
          addOns: selectedAddOns,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create plan");
      router.push(`/group-plans/${data.planId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8">
          <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
            <Loader2 className="animate-spin" size={16} />
            Loading venue...
          </div>
        </div>
      </main>
    );
  }

  if (error && !listing) {
    return (
      <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
        <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">{error}</p>
          <Link href="/listings" className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Browse listings</Link>
        </div>
      </main>
    );
  }

  if (authChecked && !isAuthenticated) {
    return (
      <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <PublicHeader />
          <BackButton href={listingId ? `/listings/${listingId}` : "/listings"} label="Back to listing" />
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
            <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <Lock size={22} />
            </span>
            <h1 className="text-xl font-semibold text-[var(--color-ink)]">Sign in to start a group booking</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-ink-muted)]">
              You need a free ClockHost account to create a plan and share the invite link.
            </p>
                        <Link href="/sign-up" className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white">
              <Lock size={16} /> Sign in / Create account
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <PublicHeader />
        <BackButton href={listingId ? `/listings/${listingId}` : "/listings"} label="Back to listing" />

        <form onSubmit={handleCreate} className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-[var(--color-ink)]">
              <Users size={22} /> Start a group booking
            </h1>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Pick a slot, set the group size, and share the link. Friends join and pay their share.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-ink)]">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); }}
              className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-ink)]">Time Slot</label>
            {slots.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3 text-sm text-[var(--color-ink-muted)]">
                No open slots on this date. Try another date — the Create button stays disabled until you pick an open slot.
              </p>
            ) : (
              <div className="space-y-2">
                {slots.map((slot) => (
                  <label key={slot.id} className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] p-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <input
                        type="radio"
                        name="slot"
                        checked={selectedSlotId === slot.id}
                        onChange={() => setSelectedSlotId(slot.id)}
                      />
                      {new Date(slot.eventStart as string).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })} – {new Date(slot.eventEnd).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-[#15803D]">{slot.available}/{slot.capacity} spots</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--color-ink)]">How many people in the group?</label>
              <input
                type="number"
                min="1"
                max={Math.max(slotAvailable, 1)}
                value={targetHeadcount}
                onChange={(e) => setTargetHeadcount(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
              />
              <p className="text-xs text-[var(--color-ink-muted)]">The plan finalizes when this many people are committed.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[var(--color-ink)]">How many will you bring?</label>
              <input
                type="number"
                min="1"
                max={Math.max(targetHeadcount || 1, 1)}
                value={myHeadcount}
                onChange={(e) => setMyHeadcount(Number(e.target.value))}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-ink)]">Close date (when the plan stops accepting & auto-cancels if not filled)</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
            />
          </div>

          {listing?.addOns?.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Add-ons</p>
              {listing!.addOns.map((addon: any) => (
                <label key={addon.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] p-3 text-sm">
                  <span className="min-w-0 break-words">{addon.name}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span>+₦{(addon.priceInKobo / 100).toLocaleString()}</span>
                    <input type="checkbox" checked={selectedAddOns.includes(addon.id)} onChange={() => toggleAddon(addon.id)} />
                  </span>
                </label>
              ))}
            </div>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting || !selectedSlotId}
            className="min-h-[44px] w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Creating plan..." : "Create Plan & Share Link"}
          </button>
        </form>
      </div>
    </main>
  );
}