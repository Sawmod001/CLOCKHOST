"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, Bell, Mail, Smartphone, Clock } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import GuestSidebar from "@/components/sidebar/GuestSidebar";

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchPrefs(); }, []);

  async function fetchPrefs() {
    try {
      const res = await fetch("/api/notifications/preferences");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load preferences");
      setPrefs(data.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailEnabled: prefs?.email_enabled,
          pushEnabled: prefs?.push_enabled,
          smsEnabled: prefs?.sms_enabled,
          bookingNotifications: prefs?.booking_notifications,
          paymentNotifications: prefs?.payment_notifications,
          viewingNotifications: prefs?.viewing_notifications,
          marketingNotifications: prefs?.marketing_notifications,
          quietHoursStart: prefs?.quiet_hours_start,
          quietHoursEnd: prefs?.quiet_hours_end,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: string) {
    setPrefs((prev: any) => ({ ...prev, [key]: !prev?.[key] }));
  }

  if (loading) {
    return (
      <DashboardLayout sidebar={GuestSidebar} sidebarProps={{ activePage: "notifications" }}>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebar={GuestSidebar} sidebarProps={{ activePage: "notifications" }}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Notification Preferences</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Choose how and when you receive notifications</p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        )}

        {saved && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            Preferences saved successfully.
          </div>
        )}

        {/* Channels */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 space-y-4">
          <h2 className="font-semibold text-[var(--color-ink)]">Notification Channels</h2>
          <div className="space-y-3">
            <ToggleRow
              icon={<Bell size={18} />}
              label="In-App Notifications"
              sublabel="Notifications inside the app"
              checked={prefs?.push_enabled}
              onChange={() => toggle("push_enabled")}
            />
            <ToggleRow
              icon={<Mail size={18} />}
              label="Email Notifications"
              sublabel="Receive notifications via email"
              checked={prefs?.email_enabled}
              onChange={() => toggle("email_enabled")}
            />
            <ToggleRow
              icon={<Smartphone size={18} />}
              label="SMS Notifications"
              sublabel="Receive notifications via SMS"
              checked={prefs?.sms_enabled}
              onChange={() => toggle("sms_enabled")}
            />
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 space-y-4">
          <h2 className="font-semibold text-[var(--color-ink)]">Notification Categories</h2>
          <div className="space-y-3">
            <ToggleRow
              label="Booking Updates"
              sublabel="Approval, rejection, cancellation, reminders"
              checked={prefs?.booking_notifications}
              onChange={() => toggle("booking_notifications")}
            />
            <ToggleRow
              label="Payment Updates"
              sublabel="Payment confirmation, refunds, receipts"
              checked={prefs?.payment_notifications}
              onChange={() => toggle("payment_notifications")}
            />
            <ToggleRow
              label="Viewing Updates"
              sublabel="Viewing confirmation, reminders, changes"
              checked={prefs?.viewing_notifications}
              onChange={() => toggle("viewing_notifications")}
            />
            <ToggleRow
              label="Marketing"
              sublabel="Promotions, new features, tips"
              checked={prefs?.marketing_notifications}
              onChange={() => toggle("marketing_notifications")}
            />
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-[var(--color-ink-muted)]" />
            <h2 className="font-semibold text-[var(--color-ink)]">Quiet Hours</h2>
          </div>
          <p className="text-sm text-[var(--color-ink-muted)]">
            No notifications during these hours (except critical alerts).
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-ink-muted)]">From</label>
              <input
                type="time"
                value={prefs?.quiet_hours_start || "22:00"}
                onChange={(e) => setPrefs((prev: any) => ({ ...prev, quiet_hours_start: e.target.value }))}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </div>
            <span className="text-[var(--color-ink-muted)]">to</span>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[var(--color-ink-muted)]">Until</label>
              <input
                type="time"
                value={prefs?.quiet_hours_end || "07:00"}
                onChange={(e) => setPrefs((prev: any) => ({ ...prev, quiet_hours_end: e.target.value }))}
                className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex flex-col sm:flex-row sm:justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ToggleRow({ icon, label, sublabel, checked, onChange }: { icon?: React.ReactNode; label: string; sublabel?: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-alt)] px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className="shrink-0 text-[var(--color-ink-muted)]">{icon}</span>}
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-[var(--color-ink)]">{label}</p>
          {sublabel && <p className="break-words text-xs text-[var(--color-ink-muted)]">{sublabel}</p>}
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
          checked ? "bg-[var(--color-primary)]" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5 ${
            checked ? "translate-x-5.5 ml-0.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
