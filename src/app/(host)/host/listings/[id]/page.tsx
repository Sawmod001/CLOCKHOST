"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Save, Send, ExternalLink, ImagePlus, X, Trash2 } from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

const VENUE_SUB_VERTICALS = [
  { key: "birthday", label: "Birthday" },
  { key: "exclusive_space", label: "Exclusive Space" },
  { key: "karaoke", label: "Karaoke" },
  { key: "group_night", label: "Group Night" },
];

const FEATURE_DEFAULTS = {
  birthday: { cakeAllowed: false, decorationOptions: "", partyFavorsProvided: false, kidFriendly: false },
  exclusiveSpace: { privacyLevel: "semi_private", cateringOptions: "", inHouseCatering: false, maxGuests: 0 },
  karaoke: { microphoneCount: 1, songGenres: "", privateRoom: false, hasStage: false, soundSystem: "" },
  groupNight: { gameTypes: "", hasPoolTable: false, hasVideoGames: false, hasBoardGames: false, maxGroupSize: 0, hasBar: false },
  housing: { propertyType: "apartment", bedrooms: 1, bathrooms: 1, hasWifi: false, hasParking: false, hasAC: false, furnished: false, petFriendly: false },
};

const SUB_VERTICAL_KEY_MAP = {
  birthday: "birthday",
  exclusive_space: "exclusiveSpace",
  karaoke: "karaoke",
  group_night: "groupNight",
};

const FEATURE_FIELD_CONFIG = {
  birthday: [
    { key: "cakeAllowed", label: "Cake allowed", type: "checkbox" },
    { key: "partyFavorsProvided", label: "Party favors provided", type: "checkbox" },
    { key: "decorationOptions", label: "Decoration options (separate each with comma)", type: "text" },
    { key: "kidFriendly", label: "Kid friendly", type: "checkbox" },
  ],
  exclusiveSpace: [
    { key: "privacyLevel", label: "Privacy level", type: "select", options: [{ value: "semi_private", label: "Semi-private" }, { value: "fully_private", label: "Fully private" }, { value: "vip", label: "VIP" }] },
    { key: "maxGuests", label: "Max guests", type: "number" },
    { key: "cateringOptions", label: "Catering options (separate each with comma)", type: "text" },
    { key: "inHouseCatering", label: "In-house catering", type: "checkbox" },
  ],
  karaoke: [
    { key: "microphoneCount", label: "Microphone count", type: "number" },
    { key: "songGenres", label: "Song genres (separate each with comma)", type: "text" },
    { key: "soundSystem", label: "Sound system type", type: "text" },
    { key: "privateRoom", label: "Private room", type: "checkbox" },
    { key: "hasStage", label: "Has stage", type: "checkbox" },
  ],
  groupNight: [
    { key: "gameTypes", label: "Game types (separate each with comma)", type: "text" },
    { key: "hasPoolTable", label: "Has pool table", type: "checkbox" },
    { key: "hasVideoGames", label: "Has video games", type: "checkbox" },
    { key: "hasBoardGames", label: "Has board games", type: "checkbox" },
    { key: "hasBar", label: "Has bar", type: "checkbox" },
    { key: "maxGroupSize", label: "Max group size", type: "number" },
  ],
  housing: [
    { key: "propertyType", label: "Property type", type: "select", options: [{ value: "apartment", label: "Apartment" }, { value: "house", label: "House" }, { value: "duplex", label: "Duplex" }, { value: "room", label: "Room" }, { value: "shortlet", label: "Shortlet" }] },
    { key: "bedrooms", label: "Bedrooms", type: "number" },
    { key: "bathrooms", label: "Bathrooms", type: "number" },
    { key: "hasWifi", label: "Has WiFi", type: "checkbox" },
    { key: "hasParking", label: "Has parking", type: "checkbox" },
    { key: "hasAC", label: "Has AC", type: "checkbox" },
    { key: "furnished", label: "Furnished", type: "checkbox" },
    { key: "petFriendly", label: "Pet friendly", type: "checkbox" },
  ],
};

