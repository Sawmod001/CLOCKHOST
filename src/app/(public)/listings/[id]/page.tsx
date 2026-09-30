"use client";

import { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Users, Clock, Check, X, LogIn, Star } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import BackButton from "@/components/BackButton";

const subVerticalLabels = {
  birthday: "Birthday Venue",
  exclusive_space: "Exclusive Space",
  karaoke: "Karaoke Bar",
  group_night: "Group Night",
};

const subVerticalSectionLabels = {
  birthday: "Birthday Features",
  exclusiveSpace: "Exclusive Space Features",
  karaoke: "Karaoke Features",
  groupNight: "Group Night Features",
};

const featureLabels = {
  cakeAllowed: "Cake Allowed",
  decorationOptions: "Decoration Options",
  partyFavorsProvided: "Party Favors",
  kidFriendly: "Kid Friendly",
  privacyLevel: "Privacy Level",
  cateringOptions: "Catering Options",
  inHouseCatering: "In-House Catering",
  maxGuests: "Max Guests",
  microphoneCount: "Microphones",
  songGenres: "Song Genres",
  privateRoom: "Private Room",
  hasStage: "Stage",
  soundSystem: "Sound System",
  gameTypes: "Game Types",
  hasPoolTable: "Pool Table",
  hasVideoGames: "Video Games",
  hasBoardGames: "Board Games",
  maxGroupSize: "Max Group Size",
  hasBar: "Bar",
  propertyType: "Property Type",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  hasWifi: "WiFi",
  hasParking: "Parking",
  hasAC: "Air Conditioning",
  furnished: "Furnished",
  petFriendly: "Pet Friendly",
  cuisineType: "Cuisine",
  deliveryAvailable: "Delivery Available",
  pickupAvailable: "Pickup Available",
  prepTimeMinutes: "Prep Time",
  minOrderKobo: "Min. Order",
};

function displayFeatureValue(value: unknown, key: string) {
  if (typeof value === "boolean") {
    return value
      ? <span className="flex items-center gap-1 text-[#15803D]"><Check size={14} /> Yes</span>
      : <span className="flex items-center gap-1 text-[#B91C1C]"><X size={14} /> No</span>;
  }
  if (Array.isArray(value)) {
    return value.map((v) => String(v).replace(/_/g, " ")).join(", ");
  }
  if (typeof value === "number") {
    if (key === "prepTimeMinutes") return `${value} min`;
    if (key === "minOrderKobo") return `₦${(value / 100).toLocaleString()}`;
    return value.toLocaleString();
  }
  if (typeof value === "string") {
    return value.replace(/_/g, " ");
  }
  return String(value);
}

function getFeatureEntries(features: Record<string, any> | null | undefined) {
  if (!features) return [];
  return Object.entries(features)
    .filter(([, value]) => typeof value === "object" && value !== null && !Array.isArray(value))
    .map(([key, value]) => ({ categoryKey: key, entries: Object.entries(value) }));
}

