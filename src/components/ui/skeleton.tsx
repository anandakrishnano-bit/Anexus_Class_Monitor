import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-2xl bg-neutral-200/80 dark:bg-neutral-800/80', className)}
      {...props}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={cn('w-full max-w-xs', className)}>
      <CardHeader>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="aspect-video w-full" />
      </CardContent>
    </Card>
  );
}

export function SkeletonTableRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 w-full animate-fade-in">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 rounded-2xl border border-neutral-200/60 dark:border-neutral-800/60 bg-white/50 dark:bg-[#171717]/50"
        >
          <div className="flex items-center gap-3 w-full">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-2 w-1/3">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-2.5 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}
