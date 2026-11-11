export function PageSkeleton() {
  return (
    <main className="pt-24 pb-16">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="h-10 w-64 rounded-lg bg-secondary/40 animate-pulse" />
        <GridSkeleton />
      </div>
    </main>
  );
}

export function ContentRowSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 rounded-lg bg-secondary/50 animate-pulse" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-40 sm:w-48 aspect-[2/3] rounded-xl bg-secondary/40 animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] rounded-xl bg-secondary/40 animate-pulse"
          style={{ animationDelay: `${i * 50}ms` }}
        />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
        <div className="w-32 h-32 rounded-2xl bg-secondary/40 animate-pulse" />
        <div className="flex-1 space-y-3">
          <div className="h-8 w-64 rounded-lg bg-secondary/40 animate-pulse" />
          <div className="h-4 w-48 rounded-lg bg-secondary/30 animate-pulse" />
          <div className="flex gap-3 mt-4">
            <div className="h-10 w-28 rounded-lg bg-secondary/30 animate-pulse" />
            <div className="h-10 w-28 rounded-lg bg-secondary/30 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full md:w-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-secondary/30 rounded-xl p-4 space-y-2">
              <div className="w-5 h-5 rounded bg-secondary/40 animate-pulse mx-auto" />
              <div className="h-6 w-12 rounded bg-secondary/40 animate-pulse mx-auto" />
              <div className="h-3 w-16 rounded bg-secondary/30 animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-10">
        <ContentRowSkeleton />
        <ContentRowSkeleton />
      </div>
    </div>
  );
}
