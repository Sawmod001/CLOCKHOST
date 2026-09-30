"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Filter, Loader2, X } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";

const subVerticalLabels = {
  birthday: "Birthday",
  exclusive_space: "Exclusive",
  karaoke: "Karaoke",
  group_night: "Group Night",
};

export default function DiscoveryPage() {
    const [listings, setListings] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [filters, setFilters] = useState({
        vertical: "",
        bookingType: "",
        cityArea: "",
        subVertical: "",
        keyword: "",
    });
    const [searching, setSearching] = useState(false);

    const fetchListings = useCallback(
        async (reset = false) => {
            try {
                if (reset) setLoading(true);
                const params = new URLSearchParams();
                if (filters.vertical) params.append("vertical", filters.vertical);
                if (filters.bookingType) params.append("bookingType", filters.bookingType);
                if (filters.cityArea) params.append("cityArea", filters.cityArea);
                if (filters.subVertical) params.append("subVertical", filters.subVertical);
                if (filters.keyword) params.append("keyword", filters.keyword);
                if (cursor && !reset) params.append("cursor", cursor);

                const response = await fetch(`/api/listings?${params.toString()}`);
                if (!response.ok) throw new Error("Failed to fetch listings");

                const data = await response.json();
                const items = Array.isArray(data.data) ? data.data : [];
                setListings(reset ? items : (prev) => [...prev, ...items]);
                setCursor(data.pagination?.nextCursor ?? null);
                setHasMore(data.pagination?.hasMore ?? false);
                setError(null);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setLoading(false);
                setSearching(false);
            }
        },
        [cursor, filters]
    );

    useEffect(() => {
        setCursor(null);
        fetchListings(true);
    }, [filters]);

    const handleFilterChange = (key: string, value: unknown) => {
        setFilters((prev) => {
            const updated = { ...prev, [key]: value };
            if (key === "vertical" && value !== "venue") {
                updated.subVertical = "";
            }
            return updated;
        });
    };

    const handleLoadMore = () => {
        if (!searching && hasMore) {
            setSearching(true);
            fetchListings();
        }
    };

    const activeFilterCount = Object.values(filters).filter(Boolean).length;

    const handleClearFilters = () => {
        setFilters({ vertical: "", bookingType: "", cityArea: "", subVertical: "", keyword: "" });
    };

    if (loading && listings.length === 0) {
        return (
            <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-64 rounded-2xl bg-white animate-pulse border border-[var(--color-border)]" />
                    ))}
                </div>
            </main>
        );
    }

    if (error && listings.length === 0) {
        return (
            <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-8">
                    <p className="text-sm text-[var(--color-ink-muted)]">Error: {error}</p>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => fetchListings(true)}
                            className="min-h-[44px] rounded-xl bg-[var(--color-primary)] px-4 py-2 text-white font-semibold"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6 sm:px-6">
            <div className="mx-auto max-w-4xl space-y-6">
                <PublicHeader />
                <div className="space-y-3">
                    <h1 className="text-3xl font-semibold text-[var(--color-ink)] sm:text-4xl">Discover Spaces</h1>
                    <p className="text-sm text-[var(--color-ink-muted)]">Find the perfect venue for your next event</p>
                </div>

                <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 space-y-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)]" />
                            <input type="text" value={filters.keyword} onChange={(e) => handleFilterChange("keyword", e.target.value)}
                                placeholder="Search listings..."
                                className="w-full rounded-xl border border-[var(--color-border)] pl-9 pr-3 py-2 text-base sm:text-sm" />
                        </div>
                        {activeFilterCount > 0 && (
                            <button onClick={handleClearFilters}
                                className="btn-outline min-h-[44px] gap-1 px-3 py-2 text-sm">
                                <X size={14} /> Clear
                            </button>
                        )}
                    </div>
                    <div className="sm:flex sm:gap-3 space-y-3 sm:space-y-0">
                    <div className="flex-1">
                        <label className="text-xs font-semibold text-[var(--color-ink)] block mb-2">Category</label>
                        <select
                            value={filters.vertical}
                            onChange={(e) => handleFilterChange("vertical", e.target.value)}
                            className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
                        >
                            <option value="">All Categories</option>
                            <option value="venue">Venues</option>
                            <option value="housing">Housing</option>
                        </select>
                    </div>

                    <div className="flex-1">
                        <label className="text-xs font-semibold text-[var(--color-ink)] block mb-2">Booking Type</label>
                        <select
                            value={filters.bookingType}
                            onChange={(e) => handleFilterChange("bookingType", e.target.value)}
                            className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
                        >
                            <option value="">All Types</option>
                            <option value="capacity">Shared Capacity</option>
                            <option value="exclusive">Exclusive Space</option>
                        </select>
                    </div>

                    {filters.vertical === "venue" && (
                        <div className="flex-1">
                            <label className="text-xs font-semibold text-[var(--color-ink)] block mb-2">Sub-Vertical</label>
                            <select
                                value={filters.subVertical}
                                onChange={(e) => handleFilterChange("subVertical", e.target.value)}
                                className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
                            >
                                <option value="">All Sub-Verticals</option>
                                <option value="birthday">Birthday</option>
                                <option value="exclusive_space">Exclusive</option>
                                <option value="karaoke">Karaoke</option>
                                <option value="group_night">Group Night</option>
                            </select>
                        </div>
                    )}

                    <div className="flex-1">
                        <label className="text-xs font-semibold text-[var(--color-ink)] block mb-2">City Area</label>
                        <input
                            type="text"
                            value={filters.cityArea}
                            onChange={(e) => handleFilterChange("cityArea", e.target.value)}
                            placeholder="e.g. Lekki"
                            className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
                        />
                    </div>
                </div>
                </div>

                {listings.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
                        <p className="text-sm font-semibold text-[var(--color-ink)]">No listings found</p>
                        <p className="text-xs text-[var(--color-ink-muted)]">Try adjusting your filters to find available spaces</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {listings.map((listing) => (
                            <Link key={listing.id} href={`/listings/${listing.id}`} className="block">
                                <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-primary)] transition-colors cursor-pointer sm:p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <h3 className="font-semibold text-[var(--color-ink)] line-clamp-1">{listing.title}</h3>
                                            <p className="text-xs text-[var(--color-ink-muted)] line-clamp-2">{listing.description}</p>
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {(Array.isArray(listing.subVertical) ? listing.subVertical : (listing.subVertical ? [listing.subVertical] : [])).map((sv: any) => (
                                                    <span key={sv} className="inline-flex rounded-full border border-[var(--color-primary-light)] bg-[var(--color-primary-light)] px-2 py-1 text-xs font-semibold text-[var(--color-primary-dark)]">
                                                        {(subVerticalLabels as Record<string, string>)[sv] || String(sv).replace(/_/g, " ")}
                                                    </span>
                                                ))}
                                                <span className="inline-flex rounded-full border border-[var(--color-primary-light)] bg-[var(--color-primary-light)] px-2 py-1 text-xs font-semibold text-[var(--color-primary-dark)]">
                                                    {listing.bookingType === "capacity" ? "Shared" : "Exclusive"}
                                                </span>
                                                <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-1 text-xs text-[var(--color-ink-muted)]">
                                                    {listing.vertical}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 space-y-1 text-right">
                                            <p className="font-semibold text-[var(--color-ink)]">
                                                ₦{((listing.pricing?.baseRatePerHour ?? 0) / 100).toLocaleString()}
                                            </p>
                                            <p className="text-xs text-[var(--color-ink-muted)]">per hour</p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {hasMore && (
                    <div className="flex justify-center">
                        <button
                            onClick={handleLoadMore}
                            disabled={searching}
                            className="rounded-xl bg-[var(--color-primary)] px-6 py-3 text-white font-semibold disabled:opacity-50 flex min-h-[44px] items-center gap-2"
                        >
                            {searching && <Loader2 size={16} className="animate-spin" />}
                            {searching ? "Loading..." : "Load More"}
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
