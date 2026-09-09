import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
  Clock,
  ClipboardCheck
} from 'lucide-react';
import { triggerHaptic } from '@/utils/haptics';

export type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  // Classroom specific metadata support
  subjectColor?: string;
  subjectCode?: string;
  periodNumber?: number;
  startTime?: string;
  onAction?: () => void;
  actionText?: string;
}

type ToastSubscriber = (toasts: ToastData[]) => void;

// Simple reactive store for toasts
let toasts: ToastData[] = [];
const subscribers = new Set<ToastSubscriber>();

function notify() {
  subscribers.forEach(subscriber => subscriber([...toasts]));
}

export function dismissToast(id?: string) {
  if (id) {
    toasts = toasts.filter(t => t.id !== id);
  } else {
    toasts = [];
  }
  notify();
}

function addToast(toastData: Omit<ToastData, 'id'>): string {
  const id = Math.random().toString(36).substring(2, 9);
  const newToast: ToastData = { ...toastData, id };
  toasts = [...toasts, newToast];
  notify();

  if (toastData.type === 'success') {
    triggerHaptic('success');
  } else if (toastData.type === 'error') {
    triggerHaptic('error');
  } else if (toastData.type === 'warning') {
    triggerHaptic('warning');
  } else if (toastData.type !== 'loading') {
    triggerHaptic('light');
  }

  const duration = toastData.duration !== undefined ? toastData.duration : (toastData.type === 'loading' ? 0 : 3500);
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }

  return id;
}

function updateToast(id: string, updates: Partial<ToastData>) {
  toasts = toasts.map(t => (t.id === id ? { ...t, ...updates } : t));
  notify();

  const duration = updates.duration !== undefined ? updates.duration : 3500;
  if (duration > 0) {
    setTimeout(() => {
      dismissToast(id);
    }, duration);
  }
}

export interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  subjectColor?: string;
  subjectCode?: string;
  periodNumber?: number;
  startTime?: string;
  onAction?: () => void;
  actionText?: string;
}

export interface PromiseToastMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error: string | ((error: any) => string);
}

// The Toast API callable anywhere
export const toast = (message: string, options?: ToastOptions) => {
  return addToast({
    title: message,
    description: options?.description,
    type: 'default',
    ...options
  });
};

toast.success = (message: string, options?: ToastOptions) => {
  return addToast({
    title: message,
    description: options?.description,
    type: 'success',
    ...options
  });
};

toast.error = (message: string, options?: ToastOptions) => {
  return addToast({
    title: message,
    description: options?.description,
    type: 'error',
    ...options
  });
};

toast.warning = (message: string, options?: ToastOptions) => {
  return addToast({
    title: message,
    description: options?.description,
    type: 'warning',
    ...options
  });
};

toast.info = (message: string, options?: ToastOptions) => {
  return addToast({
    title: message,
    description: options?.description,
    type: 'info',
    ...options
  });
};

toast.loading = (message: string, options?: ToastOptions) => {
  return addToast({
    title: message,
    description: options?.description,
    type: 'loading',
    duration: 0,
    ...options
  });
};

toast.promise = <T,>(
  promise: Promise<T> | (() => Promise<T>),
  messages: PromiseToastMessages<T>
) => {
  const id = addToast({
    title: messages.loading,
    type: 'loading',
    duration: 0
  });

  const p = typeof promise === 'function' ? promise() : promise;

  p.then(data => {
    const successMsg = typeof messages.success === 'function' ? messages.success(data) : messages.success;
    updateToast(id, {
      title: successMsg,
      type: 'success',
      duration: 3500
    });
    return data;
  }).catch(err => {
    const errorMsg = typeof messages.error === 'function' ? messages.error(err) : messages.error;
    updateToast(id, {
      title: errorMsg,
      type: 'error',
      duration: 4000
    });
  });

  return id;
};

toast.dismiss = dismissToast;

/**
 * Modern Toaster component - floats just above the bottom nav bar on mobile
 * and bottom-right on desktop.
 */
