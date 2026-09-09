import React from 'react';

export interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`relative flex items-center w-full rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-neutral-100 transition-all focus-within:ring-2 focus-within:ring-neutral-900 dark:focus-within:ring-neutral-100 focus-within:border-transparent ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
InputGroup.displayName = 'InputGroup';

export interface InputGroupAddonProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'inline-start' | 'inline-end';
  className?: string;
  children: React.ReactNode;
}

export const InputGroupAddon = React.forwardRef<HTMLDivElement, InputGroupAddonProps>(
  ({ align = 'inline-start', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-center shrink-0 text-neutral-400 dark:text-neutral-500 pointer-events-none ${
          align === 'inline-start' ? 'pl-3.5 pr-1 order-first' : 'pr-3.5 pl-1 order-last'
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
InputGroupAddon.displayName = 'InputGroupAddon';

export interface InputGroupInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const InputGroupInput = React.forwardRef<HTMLInputElement, InputGroupInputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);
InputGroupInput.displayName = 'InputGroupInput';
