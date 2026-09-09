import React from 'react';
import { AttendanceStatus } from '../../types';

interface StatusBadgeProps {
  status: AttendanceStatus | 'free' | 'completed' | 'pending';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-semibold' : 'px-2.5 py-1 text-xs font-semibold';

  switch (status) {
    case 'present':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Present
        </span>
      );
    case 'absent':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Absent
        </span>
      );
    case 'od':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 dark:bg-neutral-400" />
          On Duty
        </span>
      );
    case 'medical':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 dark:bg-neutral-400" />
          Medical
        </span>
      );
    case 'permission':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 ${sizeClasses}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 dark:bg-neutral-400" />
          Permission
        </span>
      );
    case 'free':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 ${sizeClasses}`}>
          Free Period
        </span>
      );
    case 'completed':
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border bg-neutral-100 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 ${sizeClasses}`}>
          Completed
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full border bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 ${sizeClasses}`}>
          {status}
        </span>
      );
  }
};
