import React, { useMemo, useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { HomeworkItem, ScheduleItem, PeriodConfig, Subject } from '../types';
import { useNotification } from '../context/NotificationContext';
import { triggerHaptic } from '../utils/haptics';
import { getStreakData } from '../utils/streak';
import { generateDailySchedulePlan } from '../utils/smartAi';
import { sendInstantNotification } from '../utils/notifications';
import { TasksModal } from '../components/common/TasksModal';
import { AndroidLiveNotification } from '../components/common/AndroidLiveNotification';
import { BroadcastTicker } from '../components/common/BroadcastTicker';
import {
  Clock,
  Calendar,
  ChevronRight,
  ClipboardCheck,
  Umbrella,
  ListTodo,
  CheckCircle2,
  AlertCircle,
  Plus,
  Flame,
  Sparkles,
  BellRing,
  PlayCircle,
  Radio,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';

interface DashboardProps {
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const { showToast } = useNotification();

  const settingsList = useLiveQuery(() => db.settings.toArray());
  const currentSettings = settingsList?.[0];
  const schedules = useLiveQuery(() => db.schedules.toArray()) || [];
  const periodConfigs = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const facultyList = useLiveQuery(() => db.faculty.toArray()) || [];
  const tasks = useLiveQuery(() => db.homeworkItems.toArray()) || [];

  const [isTasksModalOpen, setIsTasksModalOpen] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const streakData = useMemo(() => getStreakData(), []);

  // Update real-time clock every 10 seconds for real-time Active / Upcoming calculation
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  const todayName = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }, []);

  const todayDateStr = useMemo(() => format(currentTime, 'yyyy-MM-dd'), [currentTime]);

  const todayHoliday = useMemo(() => {
    return currentSettings?.holidays?.find(h => h.date === todayDateStr);
  }, [currentSettings, todayDateStr]);

  const isSaturdayDisabled = todayName === 'Saturday' && currentSettings?.disableSaturday !== false;
  const isSunday = todayName === 'Sunday';
  const isHoliday = !!todayHoliday;
  const isOffDay = isHoliday || isSaturdayDisabled || isSunday;

  const todaySchedules = useMemo(() => {
    if (isOffDay) return [];
    return schedules
      .filter(s => s.dayOfWeek === todayName)
      .sort((a, b) => a.periodNumber - b.periodNumber);
  }, [schedules, todayName, isOffDay]);

  const toggleTodayHoliday = async () => {
    if (!currentSettings?.id) return;
    const existing = currentSettings.holidays || [];
    if (isHoliday) {
      const updated = existing.filter(h => h.date !== todayDateStr);
      await db.settings.update(currentSettings.id, { holidays: updated });
      showToast('Holiday Removed', 'Classes and schedule resumed for today', 'info');
    } else {
      const updated = [
        ...existing,
        {
          id: Math.random().toString(36).substring(2, 9),
          date: todayDateStr,
          title: 'Official Holiday',
          type: 'institutional' as const
        }
      ];
      await db.settings.update(currentSettings.id, { holidays: updated });
      showToast('Holiday Marked', `Today (${todayDateStr}) is marked as a holiday`, 'success');
    }
  };

  // Real-Time Active & Upcoming Period Detector
  const { activeItem, upcomingItem, statusType } = useMemo(() => {
    if (isOffDay) {
      return {
        activeItem: null,
        upcomingItem: null,
        statusType: 'idle' as const
      };
    }

    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    let foundActive: { schedule: ScheduleItem; config: PeriodConfig; subject?: Subject } | null = null;
    let foundUpcoming: { schedule: ScheduleItem; config: PeriodConfig; subject?: Subject; minsLeft: number } | null = null;

    for (const sched of todaySchedules) {
      const pc = periodConfigs.find(p => p.periodNumber === sched.periodNumber);
      if (!pc || !pc.startTime || !pc.endTime) continue;

      const [startH, startM] = pc.startTime.split(':').map(Number);
      const [endH, endM] = pc.endTime.split(':').map(Number);

      const startTotalMins = startH * 60 + startM;
      const endTotalMins = endH * 60 + endM;

      const sub = subjects.find(s => s.code === sched.subjectCode);

      // Check Active Now (current time is between start & end time)
      if (nowMinutes >= startTotalMins && nowMinutes <= endTotalMins) {
        foundActive = { schedule: sched, config: pc, subject: sub };
        break;
      }

      // Check Upcoming in 10 Mins (current time is between start - 10 and start)
      if (nowMinutes >= startTotalMins - 10 && nowMinutes < startTotalMins) {
        const minsLeft = startTotalMins - nowMinutes;
        foundUpcoming = { schedule: sched, config: pc, subject: sub, minsLeft };
        break;
      }
    }

    if (foundActive) {
      return { activeItem: foundActive, upcomingItem: null, statusType: 'active' as const };
    } else if (foundUpcoming) {
      return { activeItem: null, upcomingItem: foundUpcoming, statusType: 'upcoming' as const };
    }

    // No active class and no class starting within 10 minutes
    return {
      activeItem: null,
      upcomingItem: null,
      statusType: 'idle' as const
    };
  }, [currentTime, todaySchedules, periodConfigs, subjects, isOffDay]);

  // Next later class calculation for standby information
  const nextLaterClass = useMemo(() => {
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    for (const sched of todaySchedules) {
      const pc = periodConfigs.find(p => p.periodNumber === sched.periodNumber);
      if (!pc || !pc.startTime) continue;
      const [sh, sm] = pc.startTime.split(':').map(Number);
      const startM = sh * 60 + sm;
      if (nowMinutes < startM) {
        const sub = subjects.find(s => s.code === sched.subjectCode);
        return { schedule: sched, config: pc, subject: sub, startsInMins: startM - nowMinutes };
      }
    }
    return null;
  }, [currentTime, todaySchedules, periodConfigs, subjects]);

  const pendingTasks = useMemo(() => {
    return tasks
      .filter(t => !t.isCompleted)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks]);

  // AI Daily Schedule Plan
  const aiDayPlan = useMemo(() => {
    return generateDailySchedulePlan(todaySchedules, pendingTasks, streakData.currentStreak);
  }, [todaySchedules, pendingTasks, streakData]);

  // Ongoing Live Class Notification handles all real-time class activity and upcoming countdowns exclusively.

  const toggleTaskCompleted = async (task: HomeworkItem) => {
    triggerHaptic('success');
    if (task.id) {
      await db.homeworkItems.update(task.id, { isCompleted: !task.isCompleted });
      showToast(task.isCompleted ? 'Marked Active' : 'Task Completed', undefined, 'success');
    }
  };

  const handleTestNotification = async () => {
    triggerHaptic('medium');
    const firstSub = subjects[0] || { code: 'SUB101', name: 'General Subject', color: '#1e5a80' };
    const firstSched = todaySchedules[0] || {
      periodNumber: 1,
      subjectCode: firstSub.code,
      facultyName: facultyList[0]?.name || 'Course Faculty',
      classroom: '101'
    };
    const firstPc = periodConfigs[0] || { periodNumber: 1, startTime: '09:00', endTime: '09:50' };

    const title = `Upcoming Class in 10 Mins: Period ${firstSched.periodNumber} (${firstSched.subjectCode})`;
    const body = `${firstSub.name} starts at ${firstPc.startTime} in Room ${firstSched.classroom || '101'} with ${firstSched.facultyName || 'Faculty'}. Prepare attendance roster!`;

    await sendInstantNotification(title, body);

    showToast({
      title: `Period ${firstSched.periodNumber} • ${firstSched.subjectCode}`,
      message: `${firstSub.name} starts at ${firstPc.startTime} in Room ${firstSched.classroom || '101'} with ${firstSched.facultyName || 'Faculty'}.`,
      type: 'info',
      subjectColor: firstSub.color || '#1e5a80',
      subjectCode: firstSched.subjectCode,
      periodNumber: firstSched.periodNumber,
      startTime: firstPc.startTime,
      classroom: firstSched.classroom || '101',
      facultyName: firstSched.facultyName,
      aiNote: `AI Focus: Prepare class roster for ${firstSub.name}. Ensure attendance is taken on time.`,
      actionText: 'Take Attendance',
      onAction: () => setActiveTab('attendance')
    });
  };

  // Determine current active or upcoming display text
  const heroSchedule = activeItem?.schedule || upcomingItem?.schedule;
  const heroConfig = activeItem?.config || upcomingItem?.config;
  const heroSubject = activeItem?.subject || upcomingItem?.subject;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-36 space-y-6 animate-fade-in-up">
      {/* 24-HOUR ADMINISTRATIVE BROADCAST ANNOUNCEMENT CARD */}
      <BroadcastTicker />

      {/* Flame Activity Streak & Summary Bar */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-3xl bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 shadow-sm backdrop-blur-sm card-interactive animate-scale-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shadow-md shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-black text-neutral-900 dark:text-white flex items-center gap-1.5">
              {streakData.currentStreak}-Day Activity Streak
            </span>
            <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mt-0.5">
              Best: {streakData.bestStreak} Days • Keep logging attendance daily
            </span>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('reports')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 text-xs font-bold shadow-sm hover:bg-neutral-200 dark:hover:bg-[#333333] hover:scale-105 active:scale-95 transition-all shrink-0"
        >
          <Calendar className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" /> View History
        </button>
      </div>

      {/* REAL-TIME LIVE PROGRESS & CLASS ACTIVITY (DASHBOARD PROGRESS) */}
      <AndroidLiveNotification
        onNavigateToAttendance={(period) => setActiveTab('attendance')}
        onNavigateToSchedule={() => setActiveTab('schedule')}
      />

      {/* REAL-TIME ACTIVE NOW & UPCOMING CLASS HERO BANNER */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-sm relative overflow-hidden card-interactive">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* STATUS BADGE */}
              {isHoliday ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--accent-tertiary)] text-white text-xs font-black shadow-md shadow-[var(--accent-tertiary-glow)]">
                  <Umbrella className="w-4 h-4" /> OFFICIAL HOLIDAY ({todayHoliday?.title?.toUpperCase() || 'INSTITUTIONAL BREAK'})
                </span>
              ) : statusType === 'active' && heroSchedule ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--accent-tertiary)] text-white text-xs font-black shadow-md shadow-[var(--accent-tertiary-glow)] animate-pulse">
                  <Radio className="w-4 h-4" /> ACTIVE NOW (Period {heroSchedule.periodNumber})
                </span>
              ) : statusType === 'upcoming' && heroSchedule ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-black shadow-md animate-pulse">
                  <Clock className="w-4 h-4" /> UPCOMING IN {upcomingItem?.minsLeft} MINS (Period {heroSchedule.periodNumber})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" /> Standby • No Active Class
                </span>
              )}

              <span className="px-3.5 py-1.5 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 text-xs font-bold">
                {format(currentTime, 'EEE, dd MMM • HH:mm:ss')}
              </span>

              <button
                onClick={toggleTodayHoliday}
                title={isHoliday ? "Click to resume regular classes for today" : "Click to mark today as a holiday"}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all duration-200 active:scale-95 ${
                  isHoliday
                    ? 'border-[var(--accent-tertiary)] bg-[var(--accent-tertiary-subtle)] text-[var(--accent-tertiary)] hover:opacity-90'
                    : 'border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#333333]'
                }`}
              >
                <Umbrella className="w-3.5 h-3.5" /> {isHoliday ? 'Holiday Active (Unmark)' : 'Mark Holiday'}
              </button>
            </div>

            {/* HOLIDAY STATE HERO */}
            {isHoliday ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-1.5 flex items-center gap-2.5">
                    <span>Holiday: {todayHoliday?.title || 'Enjoy Your Break!'}</span>
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed max-w-2xl">
                    Today ({format(currentTime, 'EEEE, dd MMMM yyyy')}) is recorded as an official holiday in your academic calendar. Regular classes and timetable reminder notifications are paused.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveTab('schedule');
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    <Calendar className="w-4 h-4" /> View Weekly Timetable
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveTab('settings');
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-[#333333] font-bold text-xs shadow-sm transition-all active:scale-95"
                  >
                    <Umbrella className="w-4 h-4" /> Manage Holiday Calendar
                  </button>
                </div>
              </div>
            ) : (statusType === 'active' || statusType === 'upcoming') && heroSchedule ? (
              /* ACTIVE OR UPCOMING CLASS IN PROGRESS */
              <>
                <div>
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
                      Period {heroSchedule.periodNumber}: {heroSubject ? heroSubject.name : heroSchedule.subjectCode}
                    </h2>
                    {heroSubject?.color && (
                      <span
                        className="w-4 h-4 rounded-full inline-block shadow-sm ring-2 ring-neutral-200 dark:ring-neutral-700 shrink-0"
                        style={{ backgroundColor: heroSubject.color }}
                        title={`Subject Color: ${heroSubject.name}`}
                      />
                    )}
                  </div>

                  <p className="text-sm text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed">
                    Faculty: <strong className="text-neutral-900 dark:text-white font-bold">{heroSchedule.facultyName || 'Faculty'}</strong> • Classroom: <span className="font-bold text-neutral-800 dark:text-neutral-200">{heroSchedule.classroom || 'General'}</span> • Timing: <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">({heroConfig?.startTime} - {heroConfig?.endTime})</span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    triggerHaptic('medium');
                    setActiveTab('attendance');
                  }}
                  className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-black text-sm shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-95"
                >
                  <ClipboardCheck className="w-5 h-5" /> Take Attendance for Period {heroSchedule.periodNumber} Now
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </>
            ) : (
              /* STANDBY / NO CLASS ACTIVE STATE */
              <>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-1.5">
                    No Class Currently in Session
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed">
                    {nextLaterClass ? (
                      <>
                        Next class today is <strong className="text-neutral-900 dark:text-white font-bold">Period {nextLaterClass.schedule.periodNumber} ({nextLaterClass.subject?.name || nextLaterClass.schedule.subjectCode})</strong> starting at <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{nextLaterClass.config.startTime}</span> in Room {nextLaterClass.schedule.classroom || 'General'} (in {Math.floor(nextLaterClass.startsInMins / 60) > 0 ? `${Math.floor(nextLaterClass.startsInMins / 60)}h ` : ''}{nextLaterClass.startsInMins % 60}m).
                      </>
                    ) : todaySchedules.length > 0 ? (
                      <>All scheduled periods for today ({todayName}) have finished.</>
                    ) : isSunday || isSaturdayDisabled ? (
                      <>Weekend — No classes are scheduled for today ({todayName}).</>
                    ) : (
                      <>No classes are scheduled for today ({todayName}).</>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setActiveTab('attendance');
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    <ClipboardCheck className="w-4 h-4" /> Take Attendance (Manual)
                  </button>

                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveTab('schedule');
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-[#333333] font-bold text-xs shadow-sm transition-all active:scale-95"
                  >
                    <Calendar className="w-4 h-4" /> View Full Timetable
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI SMART DAILY SCHEDULE & TASK PLANNER */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5 card-interactive">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                AI Smart Daily Schedule & Task Planner
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {aiDayPlan.summary}
              </p>
            </div>
          </div>

          <div className="w-14 h-14 shrink-0 hidden sm:flex items-center justify-center">
            <img
              src="/illustrations/ai_assistant.jpg"
              alt="AI Assistant"
              className="w-full h-full object-contain blend-illustration"
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 text-xs">
          <span className="font-extrabold text-neutral-900 dark:text-white block uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" /> Today's AI Focus Goal
          </span>
          <p className="font-bold text-neutral-800 dark:text-neutral-200 text-xs sm:text-sm">
            {aiDayPlan.focusGoal}
          </p>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {aiDayPlan.blocks.map((block: any, idx: number) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex items-start justify-between gap-3 text-xs hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-200"
            >
              <div>
                <span className="font-mono font-bold text-neutral-400 text-[10px] block mb-0.5">
                  {block.timeSlot}
                </span>
                <h4 className="font-extrabold text-neutral-900 dark:text-white text-xs sm:text-sm">
                  {block.activity}
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {block.suggestion}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase shrink-0 shadow-sm bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                {block.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tasks, Assignments & Exam Reminders Widget */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 card-interactive">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-[#262626] text-neutral-900 dark:text-white flex items-center justify-center font-bold shrink-0">
              <ListTodo className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white">
                Tasks & Exam Reminders
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 text-[10px] font-extrabold whitespace-nowrap shrink-0 animate-badge-pop">
                {pendingTasks.length} Pending
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsTasksModalOpen(true)}
            className="text-xs font-bold text-neutral-900 dark:text-white hover:underline flex items-center gap-1 shrink-0 self-end sm:self-auto hover:translate-x-1 transition-transform"
          >
            Manage All <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 italic bg-neutral-50 dark:bg-[#262626] rounded-2xl">
            No pending tasks or exam reminders. Tap "Manage All" to add one.
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingTasks.slice(0, 3).map((task, idx) => {
              const dueObj = new Date(task.dueDate);
              const overdue = isPast(dueObj) && !isToday(dueObj);

              let badgeColor = 'bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200';
              if (task.type === 'exam') badgeColor = 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';

              return (
                <div
                  key={task.id}
                  className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-3 hover:border-neutral-400 dark:hover:border-neutral-600 transition-all duration-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => toggleTaskCompleted(task)}
                      className="w-6 h-6 rounded-lg border border-neutral-300 dark:border-neutral-600 hover:border-neutral-900 dark:hover:border-white hover:scale-110 active:scale-95 flex items-center justify-center shrink-0 transition-all"
                    >
                      {task.isCompleted && <CheckCircle2 className="w-4 h-4 text-[var(--accent-tertiary)]" />}
                    </button>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${badgeColor}`}>
                          {task.type}
                        </span>
                        {task.subjectCode && (
                          <span className="text-[10px] font-mono font-bold text-neutral-400">
                            {task.subjectCode}
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {task.title}
                      </h4>
                    </div>
                  </div>

                  <span className={`text-[11px] font-bold shrink-0 font-mono px-2.5 py-1 rounded-full ${
                    overdue ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 animate-pulse' : 'bg-neutral-200 dark:bg-[#171717] text-neutral-700 dark:text-neutral-300'
                  }`}>
                    {overdue ? 'Overdue' : task.dueDate}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Today's Classes Section */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 card-interactive">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-neutral-900 dark:text-white" /> Today's Classes
          </h3>
          <button
            onClick={() => setActiveTab('schedule')}
            className="text-xs font-bold text-neutral-900 dark:text-white hover:underline flex items-center gap-1 hover:translate-x-1 transition-transform"
          >
            Manage Schedule <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {todaySchedules.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-400 italic bg-neutral-50 dark:bg-[#262626] rounded-2xl flex flex-col items-center justify-center gap-1.5 px-4">
            {isHoliday ? (
              <>
                <span className="font-bold text-[var(--accent-tertiary)] not-italic text-sm">
                  Today is an Official Holiday ({todayHoliday?.title || 'Institutional Holiday'})
                </span>
                <span>Timetable classes and lecture sessions are paused for the day.</span>
              </>
            ) : isSunday || isSaturdayDisabled ? (
              <span>Weekend — No classes scheduled for today.</span>
            ) : (
              <span>No classes scheduled for today.</span>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {todaySchedules.map((item, idx) => {
              const pc = periodConfigs.find(p => p.periodNumber === item.periodNumber);
              const sub = subjects.find(s => s.code === item.subjectCode);

              const nowMins = currentTime.getHours() * 60 + currentTime.getMinutes();
              let isPeriodActiveNow = false;
              let isPeriodUpcoming10Mins = false;

              if (pc && pc.startTime && pc.endTime) {
                const [sh, sm] = pc.startTime.split(':').map(Number);
                const [eh, em] = pc.endTime.split(':').map(Number);
                const startM = sh * 60 + sm;
                const endM = eh * 60 + em;

                isPeriodActiveNow = nowMins >= startM && nowMins <= endM;
                isPeriodUpcoming10Mins = nowMins >= startM - 10 && nowMins < startM;
              }

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-200 hover:scale-[1.01] ${
                    isPeriodActiveNow
                      ? 'bg-[var(--accent-tertiary-subtle)] border-[var(--accent-tertiary)] shadow-md shadow-[var(--accent-tertiary-glow)]'
                      : isPeriodUpcoming10Mins
                      ? 'bg-neutral-100 dark:bg-[#262626] border-neutral-400 dark:border-neutral-600 shadow-md'
                      : 'bg-neutral-50 dark:bg-[#262626] border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-2xl text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md transition-transform hover:scale-105"
                      style={{ backgroundColor: sub?.color || '#171717' }}
                    >
                      P{item.periodNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                          {sub ? sub.name : item.subjectCode}
                        </h4>
                        {isPeriodActiveNow && (
                          <span className="px-2 py-0.5 rounded-full bg-[var(--accent-tertiary)] text-white text-[10px] font-black uppercase shadow-sm flex items-center gap-1 animate-pulse">
                            <Radio className="w-3 h-3" /> Active Now
                          </span>
                        )}
                        {isPeriodUpcoming10Mins && (
                          <span className="px-2 py-0.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[10px] font-black uppercase shadow-sm animate-bounce">
                            Starts Soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                        {item.facultyName && `Faculty: ${item.facultyName}`}
                        {item.classroom && ` • Room ${item.classroom}`}
                      </p>
                      <span className="text-xs font-mono font-bold text-neutral-400 mt-1 block">
                        {pc ? `${pc.startTime} - ${pc.endTime}` : `Period ${item.periodNumber}`}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setActiveTab('attendance');
                    }}
                    className="px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-all shrink-0 hover:scale-105 active:scale-95"
                  >
                    Log Session
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tasks Modal */}
      <TasksModal isOpen={isTasksModalOpen} onClose={() => setIsTasksModalOpen(false)} />
    </div>
  );
};
