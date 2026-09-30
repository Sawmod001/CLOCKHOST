"use client";

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-alt)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">Authentication Error</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">{error.message}</p>
        <button onClick={reset} className="mt-4 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">
          Try again
        </button>
      </div>
    </main>
  );
}
