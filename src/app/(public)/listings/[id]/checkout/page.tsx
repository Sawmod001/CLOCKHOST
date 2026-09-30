"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import PublicHeader from "@/components/PublicHeader";
import BackButton from "@/components/BackButton";

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const listingId = params?.id;

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [listing, setListing] = useState<Record<string, any> | null>(null);
    const [slots, setSlots] = useState<Record<string, any>[]>([]);
    const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [headcount, setHeadcount] = useState(1);
    const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        return new Date(now.getTime() - offset * 60000).toISOString().split("T")[0];
    });
    const [serverPrice, setServerPrice] = useState<Record<string, any> | null>(null);
    const [priceValidating, setPriceValidating] = useState(false);

    const slot = useMemo(() => slots.find((s) => s.id === selectedSlotId) || null, [slots, selectedSlotId]);

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
            try {
                const listingRes = await fetch(`/api/listings/${listingId}`);
                if (!listingRes.ok) throw new Error("Failed to load listing");
                const listingData = await listingRes.json();
                setListing(listingData);

                const slotsRes = await fetch(`/api/listings/${listingId}/slots?date=${selectedDate}`);
                if (!slotsRes.ok) throw new Error("No slots available");
                const slotsData = await slotsRes.json();
                const availableSlots = slotsData?.data || [];
                setSlots(availableSlots);
                setSelectedSlotId(availableSlots.length > 0 ? availableSlots[0].id : null);
                setError(null);
            } catch (err) {
                setError((err as Error).message || "Unable to load checkout details");
            } finally {
                setLoading(false);
            }
        };

        if (listingId) {
            load();
        }
    }, [listingId, selectedDate]);

    const subtotal = useMemo(() => {
        if (!listing || !slot) return 0;
        const hours = Math.max(1, (new Date(slot.eventEnd as string).getTime() - new Date(slot.eventStart as string).getTime()) / (60 * 60 * 1000));
        const base = Number(listing.pricing?.baseRatePerHour || 0) * Number(headcount || 0) * hours;
        const addOnsTotal = listing.addOns?.reduce((sum: any, item: any) => {
            if (!selectedAddOns.includes(item.id) && !item.isRequired) return sum;
            return sum + Number(item.priceInKobo || 0);
        }, 0) || 0;
        return base + addOnsTotal;
    }, [headcount, listing, selectedAddOns, slot]);

    const toggleAddon = (addonId: string) => {
        setSelectedAddOns((current) =>
            current.includes(addonId) ? current.filter((value) => value !== addonId) : [...current, addonId]
        );
    };

    useEffect(() => {
        if (!listing || !slot) return;
        let cancelled = false;
        setPriceValidating(true);

        const timer = setTimeout(async () => {
            try {
                const res = await fetch("/api/pricing/preview", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        listingId,
                        eventStart: slot.eventStart,
                        eventEnd: slot.eventEnd,
                        headcount,
                        addOnIds: selectedAddOns,
                    }),
                });
                if (cancelled) return;
                if (res.ok) {
                    const data = await res.json();
                    setServerPrice(data.data);
                } else {
                    setServerPrice(null);
                }
            } catch {
                if (!cancelled) setServerPrice(null);
            } finally {
                if (!cancelled) setPriceValidating(false);
            }
        }, 300);

        return () => { cancelled = true; clearTimeout(timer); };
    }, [listing, slot, headcount, selectedAddOns, listingId]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!listing || !slot) return;

        setSubmitting(true);
        setError(null);

        try {
            const softHoldRes = await fetch("/api/soft-holds", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    listingId,
                    slotId: slot.id,
                    headcount,
                }),
            });

            const softHoldData = await softHoldRes.json();
            if (!softHoldRes.ok) throw new Error(softHoldData.error || "Could not reserve slot");

            const bookingRes = await fetch("/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    softHoldId: softHoldData.data.softHoldId,
                    listingId,
                    addOns: selectedAddOns.map((addonId: string) => ({
                        id: addonId,
                        priceInKobo: listing.addOns?.find((item: any) => item.id === addonId)?.priceInKobo || 0,
                    })),
                }),
            });

            const bookingData = await bookingRes.json();
            if (!bookingRes.ok) throw new Error(bookingData.error || "Could not create booking");

            router.push(`/bookings/${bookingData.data.bookingId}/pay`);
        } catch (err) {
            setError((err as Error).message || "Checkout failed");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !authChecked) {
        return (
            <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
                <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8">
                    <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
                        <Loader2 className="animate-spin" size={16} />
                        Preparing checkout...
                    </div>
                </div>
            </main>
        );
    }

    if (!isAuthenticated) {
        return (
            <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
                <div className="mx-auto max-w-2xl space-y-6">
                    <PublicHeader />
                    <BackButton href={`/listings/${listingId}`} label="Back to listing" />
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
                        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                            <Lock size={22} />
                        </span>
                        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Sign in to book</h1>
                        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-ink-muted)]">
                            Create a free ClockHost account to reserve your slot and continue to payment.
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
                <BackButton href={`/listings/${listingId}`} label="Back to listing" />

                <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Checkout</h1>
                        <p className="text-sm text-[var(--color-ink-muted)]">Reserve your slot and continue to payment.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[var(--color-ink)]">Date</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
                            disabled={submitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[var(--color-ink)]">Available Slots</label>
                        {slots.length === 0 ? (
                            <p className="text-sm text-[var(--color-ink-muted)]">No slots available for this date.</p>
                        ) : (
                            <div className="space-y-2">
                                {slots.map((s) => (
                                    <label
                                        key={s.id}
                                        className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm cursor-pointer transition-colors ${
                                            selectedSlotId === s.id
                                                ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                                                : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                                        }`}
                                    >
                                        <span className="flex min-w-0 items-center gap-3">
                                            <input
                                                type="radio"
                                                name="slot"
                                                value={s.id}
                                                checked={selectedSlotId === s.id}
                                                onChange={() => setSelectedSlotId(s.id)}
                                                disabled={submitting}
                                                className="shrink-0 accent-[var(--color-primary)]"
                                            />
                                            <span className="min-w-0 break-words">
                                                {new Date(s.eventStart as string).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })} – {new Date(s.eventEnd).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </span>
                                        <span className="shrink-0 text-xs text-[var(--color-ink-muted)]">
                                            {s.capacity != null ? `${s.capacity} available` : ""}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-[var(--color-ink)]">How many people?</label>
                        <input
                            type="number"
                            min="1"
                            max={(listing?.operationalRules?.maxCapacity || 1)}
                            value={headcount}
                            onChange={(e) => setHeadcount(Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
                            disabled={submitting}
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
                                        <input
                                            type="checkbox"
                                            checked={selectedAddOns.includes(addon.id)}
                                            onChange={() => toggleAddon(addon.id)}
                                            disabled={submitting}
                                        />
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="rounded-xl bg-[var(--color-surface-alt)] p-4 text-sm text-[var(--color-ink)]">
                        <div className="flex items-center justify-between">
                            <span>Subtotal</span>
                            <span className="font-semibold">₦{(subtotal / 100).toLocaleString()}</span>
                        </div>
                        {serverPrice && (
                            <>
                                {serverPrice.breakdown.multiGuestDiscountKobo > 0 && (
                                    <div className="flex items-center justify-between text-xs text-green-700">
                                        <span>Multi-guest discount ({serverPrice.breakdown.multiGuestDiscountPercent}%)</span>
                                        <span>-₦{(serverPrice.breakdown.multiGuestDiscountKobo / 100).toLocaleString()}</span>
                                    </div>
                                )}
                                {serverPrice.breakdown.hourlyDiscountKobo > 0 && (
                                    <div className="flex items-center justify-between text-xs text-green-700">
                                        <span>Long booking discount ({serverPrice.breakdown.hourlyDiscountPercent}%)</span>
                                        <span>-₦{(serverPrice.breakdown.hourlyDiscountKobo / 100).toLocaleString()}</span>
                                    </div>
                                )}
                                {serverPrice.breakdown.exclusiveFeeKobo > 0 && (
                                    <div className="flex items-center justify-between text-xs">
                                        <span>Exclusive flat fee</span>
                                        <span>+₦{(serverPrice.breakdown.exclusiveFeeKobo / 100).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="mt-2 flex items-center justify-between border-t border-[var(--color-border)] pt-2 font-semibold">
                                    <span>Total</span>
                                    <span>₦{(serverPrice.totalAmountKobo / 100).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-[var(--color-ink-muted)]">
                                    <span>Platform fee ({serverPrice.breakdown.commissionRate}%)</span>
                                    <span>₦{(serverPrice.commissionKobo / 100).toLocaleString()}</span>
                                </div>
                            </>
                        )}
                        {slot ? (
                            <div className="mt-2 text-xs text-[var(--color-ink-muted)]">
                                {new Date(slot.eventStart as string).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })} – {new Date(slot.eventEnd).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit" })}
                                {serverPrice && ` · ${serverPrice.breakdown.hours}h`}
                            </div>
                        ) : (
                            <div className="mt-2 text-xs text-[var(--color-ink-muted)]">Select a slot above.</div>
                        )}
                    </div>

                    {error ? <p className="text-sm text-red-600">{error}</p> : null}

                    <button
                        type="submit"
                        disabled={submitting || !slot}
                        className="min-h-[44px] w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {submitting ? "Reserving..." : "Continue to Payment"}
                    </button>
                </form>
            </div>
        </main>
    );
}
