// ============================================
// SkeletonLoader.tsx — Loading placeholders
// Use these instead of spinners for better UX
// ============================================

// ---- SkeletonCard: single card placeholder ----
export function SkeletonCard() {
  return (
    <div className="criciq-card space-y-3">
      {/* Top row: badge + date */}
      <div className="flex justify-between">
        <div className="skeleton h-5 w-12 rounded" />
        <div className="skeleton h-5 w-24 rounded" />
      </div>
      {/* Teams row */}
      <div className="flex items-center justify-between py-2">
        <div className="space-y-2 flex-1">
          <div className="skeleton h-6 w-16 rounded mx-auto" />
          <div className="skeleton h-4 w-20 rounded mx-auto" />
        </div>
        <div className="skeleton h-6 w-8 rounded mx-4" />
        <div className="space-y-2 flex-1">
          <div className="skeleton h-6 w-16 rounded mx-auto" />
          <div className="skeleton h-4 w-20 rounded mx-auto" />
        </div>
      </div>
      {/* Venue */}
      <div className="skeleton h-4 w-40 rounded mx-auto" />
    </div>
  );
}

// ---- SkeletonMatchGrid: 6 card placeholders ----
export function SkeletonMatchGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// ---- SkeletonGauge: win probability gauge placeholder ----
export function SkeletonGauge() {
  return (
    <div className="criciq-card flex flex-col items-center gap-3">
      <div className="skeleton h-4 w-32 rounded" />
      <div className="skeleton w-56 h-28 rounded-full" />
      <div className="flex justify-between w-full">
        <div className="skeleton h-8 w-16 rounded" />
        <div className="skeleton h-8 w-16 rounded" />
      </div>
    </div>
  );
}

// ---- SkeletonText: a few lines of text ----
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton h-4 rounded"
          // Make lines slightly different widths so it looks natural
          style={{ width: `${70 + (i % 3) * 10}%` }}
        />
      ))}
    </div>
  );
}

// ---- SkeletonChart: chart placeholder ----
export function SkeletonChart() {
  return (
    <div className="criciq-card">
      <div className="skeleton h-4 w-48 rounded mb-4" />
      <div className="skeleton h-36 w-full rounded" />
    </div>
  );
}
