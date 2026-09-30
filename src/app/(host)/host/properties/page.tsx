"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Home, MapPin } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import ShortletHostSidebar from "@/components/sidebar/ShortletHostSidebar";

export default function MyPropertiesPage() {
  const [listings, setListings] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/listings?status=active")
      .then((r) => r.json())
      .then((data) => setListings(data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout sidebar={ShortletHostSidebar} sidebarProps={{ activePage: "properties" }}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-[var(--color-ink)]">My Properties</h1>
            <p className="text-sm text-[var(--color-ink-muted)]">Manage your rental properties</p>
          </div>
          <Link href="/host/properties/new" className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white sm:w-auto">
            <Plus size={16} /> Add Property
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
            <Home size={32} className="mx-auto mb-3 text-[var(--color-ink-muted)]" />
            <p className="text-sm font-semibold text-[var(--color-ink)]">No properties yet</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Add your first property to start receiving bookings</p>
            <Link href="/host/properties/new" className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">
              Add Property
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {listings.map((listing) => (
              <Link key={listing.id} href={`/host/listings/${listing.id}`} className="rounded-2xl border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-primary)] transition-colors">
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-alt)]">
                    {listing.media?.[0] ? (
                      <img src={listing.media[0]} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><Home size={20} className="text-[var(--color-ink-muted)]" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[var(--color-ink)] truncate">{listing.title}</p>
                    <div className="flex items-center gap-1 text-xs text-[var(--color-ink-muted)]">
                      <MapPin size={12} />
                      {listing.location?.cityArea || "–"}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex rounded-full bg-[#DCFCE7] px-2 py-0.5 text-xs font-semibold text-[#166534]">Active</span>
                      {listing.pricing?.nightlyRate && (
                        <span className="text-xs text-[var(--color-ink-muted)]">₦{(listing.pricing.nightlyRate / 100).toLocaleString()}/night</span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