export const Toaster: React.FC = () => {
  const [activeToasts, setActiveToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    subscribers.add(setActiveToasts);
    setActiveToasts([...toasts]);
    return () => {
      subscribers.delete(setActiveToasts);
    };
  }, []);

  if (activeToasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.75rem)] md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse items-center gap-2 pointer-events-none w-[calc(100%-2rem)] max-w-sm sm:max-w-md"
    >
      {activeToasts.map(t => {
        // Icon according to type
        let Icon = Info;
        let iconColor = 'text-neutral-400';

        if (t.type === 'success') {
          Icon = CheckCircle2;
          iconColor = 'text-emerald-400';
        } else if (t.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'text-red-400';
        } else if (t.type === 'warning') {
          Icon = AlertTriangle;
          iconColor = 'text-amber-400';
        } else if (t.type === 'loading') {
          Icon = Loader2;
          iconColor = 'text-neutral-300 animate-spin';
        }

        // Custom subject color styling
        const hasColor = !!t.subjectColor;
        const color = t.subjectColor || '#0A0A0A';

        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto w-full relative overflow-hidden rounded-2xl bg-neutral-900/95 dark:bg-[#181818]/95 text-white border border-neutral-800 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-toast-in"
            style={
              hasColor
                ? {
                    borderColor: `${color}40`,
                    boxShadow: `0 10px 30px -5px ${color}20, 0 4px 12px -2px rgba(0,0,0,0.5)`
                  }
                : undefined
            }
          >
            {hasColor && (
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: color }}
              />
            )}

            <div className="p-3.5 pl-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="shrink-0 mt-0.5">
                  <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>

                <div className="min-w-0 flex-1">
                  {hasColor && (
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span
                        className="px-2 py-0.2 rounded-full text-[10px] font-black text-white"
                        style={{ backgroundColor: color }}
                      >
                        {t.periodNumber !== undefined ? `P${t.periodNumber}` : 'Class'} • {t.subjectCode || 'CLASS'}
                      </span>
                      {t.startTime && (
                        <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> {t.startTime}
                        </span>
                      )}
                    </div>
                  )}

                  <h5 className="text-xs font-bold text-white leading-snug break-words">
                    {t.title}
                  </h5>

                  {t.description && (
                    <p className="text-[11px] text-neutral-300 mt-0.5 font-medium leading-relaxed break-words">
                      {t.description}
                    </p>
                  )}

                  {t.action && (
                    <button
                      onClick={() => {
                        t.action?.onClick();
                        dismissToast(t.id);
                      }}
                      className="mt-2 text-[11px] font-bold text-white underline-offset-4 hover:underline"
                    >
                      {t.action.label}
                    </button>
                  )}

                  {t.onAction && t.actionText && (
                    <button
                      onClick={() => {
                        t.onAction?.();
                        dismissToast(t.id);
                      }}
                      className="mt-2 py-1.5 px-3 rounded-xl text-white font-bold text-xs shadow-md transition-all hover:opacity-90 flex items-center gap-1.5 active:scale-95"
                      style={{ backgroundColor: color }}
                    >
                      <ClipboardCheck className="w-3.5 h-3.5" /> {t.actionText}
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={() => dismissToast(t.id)}
                className="shrink-0 p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export function ToastPromise() {
  function showToast() {
    toast.promise(
      new Promise<{ name: string }>((resolve) => {
        window.setTimeout(() => resolve({ name: "Event" }), 2000);
      }),
      {
        loading: "Creating event…",
        success: (data) => `${data.name} created.`,
        error: "Could not create event.",
      }
    );
  }

  return (
    <button
      onClick={showToast}
      className="inline-flex items-center justify-center rounded-2xl text-xs font-bold transition-all focus-visible:outline-none border border-neutral-200 dark:border-neutral-700 bg-transparent text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-[#262626] h-10 px-4 py-2"
    >
      Create Event
    </button>
  );
}

