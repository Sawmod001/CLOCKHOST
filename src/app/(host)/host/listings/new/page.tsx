"use client";

import { useState, useRef } from "react";
import { ArrowLeft, Loader2, ImagePlus, X } from "lucide-react";
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
  outdoor: { terrain: "garden", hasShelter: false, hasParking: false, hasRestrooms: false, hasPower: false, allowsAlcohol: false, noiseLimit: "moderate" },
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
  outdoor: [
    { key: "terrain", label: "Terrain", type: "select", options: [{ value: "garden", label: "Garden" }, { value: "rooftop", label: "Rooftop" }, { value: "beach", label: "Beach" }, { value: "field", label: "Field" }, { value: "patio", label: "Patio/Deck" }, { value: "other", label: "Other" }] },
    { key: "hasShelter", label: "Has shelter/canopy", type: "checkbox" },
    { key: "hasParking", label: "Has parking", type: "checkbox" },
    { key: "hasRestrooms", label: "Has restrooms", type: "checkbox" },
    { key: "hasPower", label: "Has power supply", type: "checkbox" },
    { key: "allowsAlcohol", label: "Allows alcohol", type: "checkbox" },
    { key: "noiseLimit", label: "Noise level", type: "select", options: [{ value: "quiet", label: "Quiet" }, { value: "moderate", label: "Moderate" }, { value: "loud", label: "Loud (events)" }] },
  ],
};

const FEATURE_SECTION_LABELS = {
  birthday: "Birthday Features",
  exclusiveSpace: "Exclusive Space Features",
  karaoke: "Karaoke Features",
  groupNight: "Group Night Features",
  housing: "Housing Features",
  outdoor: "Outdoor Space Features",
};

function getDefaultFeatures(vertical: string, subVerticals: string[]) {
  const features: Record<string, any> = {};
  if (vertical === "venue") {
    for (const sv of subVerticals) {
      const key = (SUB_VERTICAL_KEY_MAP as Record<string, string>)[sv] as string;
      if (key && (FEATURE_DEFAULTS as Record<string, any>)[key]) features[key] = { ...(FEATURE_DEFAULTS as Record<string, any>)[key] };
    }
  } else if ((FEATURE_DEFAULTS as Record<string, any>)[vertical]) {
    features[vertical] = { ...(FEATURE_DEFAULTS as Record<string, any>)[vertical] };
  }
  return features;
}

