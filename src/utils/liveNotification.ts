import { registerPlugin, Capacitor } from '@capacitor/core';
import { ScheduleItem, PeriodConfig, Subject, AppSettings } from '../types';
import { format, addDays } from 'date-fns';

export interface LiveNotificationPluginType {
  showOrUpdateLiveNotification(options: {
    title: string;
    message: string;
    subText?: string;
    capsuleText?: string;
    progress: number;
    maxProgress?: number;
    ongoing?: boolean;
    accentColor?: string;
    periodNumber?: number;
    startTimeMillis?: number;
    endTimeMillis?: number;
    subjectName?: string;
    classroom?: string;
    facultyName?: string;
  }): Promise<{ success: boolean; notificationId: number; originIslandEnabled?: boolean }>;

  dismissLiveNotification(): Promise<{ dismissed: boolean }>;

  isSupported(): Promise<{
    supported: boolean;
    sdkInt: number;
    isAndroid16Plus: boolean;
    isVivoOrIqoo?: boolean;
    brand?: string;
    manufacturer?: string;
  }>;

  openOriginIslandSettings(): Promise<{ opened: boolean }>;
  openBatteryOptimizationSettings(): Promise<{ opened: boolean }>;
}

export const LiveNotification = registerPlugin<LiveNotificationPluginType>('LiveNotification');

export interface LiveClassStatus {
  type: 'active' | 'upcoming' | 'standby' | 'idle';
  periodNumber?: number;
  schedule?: ScheduleItem;
  config?: PeriodConfig;
  subject?: Subject;
  progress: number; // 0 - 100
  elapsedMinutes: number;
  remainingMinutes: number;
  totalMinutes: number;
  startTime?: string;
  endTime?: string;
  startTimeMillis?: number;
  endTimeMillis?: number;
  capsuleText?: string;
  nextClassText?: string;
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Calculates current active, upcoming, or standby class status from database records
 */
export function getCurrentLiveClassStatus(
  schedules: ScheduleItem[],
  periodConfigs: PeriodConfig[],
  subjects: Subject[],
  settings?: AppSettings,
  currentTime: Date = new Date()
): LiveClassStatus {
  const todayName = DAYS_OF_WEEK[currentTime.getDay()];
  const todayDateStr = format(currentTime, 'yyyy-MM-dd');

  const isSunday = todayName === 'Sunday';
  const isSaturdayDisabled = todayName === 'Saturday' && settings?.disableSaturday !== false;
  const isTodayHoliday = settings?.holidays?.some(h => h.date === todayDateStr);

  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const nowSeconds = currentTime.getSeconds();
  const nowPreciseMinutes = nowMinutes + nowSeconds / 60;

  // 1. If today is a valid class day, inspect today's periods
  if (!isSunday && !isSaturdayDisabled && !isTodayHoliday) {
    const todaySchedules = schedules
      .filter(s => s.dayOfWeek === todayName)
      .sort((a, b) => a.periodNumber - b.periodNumber);

    // 1A. Check Active Period
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

        const startDate = new Date(currentTime);
        startDate.setHours(sh, sm, 0, 0);
        const endDate = new Date(currentTime);
        endDate.setHours(eh, em, 0, 0);

        const remMins = Math.max(1, Math.ceil(remaining));
        const subCode = sub?.code || sched.subjectCode;

        return {
          type: 'active',
          periodNumber: sched.periodNumber,
          schedule: sched,
          config: pc,
          subject: sub,
          progress: Math.round(progress),
          elapsedMinutes: Math.floor(elapsed),
          remainingMinutes: remMins,
          totalMinutes: duration,
          startTime: pc.startTime,
          endTime: pc.endTime,
          startTimeMillis: startDate.getTime(),
          endTimeMillis: endDate.getTime(),
          capsuleText: `P${sched.periodNumber} • ${subCode} • ${remMins}m`
        };
      }
    }

    // 1B. Check Upcoming Period (within 20 minutes before start)
    for (const sched of todaySchedules) {
      const pc = periodConfigs.find(p => p.periodNumber === sched.periodNumber);
      if (!pc || !pc.startTime) continue;

      const [sh, sm] = pc.startTime.split(':').map(Number);
      const startTotal = sh * 60 + sm;

      if (nowMinutes < startTotal && startTotal - nowMinutes <= 20) {
        const minsLeft = startTotal - nowMinutes;
        const sub = subjects.find(s => s.code === sched.subjectCode);

        const startDate = new Date(currentTime);
        startDate.setHours(sh, sm, 0, 0);

        return {
          type: 'upcoming',
          periodNumber: sched.periodNumber,
          schedule: sched,
          config: pc,
          subject: sub,
          progress: 0,
          elapsedMinutes: 0,
          remainingMinutes: minsLeft,
          totalMinutes: 0,
          startTime: pc.startTime,
          endTime: pc.endTime,
          startTimeMillis: startDate.getTime(),
          capsuleText: `P${sched.periodNumber} in ${minsLeft}m`
        };
      }
    }

