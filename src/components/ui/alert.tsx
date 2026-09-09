import React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  className?: string;
  children: React.ReactNode;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ variant = 'default', className = '', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-[#171717] text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800 [&>svg]:text-neutral-900 dark:[&>svg]:text-neutral-100',
      destructive: 'border-red-200 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/40 text-red-800 dark:text-red-200 [&>svg]:text-red-600 dark:[&>svg]:text-red-400',
      success: 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400',
      warning: 'border-amber-200 dark:border-amber-900/60 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400',
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={`relative w-full rounded-2xl border p-4 shadow-sm transition-all [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:w-5 [&>svg]:h-5 ${variants[variant]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Alert.displayName = 'Alert';

export interface AlertTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children: React.ReactNode;
}

export const AlertTitle = React.forwardRef<HTMLHeadingElement, AlertTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <h5
        ref={ref}
        className={`mb-1 font-bold leading-none tracking-tight text-xs sm:text-sm select-none ${className}`}
        {...props}
      >
        {children}
      </h5>
    );
  }
);
AlertTitle.displayName = 'AlertTitle';

export interface AlertDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children: React.ReactNode;
}

export const AlertDescription = React.forwardRef<HTMLParagraphElement, AlertDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`text-xs font-medium leading-relaxed opacity-90 ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AlertDescription.displayName = 'AlertDescription';
