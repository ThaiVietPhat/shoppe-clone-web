import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col overflow-hidden rounded-xl bg-card border border-white/6', className)}>
      <Skeleton className="aspect-square w-full bg-white/5" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-full bg-white/5" />
        <Skeleton className="h-4 w-3/4 bg-white/5" />
        <Skeleton className="h-5 w-1/2 bg-white/5" />
        <Skeleton className="h-3 w-1/3 bg-white/5" />
      </div>
    </div>
  );
}
