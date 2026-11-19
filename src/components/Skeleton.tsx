export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`block animate-pulse rounded-xl bg-line/80 ${className}`} aria-hidden="true" />
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-4 p-6" role="status" aria-busy="true" aria-label="正在加载">
      <div className="flex gap-4">
        {Array.from({ length: cols }, (_, index) => (
          <Skeleton key={index} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex gap-4">
          {Array.from({ length: cols }, (_, col) => (
            <Skeleton key={col} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-3" role="status" aria-busy="true" aria-label="正在加载">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card space-y-4 p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="正在加载">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="card space-y-3 p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  )
}

export function LevelGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4" role="status" aria-busy="true" aria-label="正在读取关卡">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="flex flex-col items-center gap-2 rounded-2xl bg-canvas py-4">
          <Skeleton className="h-11 w-11 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}
