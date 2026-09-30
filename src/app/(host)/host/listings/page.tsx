"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

export default function HostListingsPage() {
    const [listings, setListings] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [providerProfileId, setProviderProfileId] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            const res = await fetch("/api/users/me");
            if (!res.ok) { setLoading(false); return; }
            const data = await res.json();
            const ppid = data.data?.providerProfile?.id || data.providerProfile?.id || null;
            setProviderProfileId(ppid);
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!providerProfileId) return;
        const fetchListings = async () => {
            try {
                const response = await fetch(`/api/listings?providerProfileId=${providerProfileId}`);
                if (!response.ok) throw new Error("Failed to fetch listings");
                const data = await response.json();
                setListings(data.data);
                setError(null);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
            }
        };

        fetchListings();
    }, [providerProfileId]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "bg-[#DCFCE7] text-[#166534]";
            case "pending_review":
                return "bg-[#FEF3C7] text-[#B45309]";
            case "draft":
                return "bg-[#F3F4F6] text-[#6B7280]";
            case "rejected":
                return "bg-[#FEE2E2] text-[#991B1B]";
            default:
                return "bg-[#F3F4F6] text-[#6B7280]";
        }
    };

    return (
        <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}>
            {loading ? (
                <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
                    <div className="mx-auto max-w-4xl space-y-6">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-32 rounded-2xl bg-white animate-pulse border border-[var(--color-border)]" />
                        ))}
                    </div>
                </main>
            ) : error && listings.length === 0 ? (
                <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
                    <div className="mx-auto max-w-4xl flex flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-8">
                        <p className="text-sm text-[var(--color-ink-muted)]">Error: {error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-white font-semibold"
                        >
                            Try Again
                        </button>
                    </div>
                </main>
            ) : (
                <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
                    <div className="mx-auto max-w-4xl space-y-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1">
                                <h1 className="text-3xl break-words font-semibold text-[var(--color-ink)]">My Listings</h1>
                                <p className="text-sm text-[var(--color-ink-muted)]">Manage and create your spaces</p>
                            </div>
                            <Link
                                href="/host/listings/new"
                                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-white font-semibold sm:w-auto"
                            >
                                <Plus size={18} />
                                New Listing
                            </Link>
                        </div>

                        {listings.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
                                <p className="text-sm font-semibold text-[var(--color-ink)]">No listings yet</p>
                                <p className="text-xs text-[var(--color-ink-muted)]">Create your first listing to get started</p>
                                <Link
                                    href="/host/listings/new"
                                    className="mt-2 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-white font-semibold text-sm"
                                >
                                    Create Listing
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {listings.map((listing) => (
                                    <Link
                                        key={listing.id}
                                        href={`/host/listings/${listing.id}`}
                                        className="block rounded-2xl border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-primary)] transition-colors sm:p-6"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <h3 className="truncate font-semibold text-[var(--color-ink)]">{listing.title}</h3>
                                                <p className="text-xs break-words text-[var(--color-ink-muted)] line-clamp-1">{listing.description}</p>
                                                <div className="flex flex-wrap items-center gap-2 pt-1">
                                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(listing.status)}`}>
                                                        {listing.status === "draft"
                                                            ? "Draft"
                                                            : listing.status === "pending_review"
                                                                ? "Pending Review"
                                                                : listing.status === "active"
                                                                    ? "Active"
                                                                    : listing.status === "rejected"
                                                                        ? "Rejected"
                                                                        : listing.status}
                                                    </span>
                                                    <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-1 text-xs text-[var(--color-ink-muted)]">
                                                        {listing.bookingType === "capacity" ? "Shared" : "Exclusive"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-2">
                                                <p className="font-semibold whitespace-nowrap text-[var(--color-ink)]">₦{((listing.pricing?.baseRatePerHour || 0) / 100).toLocaleString()}</p>
                                                <p className="text-xs text-[var(--color-ink-muted)]">per hour</p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </main>
            )}
        </DashboardLayout>
    );
}
