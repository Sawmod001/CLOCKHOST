"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

export default function HostReviewsPage() {
  const [reviews, setReviews] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/listings?status=active");
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        const listings = data.data || [];

        const allReviews: any[] = [];
        for (const listing of listings) {
          try {
            const rRes = await fetch(`/api/listings/${listing.id}/reviews`);
            if (rRes.ok) {
              const rData = await rRes.json();
              const listingReviews = (rData.data || []).map((r: any) => ({ ...r, listingTitle: listing.title }));
              allReviews.push(...listingReviews);
            }
          } catch {}
        }
        setReviews(allReviews.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : "–";

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "reviews" }}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Reviews</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">See what guests are saying</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
            <p className="text-xs text-[var(--color-ink-muted)]">Average Rating</p>
            <div className="flex items-center gap-2 mt-1">
              <Star size={20} className="text-yellow-500 fill-yellow-500" />
              <span className="text-2xl font-bold text-[var(--color-ink)]">{avgRating}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
            <p className="text-xs text-[var(--color-ink-muted)]">Total Reviews</p>
            <p className="text-2xl font-bold text-[var(--color-ink)] mt-1">{reviews.length}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
            <p className="text-sm text-[var(--color-ink-muted)]">{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
            <p className="text-sm font-semibold text-[var(--color-ink)]">No reviews yet</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Reviews from guests will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-ink)]">{review.listingTitle}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={14} className={i < (review.rating || 0) ? "text-yellow-500 fill-yellow-500" : "text-gray-300"} />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="break-words text-sm text-[var(--color-ink-muted)]">{review.comment}</p>
                )}
                <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                  {new Date(review.created_at).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos",  day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
