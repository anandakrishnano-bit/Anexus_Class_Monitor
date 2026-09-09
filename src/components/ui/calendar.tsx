import React, { useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  setMonth,
  setYear,
  getYear,
  getMonth
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface CalendarProps {
  mode?: 'single';
  selected?: Date | string | null;
  onSelect?: (date: Date) => void;
  captionLayout?: 'dropdown' | 'buttons';
  disabled?: (date: Date) => boolean;
  className?: string;
  month?: Date;
  onMonthChange?: (month: Date) => void;
}

export const Calendar: React.FC<CalendarProps> = ({
  mode = 'single',
  selected,
  onSelect,
  captionLayout = 'buttons',
  disabled,
  className = '',
  month: controlledMonth,
  onMonthChange
}) => {
  const selectedDate = selected
    ? typeof selected === 'string'
      ? new Date(selected.includes('T') ? selected : `${selected}T00:00:00`)
      : selected
    : null;

  const [currentMonth, setCurrentMonth] = useState<Date>(
    controlledMonth || selectedDate || new Date()
  );

  const displayMonth = controlledMonth || currentMonth;

  const handleMonthChange = (newMonth: Date) => {
    if (!controlledMonth) {
      setCurrentMonth(newMonth);
    }
    onMonthChange?.(newMonth);
  };

  const monthStart = startOfMonth(displayMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const years = Array.from({ length: 15 }, (_, i) => getYear(new Date()) - 5 + i);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className={`p-4 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-sm inline-block select-none ${className}`}>
      {/* Header with Month/Year Navigation */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {captionLayout === 'dropdown' ? (
          <div className="flex items-center gap-1.5 flex-1">
            <select
              value={getMonth(displayMonth)}
              onChange={e => handleMonthChange(setMonth(displayMonth, Number(e.target.value)))}
              className="px-2.5 py-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-white text-xs font-bold focus:outline-none"
            >
              {months.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={getYear(displayMonth)}
              onChange={e => handleMonthChange(setYear(displayMonth, Number(e.target.value)))}
              className="px-2.5 py-1 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-white text-xs font-bold focus:outline-none"
            >
              {years.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <h4 className="text-xs font-black text-neutral-900 dark:text-white tracking-wide px-1">
            {format(displayMonth, 'MMMM yyyy')}
          </h4>
        )}

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleMonthChange(subMonths(displayMonth, 1))}
            className="p-1.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleMonthChange(addMonths(displayMonth, 1))}
            className="p-1.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-[#262626] hover:text-neutral-900 dark:hover:text-white transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDays.map(day => (
          <div key={day} className="h-7 flex items-center justify-center text-[10px] font-extrabold text-neutral-400 uppercase">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isCurrentMonth = isSameMonth(day, displayMonth);
          const isCurrentDay = isToday(day);
          const isDisabled = disabled ? disabled(day) : false;

          return (
            <button
              key={idx}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled && onSelect) {
                  onSelect(day);
                }
              }}
              className={`h-8 w-8 rounded-xl text-xs font-bold flex flex-col items-center justify-center relative transition-all ${
                !isCurrentMonth ? 'text-neutral-400/40 dark:text-neutral-600' : 'text-neutral-800 dark:text-neutral-200'
              } ${
                isSelected
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-md scale-105 font-black z-10'
                  : 'hover:bg-neutral-100 dark:hover:bg-[#262626]'
              } ${
                isCurrentDay && !isSelected
                  ? 'ring-1 ring-neutral-400 dark:ring-neutral-600 font-extrabold'
                  : ''
              } ${
                isDisabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
              }`}
            >
              <span>{format(day, 'd')}</span>
              {isCurrentDay && !isSelected && (
                <span className="w-1 h-1 rounded-full bg-neutral-900 dark:bg-neutral-100 absolute bottom-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
