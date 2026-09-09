import React from 'react';

export interface BubbleProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'muted' | 'secondary' | 'tertiary';
  className?: string;
  children: React.ReactNode;
}

export const Bubble = React.forwardRef<HTMLDivElement, BubbleProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    const variants = {
      default: 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm rounded-2xl rounded-br-sm',
      muted: 'bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 rounded-2xl rounded-bl-sm shadow-sm',
      secondary: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-2xl shadow-sm',
      tertiary: 'bg-[var(--accent-tertiary)] text-white shadow-md rounded-2xl rounded-br-sm selection:bg-white/20'
    };

    return (
      <div
        ref={ref}
        className={`transition-all ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Bubble.displayName = 'Bubble';

export interface BubbleContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const BubbleContent = React.forwardRef<HTMLDivElement, BubbleContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`p-3.5 text-xs font-medium leading-relaxed whitespace-pre-wrap ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
BubbleContent.displayName = 'BubbleContent';

export interface BubbleGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const BubbleGroup = React.forwardRef<HTMLDivElement, BubbleGroupProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`flex flex-col gap-1.5 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);
BubbleGroup.displayName = 'BubbleGroup';
