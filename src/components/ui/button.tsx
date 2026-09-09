import React from 'react';
import { cn } from '@/lib/utils';
import { triggerHaptic, HapticType } from '@/utils/haptics';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  haptic?: HapticType | 'none';
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'default',
      size = 'default',
      haptic,
      onPointerDown,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-2xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none';

    const variants = {
      default:
        'bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white shadow-sm',
      secondary:
        'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-[#262626] dark:text-neutral-100 dark:hover:bg-[#333333]',
      outline:
        'border border-neutral-200 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-[#262626]',
      ghost:
        'bg-transparent text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-[#262626]',
      destructive:
        'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 shadow-sm',
      link: 'text-neutral-900 dark:text-neutral-100 underline-offset-4 hover:underline p-0',
    };

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-8 rounded-xl px-3 text-[11px]',
      lg: 'h-12 rounded-2xl px-6 text-sm',
      icon: 'h-9 w-9 rounded-xl p-0',
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!disabled && haptic !== 'none') {
        const typeToTrigger = haptic || (variant === 'destructive' ? 'heavy' : 'light');
        triggerHaptic(typeToTrigger);
      }
      onPointerDown?.(e);
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        onPointerDown={handlePointerDown}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
