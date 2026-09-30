export default function HostLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-surface-alt)]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
        <p className="text-sm text-[var(--color-ink-muted)]">Loading...</p>
      </div>
    </main>
  );
}
