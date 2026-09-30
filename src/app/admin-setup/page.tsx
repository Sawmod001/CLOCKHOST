"use client";

import { useState } from "react";

export default function AdminSetupPage() {
  const [email, setEmail] = useState("admin@clockhost.com");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("Admin");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("Creating admin...");

    try {
      const res = await fetch("/api/auth/admin-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });
      const data = await res.json();
      setStatus(data.message || data.error || "Done");
    } catch {
      setStatus("Failed to connect");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-alt)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold">Admin Setup</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input className="mt-1 block w-full rounded-xl border px-4 py-3 text-base sm:text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input className="mt-1 block w-full rounded-xl border px-4 py-3 text-base sm:text-sm" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Password</label>
            <input className="mt-1 block w-full rounded-xl border px-4 py-3 text-base sm:text-sm" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <button className="min-h-[44px] w-full rounded-xl bg-[var(--color-primary)] px-4 py-3 font-semibold text-white disabled:opacity-50" type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Admin"}
          </button>
        </form>
        {status && <p className="mt-4 break-words text-sm">{status}</p>}
        <p className="mt-4 text-xs text-[var(--color-ink-muted)]">Use once. Then sign in at /sign-in with the credentials above.</p>
      </div>
    </main>
  );
}
