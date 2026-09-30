"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import ShortletHostSidebar from "@/components/sidebar/ShortletHostSidebar";

export default function AddPropertyPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    state: "",
    cityArea: "",
    address: "",
    nightlyRate: "",
    weeklyRate: "",
    monthlyRate: "",
    bedrooms: 1,
    bathrooms: 1,
    maxGuests: 2,
    minStayNights: 1,
    maxStayNights: "",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    propertyType: "apartment",
    hasWifi: false,
    hasParking: false,
    hasAC: false,
    furnished: false,
    petFriendly: false,
  });

  const handleChange = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        vertical: "housing",
        bookingType: "exclusive",
        title: form.title,
        description: form.description,
        location: { state: form.state, cityArea: form.cityArea, address: form.address },
        pricing: {
          baseRatePerHour: 0,
        },
        housingDetails: {
          nightlyRateKobo: (Number(form.nightlyRate) || 0) * 100,
          weeklyRateKobo: (Number(form.weeklyRate) || 0) * 100,
          monthlyRateKobo: (Number(form.monthlyRate) || 0) * 100,
          minStayNights: Number(form.minStayNights) || 1,
          maxStayNights: Number(form.maxStayNights) || 0,
          maxGuests: Number(form.maxGuests) || 2,
          checkInTime: form.checkInTime,
          checkOutTime: form.checkOutTime,
        },
        operationalRules: {
          maxCapacity: Number(form.maxGuests) || 2,
          cancellationPolicy: "moderate",
        },
        features: {
          housing: {
            propertyType: form.propertyType,
            bedrooms: Number(form.bedrooms),
            bathrooms: Number(form.bathrooms),
            hasWifi: form.hasWifi,
            hasParking: form.hasParking,
            hasAC: form.hasAC,
            furnished: form.furnished,
            petFriendly: form.petFriendly,
          },
        },
      };

      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create property");
      }

      router.push("/host/properties");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout sidebar={ShortletHostSidebar} sidebarProps={{ activePage: "properties" }}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/host/properties" className="flex items-center gap-2 text-sm text-[var(--color-primary)]">
          <ArrowLeft size={16} /> Back to properties
        </Link>

        <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Add Property</h1>

        {error && <div className="rounded-xl border border-[#B91C1C] bg-[#FEE2E2] p-4 text-sm text-[#7F1D1D]">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
          <div>
            <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Title</label>
            <input value={form.title} onChange={(e) => handleChange("title", e.target.value)} placeholder="e.g. Cozy Lekki Apartment" className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" required />
          </div>

          <div>
            <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Description</label>
            <textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={4} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="text-sm font-semibold block mb-2">State</label><input value={form.state} onChange={(e) => handleChange("state", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm" required /></div>
            <div><label className="text-sm font-semibold block mb-2">City Area</label><input value={form.cityArea} onChange={(e) => handleChange("cityArea", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm" required /></div>
          </div>
          <div><label className="text-sm font-semibold block mb-2">Address</label><input value={form.address} onChange={(e) => handleChange("address", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm" required /></div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <h3 className="font-semibold mb-3">Pricing (₦/night)</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div><label className="text-xs text-[var(--color-ink-muted)] block mb-1">Nightly</label><input type="number" value={form.nightlyRate} onChange={(e) => handleChange("nightlyRate", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" required /></div>
              <div><label className="text-xs text-[var(--color-ink-muted)] block mb-1">Weekly</label><input type="number" value={form.weeklyRate} onChange={(e) => handleChange("weeklyRate", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-[var(--color-ink-muted)] block mb-1">Monthly</label><input type="number" value={form.monthlyRate} onChange={(e) => handleChange("monthlyRate", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" /></div>
            </div>
          </div>

          <div className="border-t border-[var(--color-border)] pt-4">
            <h3 className="font-semibold mb-3">Property Details</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div><label className="text-xs text-[var(--color-ink-muted)] block mb-1">Bedrooms</label><input type="number" min="0" value={form.bedrooms} onChange={(e) => handleChange("bedrooms", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-[var(--color-ink-muted)] block mb-1">Bathrooms</label><input type="number" min="0" value={form.bathrooms} onChange={(e) => handleChange("bathrooms", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" /></div>
              <div><label className="text-xs text-[var(--color-ink-muted)] block mb-1">Max Guests</label><input type="number" min="1" value={form.maxGuests} onChange={(e) => handleChange("maxGuests", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" /></div>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs text-[var(--color-ink-muted)] block mb-1">Property Type</label>
                <select value={form.propertyType} onChange={(e) => handleChange("propertyType", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm">
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                  <option value="duplex">Duplex</option>
                  <option value="shortlet">Shortlet</option>
                </select>
              </div>
              <div><label className="text-xs text-[var(--color-ink-muted)] block mb-1">Min Stay (nights)</label><input type="number" min="1" value={form.minStayNights} onChange={(e) => handleChange("minStayNights", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" /></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.hasWifi} onChange={(e) => handleChange("hasWifi", e.target.checked)} className="rounded border" /> WiFi</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.hasParking} onChange={(e) => handleChange("hasParking", e.target.checked)} className="rounded border" /> Parking</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.hasAC} onChange={(e) => handleChange("hasAC", e.target.checked)} className="rounded border" /> AC</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.furnished} onChange={(e) => handleChange("furnished", e.target.checked)} className="rounded border" /> Furnished</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.petFriendly} onChange={(e) => handleChange("petFriendly", e.target.checked)} className="rounded border" /> Pet Friendly</label>
            </div>
          </div>

          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Creating..." : "Create Property"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
