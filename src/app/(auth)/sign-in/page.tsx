"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Logo from "@/components/Logo";

function safeNext(raw: string | null) {
  if (!raw) return null;
  return raw.startsWith("/") && !raw.startsWith("//") && !raw.includes(":") && !raw.includes("\\") ? raw : null;
}

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const abortRef = useRef<AbortController | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const created = searchParams.get("created");
    const exists = searchParams.get("exists");
    if (created === "true") {
      setBanner("Account created! Please sign in.");
    } else if (exists === "true") {
      setBanner("An account with this email already exists. Please sign in.");
    }
  }, [searchParams.get("created"), searchParams.get("exists")]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 90000);

    try {
      const res = await fetch("/api/auth/sign-in", {
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
          setError(data.error || "Invalid email or password.");
        }
        return;
      }

      const redirectTo = safeNext(searchParams.get("next"));
      router.push(redirectTo || data.redirectTo || "/complete-profile");
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Request timed out. Please check your connection and try again.");
      } else if ((err as Error).message && /Failed to fetch|NetworkError|fetch failed/i.test((err as Error).message)) {
        setError("Cannot reach the server. Please check your internet connection and refresh the page.");
      } else {
        setError((err as Error).message || "Connection error. Please try again.");
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
            <h1 className="text-xl font-semibold" style={{ color: "var(--color-ink)" }}>Welcome back</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--color-ink-muted)" }}>Sign in to your ClockHost account</p>
          </div>

          {banner && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{banner}</div>
          )}

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
                <input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="block w-full rounded-xl border border-[var(--color-border)] bg-white px-4 py-3 pr-11 text-base sm:text-sm outline-none transition-all placeholder:text-[var(--color-ink-muted)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
                  placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--color-primary-dark)] disabled:opacity-50">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : "Sign in"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link href="/sign-up" className="btn-outline w-full justify-center px-4 py-3 text-sm">
            Don&apos;t have an account? Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--color-primary-subtle)] via-white to-white px-4">
        <div className="text-sm" style={{ color: "var(--color-ink-muted)" }}>Loading...</div>
      </main>
    }>
      <SignInForm />
    </Suspense>
  );
}