    // 1C. Check if there are future classes later today
    const laterToday = todaySchedules.find(sched => {
      const pc = periodConfigs.find(p => p.periodNumber === sched.periodNumber);
      if (!pc?.startTime) return false;
      const [sh, sm] = pc.startTime.split(':').map(Number);
      return sh * 60 + sm > nowMinutes;
    });

    if (laterToday) {
      const pc = periodConfigs.find(p => p.periodNumber === laterToday.periodNumber);
      const sub = subjects.find(s => s.code === laterToday.subjectCode);
      return {
        type: 'standby',
        periodNumber: laterToday.periodNumber,
        schedule: laterToday,
        config: pc,
        subject: sub,
        progress: 0,
        elapsedMinutes: 0,
        remainingMinutes: 0,
        totalMinutes: 0,
        startTime: pc?.startTime,
        capsuleText: `Next P${laterToday.periodNumber} • ${pc?.startTime || ''}`,
        nextClassText: `Next: P${laterToday.periodNumber} ${sub?.code || laterToday.subjectCode} at ${pc?.startTime || 'TBD'}`
      };
    }
  }

  // 2. Classes for today have finished (or today is weekend/holiday): Find next upcoming class in future days
  for (let offset = 1; offset <= 7; offset++) {
    const targetDate = addDays(currentTime, offset);
    const targetDayName = DAYS_OF_WEEK[targetDate.getDay()];
    const targetDateStr = format(targetDate, 'yyyy-MM-dd');

    if (targetDayName === 'Sunday') continue;
    if (targetDayName === 'Saturday' && settings?.disableSaturday !== false) continue;
    if (settings?.holidays?.some(h => h.date === targetDateStr)) continue;

    const daySchedules = schedules
      .filter(s => s.dayOfWeek === targetDayName)
      .sort((a, b) => a.periodNumber - b.periodNumber);

    if (daySchedules.length > 0) {
      const firstSched = daySchedules[0];
      const pc = periodConfigs.find(p => p.periodNumber === firstSched.periodNumber);
      const sub = subjects.find(s => s.code === firstSched.subjectCode);
      const dayLabel = offset === 1 ? 'Tomorrow' : targetDayName;

      return {
        type: 'standby',
        periodNumber: firstSched.periodNumber,
        schedule: firstSched,
        config: pc,
        subject: sub,
        progress: 0,
        elapsedMinutes: 0,
        remainingMinutes: 0,
        totalMinutes: 0,
        startTime: pc?.startTime,
        capsuleText: `${dayLabel} P${firstSched.periodNumber}`,
        nextClassText: `Next: ${dayLabel} P${firstSched.periodNumber} • ${sub?.code || firstSched.subjectCode} (${pc?.startTime || '09:00'})`
      };
    }
  }

  return { type: 'idle', progress: 0, elapsedMinutes: 0, remainingMinutes: 0, totalMinutes: 0 };
}

let lastNotificationStateKey = '';

/**
 * Synchronizes real-time status with the Android 16 & Vivo/iQOO Origin Island Ongoing Live Notification
 */
