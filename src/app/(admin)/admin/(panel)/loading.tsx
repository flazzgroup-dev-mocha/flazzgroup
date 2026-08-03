import { Card } from "@/components/ui/surface";
import { Skeleton } from "@/components/ui/surface";

/** Shown while a panel page streams in, so the layout never jumps. */
export default function PanelLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Memuat…</span>

      <header className="mb-6 sm:mb-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </header>

      <div className="mb-4 flex justify-end">
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>

      <Card>
        <div className="border-b border-white/8 px-4 py-3">
          <Skeleton className="h-3 w-40" />
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-white/6 px-4 py-4 last:border-0"
          >
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="mt-2 h-3 w-32 max-w-full" />
            </div>
            <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
            <Skeleton className="h-8 w-16 shrink-0 rounded-lg" />
          </div>
        ))}
      </Card>
    </div>
  );
}
