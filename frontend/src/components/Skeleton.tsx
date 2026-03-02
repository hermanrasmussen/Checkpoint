export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl sm:rounded-2xl bg-white/[0.04] overflow-hidden">
      <div className="aspect-[3/4] w-full bg-white/5" />
      <div className="space-y-2.5 p-3 sm:p-4">
        <div className="h-5 w-3/4 rounded bg-white/5" />
        <div className="h-4 w-1/3 rounded bg-white/5" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-5 w-16 rounded bg-white/5" />
          <div className="h-5 w-20 rounded bg-white/5" />
        </div>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
