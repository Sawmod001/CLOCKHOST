"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

export default function HostNotificationsPage() {
  const [notifications, setNotifications] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.data || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "notifications" }}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Notifications</h1>
            <p className="text-sm text-[var(--color-ink-muted)]">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </p>
          </div>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex min-h-[44px] items-center justify-center gap-1 rounded-xl bg-[var(--color-primary)] px-3 py-2.5 text-xs font-semibold text-white sm:w-auto">
              <Check size={14} /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
            <Bell size={32} className="mx-auto mb-3 text-[var(--color-ink-muted)]" />
            <p className="text-sm font-semibold text-[var(--color-ink)]">No notifications</p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">You&apos;ll see booking updates and alerts here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && markAsRead(n.id)}
                className={`rounded-2xl border p-4 cursor-pointer transition-colors ${
                  n.read
                    ? "border-[var(--color-border)] bg-white"
                    : "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold text-[var(--color-ink)]">{n.title || "Notification"}</p>
                    <p className="mt-1 break-words text-sm text-[var(--color-ink-muted)]">{n.message || n.body || ""}</p>
                  </div>
                  {!n.read && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)] mt-2" />
                  )}
                </div>
                {n.created_at && (
                  <p className="mt-2 text-xs text-[var(--color-ink-muted)]">
                    {new Date(n.created_at).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos",  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
