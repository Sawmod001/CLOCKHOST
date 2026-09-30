"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Clock, Loader2, FileText, Eye } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import AdminSidebar from "@/components/sidebar/AdminSidebar";

const STATUS_TABS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const TYPE_LABELS = {
  identity: "Identity",
  business: "Business",
  property_authority: "Property Authority",
};

export default function AdminVerificationsPage() {
  const [verifications, setVerifications] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [viewingDocs, setViewingDocs] = useState<Record<string, any> | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchVerifications();
  }, [activeTab]);

  async function fetchVerifications() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/verifications?status=${activeTab}`);
      const data = await res.json();
      setVerifications(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch verifications:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/verifications/${id}/approve`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      setVerifications((prev) => prev.filter((v) => v.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRejectSubmit(id: string) {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      alert("Rejection reason must be at least 5 characters");
      return;
    }
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/verifications/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to reject");
      setVerifications((prev) => prev.filter((v) => v.id !== id));
      setTotal((prev) => prev - 1);
      setRejectingId(null);
      setRejectReason("");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <DashboardLayout sidebar={AdminSidebar} sidebarProps={{ activePage: "verifications" }}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-ink)]">Provider Verifications</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">Review identity, business, and property authority documents</p>
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-[var(--color-border)] pb-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors sm:py-2 ${
                activeTab === tab.key
                  ? "bg-[var(--color-primary)] text-white"
                  : "text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-alt)]"
              }`}
            >
              {tab.label}
              {tab.key === "pending" && total > 0 && activeTab === tab.key && (
                <span className="ml-2 rounded-full bg-white/20 px-1.5 text-xs">{total}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
            ))}
          </div>
        ) : verifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
            <p className="text-sm font-semibold text-[var(--color-ink)]">No {activeTab} verifications</p>
            <p className="text-xs text-[var(--color-ink-muted)]">
              {activeTab === "pending" ? "All caught up!" : `No verifications with "${activeTab}" status`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {verifications.map((v) => {
              const provider = v.provider_profiles;
              const user = provider?.user;

              return (
                <div key={v.id} className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="break-words font-semibold text-[var(--color-ink)]">
                          {provider?.business_name || provider?.display_name || "Unknown Provider"}
                        </h3>
                        <span className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-0.5 text-xs text-[var(--color-ink-muted)]">
                          {TYPE_LABELS[v.verification_type as keyof typeof TYPE_LABELS] || v.verification_type}
                        </span>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          v.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          v.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {v.status}
                        </span>
                      </div>
                      {user && (
                        <p className="break-all text-sm text-[var(--color-ink-muted)]">
                          {user.name || user.email}
                        </p>
                      )}
                      {provider && (
                        <p className="text-xs text-[var(--color-ink-muted)]">
                          {provider.provider_type === "venue_host" ? "Venue Host" : "Housing Agent"}
                        </p>
                      )}
                      <p className="text-xs text-[var(--color-ink-muted)]">
                        Submitted {new Date(v.created_at).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos",  day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {/* Documents */}
                  {v.documents?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-[var(--color-ink)]">Documents ({v.documents.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {v.documents.map((doc: any, i: number) => (
                          <a
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm text-[var(--color-primary)] hover:border-[var(--color-primary)]"
                          >
                            <FileText size={14} />
                            {doc.name || `Document ${i + 1}`}
                            <Eye size={12} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rejection note */}
                  {v.review_note && (
                    <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                      <p className="font-semibold">Rejection reason:</p>
                      <p>{v.review_note}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {activeTab === "pending" && (
                    <div className="border-t border-[var(--color-border)] pt-4">
                      {rejectingId === v.id ? (
                        <div className="space-y-3">
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Explain why this verification is being rejected..."
                            rows={3}
                            className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2.5 text-base sm:text-sm"
                          />
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              onClick={() => handleRejectSubmit(v.id)}
                              disabled={actionLoading === v.id}
                              className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[#B91C1C] px-4 py-2.5 text-white font-semibold disabled:opacity-50"
                            >
                              {actionLoading === v.id ? "Submitting..." : "Confirm Rejection"}
                            </button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectReason(""); }}
                              className="btn-outline flex min-h-[44px] flex-1 items-center justify-center px-4 py-2.5"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            onClick={() => handleApprove(v.id)}
                            disabled={actionLoading === v.id}
                            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#15803D] px-4 py-2.5 text-white font-semibold disabled:opacity-50 sm:flex-1"
                          >
                            {actionLoading === v.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectingId(v.id)}
                            disabled={actionLoading === v.id}
                            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#B91C1C] px-4 py-2.5 text-white font-semibold disabled:opacity-50 sm:flex-1"
                          >
                            <XCircle size={16} />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