const FEATURE_SECTION_LABELS = {
  birthday: "Birthday Features",
  exclusiveSpace: "Exclusive Space Features",
  karaoke: "Karaoke Features",
  groupNight: "Group Night Features",
  housing: "Housing Features",
};

const subVerticalBadgeLabels = {
  birthday: "Birthday",
  exclusive_space: "Exclusive",
  karaoke: "Karaoke",
  group_night: "Group Night",
};

function getDefaultFeatures(vertical: string, subVerticals: string[]) {
  const features: Record<string, any> = {};
  if (vertical === "venue") {
    for (const sv of subVerticals) {
      const key = SUB_VERTICAL_KEY_MAP[sv as keyof typeof SUB_VERTICAL_KEY_MAP] as string;
      if (key && (FEATURE_DEFAULTS as Record<string, any>)[key]) features[key] = { ...(FEATURE_DEFAULTS as Record<string, any>)[key] };
    }
  } else if ((FEATURE_DEFAULTS as Record<string, any>)[vertical]) {
    features[vertical] = { ...(FEATURE_DEFAULTS as Record<string, any>)[vertical] };
  }
  return features;
}

export default function HostListingDetailPage() {
  const { id } = useParams();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { fetchListing(); }, [id]);

  async function fetchListing() {
    try {
      const res = await fetch(`/api/listings/${id}`);
      if (!res.ok) throw new Error("Listing not found");
      const data = await res.json();
      const rawSub = data.subVertical;
      const subVerticals = Array.isArray(rawSub) ? rawSub : (rawSub ? [rawSub] : []);
      let features = data.features || {};
      if (!features || Object.keys(features).length === 0) {
        features = getDefaultFeatures(data.vertical, subVerticals);
      }
      setListing(data);
      setEditData({
        title: data.title,
        description: data.description,
        subVertical: subVerticals,
        features,
        pricing: { baseRatePerHour: data.pricing?.baseRatePerHour || 0 },
        housingDetails: {
          nightlyRateKobo: data.housingDetails?.nightlyRateKobo || 0,
          weeklyRateKobo: data.housingDetails?.weeklyRateKobo || 0,
          cleaningFeeKobo: data.housingDetails?.cleaningFeeKobo || 0,
          minStayNights: data.housingDetails?.minStayNights || 1,
          maxStayNights: data.housingDetails?.maxStayNights || 0,
          checkInTime: data.housingDetails?.checkInTime || "14:00",
          checkOutTime: data.housingDetails?.checkOutTime || "11:00",
          maxGuests: data.housingDetails?.maxGuests || 2,
          houseRules: data.housingDetails?.houseRules || "",
        },
        location: {
          state: data.location?.state || "",
          cityArea: data.location?.cityArea || "",
          address: data.location?.address || "",
          coordinates: { latitude: data.location?.coordinates?.coordinates?.[1] || 0, longitude: data.location?.coordinates?.coordinates?.[0] || 0 },
        },
        operationalRules: {
          maxCapacity: data.operationalRules?.maxCapacity || 1,
          setupTimeMinutes: data.operationalRules?.setupTimeMinutes || data.operationalRules?.setupBufferMinutes || 30,
          cleanupTimeMinutes: data.operationalRules?.cleanupTimeMinutes || data.operationalRules?.teardownBufferMinutes || 30,
          isByobAllowed: data.operationalRules?.isByobAllowed || false,
          cancellationPolicy: data.operationalRules?.cancellationPolicy || "moderate",
        },
        media: data.media || [],
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(files: File[]) {
    setUploading(true);
    setMessage(null);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) {
          setEditData((prev: any) => ({ ...prev, media: [...(prev.media || []), data.url] }));
        } else {
          setMessage("Upload error: " + (data.error || "Unknown"));
        }
      } catch (err) {
        setMessage("Upload error: " + (err as Error).message);
      }
    }
    setUploading(false);
  }

  function handleDrop(e: React.DragEvent) { e.preventDefault(); const files = [...(e.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith("image/")); if (files.length) handleFileUpload(files); }
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) { const files = [...(e.target.files ?? [])].filter((f) => f.type.startsWith("image/")); if (files.length) handleFileUpload(files); e.target.value = ""; }

  const handleFeatureChange = (categoryKey: string, field: string, value: unknown) => {
    setEditData((prev: any) => {
      const newData = JSON.parse(JSON.stringify(prev));
      if (!newData.features[categoryKey]) newData.features[categoryKey] = {};
      newData.features[categoryKey][field] = value;
      return newData;
    });
  };

  const toggleSubVertical = (key: string) => {
    setEditData((prev: any) => {
      const current = prev.subVertical || [];
      const exists = current.includes(key);
      const next = exists ? current.filter((k: any) => k !== key) : [...current, key];
      if (next.length === 0) return { ...prev, subVertical: next, features: {} };
      const features = getDefaultFeatures("venue", next);
      for (const sv of Object.keys(prev.features)) {
        if (features[sv]) Object.assign(features[sv], prev.features[sv]);
      }
      return { ...prev, subVertical: next, features };
    });
  };

  const selectedSubVerticals = editData?.subVertical || [];

  const renderFeatureInput = (categoryKey: string, field: string, label: string, type: string, options: { value: string; label: string }[] | undefined) => {
    const currentFeatures = editData?.features?.[categoryKey] || {};
    if (type === "checkbox") {
      return <label key={field} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!currentFeatures[field]} onChange={(e) => handleFeatureChange(categoryKey, field, e.target.checked)} className="rounded border border-[var(--color-border)]" /><span className="text-[var(--color-ink)]">{label}</span></label>;
    }
    if (type === "select") {
      return <div key={field}><label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">{label}</label><select value={currentFeatures[field] || (options ? options[0]?.value : "")} onChange={(e) => handleFeatureChange(categoryKey, field, e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm">{options && options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>;
    }
    const displayVal = type === "number" ? (currentFeatures[field] || "") : (currentFeatures[field] ?? "");
    return <div key={field}><label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">{label}</label><input type={type} value={displayVal} onChange={(e) => { const val = type === "number" ? (parseInt(e.target.value) || 0) : e.target.value; handleFeatureChange(categoryKey, field, val); }} placeholder={label} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" /></div>;
  };

  const renderFeatureSections = () => {
    const vertical = listing?.vertical;
    if (vertical === "venue") {
      return selectedSubVerticals.map((sv: any) => {
        const key = (SUB_VERTICAL_KEY_MAP as Record<string, string>)[sv];
        if (!key || !(FEATURE_FIELD_CONFIG as Record<string, any>)[key]) return null;
        return <div key={key} className="space-y-3 border-t border-[var(--color-border)] pt-4"><h3 className="font-semibold text-[var(--color-ink)]">{(FEATURE_SECTION_LABELS as Record<string, string>)[key]}</h3><div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">{((FEATURE_FIELD_CONFIG as Record<string, any>)[key] as any[]).map((cfg: any) => renderFeatureInput(key, cfg.key, cfg.label, cfg.type, cfg.options))}</div></div>;
      });
    }
    const key = vertical as string;
    const configs = (FEATURE_FIELD_CONFIG as Record<string, any>)[key] as any[] | undefined;
    if (!configs) return null;
    return <div className="space-y-3 border-t border-[var(--color-border)] pt-4"><h3 className="font-semibold text-[var(--color-ink)]">{(FEATURE_SECTION_LABELS as Record<string, string>)[key]}</h3><div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">{configs.map((cfg: any) => renderFeatureInput(key, cfg.key, cfg.label, cfg.type, cfg.options))}</div></div>;
  };

  const ARRAY_FIELDS = ["decorationOptions", "cateringOptions", "songGenres", "gameTypes"];

  function preparePayload(data: Record<string, any> | null) {
    const p = JSON.parse(JSON.stringify(data));
    if (p.features) {
      for (const cat of Object.keys(p.features)) {
        for (const field of ARRAY_FIELDS) {
          if (typeof p.features[cat]?.[field] === "string") {
            p.features[cat][field] = p.features[cat][field].split(",").map((s) => s.trim()).filter(Boolean);
          }
        }
      }
    }
    return p;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = preparePayload(editData);
      const res = await fetch(`/api/listings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const data = await res.json(); const msg = data.issues ? data.issues.map((i: any) => i.message || i.path?.join(".") + " " + i.message).join("; ") : data.error; throw new Error(msg || "Failed to save"); }
      setMessage("Saved!");
      fetchListing();
    } catch (err) {
      setMessage("Error: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitReview() {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/listings/${id}/submit-review`, { method: "POST" });
      if (!res.ok) { const data = await res.json(); throw new Error(data.error || "Failed to submit"); }
      setMessage("Submitted for review");
      fetchListing();
    } catch (err) {
      setMessage("Error: " + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this listing permanently?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/listings/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to delete"); }
      window.location.href = "/host/listings";
    } catch (err) {
      setMessage("Error: " + (err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  function removeMedia(idx: number) { setEditData((prev: any) => ({ ...prev, media: prev.media.filter((_: any, i: number) => i !== idx) })); }

  if (loading) {
    return <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}><div className="mx-auto max-w-2xl space-y-4">{Array.from({ length: 5 }).map((_: any, i: number) => <div key={i} className="h-12 animate-pulse rounded-2xl bg-white border border-[var(--color-border)]" />)}</div></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}><div className="mx-auto max-w-2xl flex flex-col items-center gap-4 rounded-2xl border border-[var(--color-border)] bg-white p-8"><p className="text-sm text-[var(--color-ink-muted)]">{error}</p><Link href="/host/listings" className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-white font-semibold text-sm">Back to My Listings</Link></div></DashboardLayout>;
  }

  const canEdit = listing.status !== "pending_review";
  const statusColors = { draft: "bg-[#F3F4F6] text-[#6B7280]", pending_review: "bg-[#FEF3C7] text-[#B45309]", active: "bg-[#DCFCE7] text-[#166534]", rejected: "bg-[#FEE2E2] text-[#991B1B]" };

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/host/listings" className="flex items-center gap-2 text-[var(--color-primary)] text-sm"><ArrowLeft size={16} />Back to My Listings</Link>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="break-words text-2xl font-semibold text-[var(--color-ink)]">{listing.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[listing.status as keyof typeof statusColors] || statusColors.draft}`}>{listing.status === "draft" ? "Draft" : listing.status === "pending_review" ? "Pending Review" : listing.status === "active" ? "Active" : listing.status === "rejected" ? "Rejected" : listing.status}</span>
              <span className="text-xs text-[var(--color-ink-muted)] capitalize">{listing.vertical === "venue" ? "Venue" : "Housing"}</span>
              {(Array.isArray(listing.subVertical) ? listing.subVertical : (listing.subVertical ? [listing.subVertical] : [])).map((sv: any) => (
                <span key={sv} className="inline-flex rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">{(subVerticalBadgeLabels as Record<string, string>)[sv] || sv.replace(/_/g, " ")}</span>
              ))}
            </div>
          </div>
          {listing.status === "active" && <a href={`/listings/${id}`} target="_blank" className="flex min-h-[44px] shrink-0 items-center gap-1 text-sm text-[var(--color-primary)]"><ExternalLink size={14} />View public</a>}
        </div>

        {listing.status === "rejected" && listing.rejectionReason && <div className="rounded-xl border border-[#B91C1C] bg-[#FEE2E2] p-4 text-sm text-[#7F1D1D]"><p className="font-semibold">Rejected</p><p>{listing.rejectionReason}</p></div>}

        {listing.status === "pending_review" && <div className="rounded-xl border border-[#B45309] bg-[#FEF3C7] p-4 text-sm text-[#92400E]"><p className="font-semibold">Under Review</p><p>This listing is being reviewed by an admin and cannot be edited.</p></div>}

        {listing.vertical === "housing" && (
          <Link href={`/host/listings/${id}/calendar`}
            className="btn-outline gap-2 px-4 py-2 text-sm">
            Manage Calendar
          </Link>
        )}
        {listing.vertical === "venue" && listing.bookingType === "capacity" && (
          <Link href={`/host/listings/${id}/slots`}
            className="btn-outline gap-2 px-4 py-2 text-sm">
            Manage Time Slots
          </Link>
        )}
        {listing.vertical === "venue" && listing.bookingType === "exclusive" && (
          <Link href={`/host/listings/${id}/exclusive-locks`}
            className="btn-outline gap-2 px-4 py-2 text-sm">
            Manage Exclusive Locks
          </Link>
        )}

        {message && <div className={`rounded-xl border p-4 text-sm ${message.startsWith("Error") ? "border-[#B91C1C] bg-[#FEE2E2] text-[#7F1D1D]" : "border-[#15803D] bg-[#DCFCE7] text-[#166534]"}`}>{message}</div>}

        {canEdit ? (
          <form onSubmit={handleSave} className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
            <div>
              <label className="text-sm font-semibold block mb-2">Title</label>
              <input type="text" value={editData.title} onChange={(e) => setEditData((p: any) => ({ ...p, title: e.target.value }))} className="w-full rounded-xl border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold block mb-2">Description</label>
              <textarea value={editData.description} onChange={(e) => setEditData((p: any) => ({ ...p, description: e.target.value }))} rows={4} className="w-full rounded-xl border px-3 py-2 text-sm" />
            </div>

            {listing.vertical === "venue" && (
              <div className="border-t border-[var(--color-border)] pt-4">
                <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Venue types</label>
                <div className="flex flex-wrap gap-3">
                  {VENUE_SUB_VERTICALS.map((sv) => (
                    <label key={sv.key} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-colors ${selectedSubVerticals.includes(sv.key) ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-ink)]"}`}>
                      <input type="checkbox" checked={selectedSubVerticals.includes(sv.key)} onChange={() => toggleSubVertical(sv.key)} className="sr-only" />
                      {sv.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {renderFeatureSections()}

            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold">Location</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input type="text" value={editData.location.state} onChange={(e) => setEditData((p: any) => ({ ...p, location: { ...p.location, state: e.target.value } }))} placeholder="State" className="rounded-xl border px-3 py-2 text-sm" />
                <input type="text" value={editData.location.cityArea} onChange={(e) => setEditData((p: any) => ({ ...p, location: { ...p.location, cityArea: e.target.value } }))} placeholder="City Area" className="rounded-xl border px-3 py-2 text-sm" />
              </div>
              <input type="text" value={editData.location.address} onChange={(e) => setEditData((p: any) => ({ ...p, location: { ...p.location, address: e.target.value } }))} placeholder="Address" className="w-full rounded-xl border px-3 py-2 text-sm" />
            </div>

            {listing.vertical === "housing" ? (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold">Housing Pricing</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-sm block mb-1">Nightly Rate (₦)</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₦</span>
                      <input type="number" min="0" step="100" value={(editData.housingDetails?.nightlyRateKobo || 0) > 0 ? editData.housingDetails.nightlyRateKobo / 100 : ""} onChange={(e) => setEditData((p: any) => ({ ...p, housingDetails: { ...p.housingDetails, nightlyRateKobo: (parseInt(e.target.value) || 0) * 100 } }))} onFocus={(e) => e.target.select()} placeholder="0" className="w-full rounded-xl border py-2 pl-8 pr-3 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm block mb-1">Max Guests</label>
                    <input type="number" min="1" max="50" value={editData.housingDetails?.maxGuests || ""} onChange={(e) => setEditData((p: any) => ({ ...p, housingDetails: { ...p.housingDetails, maxGuests: parseInt(e.target.value) || 2 } }))} className="w-full rounded-xl border px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-sm block mb-1">Cleaning Fee (₦)</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₦</span>
                      <input type="number" min="0" step="100" value={(editData.housingDetails?.cleaningFeeKobo || 0) > 0 ? editData.housingDetails.cleaningFeeKobo / 100 : ""} onChange={(e) => setEditData((p: any) => ({ ...p, housingDetails: { ...p.housingDetails, cleaningFeeKobo: (parseInt(e.target.value) || 0) * 100 } }))} onFocus={(e) => e.target.select()} placeholder="0" className="w-full rounded-xl border py-2 pl-8 pr-3 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm block mb-1">Min Stay (nights)</label>
                    <input type="number" min="1" max="365" value={editData.housingDetails?.minStayNights || ""} onChange={(e) => setEditData((p: any) => ({ ...p, housingDetails: { ...p.housingDetails, minStayNights: parseInt(e.target.value) || 1 } }))} className="w-full rounded-xl border px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-semibold">Pricing & Capacity</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-sm block mb-1">Base Rate (₦/hr)</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₦</span>
                      <input type="number" min="0" step="0.01" value={editData.pricing.baseRatePerHour > 0 ? editData.pricing.baseRatePerHour / 100 : ""} onChange={(e) => setEditData((p: any) => ({ ...p, pricing: { baseRatePerHour: (parseInt(e.target.value) || 0) * 100 } }))} onFocus={(e) => e.target.select()} placeholder="0.00" className="w-full rounded-xl border py-2 pl-8 pr-3 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm block mb-1">Max Capacity</label>
                    <input type="number" min="1" value={editData.operationalRules.maxCapacity || ""} onChange={(e) => setEditData((p: any) => ({ ...p, operationalRules: { ...p.operationalRules, maxCapacity: parseInt(e.target.value) || 1 } }))} onFocus={(e) => e.target.select()} className="w-full rounded-xl border px-3 py-2 text-sm" />
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold">Photos</h3>
              <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()} className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-ink-muted)] hover:border-[var(--color-primary)] transition-colors">
                <ImagePlus size={32} />
                {uploading ? <div className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Uploading...</div> : <><p className="font-semibold text-[var(--color-ink)]">Drop photos here or click to browse</p><p>Supports JPG, PNG, WebP, GIF</p></>}
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
              </div>
              {editData.media?.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {editData.media.map((url: any, i: number) => (
                    <div key={i} className="group relative h-24 w-24 overflow-hidden rounded-xl border bg-[var(--color-surface-alt)]">
                      <img src={url} alt="" className="h-full w-full object-cover" onError={(e: any) => { e.target.src = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%2250%22 x=%2250%22 text-anchor=%22middle%22 dominant-baseline=%22central%22 font-size=%2220%22>?</text></svg>" }} />
                      <button type="button" onClick={() => removeMedia(i)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"><X size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button type="submit" disabled={saving} className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-white font-semibold disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? "Saving..." : "Save Changes"}</button>
              {listing.status === "draft" && <button type="button" onClick={handleSubmitReview} disabled={submitting} className="btn-outline flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5">{submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{submitting ? "Submitting..." : "Submit for Review"}</button>}
            </div>
            {listing.status !== "active" && listing.status !== "pending_review" && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="btn-outline-danger mt-4 w-full gap-2 px-4 py-2 text-sm">
                {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {deleting ? "Deleting..." : "Delete Listing"}
              </button>
            )}
          </form>
        ) : (
          <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-white p-6">
            <div><p className="text-sm text-[var(--color-ink-muted)]">Description</p><p className="text-sm">{listing.description}</p></div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><p className="text-sm text-[var(--color-ink-muted)]">Location</p><p className="text-sm">{listing.location?.address}, {listing.location?.cityArea}, {listing.location?.state}</p></div>
              <div><p className="text-sm text-[var(--color-ink-muted)]">Price</p><p className="text-sm font-semibold">₦{(listing.pricing?.baseRatePerHour / 100).toLocaleString()}/hr</p></div>
              <div><p className="text-sm text-[var(--color-ink-muted)]">Capacity</p><p className="text-sm">{listing.operationalRules?.maxCapacity} people</p></div>
              <div><p className="text-sm text-[var(--color-ink-muted)]">Booking Type</p><p className="text-sm capitalize">{listing.bookingType}</p></div>
            </div>
            {listing.media?.length > 0 && (
              <div><p className="text-sm text-[var(--color-ink-muted)] mb-2">Photos</p><div className="flex flex-wrap gap-2">{listing.media.map((url: any, i: number) => <img key={i} src={url} alt="" className="h-24 w-24 rounded-xl object-cover border" onError={(e: any) => { e.target.src = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%2250%22 x=%2250%22 text-anchor=%22middle%22 dominant-baseline=%22central%22 font-size=%2220%22>?</text></svg>" }} />)}</div></div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
