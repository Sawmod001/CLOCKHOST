import { ListSkeleton } from "@/components/Skeletons";

export default function ListingsLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <div className="mb-8 h-8 w-64 max-w-full animate-pulse rounded bg-[var(--color-night-elevated)]" />
      <div className="mb-4 h-4 w-96 max-w-full animate-pulse rounded bg-[var(--color-night-elevated)]" />
      <ListSkeleton count={6} />
    </div>
  );
}
