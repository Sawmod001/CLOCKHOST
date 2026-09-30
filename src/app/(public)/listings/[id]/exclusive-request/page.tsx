"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import BackButton from "@/components/BackButton";

export default function ExclusiveRequestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [listing, setListing] = useState<Record<string, any> | null>(null);
    const [loading, setLoading] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState<any>(null);
    const [availableLocks, setAvailableLocks] = useState<Record<string, any>[]>([]);
    const [locksLoading, setLocksLoading] = useState(false);
    const [locksError, setLocksError] = useState<string | null>(null);
    const [form, setForm] = useState({
        lockId: "",
        headcount: 2,
        eventStart: "",
        eventEnd: "",
    });

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
        const fetchListing = async () => {
            try {
                const response = await fetch(`/api/listings/${id}`);
                if (!response.ok) throw new Error("Listing not found");
                const data = await response.json();
                setListing(data);
                setError(null);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        };

        fetchListing();
    }, [id]);

    useEffect(() => {
        if (!form.eventStart) return;
        const date = form.eventStart.slice(0, 10);
        if (!date) return;

        let cancelled = false;
        setLocksLoading(true);
        setLocksError(null);
        fetch(`/api/listings/${id}/exclusive-locks?date=${date}`)
            .then((res) => {
                if (!res.ok) throw new Error("Failed to load locks");
                return res.json();
            })
            .then((data) => {
                if (cancelled) return;
                setAvailableLocks(Array.isArray(data) ? data : data.data || []);
                setForm((prev) => ({ ...prev, lockId: "" }));
            })
            .catch((err) => {
                if (!cancelled) setLocksError((err as Error).message);
            })
            .finally(() => {
                if (!cancelled) setLocksLoading(false);
            });

        return () => { cancelled = true; };
    }, [id, form.eventStart]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.lockId) {
            setError("Please select an available lock");
            return;
        }
        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/bookings/exclusive/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    listingId: id,
                    lockId: form.lockId,
                    headcount: form.headcount,
                    eventStart: form.eventStart,
                    eventEnd: form.eventEnd,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Unable to submit request");
            setSuccess(data.data);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !authChecked) {
        return (
            <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
                <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-6">
                    <div className="h-8 w-24 animate-pulse rounded-xl bg-[var(--color-surface-alt)]" />
                    <div className="h-10 animate-pulse rounded-xl bg-[var(--color-surface-alt)]" />
                    <div className="h-24 animate-pulse rounded-xl bg-[var(--color-surface-alt)]" />
                </div>
            </main>
        );
    }

    if (!isAuthenticated) {
        return (
            <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
                <div className="mx-auto max-w-2xl space-y-6">
                    <PublicHeader />
                    <BackButton href={`/listings/${id}`} label="Back to listing" />
                    <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
                        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                            <Lock size={22} />
                        </span>
                        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Sign in to book</h1>
                        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-ink-muted)]">
                            Create a free ClockHost account to submit your request for this space.
                        </p>
                        <Link href="/sign-up" className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white">
                            <Lock size={16} /> Sign in / Create account
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    if (error || !listing) {
        return (
            <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
                <div className="mx-auto max-w-2xl rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
                    <p className="mb-4 text-sm text-[var(--color-ink-muted)]">{error || "Unable to load this listing"}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                    >
                        Try Again
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
            <div className="mx-auto max-w-2xl space-y-6">
                <PublicHeader />
                <BackButton href={`/listings/${id}`} label="Back to listing" />

                <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
                    <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Request to Book</h1>
                    <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                        Submit your request for this exclusive-space listing. The first successful payment wins the slot.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div className="block text-sm font-semibold text-[var(--color-ink)]">
                            Exclusive lock
                            {!form.eventStart && (
                                <p className="mt-1 text-xs font-normal text-[var(--color-ink-muted)]">
                                    Select a start date above to view available locks
                                </p>
                            )}
                            {locksLoading && (
                                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--color-ink-muted)]">
                                    <Loader2 size={14} className="animate-spin" /> Loading available locks...
                                </div>
                            )}
                            {locksError && (
                                <p className="mt-2 text-xs text-red-500">{locksError}</p>
                            )}
                            {!locksLoading && form.eventStart && availableLocks.length === 0 && !locksError && (
                                <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                                    No exclusive locks available for this date
                                </p>
                            )}
                            {availableLocks.length > 0 && (
                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                    {availableLocks.map((lock) => {
                                        const isSelected = form.lockId === lock.id;
                                        const isOpen = lock.status === "open";
                                        return (
                                            <button
                                                key={lock.id}
                                                type="button"
                                                disabled={!isOpen}
                                                onClick={() => setForm({ ...form, lockId: lock.id })}
                                                className={`flex min-w-0 w-full flex-col items-start rounded-xl border p-3 text-left text-xs transition ${
                                                    isSelected
                                                        ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-1 ring-[var(--color-primary)]"
                                                        : isOpen
                                                        ? "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
                                                        : "border-[var(--color-border)] bg-[var(--color-surface-alt)] opacity-50 cursor-not-allowed"
                                                }`}
                                            >
                                                <span className="w-full break-all font-semibold text-[var(--color-ink)]">{lock.id}</span>
                                                <span className="mt-0.5 text-[var(--color-ink-muted)]">
                                                    {lock.date || (lock.start ? new Date(lock.start).toLocaleDateString() : "")}
                                                </span>
                                                {(lock.startTime || lock.start) && (
                                                    <span className="text-[var(--color-ink-muted)]">
                                                        {lock.startTime || new Date(lock.start).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })}
                                                        {lock.endTime || lock.end ? ` – ${lock.endTime || new Date(lock.end).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })}` : ""}
                                                    </span>
                                                )}
                                                <span className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                                    {isOpen ? "Open" : "Locked"}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            <input type="hidden" value={form.lockId} required />
                        </div>

                        <label className="block text-sm font-semibold text-[var(--color-ink)]">
                            How many people?
                            <input
                                type="number"
                                min="1"
                                value={form.headcount}
                                onChange={(event) => setForm({ ...form, headcount: Number(event.target.value) })}
                                onFocus={(e) => e.target.select()}
                                className="mt-2 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
                                required
                            />
                        </label>

                        <label className="block text-sm font-semibold text-[var(--color-ink)]">
                            Start
                            <input
                                type="datetime-local"
                                value={form.eventStart}
                                onChange={(event) => setForm({ ...form, eventStart: event.target.value })}
                                className="mt-2 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
                                required
                            />
                        </label>

                        <label className="block text-sm font-semibold text-[var(--color-ink)]">
                            End
                            <input
                                type="datetime-local"
                                value={form.eventEnd}
                                onChange={(event) => setForm({ ...form, eventEnd: event.target.value })}
                                className="mt-2 w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
                                required
                            />
                        </label>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                            {submitting ? "Submitting" : "Submit Request"}
                        </button>
                    </form>

                    {success ? (
                        <div className="mt-4 rounded-xl border border-[#DCFCE7] bg-[#F0FDF4] p-4 text-sm text-[#166534]">
                            Request submitted. Booking ID: {success.bookingId}
                        </div>
                    ) : null}

                    {error ? (
                        <div className="mt-4 rounded-xl border border-[#FEE2E2] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
                            {error}
                        </div>
                    ) : null}
                </div>
            </div>
        </main>
    );
}
