export function PageSkeleton() {
  return (
    <div className="w-full min-h-screen bg-background flex flex-col p-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-muted rounded-xl" />
          <div className="h-6 w-32 bg-muted rounded-md" />
        </div>
        <div className="w-10 h-10 bg-muted rounded-full" />
      </div>

      {/* Main Content Area Skeleton */}
      <div className="flex-1 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        {/* Banner/Title Skeleton */}
        <div className="w-full h-32 bg-muted/50 rounded-2xl flex flex-col justify-center px-8 gap-3">
          <div className="h-8 w-1/3 bg-muted rounded-md" />
          <div className="h-4 w-1/2 bg-muted rounded-md" />
        </div>

        {/* Grid Area Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border border-border h-48 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted rounded-full" />
                <div className="h-5 w-24 bg-muted rounded-md" />
              </div>
              <div className="flex-1 space-y-2 mt-4">
                <div className="h-3 w-full bg-muted rounded-md" />
                <div className="h-3 w-5/6 bg-muted rounded-md" />
                <div className="h-3 w-4/6 bg-muted rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Loading Indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground font-medium tracking-widest uppercase">Loading Core...</span>
      </div>
    </div>
  );
}
