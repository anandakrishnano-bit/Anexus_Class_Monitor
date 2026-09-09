import React from 'react';

export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className = '', orientation = 'horizontal', decorative = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role={decorative ? 'none' : 'separator'}
        aria-orientation={decorative ? undefined : orientation}
        className={`shrink-0 bg-neutral-200 dark:bg-neutral-800 ${
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]'
        } ${className}`}
        {...props}
      />
    );
  }
);

Separator.displayName = 'Separator';
