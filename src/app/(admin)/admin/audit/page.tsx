"use client";

import { useState, useEffect } from "react";
import { Search, Clock, AlertTriangle, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import AdminSidebar from "@/components/sidebar/AdminSidebar";

const RISK_COLORS = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

const ACTION_LABELS = {
  "booking.created": "Booking Created",
  "booking.approved": "Booking Approved",
  "booking.awaiting_payment": "Booking Approved",
  "booking.rejected": "Booking Rejected",
  "booking.cancelled_by_guest": "Cancelled by Guest",
  "booking.cancelled_by_host": "Cancelled by Host",
  "booking.cancelled_system": "System Cancellation",
  "booking.expired": "Booking Expired",
  "booking.completed": "Booking Completed",
  "booking.no_show": "No Show",
  "listing.created": "Listing Created",
  "listing.submitted": "Listing Submitted",
  "listing.approved": "Listing Approved",
  "listing.rejected": "Listing Rejected",
  "listing.suspended": "Listing Suspended",
  "listing.reactivated": "Listing Reactivated",
  "payment.initiated": "Payment Initiated",
  "payment.confirmed": "Payment Confirmed",
  "payment.failed": "Payment Failed",
  "user.registered": "User Registered",
  "user.role_changed": "Role Changed",
  "verification.submitted": "Verification Submitted",
  "verification.approved": "Verification Approved",
  "verification.rejected": "Verification Rejected",
};

export default function AdminAuditPage() {
  const [section, setSection] = useState("report");
  const [report, setReport] = useState<Record<string, any> | null>(null);
  const [trail, setTrail] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Trail filter state
  const [resourceType, setResourceType] = useState("booking");
  const [resourceId, setResourceId] = useState("");
  const [days, setDays] = useState(30);

  useEffect(() => {
    if (section === "report") fetchReport();
  }, [section, days]);

  async function fetchReport() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audit?section=report&days=${days}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch report");
      setReport(data.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTrail() {
    if (!resourceType || !resourceId) {
      setError("Resource type and ID are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/audit?section=trail&resource_type=${resourceType}&resource_id=${resourceId}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch trail");
      setTrail(data.data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout sidebar={AdminSidebar} sidebarProps={{ activePage: "audit" }}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Audit Trail</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Platform activity logs and compliance reports</p>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 overflow-x-auto border-b border-[var(--color-border)] pb-2">
          <button
            onClick={() => setSection("report")}
            className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:py-2 ${
              section === "report"
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-alt)]"
            }`}
          >
            Compliance Report
          </button>
          <button
            onClick={() => setSection("trail")}
            className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:py-2 ${
              section === "trail"
                ? "bg-[var(--color-primary)] text-white"
                : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-alt)]"
            }`}
          >
            Resource Trail
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Compliance Report */}
        {section === "report" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm font-semibold text-[var(--color-ink)]">Period:</label>
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-colors ${
                    days === d
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-alt)]"
                  }`}
                >
                  {d} days
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white p-12">
                <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-ink-muted)]">Loading report...</span>
              </div>
            ) : report ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                    <p className="text-sm text-[var(--color-ink-muted)]">Total Events</p>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">{report.totalEvents || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                    <p className="text-sm text-[var(--color-ink-muted)]">Unique Actors</p>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">{report.uniqueActors || 0}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-orange-500" />
                      <p className="text-sm text-[var(--color-ink-muted)]">High Risk Events</p>
                    </div>
                    <p className="text-2xl font-bold text-[var(--color-ink)]">{report.highRiskCount || 0}</p>
                  </div>
                </div>

                {/* Action breakdown */}
                {report.actionBreakdown?.length > 0 && (
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
                    <h3 className="mb-4 font-semibold text-[var(--color-ink)]">Events by Type</h3>
                    <div className="space-y-2">
                      {report.actionBreakdown.map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between rounded-xl bg-[var(--color-surface-alt)] px-4 py-2">
                          <span className="text-sm text-[var(--color-ink)]">
                            {ACTION_LABELS[item.action as keyof typeof ACTION_LABELS] || item.action}
                          </span>
                          <span className="text-sm font-semibold text-[var(--color-ink)]">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk breakdown */}
                {report.riskBreakdown?.length > 0 && (
                  <div className="rounded-2xl border border-[var(--color-border)] bg-white p-6">
                    <h3 className="mb-4 font-semibold text-[var(--color-ink)]">Risk Distribution</h3>
                    <div className="flex flex-wrap gap-3">
                      {report.riskBreakdown.map((item: any, i: number) => (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${RISK_COLORS[item.risk_level as keyof typeof RISK_COLORS] || "bg-gray-50 text-gray-700 border-gray-200"}`}
                        >
                          {item.risk_level}: {item.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Resource Trail */}
        {section === "trail" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-4">
              <div className="flex-1 min-w-[140px]">
                <label className="mb-1 block text-xs font-semibold text-[var(--color-ink-muted)]">Resource Type</label>
                <select
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm"
                >
                  <option value="booking">Booking</option>
                  <option value="listing">Listing</option>
                  <option value="payment">Payment</option>
                  <option value="user">User</option>
                  <option value="verification">Verification</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="mb-1 block text-xs font-semibold text-[var(--color-ink-muted)]">Resource ID</label>
                <input
                  type="text"
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  placeholder="Enter UUID"
                  className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm"
                />
              </div>
              <button
                onClick={fetchTrail}
                disabled={loading || !resourceId}
                className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-white p-12">
                <Loader2 size={20} className="animate-spin text-[var(--color-primary)]" />
                <span className="text-sm text-[var(--color-ink-muted)]">Searching...</span>
              </div>
            ) : trail.length > 0 ? (
              <div className="space-y-2">
                {trail.map((event, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-white px-5 py-4">
                    <Clock size={16} className="mt-0.5 text-[var(--color-ink-muted)] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--color-ink)]">
                          {ACTION_LABELS[event.action as keyof typeof ACTION_LABELS] || event.action}
                        </span>
                        {event.risk_level && (
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${RISK_COLORS[event.risk_level as keyof typeof RISK_COLORS] || ""}`}>
                            {event.risk_level}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">
                        Actor: {event.actor_id?.slice(0, 8)}... | {new Date(event.created_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <p className="mt-1 break-all text-xs text-[var(--color-ink-muted)]">
                          {JSON.stringify(event.metadata)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : resourceId ? (
              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
                <p className="text-sm font-semibold text-[var(--color-ink)]">No audit events found</p>
                <p className="text-xs text-[var(--color-ink-muted)]">No events match this resource</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
                <p className="text-sm font-semibold text-[var(--color-ink)]">Enter a resource ID to search</p>
                <p className="text-xs text-[var(--color-ink-muted)]">View the audit trail for any booking, listing, or payment</p>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
