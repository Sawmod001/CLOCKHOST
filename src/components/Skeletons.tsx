export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-[var(--color-night-border)] bg-[var(--color-night-card)] p-4">
      <div className="mb-3 h-40 w-full rounded-xl bg-[var(--color-night-elevated)]" />
      <div className="mb-2 h-5 w-3/4 rounded bg-[var(--color-night-elevated)]" />
      <div className="mb-2 h-4 w-1/2 rounded bg-[var(--color-night-elevated)]" />
      <div className="h-4 w-1/3 rounded bg-[var(--color-night-elevated)]" />
    </div>
  );
}

interface ListSkeletonProps {
  count?: number;
}

export function ListSkeleton({ count = 6 }: ListSkeletonProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 4 }: TableSkeletonProps) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-8 flex-1 rounded bg-[var(--color-night-elevated)]" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 h-8 w-48 max-w-full animate-pulse rounded bg-[var(--color-night-elevated)]" />
      <div className="mb-4 h-4 w-96 max-w-full animate-pulse rounded bg-[var(--color-night-elevated)]" />
      <TableSkeleton />
    </div>
  );
}
