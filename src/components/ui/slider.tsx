import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { triggerSliderTick, triggerHaptic } from '@/utils/haptics';

export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number) => void;
  onChange?: (value: number) => void;
  formatValue?: (value: number) => string;
}

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      min = 0,
      max = 100,
      step = 1,
      value,
      defaultValue,
      onValueChange,
      onChange,
      formatValue,
      disabled,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState<number>(
      value !== undefined ? value : defaultValue !== undefined ? defaultValue : min
    );
    const lastReportedValue = useRef<number>(
      value !== undefined ? value : defaultValue !== undefined ? defaultValue : min
    );

    const currentValue = value !== undefined ? value : internalValue;
    const percentage = Math.min(100, Math.max(0, ((currentValue - min) / (max - min)) * 100));

    const handleValueUpdate = (numVal: number) => {
      if (isNaN(numVal)) return;
      if (numVal !== lastReportedValue.current) {
        lastReportedValue.current = numVal;
        // Trigger crisp mechanical detent ratchet
        triggerSliderTick(16);
      }
      if (value === undefined) {
        setInternalValue(numVal);
      }
      onValueChange?.(numVal);
      onChange?.(numVal);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      handleValueUpdate(parseFloat(e.target.value));
    };

    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
      handleValueUpdate(parseFloat((e.target as HTMLInputElement).value));
    };

    const handlePointerDown = () => {
      triggerHaptic('tick');
    };

    return (
      <div className={cn('relative flex w-full touch-none select-none items-center py-2.5 cursor-pointer', className)}>
        {/* Track */}
        <div className="relative h-3 w-full grow overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800 shadow-inner">
          {/* Active fill */}
          <div
            className="h-full bg-neutral-900 dark:bg-neutral-100 transition-[width] duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Real input on top */}
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentValue}
          disabled={disabled}
          onChange={handleInputChange}
          onInput={handleInput}
          onPointerDown={handlePointerDown}
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          {...props}
        />

        {/* Visual Thumb indicator */}
        <div
          className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-6 w-6 rounded-full border-2 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-neutral-900 shadow-lg transition-transform duration-75 flex items-center justify-center ring-2 ring-black/5 dark:ring-white/10"
          style={{ left: `${percentage}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-neutral-900 dark:bg-neutral-100" />
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';