export async function syncLiveAndroidNotification(
  schedules: ScheduleItem[],
  periodConfigs: PeriodConfig[],
  subjects: Subject[],
  settings?: AppSettings,
  currentTime: Date = new Date()
) {
  // If notifications are explicitly disabled in settings
  if (settings?.notificationsEnabled === false) {
    if (Capacitor.isNativePlatform()) {
      try {
        await LiveNotification.dismissLiveNotification();
      } catch (e) {
        // ignore
      }
    }
    return;
  }

  const live = getCurrentLiveClassStatus(schedules, periodConfigs, subjects, settings, currentTime);

  // 1. ACTIVE CLASS IN SESSION
  if (live.type === 'active' && live.schedule) {
    const subCode = live.subject?.code || live.schedule.subjectCode;
    const subName = live.subject?.name || subCode;
    const title = `Class in Session: Period ${live.periodNumber} • ${subCode}`;
    const room = live.schedule.classroom ? `Room ${live.schedule.classroom}` : 'General';
    const faculty = live.schedule.facultyName || 'Faculty';
    const message = `${subName} (${room} • ${faculty}) • ${live.remainingMinutes}m left`;
    const subText = `${live.progress}% completed (${live.elapsedMinutes}/${live.totalMinutes}m)`;
    const color = live.subject?.color || '#3B82F6';
    const capsuleText = live.capsuleText || `P${live.periodNumber} • ${live.remainingMinutes}m`;

    const stateKey = `active_${live.periodNumber}_${live.progress}_${live.remainingMinutes}`;
    if (stateKey !== lastNotificationStateKey) {
      lastNotificationStateKey = stateKey;
      if (Capacitor.isNativePlatform()) {
        try {
          await LiveNotification.showOrUpdateLiveNotification({
            title,
            message,
            subText,
            capsuleText,
            progress: live.progress,
            maxProgress: 100,
            ongoing: true,
            accentColor: color,
            periodNumber: live.periodNumber,
            startTimeMillis: live.startTimeMillis,
            endTimeMillis: live.endTimeMillis,
            subjectName: subName,
            classroom: room,
            facultyName: faculty
          });
        } catch (err) {
          console.warn('Could not post native live notification', err);
        }
      }
    }
    return;
  }

  // 2. UPCOMING CLASS (Starting within 20 minutes)
  if (live.type === 'upcoming' && live.schedule) {
    const subCode = live.subject?.code || live.schedule.subjectCode;
    const title = `⏳ Starting in ${live.remainingMinutes}m: Period ${live.periodNumber} (${subCode})`;
    const room = live.schedule.classroom ? `Room ${live.schedule.classroom}` : 'General';
    const message = `Starts at ${live.startTime} in ${room} with ${live.schedule.facultyName || 'Faculty'}`;
    const subText = `Upcoming Class`;
    const color = live.subject?.color || '#F59E0B';
    const capsuleText = live.capsuleText || `P${live.periodNumber} in ${live.remainingMinutes}m`;

    const stateKey = `upcoming_${live.periodNumber}_${live.remainingMinutes}`;
    if (stateKey !== lastNotificationStateKey) {
      lastNotificationStateKey = stateKey;
      if (Capacitor.isNativePlatform()) {
        try {
          await LiveNotification.showOrUpdateLiveNotification({
            title,
            message,
            subText,
            capsuleText,
            progress: 0,
            maxProgress: 100,
            ongoing: true,
            accentColor: color,
            periodNumber: live.periodNumber,
            startTimeMillis: live.startTimeMillis,
            classroom: room,
            facultyName: live.schedule.facultyName || 'Faculty'
          });
        } catch (err) {
          console.warn('Could not post native live notification', err);
        }
      }
    }
    return;
  }

  // 3. STANDBY (Outside active class hours -> Keep ongoing status with Next Class info)
  if (live.type === 'standby' && live.nextClassText) {
    const title = `Class Manager • Standby`;
    const message = live.nextClassText;
    const subText = `Timetable Active`;
    const color = '#10B981';
    const capsuleText = live.capsuleText || `Class Manager`;

    const stateKey = `standby_${live.nextClassText}`;
    if (stateKey !== lastNotificationStateKey) {
      lastNotificationStateKey = stateKey;
      if (Capacitor.isNativePlatform()) {
        try {
          await LiveNotification.showOrUpdateLiveNotification({
            title,
            message,
            subText,
            capsuleText,
            progress: 0,
            maxProgress: 100,
            ongoing: true,
            accentColor: color,
            periodNumber: live.periodNumber || 1
          });
        } catch (err) {
          console.warn('Could not post native live standby notification', err);
        }
      }
    }
    return;
  }

  // 4. IDLE & NO CLASSES SCHEDULED
  if (lastNotificationStateKey !== 'idle') {
    lastNotificationStateKey = 'idle';
    if (Capacitor.isNativePlatform()) {
      try {
        await LiveNotification.dismissLiveNotification();
      } catch (err) {
        // ignore
      }
    }
  }
}

/**
 * Sends an instant sample live ongoing notification for testing the Android 16 & Vivo Origin Island capsule
 */
export async function sendSampleLiveNotification(
  subjectCode = 'CS102',
  subjectName = 'Data Structures & Algorithms',
  periodNumber = 2,
  classroom = 'Lab 3',
  facultyName = 'Dr. Alan Turing'
): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const now = Date.now();
    // Simulate a 45-min class that started 15 minutes ago (30 min remaining)
    const startTimeMillis = now - 15 * 60 * 1000;
    const endTimeMillis = now + 30 * 60 * 1000;

    await LiveNotification.showOrUpdateLiveNotification({
      title: `Class in Session: Period ${periodNumber} • ${subjectCode}`,
      message: `${subjectName} (${classroom} • ${facultyName}) • 30m remaining`,
      subText: `33% completed (15/45m)`,
      capsuleText: `P${periodNumber} • ${subjectCode} • 30m`,
      progress: 33,
      maxProgress: 100,
      ongoing: true,
      accentColor: '#3B82F6',
      periodNumber,
      startTimeMillis,
      endTimeMillis,
      subjectName,
      classroom,
      facultyName
    });
    return true;
  } catch (err) {
    console.error('Failed to send sample live notification:', err);
    return false;
  }
}

export async function openVivoOriginIslandSettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await LiveNotification.openOriginIslandSettings();
    return res.opened;
  } catch (err) {
    console.warn('Could not open Origin Island settings', err);
    return false;
  }
}

export async function openAppBatterySettings(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const res = await LiveNotification.openBatteryOptimizationSettings();
    return res.opened;
  } catch (err) {
    console.warn('Could not open Battery settings', err);
    return false;
  }
}

export async function checkOriginIslandSupport(): Promise<{
  supported: boolean;
  isVivoOrIqoo: boolean;
  brand?: string;
  manufacturer?: string;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { supported: false, isVivoOrIqoo: false };
  }
  try {
    const info = await LiveNotification.isSupported();
    return {
      supported: info.supported,
      isVivoOrIqoo: !!info.isVivoOrIqoo,
      brand: info.brand,
      manufacturer: info.manufacturer
    };
  } catch {
    return { supported: false, isVivoOrIqoo: false };
  }
}

