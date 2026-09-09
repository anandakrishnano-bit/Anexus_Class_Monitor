import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { Calendar } from './calendar';

export interface DatePickerProps {
  value?: string | Date | null;
  onChange?: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Pick a date...',
  className = '',
  disabled = false
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const dateObj = value
    ? typeof value === 'string'
      ? new Date(value.includes('T') ? value : `${value}T00:00:00`)
      : value
    : null;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(!open);
        }}
        className={`flex h-10 w-full items-center justify-between gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] px-3.5 py-2.5 text-xs font-bold text-neutral-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          {dateObj ? format(dateObj, 'PPP') : <span className="text-neutral-400">{placeholder}</span>}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+0.35rem)] z-50 animate-scale-in">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={dateObj}
            onSelect={d => {
              const formatted = format(d, 'yyyy-MM-dd');
              onChange?.(formatted);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
