"use client";

import { useState, useEffect } from "react";
import { Shield, CheckCircle2, XCircle, Clock, Upload, FileText, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/sidebar/DashboardLayout";
import HostSidebar from "@/components/sidebar/HostSidebar";

const VERIFICATION_TYPES = [
  { key: "identity", label: "Identity Verification", description: "Government-issued ID (National ID, Driver's License, Passport)" },
  { key: "business", label: "Business Verification", description: "Business registration certificate or CAC document" },
  { key: "property_authority", label: "Property Authority", description: "Authorization to list this property (ownership or agency agreement)" },
];

const STATUS_CONFIG = {
  pending: { color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock, label: "Pending Review" },
  approved: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Approved" },
  rejected: { color: "bg-red-50 text-red-700 border-red-200", icon: XCircle, label: "Rejected" },
  expired: { color: "bg-gray-50 text-gray-700 border-gray-200", icon: XCircle, label: "Expired" },
};

export default function ProviderVerificationPage() {
  const [verifications, setVerifications] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, any>[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchVerifications();
  }, []);

  async function fetchVerifications() {
    try {
      const res = await fetch("/api/provider/verifications");
      const data = await res.json();
      setVerifications(data.data || []);
    } catch (err) {
      console.error("Failed to fetch verifications:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "verification");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setUploadedFiles((prev) => [...prev, { url: data.url, name: file.name }]);
    } catch (err) {
      alert("Upload failed: " + (err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmitVerification() {
    if (!selectedType || uploadedFiles.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/provider/verifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verification_type: selectedType,
          documents: uploadedFiles,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");

      setSelectedType(null);
      setUploadedFiles([]);
      await fetchVerifications();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  function getVerificationForType(type: string) {
    return verifications.find((v) => v.verification_type === type && v.status !== "rejected");
  }

  function getRejectedForType(type: string) {
    return verifications.filter((v) => v.verification_type === type && v.status === "rejected");
  }

  return (
    <DashboardLayout sidebar={HostSidebar} sidebarProps={{ activePage: "verification" }}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Provider Verification</h1>
          <p className="text-sm text-[var(--color-ink-muted)]">
            Complete verification to build trust with guests and unlock all features
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl border border-[var(--color-border)] bg-white" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {VERIFICATION_TYPES.map(({ key, label, description }) => {
              const active = getVerificationForType(key);
              const rejected = getRejectedForType(key);
              const statusInfo = active ? STATUS_CONFIG[active.status as keyof typeof STATUS_CONFIG] : null;
              const StatusIcon = statusInfo?.icon as any;
              const isPending = active?.status === "pending";
              const isApproved = active?.status === "approved";
              const canSubmit = !active || active.status === "rejected";

              return (
                <div key={key} className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Shield size={18} className="shrink-0 text-[var(--color-primary)]" />
                        <h3 className="break-words font-semibold text-[var(--color-ink)]">{label}</h3>
                        {statusInfo && (
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusInfo.color}`}>
                            <StatusIcon size={12} />
                            {statusInfo.label}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{description}</p>

                      {isApproved && active?.documents?.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {active.documents.map((doc: any, i: number) => (
                            <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline">
                              <FileText size={14} />
                              {doc.name || "Document"}
                            </a>
                          ))}
                        </div>
                      )}

                      {isPending && active?.documents?.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {active.documents.map((doc: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
                              <FileText size={14} />
                              {doc.name || "Document"}
                            </div>
                          ))}
                        </div>
                      )}

                      {rejected.length > 0 && !isPending && !isApproved && (
                        <div className="mt-3">
                          {rejected.slice(-1).map((r) => (
                            <div key={r.id} className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                              <p className="font-semibold">Last rejection reason:</p>
                              <p>{r.review_note || "No reason provided"}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {canSubmit && selectedType !== key && (
                      <button
                        onClick={() => { setSelectedType(key); setUploadedFiles([]); }}
                        className="flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto"
                      >
                        {rejected.length > 0 ? "Resubmit" : "Submit"}
                      </button>
                    )}
                  </div>

                  {selectedType === key && (
                    <div className="mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
                      <p className="text-sm font-semibold text-[var(--color-ink)]">Upload documents</p>

                      <div className="space-y-2">
                        {uploadedFiles.map((file, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-alt)] px-3 py-2">
                            <div className="flex min-w-0 items-center gap-2 text-sm">
                              <FileText size={14} className="shrink-0 text-[var(--color-ink-muted)]" />
                              <span className="min-w-0 truncate max-w-[200px] break-all">{file.name}</span>
                            </div>
                            <button onClick={() => handleRemoveFile(i)} className="flex min-h-[44px] shrink-0 items-center px-2 text-xs text-red-500 hover:underline">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] p-4 text-sm text-[var(--color-ink-muted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                        {uploading ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                        {uploading ? "Uploading..." : "Add document (Image or PDF)"}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          onClick={handleSubmitVerification}
                          disabled={submitting || uploadedFiles.length === 0}
                          className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {submitting ? "Submitting..." : "Submit for Review"}
                        </button>
                        <button
                          onClick={() => { setSelectedType(null); setUploadedFiles([]); }}
                          className="flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-semibold text-[var(--color-ink-muted)]"
                        >
                          Cancel
                        </button>
                      </div>
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
