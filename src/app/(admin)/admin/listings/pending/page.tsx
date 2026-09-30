"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import AdminSidebar from "@/components/sidebar/AdminSidebar";

export default function AdminPendingListingsPage() {
    const [listings, setListings] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [contactingId, setContactingId] = useState<string | null>(null);
    const [contactHost, setContactHost] = useState<Record<string, any> | null>(null);

    const fetchListings = async () => {
        try {
            const response = await fetch("/api/listings?status=submitted");
            if (!response.ok) throw new Error("Failed to fetch listings");
            const data = await response.json();
            setListings(data.data || []);
            setError(null);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, []);

    const handleApprove = async (listingId: string) => {
        setActionLoading(listingId);
        try {
            const response = await fetch(`/api/admin/listings/${listingId}/approve`, {
                method: "POST",
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Failed to approve listing");
            setListings((prev) => prev.filter((l) => l.id !== listingId));
        } catch (err) {
            alert("Error: " + (err as Error).message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleContactHost = async (listing: Record<string, any>) => {
        setContactingId(listing.id);
        try {
            const response = await fetch(`/api/users/${listing.providerProfileId}`);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Failed to fetch host info");
            setContactHost({ ...data.data, listingId: listing.id });
        } catch (err) {
            alert("Could not load host contact info: " + (err as Error).message);
        } finally {
            setContactingId(null);
        }
    };

    const handleRejectSubmit = async (listingId: string) => {
        if (!rejectReason.trim()) {
            alert("Please provide a rejection reason");
            return;
        }

        setActionLoading(listingId);
        try {
            const response = await fetch(`/api/admin/listings/${listingId}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: rejectReason }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || "Failed to reject listing");
            setListings((prev) => prev.filter((l) => l.id !== listingId));
            setRejectingId(null);
            setRejectReason("");
        } catch (err) {
            alert("Error: " + (err as Error).message);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <DashboardLayout sidebar={AdminSidebar} sidebarProps={{ activePage: "pending" }}>
                <div className="space-y-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 rounded-2xl bg-white animate-pulse border border-[var(--color-border)]" />
                    ))}
                </div>
            </DashboardLayout>
        );
    }

    if (error && listings.length === 0) {
        return (
            <DashboardLayout sidebar={AdminSidebar} sidebarProps={{ activePage: "pending" }}>
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-8">
                    <p className="text-sm text-[var(--color-ink-muted)]">Error: {error}</p>
                    <button
                        onClick={fetchListings}
                        className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-white font-semibold"
                    >
                        Try Again
                    </button>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout sidebar={AdminSidebar} sidebarProps={{ activePage: "pending" }}>
            <div className="space-y-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Pending Approvals</h1>
                    <p className="text-sm text-[var(--color-ink-muted)]">Review and approve new listings</p>
                </div>

                {listings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
                        <p className="text-sm font-semibold text-[var(--color-ink)]">No pending listings</p>
                        <p className="text-xs text-[var(--color-ink-muted)]">All listings have been reviewed</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {listings.map((listing) => (
                            <div
                                key={listing.id}
                                className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6 space-y-4"
                            >
                                <div className="min-w-0 space-y-2">
                                    <h3 className="break-words font-semibold text-[var(--color-ink)]">{listing.title}</h3>
                                    <p className="break-words text-sm text-[var(--color-ink-muted)]">{listing.description}</p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-1 text-xs text-[var(--color-ink-muted)]">
                                            {listing.vertical === "outdoor_space" ? "Outdoor Space" : listing.vertical}
                                        </span>
                                        <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-1 text-xs text-[var(--color-ink-muted)]">
                                            {listing.bookingType === "capacity" ? "Capacity" : listing.bookingType === "viewing" ? "Viewing" : "Exclusive"}
                                        </span>
                                        {listing.pricing?.baseRatePerHour > 0 && (
                                            <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-1 text-xs text-[var(--color-ink-muted)]">
                                                ₦{(listing.pricing.baseRatePerHour / 100).toLocaleString()}/hr
                                            </span>
                                        )}
                                        {listing.housingDetails?.nightlyRateKobo > 0 && (
                                            <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-1 text-xs text-[var(--color-ink-muted)]">
                                                ₦{(listing.housingDetails.nightlyRateKobo / 100).toLocaleString()}/night
                                            </span>
                                        )}
                                        {listing.location?.cityArea && (
                                            <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-1 text-xs text-[var(--color-ink-muted)]">
                                                {listing.location.cityArea}, {listing.location.state}
                                            </span>
                                        )}
                                    </div>
                                    {listing.structuredDescription?.highlights?.length > 0 && (
                                        <div className="pt-2">
                                            <p className="text-xs font-semibold text-[var(--color-ink)] mb-1">Highlights:</p>
                                            <ul className="text-xs text-[var(--color-ink-muted)] space-y-0.5">
                                                {listing.structuredDescription.highlights.slice(0, 3).map((h: any, i: number) => (
                                                    <li key={i}>• {h}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>

                                {rejectingId === listing.id ? (
                                    <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
                                        <label className="text-sm font-semibold text-[var(--color-ink)] block">Rejection Reason</label>
                                        <textarea
                                            value={rejectReason}
                                            onChange={(e) => setRejectReason(e.target.value)}
                                            placeholder="Explain why this listing is being rejected..."
                                            rows={3}
                                            className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm"
                                        />
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <button
                                                onClick={() => handleRejectSubmit(listing.id)}
                                                disabled={actionLoading === listing.id}
                                                className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#B91C1C] px-4 py-2.5 text-white font-semibold disabled:opacity-50"
                                            >
                                                {actionLoading === listing.id ? "Submitting..." : "Confirm Rejection"}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setRejectingId(null);
                                                    setRejectReason("");
                                                }}
                                                className="btn-outline flex min-h-[44px] flex-1 items-center justify-center px-4 py-2.5"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
                                        {contactHost && contactHost.listingId === listing.id && (
                                            <div className="rounded-xl bg-[var(--color-surface-alt)] p-3 text-sm">
                                                <p className="break-words font-semibold text-[var(--color-ink)]">{contactHost.name}</p>
                                                <p className="break-all text-[var(--color-ink-muted)]">{contactHost.email}</p>
                                                {contactHost.profile?.businessName && (
                                                    <p className="text-[var(--color-ink-muted)]">{contactHost.profile.businessName}</p>
                                                )}
                                                <a
                                                    href={`mailto:${contactHost.email}?subject=${encodeURIComponent("Your ClockHost listing: " + listing.title)}`}
                                                    className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]"
                                                >
                                                    <Mail size={14} />
                                                    Send email
                                                </a>
                                                <button
                                                    onClick={() => setContactHost(null)}
                                                    className="ml-3 text-xs text-[var(--color-ink-muted)] underline"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <button
                                                onClick={() => handleApprove(listing.id)}
                                                disabled={actionLoading === listing.id}
                                                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#15803D] px-4 py-2.5 text-white font-semibold disabled:opacity-50 sm:flex-1"
                                            >
                                                {actionLoading === listing.id ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <CheckCircle2 size={16} />
                                                )}
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleContactHost(listing)}
                                                disabled={contactingId === listing.id}
                                                className="btn-outline flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 disabled:opacity-50 sm:w-auto"
                                            >
                                                <Mail size={16} />
                                                {contactingId === listing.id ? "..." : "Contact"}
                                            </button>
                                            <button
                                                onClick={() => setRejectingId(listing.id)}
                                                disabled={actionLoading === listing.id}
                                                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2.5 text-white font-semibold disabled:opacity-50 sm:flex-1"
                                            >
                                                <XCircle size={16} />
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
