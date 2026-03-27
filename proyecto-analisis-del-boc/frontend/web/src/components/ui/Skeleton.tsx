interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800 ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
      <Skeleton className="mb-3 h-3 w-1/3" />
      <Skeleton className="mb-4 h-5 w-4/5" />
      <Skeleton className="mb-2 h-3 w-1/2" />
      <Skeleton className="mb-2 h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
