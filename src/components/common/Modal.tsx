import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md'
}) => {
  const [mounted, setMounted] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleRequestClose = useCallback(() => {
    if (isExiting) return;
    triggerHaptic('light');
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      onClose();
    }, 220);
  }, [isExiting, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isExiting) {
        handleRequestClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.setAttribute('data-dialog-open', 'true');
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      document.body.removeAttribute('data-dialog-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isExiting, handleRequestClose]);

  if (!isOpen || !mounted) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }[maxWidth];

  const modalContent = (
    <div
      className={`fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 ${
        isExiting ? 'modal-backdrop-exit' : 'modal-backdrop-enter'
      }`}
    >
      {/* Background click overlay */}
      <div
        className="fixed inset-0"
        onClick={handleRequestClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Box with Stiff Spring Bottom Pop-up */}
      {/* Modal Dialog Box with Stiff Spring Bottom Pop-up & Layout Morph */}
      <div
        className={`relative w-full ${maxWidthClass} bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 transition-[max-width,width] duration-400 ease-[cubic-bezier(0.18,0.95,0.3,1.15)] ${
          isExiting ? 'modal-spring-exit' : 'modal-spring-enter'
        }`}
      >
        {title ? (
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 transition-all duration-300">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-100">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={handleRequestClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleRequestClose}
            className="absolute top-4 right-4 z-20 p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-xl hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="p-5 sm:p-6 max-h-[85vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] sm:pb-6 transition-all duration-400">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
