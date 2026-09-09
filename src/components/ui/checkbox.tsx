import React from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/utils/haptics';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean;
  indeterminate?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ checked: controlledChecked, indeterminate = false, defaultChecked = false, onCheckedChange, className = '', disabled = false, id, ...props }, ref) => {
    const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);

    const isControlled = controlledChecked !== undefined;
    const isChecked = isControlled ? controlledChecked : uncontrolledChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      triggerHaptic('light');
      if (!isControlled) {
        setUncontrolledChecked(e.target.checked);
      }
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className="relative inline-flex items-center justify-center shrink-0">
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={isChecked}
          disabled={disabled}
          onChange={handleChange}
          className="peer sr-only"
          {...props}
        />
        <label
          htmlFor={id}
          onClick={() => {
            if (!disabled && onCheckedChange) {
              triggerHaptic('light');
              onCheckedChange(!isChecked);
            }
          }}
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] transition-all cursor-pointer select-none active:scale-95',
            (isChecked || indeterminate) && 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-neutral-900 dark:peer-focus-visible:ring-neutral-100',
            disabled && 'cursor-not-allowed opacity-50',
            className
          )}
        >
          {indeterminate ? (
            <Minus className="w-3.5 h-3.5 stroke-[3]" />
          ) : isChecked ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : null}
        </label>
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
