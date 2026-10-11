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
        className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] left-0 right-0 z-40 md:hidden flex justify-center px-3.5 pointer-events-none transition-transform duration-300 ease-in-out ${
          isDialogOpen ? 'translate-y-28 opacity-0' : 'translate-y-0 opacity-100'
        }`}
        ref={moreRef}
      >
        <div className="pointer-events-auto w-full max-w-sm sm:max-w-md bg-white/90 dark:bg-[#141416]/90 backdrop-blur-2xl border border-neutral-200/90 dark:border-white/10 rounded-full px-2 py-1 shadow-[0_10px_35px_rgba(0,0,0,0.12)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.65)] relative z-40 ring-1 ring-black/5 dark:ring-white/5">
          {/* More menu popup with expanding spring animation */}
          {isMoreOpen && (
            <div className="absolute bottom-[calc(100%+0.75rem)] right-2 pb-1 w-56 max-w-[85vw] more-menu-expand z-50">
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

        {/* Main nav items with fluid sliding capsule animation */}
        {(() => {
          const targetNavIndex = isMoreActive || isMoreOpen ? 4 : primaryItems.findIndex(item => item.id === activeTab);
          return (
            <div className="relative grid grid-cols-5 items-center w-full py-0.5">
              {/* Fluid sliding capsule indicator with spring physics and liquid stretch */}
              {targetNavIndex !== -1 && (
                <div
                  className="absolute inset-y-0.5 w-1/5 px-1 pointer-events-none z-0 transition-transform duration-500 ease-[cubic-bezier(0.32,1.25,0.32,1)]"
                  style={{
                    transform: `translateX(${targetNavIndex * 100}%)`,
                  }}
                >
                  <div
                    className={`w-full h-full bg-[var(--accent-tertiary-subtle)]/45 dark:bg-[var(--accent-tertiary-subtle)]/30 border border-[var(--accent-tertiary)]/40 dark:border-[var(--accent-tertiary)]/45 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.4)] backdrop-blur-md relative overflow-hidden transition-all duration-500 ${
                      targetNavIndex === 0
                        ? 'rounded-l-full rounded-r-xl'
                        : targetNavIndex === 4
                        ? 'rounded-r-full rounded-l-xl'
                        : 'rounded-xl'
                    }`}
                  >
                    {/* Fluid liquid specular sheen highlight */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-black/5 dark:from-white/12 dark:to-transparent pointer-events-none" />
                    {/* Ambient glow droplet behind active icon */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--accent-tertiary)]/20 blur-md pointer-events-none" />
                  </div>
                </div>
              )}

              {primaryItems.map((item, idx) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const cornerRadiusClass =
                  idx === 0
                    ? 'rounded-l-full rounded-r-xl'
                    : 'rounded-xl';
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`flex flex-col items-center justify-center py-1 transition-all duration-300 active:scale-95 relative z-10 w-full select-none ${cornerRadiusClass} ${
                      isActive
                        ? 'text-neutral-900 dark:text-neutral-100 font-bold'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                    }`}
                  >
                    <div className="relative flex items-center justify-center pt-0.5">
                      <Icon
                        className={`w-5 h-5 transition-transform duration-500 ${
                          isActive
                            ? 'text-[var(--accent-tertiary)] scale-110 animate-fluid-pop'
                            : 'hover:scale-105'
                        }`}
                      />
                    </div>

                    {/* Active dot indicator: perfectly centered, with clean clearance from icon and text */}
                    <div className="h-2 flex items-center justify-center my-0.5">
                      {isActive ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-tertiary)] shadow-[0_0_8px_var(--accent-tertiary)] animate-fluid-dot" />
                      ) : (
                        <span className="w-1.5 h-1.5 opacity-0" />
                      )}
                    </div>

                    <span
                      className={`text-[10px] tracking-tight leading-none px-0.5 truncate max-w-full text-center transition-colors duration-300 ${
                        isActive
                          ? 'font-bold text-neutral-900 dark:text-neutral-100'
                          : 'font-medium'
                      }`}
                    >
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
                className={`flex flex-col items-center justify-center py-1 rounded-r-full rounded-l-xl transition-all duration-300 active:scale-95 relative z-10 w-full select-none ${
                  isMoreActive || isMoreOpen
                    ? 'text-neutral-900 dark:text-neutral-100 font-bold'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'
                }`}
              >
                <div className="relative flex items-center justify-center pt-0.5">
                  {isMoreOpen ? (
                    <X className="w-5 h-5 text-[var(--accent-tertiary)] animate-fluid-pop" />
                  ) : (
                    <MoreHorizontal
                      className={`w-5 h-5 transition-transform duration-500 ${
                        isMoreActive ? 'text-[var(--accent-tertiary)] scale-110 animate-fluid-pop' : 'hover:scale-105'
                      }`}
                    />
                  )}
                </div>

                {/* More button dot indicator */}
                <div className="h-2 flex items-center justify-center my-0.5">
                  {isMoreActive || isMoreOpen ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-tertiary)] shadow-[0_0_8px_var(--accent-tertiary)] animate-fluid-dot" />
                  ) : (
                    <span className="w-1.5 h-1.5 opacity-0" />
                  )}
                </div>

                <span
                  className={`text-[10px] tracking-tight leading-none px-0.5 truncate max-w-full text-center transition-colors duration-300 ${
                    isMoreActive || isMoreOpen ? 'font-bold text-neutral-900 dark:text-neutral-100' : 'font-medium'
                  }`}
                >
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
