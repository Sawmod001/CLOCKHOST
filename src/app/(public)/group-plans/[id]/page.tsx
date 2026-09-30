"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Copy, Loader2, Lock, Users } from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import BackButton from "@/components/BackButton";

const STATUS_STYLE = {
  pending: "bg-[#FEF3C7] text-[#B45309]",
  paid: "bg-[#DBEAFE] text-[#1E40AF]",
  confirmed: "bg-[#DCFCE7] text-[#166534]",
};

export default function GroupPlanPage() {
  const { id } = useParams();
  const [plan, setPlan] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [planExpired, setPlanExpired] = useState(false);

  const [joinHeadcount, setJoinHeadcount] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/group-plans/${id}`);
      if (!res.ok) throw new Error("Plan not found");
      const data = await res.json();
      setPlan(data.data);
      setPlanExpired(!!data.data.expiresAt && new Date(data.data.expiresAt).getTime() <= Date.now());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/profile-status")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setIsAuthenticated(!!data.authenticated);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-alt)] px-4">
        <Loader2 size={24} className="animate-spin text-[var(--color-ink-muted)]" />
      </main>
    );
  }

  if (error || !plan) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-alt)] px-4 py-6">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
          <p className="text-sm text-[var(--color-ink-muted)]">{error || "Plan not found"}</p>
          <Link href="/listings" className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">Browse listings</Link>
        </div>
      </main>
    );
  }

  const listing = plan.listing;
  const allPaid = plan.members.length > 0 && plan.members.every((m: any) => m.status !== "pending");
  const isFull = plan.committed >= plan.targetHeadcount;
  const canFinalize = plan.status === "active" && isFull && allPaid && plan.isMember;
  const maxJoin = Math.max(0, plan.targetHeadcount - plan.committed);

  const toggleAddon = (addonId: string) => {
    setSelectedAddOns((current) =>
      current.includes(addonId) ? current.filter((value) => value !== addonId) : [...current, addonId]
    );
  };

  const runAction = async (url: string, body: Record<string, any>, successMessage: string) => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setActionMessage({ ok: true, text: data?.data?.message || successMessage });
      await load();
    } catch (err) {
      setActionMessage({ ok: false, text: (err as Error).message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = () => runAction(
    `/api/group-plans/${id}/join`,
    { headcount: Number(joinHeadcount), addOns: selectedAddOns },
    "You joined the plan!"
  );

  const handlePay = () => {
    const memberId = plan.myMember?.id;
    if (!memberId) return;
    return runAction(
      `/api/group-plans/${id}/payments/mock-confirm`,
      { memberId },
      "Payment confirmed."
    );
  };

  const handleFinalize = () => runAction(
    `/api/group-plans/${id}/finalize`,
    {},
    "Plan confirmed!"
  );

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setActionMessage({ ok: false, text: "Could not copy the link" });
    }
  };

  const progress = Math.min(100, Math.round((plan.committed / plan.targetHeadcount) * 100));

  return (
    <main className="min-h-screen bg-[var(--color-surface-alt)] px-4 py-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <PublicHeader backHref="/group-plans" />
        <BackButton href={listing ? `/listings/${listing.id}` : "/listings"} label="Back to listing" />

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink-muted)]">Group booking plan</p>
              <h1 className="mt-1 break-words text-2xl font-semibold text-[var(--color-ink)]">{listing?.title || "Venue"}</h1>
              <p className="mt-1 break-words text-sm text-[var(--color-ink-muted)]">
                {listing?.location?.cityArea || ""} · {new Date(plan.eventStart as string).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos",  weekday: "short", day: "numeric", month: "short" })}{" "}
                {new Date(plan.eventStart as string).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })} –{" "}
                {new Date(plan.eventEnd).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos",  hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${plan.status === "active" ? "bg-[#DBEAFE] text-[#1E40AF]" : plan.status === "finalized" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F3F4F6] text-[#6B7280]"}`}>
              {plan.status}
            </span>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-[var(--color-ink)]">{plan.committed} / {plan.targetHeadcount} people</span>
              <span className="text-[var(--color-ink-muted)]">{plan.remaining} spots left</span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[var(--color-surface-alt)]">
              <div className="h-full rounded-full bg-[var(--color-primary)] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={copyLink} className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)]">
              {copied ? <Check size={14} className="text-[#15803D]" /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy invite link"}
            </button>
            {plan.finalizedBookingId && (
              <Link href={`/bookings/${plan.finalizedBookingId}`} className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#15803D] px-3 py-2 text-sm font-semibold text-white">
                <Check size={14} /> View booking
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--color-ink)]">
            <Users size={18} /> Who&apos;s coming ({plan.members.length})
          </h2>
          {plan.members.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--color-ink-muted)]">Be the first to join.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {plan.members.map((member: any) => (
                <li key={member.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] p-3 text-sm">
                  <div className="min-w-0">
                    <span className="break-words font-semibold text-[var(--color-ink)]">{member.name}</span>
                    <span className="ml-2 text-[var(--color-ink-muted)]">({member.headcount} {member.headcount === 1 ? "person" : "people"})</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="whitespace-nowrap font-semibold">₦{(member.shareAmountKobo / 100).toLocaleString()}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${(STATUS_STYLE as Record<string, string>)[member.status] || "bg-[#F3F4F6] text-[#6B7280]"}`}>
                      {member.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {actionMessage && (
          <div className={`rounded-xl border p-4 text-sm ${actionMessage.ok ? "border-[#DCFCE7] bg-[#F0FDF4] text-[#166534]" : "border-[#FEE2E2] bg-[#FEF2F2] text-[#991B1B]"}`}>
            {actionMessage.text}
          </div>
        )}

        {plan.status === "active" && plan.isMember && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
            {plan.myMember.status === "pending" ? (
              <>
                <h2 className="text-lg font-semibold text-[var(--color-ink)]">Your share</h2>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
                  {plan.myMember.headcount} {plan.myMember.headcount === 1 ? "person" : "people"} · ₦{(plan.myMember.shareAmountKobo / 100).toLocaleString()}
                </p>
                <button
                  onClick={handlePay}
                  disabled={actionLoading}
                  className="mt-4 min-h-[44px] w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {actionLoading ? "Processing..." : `Pay my share ₦${(plan.myMember.shareAmountKobo / 100).toLocaleString()}`}
                </button>
              </>
            ) : canFinalize ? (
              <button
                onClick={handleFinalize}
                disabled={actionLoading}
                className="min-h-[44px] w-full rounded-xl bg-[#15803D] px-4 py-3 font-semibold text-white disabled:opacity-60"
              >
                {actionLoading ? "Finalizing..." : "Finalize booking — everyone has paid!"}
              </button>
            ) : (
              <p className="text-sm text-[var(--color-ink-muted)]">
                ✓ Your share is {plan.myMember.status}. {isFull && !allPaid ? "Waiting for other members to pay." : !isFull ? `Still need ${plan.targetHeadcount - plan.committed} more ${plan.targetHeadcount - plan.committed === 1 ? "person" : "people"}.` : ""}
              </p>
            )}
          </div>
        )}

        {plan.status === "active" && !plan.isMember && (
          <div className="rounded-2xl border border-[var(--color-border)] bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Join this plan</h2>
            {authChecked && !isAuthenticated ? (
              <>
                <p className="mt-1 text-sm text-[var(--color-ink-muted)]">Sign in with your ClockHost account to join and pay your share.</p>
                <Link
                  href="/sign-up"
                  className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white"
                >
                  <Lock size={16} /> Sign in to join
                </Link>
              </>
            ) : maxJoin <= 0 ? (
              <p className="mt-2 text-sm font-semibold text-[#B91C1C]">This plan is full.</p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-[var(--color-ink)]">How many people are you bringing?</label>
                  <input
                    type="number"
                    min="1"
                    max={maxJoin}
                    value={joinHeadcount}
                    onChange={(e) => setJoinHeadcount(Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full rounded-xl border border-[var(--color-border)] px-3 py-2 text-base sm:text-sm"
                  />
                  <p className="text-xs text-[var(--color-ink-muted)]">Up to {maxJoin} spots left.</p>
                </div>

                {listing?.addOns?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--color-ink)]">Add-ons</p>
                    {listing.addOns.map((addon: any) => (
                      <label key={addon.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] p-3 text-sm">
                        <span className="min-w-0 break-words">{addon.name}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span>+₦{(addon.priceInKobo / 100).toLocaleString()}</span>
                          <input type="checkbox" checked={selectedAddOns.includes(addon.id)} onChange={() => toggleAddon(addon.id)} />
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleJoin}
                  disabled={actionLoading || maxJoin <= 0}
                  className="min-h-[44px] w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:opacity-60"
                >
                  {actionLoading ? "Joining..." : "Join this plan"}
                </button>
              </div>
            )}
          </div>
        )}

        {plan.status === "finalized" && (
          <div className="rounded-2xl border border-[#DCFCE7] bg-[#F0FDF4] p-6 text-center">
            <Check size={32} className="mx-auto text-[#15803D]" />
            <h2 className="mt-2 text-lg font-semibold text-[#166534]">Plan confirmed!</h2>
            <p className="mt-1 text-sm text-[#166534]">The venue is booked.</p>
            {plan.finalizedBookingId && (
              <Link href={`/bookings/${plan.finalizedBookingId}`} className="mt-4 inline-block rounded-xl bg-[#15803D] px-4 py-2 text-sm font-semibold text-white">
                View booking
              </Link>
            )}
          </div>
        )}

        {plan.status === "cancelled" && (
          <div className="rounded-2xl border border-[#FEE2E2] bg-[#FEF2F2] p-6 text-center">
            <h2 className="text-lg font-semibold text-[#991B1B]">Plan cancelled</h2>
            <p className="mt-1 text-sm text-[#991B1B]">
              {planExpired ? "The plan deadline passed before it was filled." : "The slot became unavailable before the plan finalized."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}