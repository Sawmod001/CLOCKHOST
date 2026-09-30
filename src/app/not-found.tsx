import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-alt)] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-border)] bg-white p-8 text-center">
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">The page you are looking for does not exist.</p>
        <Link href="/" className="mt-4 inline-block rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white">
          Go home
        </Link>
      </div>
    </main>
  );
}
