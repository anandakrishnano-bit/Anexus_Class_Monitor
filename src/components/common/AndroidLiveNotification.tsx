import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { PeriodConfig, ScheduleItem, Subject } from '../../types';
import { triggerHaptic } from '../../utils/haptics';
import {
  Radio,
  Clock,
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { format } from 'date-fns';

interface AndroidLiveNotificationProps {
  onNavigateToAttendance?: (period: number) => void;
  onNavigateToSchedule?: () => void;
}

export const AndroidLiveNotification: React.FC<AndroidLiveNotificationProps> = ({
  onNavigateToAttendance,
  onNavigateToSchedule
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  const schedules = useLiveQuery(() => db.schedules.toArray()) || [];
  const periodConfigs = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const settingsList = useLiveQuery(() => db.settings.toArray());
  const currentSettings = settingsList?.[0];

  // Refresh real-time clock every 2 seconds for live countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 2000);
    return () => clearInterval(timer);
  }, []);

  const todayName = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[currentTime.getDay()];
  }, [currentTime]);

  const todayDateStr = useMemo(() => format(currentTime, 'yyyy-MM-dd'), [currentTime]);

  const isClassDay = useMemo(() => {
    if (todayName === 'Sunday') return false;
    if (todayName === 'Saturday' && currentSettings?.disableSaturday !== false) return false;
    if (currentSettings?.holidays?.some(h => h.date === todayDateStr)) return false;
    return true;
  }, [todayName, todayDateStr, currentSettings]);

  const todaySchedules = useMemo(() => {
    if (!isClassDay) return [];
    return schedules
      .filter(s => s.dayOfWeek === todayName)
      .sort((a, b) => a.periodNumber - b.periodNumber);
  }, [schedules, todayName, isClassDay]);

  // Real-time Active & Progress Calculation
  const liveState = useMemo(() => {
    if (!isClassDay || todaySchedules.length === 0 || periodConfigs.length === 0) {
      return null;
    }

    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const nowSecondsInMinute = currentTime.getSeconds();
    const nowPreciseMinutes = nowMinutes + nowSecondsInMinute / 60;

    // 1. Check Active Period
    for (const sched of todaySchedules) {
      const pc = periodConfigs.find(p => p.periodNumber === sched.periodNumber);
      if (!pc || !pc.startTime || !pc.endTime) continue;

      const [sh, sm] = pc.startTime.split(':').map(Number);
      const [eh, em] = pc.endTime.split(':').map(Number);
      const startTotal = sh * 60 + sm;
      const endTotal = eh * 60 + em;
      const duration = endTotal - startTotal;

      if (nowPreciseMinutes >= startTotal && nowPreciseMinutes <= endTotal) {
        const elapsed = nowPreciseMinutes - startTotal;
        const remaining = Math.max(0, endTotal - nowPreciseMinutes);
        const progress = duration > 0 ? Math.min(100, Math.max(0, (elapsed / duration) * 100)) : 0;
        const sub = subjects.find(s => s.code === sched.subjectCode);

        return {
          type: 'active' as const,
          periodNumber: sched.periodNumber,
          schedule: sched,
          config: pc,
          subject: sub,
          progress: Math.round(progress),
          elapsedMinutes: Math.floor(elapsed),
          remainingMinutes: Math.ceil(remaining),
          totalMinutes: duration,
          startTime: pc.startTime,
          endTime: pc.endTime
        };
      }
    }

    // 2. Check Upcoming in 15 mins or next period
    for (const sched of todaySchedules) {
      const pc = periodConfigs.find(p => p.periodNumber === sched.periodNumber);
      if (!pc || !pc.startTime) continue;

      const [sh, sm] = pc.startTime.split(':').map(Number);
      const startTotal = sh * 60 + sm;

      if (nowMinutes < startTotal) {
        const minsLeft = startTotal - nowMinutes;
        const sub = subjects.find(s => s.code === sched.subjectCode);

        return {
          type: 'upcoming' as const,
          periodNumber: sched.periodNumber,
          schedule: sched,
          config: pc,
          subject: sub,
          progress: 0,
          elapsedMinutes: 0,
          remainingMinutes: minsLeft,
          totalMinutes: 0,
          startTime: pc.startTime,
          endTime: pc.endTime
        };
      }
    }

    return null;
  }, [currentTime, todaySchedules, periodConfigs, subjects, isClassDay]);

  // Update Document Title for Recent Apps Switcher & Background Tab Preview
  useEffect(() => {
    if (liveState?.type === 'active') {
      const subCode = liveState.subject?.code || liveState.schedule.subjectCode;
      document.title = `[${liveState.progress}%] Period ${liveState.periodNumber}: ${subCode} (${liveState.remainingMinutes}m left) • Class Manager`;
    } else if (liveState?.type === 'upcoming') {
      const subCode = liveState.subject?.code || liveState.schedule.subjectCode;
      document.title = `Period ${liveState.periodNumber}: ${subCode} in ${liveState.remainingMinutes}m • Class Manager`;
    } else {
      document.title = 'Anexus Class Manager';
    }
  }, [liveState]);

  if (!liveState || isDismissed) {
    return null;
  }

  const subjectColor = liveState.subject?.color || '#3b82f6';

  return (
    <div className="w-full animate-fade-in-down">
      {/* Real-time Live Class Notification Card */}
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 shadow-sm text-neutral-900 dark:text-white transition-all duration-300">
        
        {/* Subtle Ambient Glow */}
        <div
          className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ backgroundColor: subjectColor }}
        />

        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 pb-3 flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Live Indicator Icon */}
            <div className="w-7 h-7 rounded-full bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0">
              {liveState.type === 'active' ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              ) : (
                <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              )}
            </div>

            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                {liveState.type === 'active' ? 'Live Class • In Session' : 'Upcoming Class • Schedule'}
              </span>

              {/* Subject Tag Pill */}
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm flex items-center gap-1"
                style={{ backgroundColor: subjectColor }}
              >
                Period {liveState.periodNumber} • {liveState.subject?.code || liveState.schedule.subjectCode}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsExpanded(prev => !prev);
              }}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                setIsDismissed(true);
              }}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
              title="Dismiss for now"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Notification Body */}
        {isExpanded && (
          <div className="p-4 sm:p-5 pt-3 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
                  {liveState.subject?.name || liveState.schedule.subjectCode}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
                  Faculty: <strong className="text-neutral-800 dark:text-neutral-200">{liveState.schedule.facultyName || 'Faculty'}</strong> • Room: <span className="text-neutral-800 dark:text-neutral-200 font-bold">{liveState.schedule.classroom || 'General'}</span>
                </p>
              </div>

              {/* Right Countdown Stats */}
              <div className="text-left sm:text-right">
                {liveState.type === 'active' ? (
                  <>
                    <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {liveState.remainingMinutes}m remaining
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block">
                      {liveState.elapsedMinutes}m / {liveState.totalMinutes}m elapsed ({liveState.progress}%)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400">
                      Starts in {liveState.remainingMinutes} mins
                    </span>
                    <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block">
                      Scheduled at {liveState.startTime}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Real-Time Subject Progress Track */}
            {liveState.type === 'active' && (
              <div className="space-y-1.5">
                <div className="w-full h-2.5 rounded-full bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                    style={{
                      width: `${liveState.progress}%`,
                      backgroundColor: subjectColor
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-neutral-500 dark:text-neutral-400">
                  <span>{liveState.startTime}</span>
                  <span className="text-neutral-700 dark:text-neutral-300 font-bold">{liveState.progress}% Progress</span>
                  <span>{liveState.endTime}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 pt-1 flex-wrap">
              <button
                onClick={() => {
                  triggerHaptic('medium');
                  onNavigateToAttendance?.(liveState.periodNumber);
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Take Attendance (Period {liveState.periodNumber})</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  onNavigateToSchedule?.();
                }}
                className="px-4 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-[#262626] dark:hover:bg-[#333333] border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Timetable</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
