import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { useTheme } from '../../context/ThemeContext';
import { triggerHaptic } from '../../utils/haptics';
import {
  User,
  Bell,
  Moon,
  Sun,
  Monitor,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Calendar,
  X,
  Radio,
  Sparkles,
  Umbrella
} from 'lucide-react';
import { format, isToday, isPast } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [isNotifOpen, setIsNotifOpen] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const settings = useLiveQuery(() => db.settings.toArray());
  const schedules = useLiveQuery(() => db.schedules.toArray()) || [];
  const periodConfigs = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray()) || [];
  const tasks = useLiveQuery(() => db.homeworkItems.toArray()) || [];
  const currentSettings = settings?.[0];

  const classRep = currentSettings?.classRepName || 'Class Representative';
  const className = currentSettings?.className || 'My Class';
  const section = currentSettings?.section || 'Section A';
  const profilePhoto = currentSettings?.profilePhoto;
  const todayStr = format(new Date(), 'EEE, dd MMM');

  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Close notification popover on outside click / tap
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isNotifOpen]);

  // Compute current period from real-time clock, considering holidays & off-days
  const { currentPeriodLabel, activeSched, nextSched, isTodayHoliday, todayHolidayTitle } = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[currentTime.getDay()];
    const todayDateStr = format(currentTime, 'yyyy-MM-dd');

    const holiday = currentSettings?.holidays?.find(h => h.date === todayDateStr);
    const isSaturdayDisabled = todayName === 'Saturday' && currentSettings?.disableSaturday !== false;
    const isSunday = todayName === 'Sunday';

    if (holiday) {
      return {
        currentPeriodLabel: `Holiday (${holiday.title || 'Official Break'})`,
        activeSched: null,
        nextSched: null,
        isTodayHoliday: true,
        todayHolidayTitle: holiday.title || 'Institutional Holiday'
      };
    }

    if (isSunday || isSaturdayDisabled) {
      return {
        currentPeriodLabel: 'Weekend • No Classes',
        activeSched: null,
        nextSched: null,
        isTodayHoliday: false,
        todayHolidayTitle: ''
      };
    }

    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const todaySchedules = schedules.filter(s => s.dayOfWeek === todayName);
    let active: typeof schedules[0] | null = null;
    let next: { sched: typeof schedules[0]; minsLeft: number } | null = null;

    for (const sched of todaySchedules) {
      const pc = periodConfigs.find(p => p.periodNumber === sched.periodNumber);
      if (!pc || !pc.startTime || !pc.endTime) continue;

      const [startH, startM] = pc.startTime.split(':').map(Number);
      const [endH, endM] = pc.endTime.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;

      if (nowMinutes >= startTotal && nowMinutes <= endTotal) {
        active = sched;
        break;
      }
    }

    if (!active) {
      for (const sched of todaySchedules.sort((a, b) => a.periodNumber - b.periodNumber)) {
        const pc = periodConfigs.find(p => p.periodNumber === sched.periodNumber);
        if (!pc || !pc.startTime) continue;
        const [startH, startM] = pc.startTime.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        if (nowMinutes < startTotal) {
          next = { sched, minsLeft: startTotal - nowMinutes };
          break;
        }
      }
    }

    let label = 'Classes Done';
    if (active) label = `Period ${active.periodNumber}`;
    else if (next) label = `Next: P${next.sched.periodNumber}`;
    else if (todaySchedules.length === 0) label = 'No Classes';

    return {
      currentPeriodLabel: label,
      activeSched: active,
      nextSched: next,
      isTodayHoliday: false,
      todayHolidayTitle: ''
    };
  }, [currentTime, schedules, periodConfigs, currentSettings]);

  const pendingTasks = useMemo(() => {
    return tasks.filter(t => !t.isCompleted);
  }, [tasks]);

  const hasUnreadAlerts = pendingTasks.length > 0 || !!activeSched || !!nextSched;
  const isAttendance = activeTab === 'attendance';

  return (
    <header
      className={`sticky top-0 z-30 w-full bg-[#FAFAFA]/95 dark:bg-[#0A0A0A]/95 backdrop-blur-md px-3.5 sm:px-6 lg:px-8 border-neutral-200/80 dark:border-neutral-800 transition-all duration-500 ease-in-out ${
        isAttendance
          ? '-translate-y-full opacity-0 pointer-events-none max-h-0 py-0 border-b-transparent overflow-hidden'
          : 'translate-y-0 opacity-100 max-h-28 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2.5 sm:pb-3 border-b border-b-neutral-200/80 dark:border-b-neutral-800'
      }`}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 md:max-w-full">
        {/* Profile Avatar & Greeting with SidebarTrigger on Desktop */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <SidebarTrigger className="hidden md:flex shrink-0" />
          <div
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('profile');
            }}
            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group select-none"
            title="View & Edit Profile"
          >
            <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-2xl overflow-hidden bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shrink-0 shadow-md ring-1 ring-[var(--accent-tertiary-subtle)] group-hover:ring-2 group-hover:ring-[var(--accent-tertiary)] transition-all">
              {profilePhoto ? (
                <img src={profilePhoto} alt={classRep} className="w-full h-full object-cover" />
              ) : (
                <User className="w-4.5 h-4.5 sm:w-6 sm:h-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-2xl font-black text-neutral-900 dark:text-neutral-100 tracking-tight leading-tight group-hover:underline">
                Hello, {classRep}
              </h1>
              <p className="text-[11px] sm:text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-snug">
                <span>{className}</span>
                <span>•</span>
                <span>{section}</span>
                <span>•</span>
                <span className="font-bold text-[var(--accent-tertiary)]">{currentPeriodLabel}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 relative" ref={notifRef}>
          {/* Real Notification Center Popover */}
          <div className="relative">
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsNotifOpen(prev => !prev);
              }}
              title="Notification Center"
              className={`w-10 h-10 rounded-full border text-neutral-700 dark:text-neutral-200 flex items-center justify-center shadow-sm transition-all relative ${
                isNotifOpen
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100 ring-2 ring-[var(--accent-tertiary-subtle)]'
                  : 'bg-white dark:bg-[#171717] border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-[#262626]'
              }`}
            >
              <Bell className="w-4 h-4" />
              {hasUnreadAlerts && !isNotifOpen && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--accent-tertiary)] shadow-[0_0_8px_var(--accent-tertiary)] animate-pulse" />
              )}
            </button>

            {/* Notification Center Dropdown */}
            {isNotifOpen && (
              <>
                {/* Mobile backdrop overlay */}
                <div
                  className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40 sm:hidden animate-fade-in"
                  onClick={() => setIsNotifOpen(false)}
                />

                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-12 max-w-sm sm:max-w-none sm:w-96 mx-auto sm:mx-0 bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl shadow-2xl p-4 z-50 animate-scale-in space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-[#262626] text-neutral-900 dark:text-neutral-100 flex items-center justify-center">
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-black text-xs text-neutral-900 dark:text-white uppercase tracking-wider">
                        Notification Center
                      </span>
                    </div>
                    <button
                      onClick={() => setIsNotifOpen(false)}
                      className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <Separator />

                  {/* Today Holiday Banner */}
                  {isTodayHoliday && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
                      <Umbrella className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-amber-700 dark:text-amber-300 block">
                          Today is a Holiday: {todayHolidayTitle}
                        </span>
                        <p className="text-neutral-600 dark:text-neutral-300 mt-0.5">
                          Regular class schedule and period notifications are suspended for the holiday.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Active / Next Period Card */}
                  {activeSched && (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                      <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                      <div className="text-xs">
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 block">
                          Period {activeSched.periodNumber} is Active Now
                        </span>
                        <p className="text-neutral-600 dark:text-neutral-300 mt-0.5">
                          {activeSched.subjectCode} • Room {activeSched.classroom || '101'} • {activeSched.facultyName || 'Faculty'}
                        </p>
                      </div>
                    </div>
                  )}

                  {nextSched && !activeSched && (
                    <div className="p-3 rounded-2xl bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-neutral-700 dark:text-neutral-300 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <span className="font-bold text-neutral-900 dark:text-white block">
                          Period {nextSched.sched.periodNumber} in {nextSched.minsLeft} Mins
                        </span>
                        <p className="text-neutral-600 dark:text-neutral-400 mt-0.5">
                          {nextSched.sched.subjectCode} • {nextSched.sched.facultyName || 'Faculty'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Pending Tasks Summary */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                      Pending Tasks & Deadlines ({pendingTasks.length})
                    </span>

                    {pendingTasks.length === 0 ? (
                      <div className="py-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
                        No pending tasks or exams due.
                      </div>
                    ) : (
                      pendingTasks.slice(0, 3).map(task => (
                        <div
                          key={task.id}
                          className="p-2.5 rounded-xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-neutral-900 dark:text-white block truncate">
                              {task.title}
                            </span>
                            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                              Due {task.dueDate} • {task.subjectCode}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-mono text-[10px] font-bold shrink-0">
                            {task.type.toUpperCase()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setIsNotifOpen(false);
                        setActiveTab('attendance');
                      }}
                      className="py-2 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-bold text-center transition-colors"
                    >
                      Take Attendance
                    </button>
                    <button
                      onClick={() => {
                        setIsNotifOpen(false);
                        setActiveTab('reports');
                      }}
                      className="py-2 px-3 rounded-xl bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 text-xs font-bold text-center hover:bg-neutral-200 dark:hover:bg-[#333333] transition-colors"
                    >
                      View Logs
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Theme Toggle Button with Dribbble-style circular expand/contract */}
          <button
            onClick={(e) => {
              triggerHaptic('medium');
              toggleTheme(e);
            }}
            title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
            aria-label="Toggle dark and light theme"
            className="w-10 h-10 rounded-full bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200 flex items-center justify-center shadow-sm hover:bg-neutral-50 dark:hover:bg-[#262626] transition-all duration-200 active:scale-90 relative overflow-hidden group"
          >
            <div className="relative w-4 h-4 flex items-center justify-center">
              <Sun
                className={`w-4 h-4 text-amber-500 absolute transition-all duration-300 transform ${
                  isDark
                    ? 'rotate-90 scale-0 opacity-0'
                    : 'rotate-0 scale-100 opacity-100'
                }`}
              />
              <Moon
                className={`w-4 h-4 text-neutral-200 absolute transition-all duration-300 transform ${
                  isDark
                    ? 'rotate-0 scale-100 opacity-100'
                    : '-rotate-90 scale-0 opacity-0'
                }`}
              />
            </div>
          </button>

          {/* Direct Take Attendance Action Button */}
          <button
            onClick={() => {
              triggerHaptic('medium');
              setActiveTab('attendance');
            }}
            className="flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 shrink-0"
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Log Attendance</span>
          </button>
        </div>
      </div>
    </header>
  );
};
