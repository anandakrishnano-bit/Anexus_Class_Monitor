import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'border-transparent bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm',
      secondary: 'border-transparent bg-neutral-100 text-neutral-900 dark:bg-[#262626] dark:text-neutral-100',
      outline: 'border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100',
      destructive: 'border-transparent bg-red-600 text-white shadow-sm'
    };

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
