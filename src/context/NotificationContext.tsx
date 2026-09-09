import React, { createContext, useContext, useCallback } from 'react';
import { ToastType } from '../types';
import { toast, dismissToast, ToastOptions } from '@/components/ui/toast';

export interface ToastCustomOptions {
  title: string;
  message?: string;
  type?: ToastType;
  subjectColor?: string;
  subjectCode?: string;
  periodNumber?: number;
  startTime?: string;
  classroom?: string;
  facultyName?: string;
  aiNote?: string;
  actionText?: string;
  onAction?: () => void;
  duration?: number;
}

interface NotificationContextType {
  showToast: (
    titleOrOptions: string | ToastCustomOptions,
    message?: string,
    type?: ToastType
  ) => void;
  removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const removeToast = useCallback((id: string) => {
    dismissToast(id);
  }, []);

  const showToast = useCallback(
    (
      titleOrOptions: string | ToastCustomOptions,
      message?: string,
      type: ToastType = 'info'
    ) => {
      if (typeof titleOrOptions === 'object') {
        const tType = titleOrOptions.type || 'info';
        const opts: ToastOptions = {
          description: titleOrOptions.message || titleOrOptions.aiNote,
          duration: titleOrOptions.duration,
          subjectColor: titleOrOptions.subjectColor,
          subjectCode: titleOrOptions.subjectCode,
          periodNumber: titleOrOptions.periodNumber,
          startTime: titleOrOptions.startTime,
          actionText: titleOrOptions.actionText,
          onAction: titleOrOptions.onAction
        };

        if (tType === 'success') {
          toast.success(titleOrOptions.title, opts);
        } else if (tType === 'error') {
          toast.error(titleOrOptions.title, opts);
        } else if (tType === 'warning') {
          toast.warning(titleOrOptions.title, opts);
        } else {
          toast.info(titleOrOptions.title, opts);
        }
      } else {
        const title = titleOrOptions;
        const opts: ToastOptions = { description: message };

        if (type === 'success') {
          toast.success(title, opts);
        } else if (type === 'error') {
          toast.error(title, opts);
        } else if (type === 'warning') {
          toast.warning(title, opts);
        } else {
          toast.info(title, opts);
        }
      }
    },
    []
  );

  return (
    <NotificationContext.Provider value={{ showToast, removeToast }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};