export default function CreateListingPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<any>({
    vertical: "venue",
    subVertical: [],
    bookingType: "capacity",
    title: "",
    description: "",
    location: { state: "", cityArea: "", address: "" },
    pricing: { baseRatePerHour: 0 },
    housingDetails: { nightlyRateKobo: 0, weeklyRateKobo: 0, monthlyRateKobo: 0, cleaningFeeKobo: 0, minStayNights: 1, maxStayNights: 0, leaseDurationMonths: 0, checkInTime: "14:00", checkOutTime: "11:00", maxGuests: 2, selfCheckIn: false, houseRules: "", viewingFeeKobo: 0, viewingDurationMinutes: 30 },
    operationalRules: { maxCapacity: 10, setupTimeMinutes: 30, cleanupTimeMinutes: 30, isByobAllowed: false, cancellationPolicy: "moderate" },
    addOns: [],
    media: [],
    features: {},
    structuredDescription: { highlights: "", idealFor: "", houseRules: "", gettingAround: "" },
  });

  async function handleUploadFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok) {
          setFormData((prev: any) => ({ ...prev, media: [...(prev.media || []), data.url] }));
        } else {
          setError("Upload error: " + (data.error || "Unknown"));
        }
      } catch (err) {
        setError("Upload error: " + (err as Error).message);
      }
    }
    setUploading(false);
  }
  const [newAddOn, setNewAddOn] = useState({ name: "", priceInKobo: 0, isRequired: false });
  const [createdId, setCreatedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleInputChange = (path: string, value: unknown) => {
    const keys = path.split(".");
    setFormData((prev: any) => {
      const newData = JSON.parse(JSON.stringify(prev));
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i] as string]) current[keys[i] as string] = {};
        current = current[keys[i] as string];
      }
      current[keys[keys.length - 1] as string] = value;
      return newData;
    });
  };

  const handleFeatureChange = (categoryKey: string, field: string, value: unknown) => {
    setFormData((prev: any) => {
      const newData = JSON.parse(JSON.stringify(prev));
      if (!newData.features[categoryKey]) newData.features[categoryKey] = {};
      newData.features[categoryKey][field] = value;
      return newData;
    });
  };

  const handleVerticalChange = (value: string) => {
    const features = value === "venue" ? getDefaultFeatures(value, ["birthday"]) :
                     value === "outdoor_space" ? { outdoor: { ...FEATURE_DEFAULTS.outdoor } } :
                     getDefaultFeatures(value, []);
    setFormData((prev: any) => ({
      ...prev,
      vertical: value,
      subVertical: value === "venue" ? ["birthday"] : [],
      bookingType: (value === "housing" || value === "outdoor_space") ? "exclusive" : prev.bookingType,
      features,
    }));
  };

  const toggleSubVertical = (key: string) => {
    setFormData((prev: any) => {
      const current = prev.subVertical || [];
      const exists = current.includes(key);
      const next = exists ? current.filter((k: any) => k !== key) : [...current, key];
      if (next.length === 0) return { ...prev, subVertical: next, features: {} };
      const features = getDefaultFeatures("venue", next);
      // Preserve any existing filled-in values for sub-verticals that stay selected
      for (const sv of Object.keys(prev.features)) {
        if (features[sv]) {
          Object.assign(features[sv], prev.features[sv]);
        }
      }
      return { ...prev, subVertical: next, features };
    });
  };

  const ARRAY_FIELDS = ["decorationOptions", "cateringOptions", "songGenres", "gameTypes"];

  function preparePayload(data: Record<string, any> | null) {
    const p = JSON.parse(JSON.stringify(data));
    if (p.features) {
      for (const cat of Object.keys(p.features)) {
        for (const field of ARRAY_FIELDS) {
          if (typeof p.features[cat]?.[field] === "string") {
            p.features[cat][field] = p.features[cat][field].split(",").map((s: any) => s.trim()).filter(Boolean);
          }
        }
      }
    }
    if (p.structuredDescription) {
      const sd = p.structuredDescription;
      p.structuredDescription = {
        highlights: sd.highlights ? sd.highlights.split("\n").map((s: any) => s.trim()).filter(Boolean) : [],
        idealFor: sd.idealFor ? sd.idealFor.split("\n").map((s: any) => s.trim()).filter(Boolean) : [],
        houseRules: sd.houseRules ? sd.houseRules.split("\n").map((s: any) => s.trim()).filter(Boolean) : [],
        gettingAround: sd.gettingAround || "",
      };
      if (!sd.highlights && !sd.idealFor && !sd.houseRules && !sd.gettingAround) {
        delete p.structuredDescription;
      }
    }
    if (p.availabilityRules) {
      p.availabilityRules = Object.fromEntries(
        Object.entries(p.availabilityRules as Record<string, any>).filter(([, v]: [string, any]) => v && (v as any).enabled !== false)
      );
      if (Object.keys(p.availabilityRules).length === 0) delete p.availabilityRules;
    }
    if (p.vertical === "housing") {
      if (!p.housingDetails?.weeklyRateKobo) delete p.housingDetails?.weeklyRateKobo;
      if (!p.housingDetails?.monthlyRateKobo) delete p.housingDetails?.monthlyRateKobo;
      if (!p.housingDetails?.cleaningFeeKobo) delete p.housingDetails?.cleaningFeeKobo;
      if (!p.housingDetails?.maxStayNights) delete p.housingDetails?.maxStayNights;
      if (!p.housingDetails?.leaseDurationMonths) delete p.housingDetails?.leaseDurationMonths;
      if (!p.housingDetails?.houseRules) delete p.housingDetails?.houseRules;
      if (!p.housingDetails?.viewingFeeKobo) delete p.housingDetails?.viewingFeeKobo;
      if (!p.housingDetails?.viewingDurationMinutes) delete p.housingDetails?.viewingDurationMinutes;
      p.operationalRules.maxCapacity = p.housingDetails?.maxGuests || 2;
      delete p.pricing?.baseRatePerHour;
      delete p.operationalRules?.setupTimeMinutes;
      delete p.operationalRules?.cleanupTimeMinutes;
      delete p.operationalRules?.isByobAllowed;
    }
    if (p.vertical === "outdoor_space") {
      delete p.operationalRules?.isByobAllowed;
    }
    return p;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = preparePayload(formData);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const data = await response.json();
        const msg = data.issues ? data.issues.map((i: any) => i.message || i.path?.join(".") + " " + i.message).join("; ") : data.error;
        throw new Error(msg || "Failed to create listing");
      }

      const listing = await response.json();
      setCreatedId(listing.id);
    } catch (err) {
      setError((err as any).name === "AbortError" ? "Request timed out. Check that the server is running." : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const vertical = formData.vertical;
  const selectedSubVerticals = formData.subVertical || [];

  const renderFeatureInput = (categoryKey: string, field: string, label: string, type: string, options: { value: string; label: string }[] | undefined) => {
    const currentFeatures = formData.features[categoryKey] || {};

    if (type === "checkbox") {
      return (
        <label key={field} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!currentFeatures[field]} onChange={(e) => handleFeatureChange(categoryKey, field, e.target.checked)} className="rounded border border-[var(--color-border)]" />
          <span className="text-[var(--color-ink)]">{label}</span>
        </label>
      );
    }

    if (type === "select") {
      return (
        <div key={field}>
          <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">{label}</label>
          <select value={currentFeatures[field] || (options ? options[0]?.value : "")} onChange={(e) => handleFeatureChange(categoryKey, field, e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm">
            {options && options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      );
    }

    const displayVal = type === "number" ? (currentFeatures[field] || "") : (currentFeatures[field] ?? "");
    return (
      <div key={field}>
        <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">{label}</label>
        <input type={type} value={displayVal} onChange={(e) => { const val = type === "number" ? (parseInt(e.target.value) || 0) : e.target.value; handleFeatureChange(categoryKey, field, val); }} placeholder={label} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
      </div>
    );
  };

  const renderFeatureSections = () => {
    if (vertical === "venue") {
      const sections = [];
      for (const sv of selectedSubVerticals) {
        const key = (SUB_VERTICAL_KEY_MAP as Record<string, string>)[sv as string];
        if (!key || !(FEATURE_FIELD_CONFIG as Record<string, any>)[key]) continue;
        const configs = ((FEATURE_FIELD_CONFIG as Record<string, any>)[key] as any[]);
        sections.push(
          <div key={key} className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <h3 className="font-semibold text-[var(--color-ink)]">{((FEATURE_SECTION_LABELS as Record<string, string>)[key])}</h3>
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
              {configs.map((cfg: any) => renderFeatureInput(key, cfg.key, cfg.label, cfg.type, cfg.options))}
            </div>
          </div>
        );
      }
      return sections;
    }

    const key = vertical as string;
    const configs = ((FEATURE_FIELD_CONFIG as Record<string, any>)[key] as any[] | undefined);
    if (!configs) return null;
    return (
      <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
        <h3 className="font-semibold text-[var(--color-ink)]">{((FEATURE_SECTION_LABELS as Record<string, string>)[key])}</h3>
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          {configs.map((cfg: any) => renderFeatureInput(key, cfg.key, cfg.label, cfg.type, cfg.options))}
        </div>
      </div>
    );
  };

  if (createdId) {
    return (
      <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}>
        <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
          <div className="mx-auto max-w-2xl text-center space-y-4 py-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#DCFCE7]">
              <svg className="h-8 w-8 text-[#15803D]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h1 className="text-2xl font-semibold">Listing submitted for review!</h1>
            <p className="text-[var(--color-ink-muted)]">Your listing is pending admin approval. You will be notified once it&apos;s approved.</p>
            <div className="flex flex-col items-stretch gap-3 pt-4 sm:flex-row sm:items-center">
              <Link href={`/host/listings/${createdId}`} className="flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-white">View listing</Link>
              <Link href="/host/listings" className="btn-outline flex min-h-[44px] items-center justify-center px-6 py-3">My listings</Link>
            </div>
          </div>
        </main>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "listings" }}>
      <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Link href="/host/listings" className="flex items-center gap-2 text-[var(--color-primary)] text-sm">
            <ArrowLeft size={18} />
            Back to my listings
          </Link>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Create New Listing</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Fill in the details to create and submit your space for admin review</p>
        </div>

        {error && <div className="rounded-xl border border-[#B91C1C] bg-[#FEE2E2] p-4 text-sm text-[#7F1D1D]">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Space Type</label>
              <select value={formData.vertical} onChange={(e) => handleVerticalChange(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm">
                <option value="venue">Venue</option>
                <option value="housing">Housing</option>
                <option value="outdoor_space">Outdoor Space</option>
              </select>
            </div>
            {vertical === "venue" && (
              <div>
                <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Booking Type</label>
                <select value={formData.bookingType} onChange={(e) => handleInputChange("bookingType", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm">
                  <option value="capacity">Capacity-Based</option>
                  <option value="exclusive">Exclusive Space</option>
                </select>
              </div>
            )}
            {vertical === "housing" && (
              <div className="flex items-end">
                <span className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-ink-muted)]">
                  Booking type: Exclusive (entire property)
                </span>
              </div>
            )}
            {vertical === "outdoor_space" && (
              <div className="flex items-end">
                <span className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-ink-muted)]">
                  Booking type: Exclusive (entire space)
                </span>
              </div>
            )}
          </div>

          {vertical === "venue" && (
            <div className="border-t border-[var(--color-border)] pt-4">
              <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">What type of venue? (select all that apply)</label>
              <div className="flex flex-wrap gap-3">
                {VENUE_SUB_VERTICALS.map((sv) => (
                  <label key={sv.key} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-colors ${selectedSubVerticals.includes(sv.key) ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]" : "border-[var(--color-border)] text-[var(--color-ink)]"}`}>
                    <input type="checkbox" checked={selectedSubVerticals.includes(sv.key)} onChange={() => toggleSubVertical(sv.key)} className="sr-only" />
                    {sv.label}
                  </label>
                ))}
              </div>
              {selectedSubVerticals.length === 0 && <p className="mt-1 text-xs text-[#B91C1C]">Select at least one type</p>}
            </div>
          )}

          {renderFeatureSections()}

          <div>
            <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Title</label>
            <input type="text" value={formData.title} onChange={(e) => handleInputChange("title", e.target.value)} placeholder="e.g. Lekki Waterfront Lounge" className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Description</label>
            <textarea value={formData.description} onChange={(e) => handleInputChange("description", e.target.value)} placeholder="Describe your space, atmosphere, rules, etc." rows={4} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
          </div>

          <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Structured Description <span className="text-[var(--color-ink-muted)] font-normal">optional — improves search visibility</span></h3>
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Highlights <span className="text-[var(--color-ink-muted)] font-normal">one per line</span></label>
              <textarea value={formData.structuredDescription.highlights} onChange={(e) => handleInputChange("structuredDescription.highlights", e.target.value)} placeholder="e.g. Ocean view&#10;Private pool&#10;Free parking" rows={3} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Ideal For <span className="text-[var(--color-ink-muted)] font-normal">one per line</span></label>
              <textarea value={formData.structuredDescription.idealFor} onChange={(e) => handleInputChange("structuredDescription.idealFor", e.target.value)} placeholder="e.g. Birthday parties&#10;Corporate events&#10;Date nights" rows={3} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">House Rules <span className="text-[var(--color-ink-muted)] font-normal">one per line</span></label>
              <textarea value={formData.structuredDescription.houseRules} onChange={(e) => handleInputChange("structuredDescription.houseRules", e.target.value)} placeholder="e.g. No smoking indoors&#10;Quiet hours after 10pm&#10;No pets" rows={3} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Getting Around</label>
              <textarea value={formData.structuredDescription.gettingAround} onChange={(e) => handleInputChange("structuredDescription.gettingAround", e.target.value)} placeholder="e.g. 5 min walk from Lekki Phase 1 bus stop. Uber and Bolt available." rows={2} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Location</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">State</label>
                <input type="text" value={formData.location.state} onChange={(e) => handleInputChange("location.state", e.target.value)} placeholder="e.g. Kwara" className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">City Area</label>
                <input type="text" value={formData.location.cityArea} onChange={(e) => handleInputChange("location.cityArea", e.target.value)} placeholder="e.g. GRA" className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Address</label>
              <input type="text" value={formData.location.address} onChange={(e) => handleInputChange("location.address", e.target.value)} placeholder="Full address" className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
            </div>
          </div>

          {vertical === "venue" && (
            <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
              <h3 className="font-semibold text-[var(--color-ink)]">Pricing & Capacity</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Base Rate (₦/hour)</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₦</span>
                    <input type="number" min="0" step="0.01" value={formData.pricing.baseRatePerHour > 0 ? formData.pricing.baseRatePerHour / 100 : ""} onChange={(e) => handleInputChange("pricing.baseRatePerHour", (parseInt(e.target.value) || 0) * 100)} onFocus={(e) => e.target.select()} placeholder="0.00" className="w-full rounded-xl border border-[var(--color-border)] py-2 pl-8 pr-3 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Max Capacity</label>
                  <input type="number" value={formData.operationalRules.maxCapacity || ""} onChange={(e) => handleInputChange("operationalRules.maxCapacity", parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}

          {vertical === "housing" && (
            <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
              <h3 className="font-semibold text-[var(--color-ink)]">Housing Pricing</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Nightly Rate (₦)</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₦</span>
                    <input type="number" min="0" step="100" value={formData.housingDetails.nightlyRateKobo > 0 ? formData.housingDetails.nightlyRateKobo / 100 : ""} onChange={(e) => handleInputChange("housingDetails.nightlyRateKobo", (parseInt(e.target.value) || 0) * 100)} onFocus={(e) => e.target.select()} placeholder="0" className="w-full rounded-xl border border-[var(--color-border)] py-2 pl-8 pr-3 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Weekly Rate (₦) <span className="text-[var(--color-ink-muted)] font-normal">optional</span></label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₦</span>
                    <input type="number" min="0" step="100" value={formData.housingDetails.weeklyRateKobo > 0 ? formData.housingDetails.weeklyRateKobo / 100 : ""} onChange={(e) => handleInputChange("housingDetails.weeklyRateKobo", (parseInt(e.target.value) || 0) * 100)} onFocus={(e) => e.target.select()} placeholder="0" className="w-full rounded-xl border border-[var(--color-border)] py-2 pl-8 pr-3 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Monthly Rate (₦) <span className="text-[var(--color-ink-muted)] font-normal">optional</span></label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₦</span>
                    <input type="number" min="0" step="100" value={formData.housingDetails.monthlyRateKobo > 0 ? formData.housingDetails.monthlyRateKobo / 100 : ""} onChange={(e) => handleInputChange("housingDetails.monthlyRateKobo", (parseInt(e.target.value) || 0) * 100)} onFocus={(e) => e.target.select()} placeholder="0" className="w-full rounded-xl border border-[var(--color-border)] py-2 pl-8 pr-3 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Cleaning Fee (₦) <span className="text-[var(--color-ink-muted)] font-normal">optional</span></label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₦</span>
                    <input type="number" min="0" step="100" value={formData.housingDetails.cleaningFeeKobo > 0 ? formData.housingDetails.cleaningFeeKobo / 100 : ""} onChange={(e) => handleInputChange("housingDetails.cleaningFeeKobo", (parseInt(e.target.value) || 0) * 100)} onFocus={(e) => e.target.select()} placeholder="0" className="w-full rounded-xl border border-[var(--color-border)] py-2 pl-8 pr-3 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Max Guests</label>
                  <input type="number" min="1" max="50" value={formData.housingDetails.maxGuests || ""} onChange={(e) => handleInputChange("housingDetails.maxGuests", parseInt(e.target.value) || 2)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Lease Duration (months) <span className="text-[var(--color-ink-muted)] font-normal">0 = no lease</span></label>
                  <input type="number" min="0" max="60" value={formData.housingDetails.leaseDurationMonths || ""} onChange={(e) => handleInputChange("housingDetails.leaseDurationMonths", parseInt(e.target.value) || 0)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Viewing Fee (₦) <span className="text-[var(--color-ink-muted)] font-normal">0 = free</span></label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₦</span>
                    <input type="number" min="0" step="100" value={formData.housingDetails.viewingFeeKobo > 0 ? formData.housingDetails.viewingFeeKobo / 100 : ""} onChange={(e) => handleInputChange("housingDetails.viewingFeeKobo", (parseInt(e.target.value) || 0) * 100)} onFocus={(e) => e.target.select()} placeholder="0" className="w-full rounded-xl border border-[var(--color-border)] py-2 pl-8 pr-3 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Viewing Duration (minutes)</label>
                  <input type="number" min="15" max="180" value={formData.housingDetails.viewingDurationMinutes || ""} onChange={(e) => handleInputChange("housingDetails.viewingDurationMinutes", parseInt(e.target.value) || 30)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}

          {vertical === "outdoor_space" && (
            <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
              <h3 className="font-semibold text-[var(--color-ink)]">Outdoor Space Pricing</h3>
              <p className="text-xs text-[var(--color-ink-muted)]">Outdoor spaces are exclusive-only. You set the flat hourly rate.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Hourly Rate (₦)</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₦</span>
                    <input type="number" min="0" step="100" value={formData.pricing.baseRatePerHour > 0 ? formData.pricing.baseRatePerHour / 100 : ""} onChange={(e) => handleInputChange("pricing.baseRatePerHour", (parseInt(e.target.value) || 0) * 100)} onFocus={(e) => e.target.select()} placeholder="0" className="w-full rounded-xl border border-[var(--color-border)] py-2 pl-8 pr-3 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Max Guests</label>
                  <input type="number" min="1" value={formData.operationalRules.maxCapacity || ""} onChange={(e) => handleInputChange("operationalRules.maxCapacity", parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}

          {vertical === "venue" && (
            <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
              <h3 className="font-semibold text-[var(--color-ink)]">Time Allowances</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-1">Setup time (minutes)</label>
                  <p className="text-xs text-[var(--color-ink-muted)] mb-2">Time needed to prepare before guests arrive</p>
                  <input type="number" value={formData.operationalRules.setupTimeMinutes || ""} onChange={(e) => handleInputChange("operationalRules.setupTimeMinutes", parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-1">Cleanup time (minutes)</label>
                  <p className="text-xs text-[var(--color-ink-muted)] mb-2">Time needed to tidy up after the event ends</p>
                  <input type="number" value={formData.operationalRules.cleanupTimeMinutes || ""} onChange={(e) => handleInputChange("operationalRules.cleanupTimeMinutes", parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}

          {vertical === "outdoor_space" && (
            <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
              <h3 className="font-semibold text-[var(--color-ink)]">Time Allowances</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-1">Setup time (minutes)</label>
                  <input type="number" value={formData.operationalRules.setupTimeMinutes || ""} onChange={(e) => handleInputChange("operationalRules.setupTimeMinutes", parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-1">Cleanup time (minutes)</label>
                  <input type="number" value={formData.operationalRules.cleanupTimeMinutes || ""} onChange={(e) => handleInputChange("operationalRules.cleanupTimeMinutes", parseInt(e.target.value) || 0)} onFocus={(e) => e.target.select()} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Availability Rules</h3>
            <p className="text-xs text-[var(--color-ink-muted)]">Set your regular opening hours. Guests can only book during these times.</p>
            <div className="space-y-2">
              {["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((day) => {
                const rules = formData.availabilityRules || {};
                const dayRule = rules[day] || { enabled: day !== "sunday", open: "09:00", close: "22:00" };
                return (
                  <div key={day} className="flex flex-col gap-3 rounded-xl border border-[var(--color-border)] p-3 sm:flex-row sm:items-center">
                    <label className="flex min-h-[44px] items-center gap-2 sm:w-28">
                      <input
                        type="checkbox"
                        checked={dayRule.enabled !== false}
                        onChange={(e) => handleInputChange(`availabilityRules.${day}`, { ...dayRule, enabled: e.target.checked })}
                        className="rounded border"
                      />
                      <span className="text-sm font-semibold capitalize">{day}</span>
                    </label>
                    {dayRule.enabled !== false ? (
                      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <input
                          type="time"
                          value={dayRule.open || "09:00"}
                          onChange={(e) => handleInputChange(`availabilityRules.${day}`, { ...dayRule, open: e.target.value })}
                          className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm"
                        />
                        <span className="shrink-0 text-sm text-[var(--color-ink-muted)]">to</span>
                        <input
                          type="time"
                          value={dayRule.close || "22:00"}
                          onChange={(e) => handleInputChange(`availabilityRules.${day}`, { ...dayRule, close: e.target.value })}
                          className="min-w-0 flex-1 rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-sm text-[var(--color-ink-muted)]">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {vertical === "housing" && (
            <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
              <h3 className="font-semibold text-[var(--color-ink)]">Stay Rules</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Check-in Time</label>
                  <input type="time" value={formData.housingDetails.checkInTime} onChange={(e) => handleInputChange("housingDetails.checkInTime", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Check-out Time</label>
                  <input type="time" value={formData.housingDetails.checkOutTime} onChange={(e) => handleInputChange("housingDetails.checkOutTime", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Minimum Stay (nights)</label>
                  <input type="number" min="1" max="365" value={formData.housingDetails.minStayNights || ""} onChange={(e) => handleInputChange("housingDetails.minStayNights", parseInt(e.target.value) || 1)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Maximum Stay (nights) <span className="text-[var(--color-ink-muted)] font-normal">0 = no limit</span></label>
                  <input type="number" min="0" max="365" value={formData.housingDetails.maxStayNights || ""} onChange={(e) => handleInputChange("housingDetails.maxStayNights", parseInt(e.target.value) || 0)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">House Rules <span className="text-[var(--color-ink-muted)] font-normal">optional</span></label>
                <textarea value={formData.housingDetails.houseRules || ""} onChange={(e) => handleInputChange("housingDetails.houseRules", e.target.value)} placeholder="e.g. No smoking, quiet hours after 10pm..." rows={3} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
              </div>
            </div>
          )}

          <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Photos</h3>
            <div onDrop={(e) => { e.preventDefault(); handleUploadFiles([...(e.dataTransfer?.files ?? [])].filter(f => f.type.startsWith("image/"))); }} onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()} className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-ink-muted)] hover:border-[var(--color-primary)] transition-colors">
              <ImagePlus size={32} />
              {uploading ? <div className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" />Uploading...</div> : <><p className="font-semibold text-[var(--color-ink)]">Drop photos here or click to browse</p><p>Supports JPG, PNG, WebP, GIF</p></>}
              <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => { handleUploadFiles([...(e.target.files ?? [])].filter(f => f.type.startsWith("image/"))); e.target.value = ""; }} className="hidden" />
            </div>
            {formData.media.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {formData.media.map((url: any, i: number) => (
                  <div key={i} className="group relative h-24 w-24 overflow-hidden rounded-xl border bg-[var(--color-surface-alt)]">
                    <img src={url} alt="" className="h-full w-full object-cover" onError={(e: any) => { e.target.src = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%2250%22 x=%2250%22 text-anchor=%22middle%22 dominant-baseline=%22central%22 font-size=%2220%22>?</text></svg>" }} />
                    <button type="button" onClick={() => setFormData((p: any) => ({ ...p, media: p.media.filter((_: any, idx: number) => idx !== i) }))} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Add-Ons</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input type="text" value={newAddOn.name} onChange={(e) => setNewAddOn((p) => ({ ...p, name: e.target.value }))} placeholder="Name (e.g. DJ)" className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm" />
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--color-ink-muted)]">₦</span>
                <input type="number" min="0" step="0.01" value={newAddOn.priceInKobo > 0 ? newAddOn.priceInKobo / 100 : ""} onChange={(e) => setNewAddOn((p) => ({ ...p, priceInKobo: (parseInt(e.target.value) || 0) * 100 }))} onFocus={(e) => e.target.select()} placeholder="Price" className="rounded-xl border border-[var(--color-border)] py-2 pl-8 pr-3 text-sm w-full" />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex min-h-[44px] items-center gap-1 text-sm"><input type="checkbox" checked={newAddOn.isRequired} onChange={(e) => setNewAddOn((p) => ({ ...p, isRequired: e.target.checked }))} className="rounded border" />Required</label>
                <button type="button" onClick={() => { if (newAddOn.name.trim()) { setFormData((p: any) => ({ ...p, addOns: [...p.addOns, { ...newAddOn, id: crypto.randomUUID?.() || Math.random().toString() }] })); setNewAddOn({ name: "", priceInKobo: 0, isRequired: false }); } }} className="min-h-[44px] rounded-xl bg-[var(--color-primary)] px-3 py-2.5 text-white text-sm font-semibold">+</button>
              </div>
            </div>
            {formData.addOns.length > 0 && (
              <div className="space-y-1">
                {formData.addOns.map((addon: any, i: number) => (
                  <div key={addon.id} className="flex items-center justify-between rounded-xl bg-[var(--color-surface-alt)] px-3 py-2 text-sm">
                    <span>{addon.name} {addon.isRequired && <span className="text-[var(--color-ink-muted)]">(required)</span>}</span>
                    <div className="flex items-center gap-3"><span>₦{(addon.priceInKobo / 100).toLocaleString()}</span><button type="button" onClick={() => setFormData((p: any) => ({ ...p, addOns: p.addOns.filter((_: any, idx: number) => idx !== i) }))} className="text-[#B91C1C] text-xs">Remove</button></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
            <h3 className="font-semibold text-[var(--color-ink)]">Policies</h3>
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)] block mb-2">Cancellation Policy</label>
              <select value={formData.operationalRules.cancellationPolicy} onChange={(e) => handleInputChange("operationalRules.cancellationPolicy", e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm">
                <option value="flexible">Flexible (90% refund)</option>
                <option value="moderate">Moderate (50% refund)</option>
                <option value="strict">Strict (20% refund)</option>
              </select>
            </div>
            {vertical === "venue" && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={formData.operationalRules.isByobAllowed} onChange={(e) => handleInputChange("operationalRules.isByobAllowed", e.target.checked)} className="rounded border border-[var(--color-border)]" />
                <span className="text-[var(--color-ink)]">Allow BYOB (Bring Your Own Bottle)</span>
              </label>
            )}
          </div>

          <button type="submit" disabled={submitting} className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:opacity-50">
            {submitting && <Loader2 size={18} className="animate-spin" />}
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>
          </form>
        </div>
      </main>
    </DashboardLayout>
  );
}
