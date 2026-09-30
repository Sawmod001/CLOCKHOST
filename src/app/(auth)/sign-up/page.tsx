"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";

function safeNext(raw: string | null) {
  if (!raw) return null;
  return raw.startsWith("/") && !raw.startsWith("//") && !raw.includes(":") && !raw.includes("\\") ? raw : null;
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const abortRef = useRef<AbortController | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      let data;
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        if (res.status === 503) {
          setError(data.error || "Authentication service is temporarily unavailable. Please wait a moment and try again.");
        } else if (res.status === 403 && /CSRF/i.test(data.error || "")) {
          setError("Security check failed. Please refresh the page and try again.");
        } else {
          setError(data.error || "Could not create account.");
        }
        return;
      }

      const next = safeNext(searchParams.get("next"));
      router.push(next || data.redirectTo || "/complete-profile");
    } catch (err: any) {
      console.error("Sign-up client error:", err);
      if (err.name === "AbortError") {
        setError("Request timed out. Please check your connection and try again.");
      } else if ((err as Error).message && /Failed to fetch|NetworkError|fetch failed/i.test((err as Error).message)) {
        setError("Cannot reach the server. Please check your internet connection and refresh the page.");
      } else {
        setError("Network error: " + ((err as Error).message || "Could not reach server. Is the site running?"));
      }
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-br from-[var(--color-primary-subtle)] via-white to-white px-4 py-10">
      <div className="m-auto w-full max-w-sm animate-fade-in">
        <div className="mb-8 text-center">
          <Logo size="lg" href="/" />
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-lg shadow-black/[0.03]">
          <div className="mb-6">
            <h1 className="text-xl font-semibold" style={{ color: "var(--color-ink)" }}>Create your account</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-muted)" }}>Join ClockHost and discover amazing spaces</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="block w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 text-base sm:text-sm outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
                placeholder="you@example.com" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>Password</label>
              <div className="relative">
                <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                  className="block w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 pr-11 text-base sm:text-sm outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
                  placeholder="At least 8 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-ink)" }}>Confirm password</label>
              <div className="relative">
                <input id="confirmPassword" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8}
                  className="block w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 pr-11 text-base sm:text-sm outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
                  placeholder="Re-enter your password" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary-dark)] disabled:opacity-50">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Creating account...</> : "Create account"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link href="/sign-in" className="btn-outline w-full justify-center px-4 py-3 text-sm">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--color-primary-subtle)] via-white to-white px-4">
        <div className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading...</div>
      </main>
    }>
      <SignUpForm />
    </Suspense>
  );
}
