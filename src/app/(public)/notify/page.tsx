"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

/**
 * /notify — public "Get notified" form. Collects name + email, shows a
 * thank-you message. No verification, no account needed.
 */
export default function NotifyPage() {
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("Be first to know when new spaces go live.");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setStatus("Please tell us your name.");
      return;
    }
    setSaving(true);
    setStatus("Saving...");
    try {
      const res = await fetch("/api/notify/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setStatus(data.error || "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setStatus("Could not reach the server. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="surface-paper flex min-h-screen px-4 py-8">
      <div className="m-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo href="/" />
        </div>
        <h1 className="font-display-face t-1 text-h2">Get notified</h1>
        <p className="t-2 mt-3 text-lead">
          New venues and shortlets are opening soon. Leave your email and we
          will tell you first.
        </p>

        {!done ? (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm font-medium">
              Your name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Adaeze"
                required
                maxLength={100}
                autoComplete="name"
                className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base outline-none sm:text-sm"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                maxLength={200}
                autoComplete="email"
                className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base outline-none sm:text-sm"
              />
            </label>
            <button type="submit" disabled={saving} className="btn mt-2 w-full">
              {saving ? "Saving..." : "Notify me"}
            </button>
          </form>
        ) : (
          <div className="mt-8 rounded-2xl border border-[var(--line)] bg-white p-8 text-center">
            <p className="font-display-face t-1 text-h3">
              Thank you{name.trim() ? `, ${name.trim()}` : ""}!
            </p>
            <p className="t-2 mt-3 text-body">
              You are on the list. We will email you at {email.trim()} when new
              spaces go live.
            </p>
            <Link href="/listings" className="btn mt-6 w-full">
              Browse spaces
            </Link>
          </div>
        )}

        {!done && <p className="t-2 mt-6 text-sm">{status}</p>}
      </div>
    </main>
  );
}