function CalendarGrid({ selectedDate, onSelect, getDateInfo }: { selectedDate: Date; onSelect: (d: Date) => void; getDateInfo: (date: Date) => { type: string; available: number; capacity: number } | null }) {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weeks = [];
  let day = 1;
  for (let w = 0; w < 6 && day <= daysInMonth; w++) {
    const week = [];
    for (let d = 0; d < 7 && day <= daysInMonth; d++) {
      if (w === 0 && d < firstDay) {
        week.push(null);
      } else {
        const date = new Date(year, month, day);
        week.push({ day, date, info: getDateInfo?.(date) });
        day++;
      }
    }
    weeks.push(week);
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-px text-center text-xs font-semibold text-[var(--color-ink-muted)] mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 gap-px">
          {week.map((cell, di) => {
            if (!cell) return <div key={di} />;
            const isToday = cell.date.getTime() === today.getTime();
            const isSelected = cell.date.getTime() === selectedDate.getTime();
            const isPast = cell.date < today;
            let dot = null;
            if (cell.info) {
              if (cell.info.type === "capacity") {
                const pct = cell.info.available / cell.info.capacity;
                dot = <span className={`mt-0.5 block h-1 w-1 rounded-full mx-auto ${pct > 0.5 ? "bg-[#15803D]" : pct > 0 ? "bg-[#B45309]" : "bg-[#B91C1C]"}`} />;
              } else {
                dot = <span className={`mt-0.5 block h-1 w-1 rounded-full mx-auto ${(cell.info as any).status === "open" ? "bg-[#15803D]" : "bg-[#6B7280]"}`} />;
              }
            }
            return (
              <button key={di} type="button" onClick={() => !isPast && onSelect(cell.date)} disabled={isPast}
                className={`rounded-lg py-1 text-sm transition-colors ${isSelected ? "bg-[var(--color-primary)] text-white" : isPast ? "text-[var(--color-ink-muted)] opacity-40 cursor-not-allowed" : "hover:bg-[var(--color-surface-alt)] text-[var(--color-ink)]"} ${isToday && !isSelected ? "ring-1 ring-[var(--color-primary)]" : ""}`}
              >
                {cell.day}
                {dot}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function MediaCarousel({ media }: { media: string[] | null | undefined }) {
  const [idx, setIdx] = useState(0);
  const items = media?.length ? media : null;
  if (!items) {
    return <div className="flex h-64 items-center justify-center rounded-xl bg-[var(--color-surface-alt)] text-[var(--color-ink-muted)] text-sm">No photos</div>;
  }
  return (
    <div className="relative overflow-hidden rounded-xl bg-[var(--color-surface-alt)]">
      <img src={items[idx]} alt="" className="h-64 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
      {items.length > 1 && (
        <>
          <button aria-label="Previous photo" onClick={() => setIdx((i) => (i - 1 + items.length) % items.length)} className="absolute left-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-1 text-white hover:bg-black/60"><ChevronLeft size={18} /></button>
          <button aria-label="Next photo" onClick={() => setIdx((i) => (i + 1) % items.length)} className="absolute right-2 top-1/2 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-black/40 p-1 text-white hover:bg-black/60"><ChevronRight size={18} /></button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {items.map((_, i) => (
              <button key={i} aria-label={`Go to photo ${i + 1}`} onClick={() => setIdx(i)} className="flex min-h-[24px] min-w-[24px] items-center justify-center p-1"><span className={`block h-1.5 w-1.5 rounded-full ${i === idx ? "bg-white" : "bg-white/40"}`} /></button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [listing, setListing] = useState<Record<string, any> | null>(null);
  const [slots, setSlots] = useState<Record<string, any>[]>([]);
  const [availability, setAvailability] = useState<Record<string, any>[]>([]);
  const [monthSlots, setMonthSlots] = useState<Record<string, any>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reviews, setReviews] = useState<Record<string, any>[]>([]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [calMonth, setCalMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const dateStr = useMemo(() => selectedDate.toISOString().split("T")[0], [selectedDate]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/profile-status")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.authenticated) setIsAuthenticated(true);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/listings/${id}`);
        if (!res.ok) throw new Error("Listing not found");
        const data = await res.json();
        setListing(data);
        setError(null);

        if (data.bookingType === "capacity") {
          const firstOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).toISOString().split("T")[0];
          const [slotsRes, monthRes] = await Promise.all([
            fetch(`/api/listings/${id}/slots?date=${dateStr}`),
            fetch(`/api/listings/${id}/slots?date=${firstOfMonth}&monthView=true`),
          ]);
          if (slotsRes.ok) {
            const d = await slotsRes.json();
            setSlots(d.data || []);
          }
          if (monthRes.ok) {
            const d = await monthRes.json();
            setMonthSlots(d.data || []);
          }
        } else {
          const availRes = await fetch(`/api/listings/${id}/availability?date=${dateStr}`);
          if (availRes.ok) {
            const d = await availRes.json();
            setAvailability(d.data || []);
          }
        }
        const reviewsRes = await fetch(`/api/listings/${id}/reviews`);
        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          setReviews(reviewsData.data || []);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, dateStr, calMonth]);

  const getDateInfo = (date: Date) => {
    if (!monthSlots) return null;
    const ds = date.toISOString().split("T")[0];
    const daySlots = monthSlots.filter((s) => new Date(s.eventStart as string).toISOString().split("T")[0] === ds);
    if (daySlots.length === 0) return null;
    const totalCap = daySlots.reduce((s, sl) => s + (sl.capacity || 0), 0);
    const totalBooked = daySlots.reduce((s, sl) => s + (sl.booked || 0), 0);
    return { type: "capacity", available: totalCap - totalBooked, capacity: totalCap };
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="h-64 rounded-2xl bg-white animate-pulse border" />
          <div className="h-8 bg-white rounded-2xl animate-pulse w-2/3" />
          <div className="h-32 bg-white rounded-2xl animate-pulse" />
        </div>
      </main>
    );
  }

  if (error || !listing) {
    return (
      <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
        <div className="mx-auto max-w-2xl">
          <BackButton href="/listings" label="Back to listings" />
          <div className="rounded-2xl border bg-white p-8 text-center space-y-4">
            {!isAuthenticated ? (
              <>
                <p className="text-sm text-[var(--color-ink-muted)]">Sign in to book this space</p>
                <Link href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-[var(--color-primary)]">
                  <LogIn size={18} /> Sign in to Book
                </Link>
              </>
            ) : (
              <p className="text-sm text-[var(--color-ink-muted)]">Error: {error || "Not found"}</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  const isCapacity = listing.bookingType === "capacity";

  return (
    <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <PublicHeader backHref="/listings" />

          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 space-y-6 sm:p-6">
          <MediaCarousel media={listing.media} />

            <div className="space-y-2">
              <h1 className="break-words text-2xl font-semibold">{listing.title}</h1>
              <p className="break-words text-sm text-[var(--color-ink-muted)]">{listing.location?.address}, {listing.location?.cityArea}, {listing.location?.state}</p>
              <div className="flex flex-wrap gap-2">
                {(Array.isArray(listing.subVertical) ? listing.subVertical : (listing.subVertical ? [listing.subVertical] : [])).map((sv: any) => (
                  <span key={sv} className="inline-block rounded-full bg-[var(--color-primary)]/10 px-3 py-0.5 text-xs font-medium text-[var(--color-primary)]">{(subVerticalLabels as Record<string, string>)[sv] || String(sv).replace(/_/g, " ").replace(/\b\w/g, (c: any) => c.toUpperCase())}</span>
                ))}
                {(!listing.subVertical || listing.subVertical.length === 0) && listing.vertical === "housing" && <span className="inline-block rounded-full bg-[var(--color-primary)]/10 px-3 py-0.5 text-xs font-medium text-[var(--color-primary)]">Housing</span>}

              </div>
            </div>

          {listing.vertical === "housing" ? (
            <div className="flex flex-wrap items-baseline gap-1">
              <p className="text-3xl font-semibold">₦{((listing.housingDetails?.nightlyRateKobo ?? 0) / 100).toLocaleString()}</p>
              <p className="text-sm text-[var(--color-ink-muted)]">per night</p>
              {listing.housingDetails?.weeklyRateKobo > 0 && (
                <span className="ml-2 text-xs text-[var(--color-ink-muted)]">
                  (₦{(listing.housingDetails.weeklyRateKobo / 100).toLocaleString()}/week)
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-baseline gap-1">
              <p className="text-3xl font-semibold">₦{((listing.pricing?.baseRatePerHour ?? 0) / 100).toLocaleString()}</p>
              <p className="text-sm text-[var(--color-ink-muted)]">per hour</p>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-2">About</p>
            <p className="text-sm text-[var(--color-ink-muted)] leading-6">{listing.description}</p>
          </div>

          {listing.structuredDescription && (
            <div className="border-t pt-4 space-y-4">
              {listing.structuredDescription.highlights?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Highlights</p>
                  <ul className="space-y-1">
                    {listing.structuredDescription.highlights.map((h: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-ink-muted)]">
                        <Star size={14} className="mt-0.5 shrink-0 text-[var(--color-gold)]" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {listing.structuredDescription.idealFor?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">Ideal For</p>
                  <div className="flex flex-wrap gap-2">
                    {listing.structuredDescription.idealFor.map((item: any, i: number) => (
                      <span key={i} className="rounded-full bg-[var(--color-surface-alt)] px-3 py-1 text-xs font-medium">{item}</span>
                    ))}
                  </div>
                </div>
              )}
              {listing.structuredDescription.houseRules?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold mb-2">House Rules</p>
                  <ul className="space-y-1 text-sm text-[var(--color-ink-muted)]">
                    {listing.structuredDescription.houseRules.map((rule: any, i: number) => (
                      <li key={i}>• {rule}</li>
                    ))}
                  </ul>
                </div>
              )}
              {listing.structuredDescription.gettingAround && (
                <div>
                  <p className="text-sm font-semibold mb-2">Getting Around</p>
                  <p className="text-sm text-[var(--color-ink-muted)] leading-6">{listing.structuredDescription.gettingAround}</p>
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm font-semibold mb-3">Details</p>
            {listing.vertical === "housing" ? (
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Max Guests</p><p className="font-semibold">{listing.housingDetails?.maxGuests ?? listing.operationalRules?.maxCapacity ?? "—"}</p></div>
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Check-in</p><p className="font-semibold">{listing.housingDetails?.checkInTime || "2:00 PM"}</p></div>
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Check-out</p><p className="font-semibold">{listing.housingDetails?.checkOutTime || "11:00 AM"}</p></div>
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Min Stay</p><p className="font-semibold">{listing.housingDetails?.minStayNights ?? 1} night{(listing.housingDetails?.minStayNights ?? 1) > 1 ? "s" : ""}</p></div>
                {listing.housingDetails?.maxStayNights > 0 && (
                  <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Max Stay</p><p className="font-semibold">{listing.housingDetails.maxStayNights} nights</p></div>
                )}
                {listing.housingDetails?.cleaningFeeKobo > 0 && (
                  <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Cleaning Fee</p><p className="font-semibold">₦{(listing.housingDetails.cleaningFeeKobo / 100).toLocaleString()}</p></div>
                )}
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Cancellation</p><p className="font-semibold capitalize">{listing.operationalRules?.cancellationPolicy || "—"}</p></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Capacity</p><p className="font-semibold">{listing.operationalRules?.maxCapacity ?? "—"} max</p></div>
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Type</p><p className="font-semibold capitalize">{listing.bookingType || "—"}</p></div>
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Setup time</p><p className="font-semibold">{(listing.operationalRules?.setupTimeMinutes ?? listing.operationalRules?.setupBufferMinutes ?? "—")}min</p></div>
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Cleanup time</p><p className="font-semibold">{(listing.operationalRules?.cleanupTimeMinutes ?? listing.operationalRules?.teardownBufferMinutes ?? "—")}min</p></div>
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">BYOB</p><p className="font-semibold">{listing.operationalRules?.isByobAllowed ? "Allowed" : "Not allowed"}</p></div>
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3"><p className="text-xs text-[var(--color-ink-muted)]">Cancellation</p><p className="font-semibold capitalize">{listing.operationalRules?.cancellationPolicy || "—"}</p></div>
              </div>
            )}
          </div>

          {(() => {
            const sections = listing.features ? getFeatureEntries(listing.features) : [];
            if (sections.length === 0) return null;
            return sections.map((section) => (
              <div key={section.categoryKey} className="border-t pt-4">
                <p className="text-sm font-semibold mb-3">{(subVerticalSectionLabels as Record<string, string>)[section.categoryKey] || section.categoryKey.replace(/([A-Z])/g, " $1").replace(/^./, (c: any) => c.toUpperCase())}</p>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  {section.entries.map(([key, value]) => (
                    <div key={key} className="rounded-xl bg-[var(--color-surface-alt)] p-3">
                      <p className="text-xs text-[var(--color-ink-muted)]">{(featureLabels as Record<string, string>)[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (c: any) => c.toUpperCase()).replace(/_/g, " ")}</p>
                      <p className="font-semibold mt-0.5">{displayFeatureValue(value, key)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}

          {listing.vertical === "housing" && listing.housingDetails?.houseRules && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-2">House Rules</p>
              <p className="text-sm text-[var(--color-ink-muted)] leading-6 whitespace-pre-line">{listing.housingDetails.houseRules}</p>
            </div>
          )}

          {Array.isArray(listing.addOns) && listing.addOns.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-sm font-semibold mb-3">Add-ons</p>
              <div className="space-y-2">
                {listing.addOns.map((addon) => (
                  <div key={addon.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm">
                    <span className="min-w-0 break-words">{addon.name}{addon.isRequired ? <span className="text-xs text-[var(--color-ink-muted)]"> (required)</span> : ""}</span>
                    <span className="shrink-0 whitespace-nowrap font-semibold">+₦{(addon.priceInKobo / 100).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 text-sm font-semibold">Availability</p>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" aria-label="Previous month" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 hover:bg-[var(--color-surface-alt)]"><ChevronLeft size={16} /></button>
                <span className="whitespace-nowrap text-sm font-semibold">{calMonth.toLocaleString("en-NG", { timeZone: "Africa/Lagos", month: "long", year: "numeric" })}</span>
                <button type="button" aria-label="Next month" onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-1 hover:bg-[var(--color-surface-alt)]"><ChevronRight size={16} /></button>
              </div>
            </div>
            <CalendarGrid selectedDate={selectedDate} onSelect={setSelectedDate} getDateInfo={getDateInfo} />
            <p className="text-xs text-[var(--color-ink-muted)] text-center">
              {listing.vertical === "housing"
                ? "Green dot = available, Gray = blocked"
                : isCapacity
                  ? "Green dot = good availability, Orange = filling up, Red = nearly full"
                  : "Green dot = open, Gray = booked"}
            </p>
          </div>

          {listing.vertical === "housing" && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><Clock size={16} />Stay Details</p>
              <div className="grid grid-cols-1 gap-3 text-sm min-[400px]:grid-cols-2">
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
                  <p className="text-xs text-[var(--color-ink-muted)]">Nightly Rate</p>
                  <p className="font-semibold">₦{((listing.housingDetails?.nightlyRateKobo ?? 0) / 100).toLocaleString()}</p>
                </div>
                {listing.housingDetails?.cleaningFeeKobo > 0 && (
                  <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
                    <p className="text-xs text-[var(--color-ink-muted)]">Cleaning Fee</p>
                    <p className="font-semibold">₦{(listing.housingDetails.cleaningFeeKobo / 100).toLocaleString()}</p>
                  </div>
                )}
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
                  <p className="text-xs text-[var(--color-ink-muted)]">Check-in</p>
                  <p className="font-semibold">{listing.housingDetails?.checkInTime || "2:00 PM"}</p>
                </div>
                <div className="rounded-xl bg-[var(--color-surface-alt)] p-3">
                  <p className="text-xs text-[var(--color-ink-muted)]">Check-out</p>
                  <p className="font-semibold">{listing.housingDetails?.checkOutTime || "11:00 AM"}</p>
                </div>
              </div>
              <p className="text-xs text-[var(--color-ink-muted)]">Select check-in and check-out dates on the calendar to book</p>
            </div>
          )}

          {isCapacity ? (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><Clock size={16} />Slots for {selectedDate.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos",  weekday: "short", day: "numeric", month: "short" })}</p>
              {slots.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">No slots available</p>
              ) : (
                <div className="space-y-2">
                  {slots.map((slot) => (
                    <div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                      <span className="min-w-0 text-sm">{new Date(slot.eventStart as string).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })} – {new Date(slot.eventEnd).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })}</span>
                      <span className={`shrink-0 whitespace-nowrap text-xs font-semibold ${slot.available > 0 ? "text-[#15803D]" : "text-[#B91C1C]"}`}>
                        {slot.available}/{slot.capacity} {slot.available > 0 ? "available" : "full"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><Clock size={16} />Time windows for {selectedDate.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos",  weekday: "short", day: "numeric", month: "short" })}</p>
              {availability.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-muted)]">No windows available</p>
              ) : (
                <div className="space-y-2">
                  {availability.map((win) => (
                    <div key={win.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
                      <span className="min-w-0 text-sm">{new Date(win.eventStart as string).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })} – {new Date(win.eventEnd).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })}</span>
                      <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${win.status === "open" ? "text-[#15803D]" : "text-[#6B7280]"}`}>
                        {win.status === "open" ? <><Check size={12} /> Open</> : <><X size={12} /> Locked</>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isCapacity && (
            <Link href={`/group-plans/new?listingId=${encodeURIComponent(id)}`}
              className="block min-h-[44px] w-full rounded-xl border-2 border-[var(--color-primary)] px-4 py-3 text-center font-semibold text-[var(--color-primary)]">
              <Users size={16} className="mr-1 inline-block" /> Book Together (Group)
            </Link>
          )}
          {isAuthenticated ? (
            <Link href={isCapacity ? `/listings/${id}/checkout` : `/listings/${id}/exclusive-request`}
              className="block min-h-[44px] w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 text-center font-semibold text-white">
              {isCapacity ? "Book Now" : "Request to Book"}
            </Link>
          ) : (
            <Link href="/sign-up"
              className="flex min-h-[44px] items-center justify-center gap-2 w-full rounded-xl border border-[var(--color-border)] px-4 py-3 text-center font-semibold text-[var(--color-ink-muted)]">
              <LogIn size={18} /> Sign in to Book a slot
            </Link>
          )}

          {reviews.length > 0 && (
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 text-sm font-semibold">Reviews ({reviews.length})</p>
                <p className="shrink-0 text-sm text-[var(--color-ink-muted)]">
                  {Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10} avg
                </p>
              </div>
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-xl bg-[var(--color-surface-alt)] p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="min-w-0 truncate text-sm font-semibold text-[var(--color-ink)]">
                        {review.guest?.name || "Guest"}
                      </p>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={12} fill={i < review.rating ? "var(--color-primary)" : "none"}
                            className={i < review.rating ? "text-[var(--color-primary)]" : "text-[var(--color-border)]"} />
                        ))}
                      </div>
                    </div>
                    {review.reviewText && (
                      <p className="break-words text-xs text-[var(--color-ink-muted)]">{review.reviewText}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
