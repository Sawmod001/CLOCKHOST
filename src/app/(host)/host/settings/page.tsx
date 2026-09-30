"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

export default function HostSettingsPage() {
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", bio: "" });

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        const user = data.data || data;
        setProfile(user);
        setForm({
          name: user.name || "",
          phone: user.phone || "",
          bio: user.profile?.bio || "",
        });
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, phone: form.phone, profile: { bio: form.bio } }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "settings" }}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Settings</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Manage your account</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6 space-y-4">
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)]">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)]">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[var(--color-ink)]">Bio</label>
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={3}
                className="mt-1 w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {saved && <p className="text-sm text-green-600">Saved successfully</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
            >
              <Save size={16} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
          <h2 className="font-semibold text-[var(--color-ink)] mb-2">Email</h2>
          <p className="break-all text-sm text-[var(--color-ink-muted)]">{profile?.email || "–"}</p>
          <p className="mt-1 text-xs text-[var(--color-ink-muted)]">Contact support to change your email</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
