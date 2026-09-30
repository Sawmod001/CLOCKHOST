"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";

const GENDER_OPTIONS = [
  { value: "", label: "Prefer not to say" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

const VENUE_BUSINESS_TYPES = [
  { value: "", label: "Select your venue type" },
  { value: "lounge", label: "Lounge" },
  { value: "bar", label: "Bar" },
  { value: "club", label: "Club" },
  { value: "leisure_entertainment", label: "Leisure / Entertainment Venue" },
  { value: "other_venue", label: "Other Approved Venue Type" },
];

const HOUSING_BUSINESS_TYPES = [
  { value: "", label: "Select your role" },
  { value: "housing_agent", label: "Housing Agent" },
  { value: "property_owner", label: "Property Owner" },
];

const REFERRAL_OPTIONS = [
  { value: "", label: "Select (optional)" },
  { value: "social_media", label: "Social media" },
  { value: "friend", label: "Friend or family" },
  { value: "search", label: "Search engine" },
  { value: "advert", label: "Advertisement" },
  { value: "event", label: "Event or venue visit" },
  { value: "other", label: "Other" },
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("guest");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [gender, setGender] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [operatingHours, setOperatingHours] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [status, setStatus] = useState("Tell us a bit more about yourself.");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/profile-status")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/sign-in");
          return;
        }
        if (data.completed) {
          router.replace(data.redirectTo || "/dashboard");
          return;
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [router]);

  const isProvider = role === "venue_host" || role === "shortlet_host";
  const businessTypes = role === "venue_host" ? VENUE_BUSINESS_TYPES : HOUSING_BUSINESS_TYPES;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!phone.trim()) {
      setStatus("Phone number is required.");
      return;
    }

    if (isProvider && !termsAccepted) {
      setStatus("You must accept ClockHost's terms and conditions.");
      return;
    }

    setSaving(true);
    setStatus("Saving...");

    try {
      const body: Record<string, any> = {
        role,
        phone: phone.trim(),
        location: location.trim(),
        gender: gender || null,
        referralSource: referralSource || null,
      };

      if (isProvider) {
        body.businessName = businessName.trim();
        body.businessType = businessType;
        body.operatingHours = operatingHours.trim() || null;
        body.termsAccepted = true;
      }

      const response = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || "Failed to save profile.");
      } else {
        setStatus("Profile saved! Redirecting...");
        router.push(data.data?.redirectTo || "/dashboard");
      }
    } catch {
      setStatus("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-alt)] px-4">
        <div className="text-[var(--color-ink-muted)]">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-[var(--color-primary-subtle)] via-white to-white px-4 py-8">
      <div className="m-auto w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <Logo size="lg" href="/" />
        </div>
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 shadow-lg shadow-black/[0.03]">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold" style={{ color: "var(--color-ink)" }}>Complete your profile</h1>
            <p className="text-sm" style={{ color: "var(--color-ink-muted)" }}>
              {isProvider
                ? "Set up your provider profile and start listing your spaces."
                : "Just a few more details to help providers know you better."}
            </p>
          </div>
        </div>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className={`min-h-[44px] flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                role === "guest"
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-ink)]"
              }`}
              onClick={() => setRole("guest")}
            >
              Guest
            </button>
            <button
              type="button"
              className={`min-h-[44px] flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                role === "venue_host"
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-ink)]"
              }`}
              onClick={() => setRole("venue_host")}
            >
              Venue Host
            </button>
            <button
              type="button"
              className={`min-h-[44px] flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                role === "shortlet_host"
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-ink)]"
              }`}
              onClick={() => setRole("shortlet_host")}
            >
              Shortlet Host
            </button>
          </div>

          <div className="h-px bg-[var(--color-border)]" />

          {isProvider && (
            <>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Business name <span className="text-[var(--color-danger)]">*</span>
                <input
                  className="rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. The Grand Lounge"
                  required
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Business type <span className="text-[var(--color-danger)]">*</span>
                <select
                  className="rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  required
                >
                  {businessTypes.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium">
                Operating hours
                <input
                  className="rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none"
                  type="text"
                  value={operatingHours}
                  onChange={(e) => setOperatingHours(e.target.value)}
                  placeholder="e.g. Mon-Fri 9am-10pm, Sat-Sun 10am-12am"
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-2 text-sm font-medium">
            Phone number <span className="text-[var(--color-danger)]">*</span>
            <input
              className="rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08012345678"
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Location
            <input
              className="rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Lagos, Nigeria"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Gender
            <select
              className="rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            How did you hear about us?
            <select
              className="rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none"
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
            >
              {REFERRAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {isProvider && (
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary)]"
              />
              <span className="text-[var(--color-ink-muted)]">
                I have read and agree to ClockHost&apos;s{" "}
                <span className="font-semibold text-[var(--color-ink)]">Terms and Conditions</span>{" "}
                and{" "}
                <span className="font-semibold text-[var(--color-ink)]">Provider Guidelines</span>. I
                understand that my listings will be reviewed before going live.
              </span>
            </label>
          )}

          <button
            className="mt-2 min-h-[44px] rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Complete profile"}
          </button>
        </form>

        <p className="mt-4 text-sm" style={{ color: "var(--color-ink-muted)" }}>{status}</p>
      </div>
    </main>
  );
}
