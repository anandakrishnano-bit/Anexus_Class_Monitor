import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  ClipboardCheck,
  Calendar,
  History,
  MoreHorizontal,
  Users,
  BookOpen,
  UserCircle,
  Settings,
  X
} from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const [isMoreOpen, setIsMoreOpen] = useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Auto-detect when a dialog or modal is open so the navbar never clips into it
  useEffect(() => {
    const checkDialog = () => {
      setIsDialogOpen(
        document.body.hasAttribute('data-dialog-open') ||
        document.body.style.overflow === 'hidden'
      );
    };
    checkDialog();
    const observer = new MutationObserver(checkDialog);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-dialog-open', 'style'] });
    return () => observer.disconnect();
  }, []);

  // Close "More" menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    };
    if (isMoreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMoreOpen]);

  // Close menu when a tab is selected
  const handleTabClick = (id: string) => {
    triggerHaptic('light');
    setActiveTab(id);
    setIsMoreOpen(false);
  };

  const primaryItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'reports', label: 'History', icon: History },
  ];

  const moreItems = [
    { id: 'profile', label: 'My Profile', icon: UserCircle },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'subjects', label: 'Subjects & Faculty', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const isMoreActive = moreItems.some(item => item.id === activeTab);

  return (
    <>
      {/* Outside Dim Backdrop - rendered at z-30 behind bottom navbar (so navbar stays clean white in light mode) */}
      {isMoreOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-30 animate-fade-in md:hidden"
          onClick={() => setIsMoreOpen(false)}
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-40 md:hidden transition-transform duration-300 ease-in-out ${
          isDialogOpen ? 'translate-y-full pointer-events-none opacity-0' : 'translate-y-0 opacity-100'
        }`}
        ref={moreRef}
      >
        <div className="bg-white dark:bg-[#0A0A0A] border-t border-neutral-200/80 dark:border-neutral-800 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] relative z-40">
          {/* More menu popup with expanding spring animation */}
          {isMoreOpen && (
            <div className="absolute bottom-full right-3 pb-2 w-56 max-w-[85vw] more-menu-expand z-50">
              <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-2 space-y-1 overflow-hidden">
                <div className="px-2.5 py-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
                    Menu
                  </span>
                </div>
                {moreItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabClick(item.id)}
                      className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95 ${
                        isActive
                          ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-sm'
                          : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#262626]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white/20 dark:bg-black/10' : 'bg-neutral-100 dark:bg-[#262626]'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold">{item.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        {/* Main nav items with sliding capsule animation */}
        {(() => {
          const activeNavIndex = isMoreActive || isMoreOpen ? 4 : primaryItems.findIndex(item => item.id === activeTab);
          return (
            <div className="relative grid grid-cols-5 items-center max-w-md mx-auto py-1">
              {/* Sliding capsule indicator with larger bounds & tertiary color tint */}
              {activeNavIndex !== -1 && (
                <div
                  className="absolute -inset-y-0.5 w-1/5 px-1 py-0.5 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none z-0"
                  style={{
                    transform: `translateX(${activeNavIndex * 100}%)`,
                  }}
                >
                  <div className="w-full h-full rounded-2xl bg-[var(--accent-tertiary-subtle)]/40 dark:bg-[var(--accent-tertiary-subtle)]/25 border border-[var(--accent-tertiary)]/35 dark:border-[var(--accent-tertiary)]/40 shadow-sm" />
                </div>
              )}

              {primaryItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all duration-200 active:scale-95 relative z-10 ${
                      isActive
                        ? 'text-neutral-900 dark:text-neutral-100 font-bold'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-xl transition-all duration-200 relative ${
                        isActive ? 'scale-105' : 'hover:scale-105'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-[var(--accent-tertiary)]' : ''}`} />
                      {isActive && (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent-tertiary)] shadow-[0_0_6px_var(--accent-tertiary)]" />
                      )}
                    </div>
                    <span className={`text-[10px] tracking-tight ${isActive ? 'font-black text-neutral-900 dark:text-neutral-100' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}

              {/* More button */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setIsMoreOpen(prev => !prev);
                }}
                className={`flex flex-col items-center justify-center gap-1 py-1 rounded-2xl transition-all duration-200 active:scale-95 relative z-10 ${
                  isMoreActive || isMoreOpen
                    ? 'text-neutral-900 dark:text-neutral-100 font-bold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all duration-200 ${
                    isMoreActive || isMoreOpen ? 'scale-105' : 'hover:scale-105'
                  }`}
                >
                  {isMoreOpen ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
                </div>
                <span className={`text-[10px] tracking-tight ${isMoreActive || isMoreOpen ? 'font-black text-neutral-900 dark:text-neutral-100' : 'font-medium'}`}>
                  More
                </span>
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  </>
);
};
