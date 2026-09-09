import React from 'react';
import { LoaderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpinnerProps extends React.ComponentProps<'svg'> {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <LoaderIcon
      role="status"
      aria-label="Loading"
      className={cn('animate-spin text-neutral-900 dark:text-neutral-100 shrink-0', sizeClasses[size], className)}
      {...props}
    />
  );
}

export interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ message = 'Loading...', className = '' }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in-up select-none',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 shadow-2xl">
        <Spinner size="lg" />
        <span className="text-xs font-bold text-neutral-900 dark:text-white tracking-wide">
          {message}
        </span>
      </div>
    </div>
  );
}
