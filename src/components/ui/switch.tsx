import React from 'react';
import { triggerHaptic } from '@/utils/haptics';

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className = '', checked = false, onCheckedChange, disabled, id, onClick, ...props }, ref) => {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        id={id}
        ref={ref}
        onClick={(e) => {
          if (!disabled) {
            // Trigger crisp medium snap on toggle
            triggerHaptic('medium');
            onCheckedChange?.(!checked);
          }
          onClick?.(e);
        }}
        className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95 ${
          checked
            ? 'bg-neutral-900 dark:bg-neutral-100'
            : 'bg-neutral-200 dark:bg-[#262626]'
        } ${className}`}
        {...props}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-white dark:bg-[#0A0A0A] shadow-md ring-0 transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';
