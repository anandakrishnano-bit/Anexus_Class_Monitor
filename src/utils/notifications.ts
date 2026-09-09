import { LocalNotifications } from '@capacitor/local-notifications';
import { HomeworkItem, ScheduleItem, PeriodConfig } from '../types';
import { format, differenceInMinutes, parseISO, isToday } from 'date-fns';

// Keep track of already alerted keys in memory to prevent duplicate spam
const notifiedSet = new Set<string>();

export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display === 'granted') return true;
  } catch (e) {
    // Fallback to Web Notification API
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
  }

  return false;
}

export async function sendInstantNotification(title: string, body: string) {
  const hasPerm = await requestNotificationPermission();
  if (!hasPerm) return;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 100000),
          title,
          body,
          smallIcon: 'ic_notification',
          iconColor: '#3B82F6',
          schedule: { at: new Date(Date.now() + 1000) },
          sound: undefined,
          actionTypeId: '',
          extra: null
        }
      ]
    });
  } catch (err) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.svg' });
    }
  }
}

/**
 * Schedules a notification 10 minutes prior to a period's start time
 */
export async function scheduleClassStart10MinReminder(
  periodNumber: number,
  subjectCode: string,
  startTimeStr: string, // e.g. "09:00"
  classroom?: string,
  facultyName?: string
) {
  if (!startTimeStr) return;
  const [hours, minutes] = startTimeStr.split(':').map(Number);
  const now = new Date();
  const classTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

  // Reminder is 10 minutes before class
  const reminderTime = new Date(classTime.getTime() - 10 * 60 * 1000);

  if (reminderTime <= now) {
    return; // Already past reminder time today
  }

  const title = `Upcoming Class in 10 Mins: Period ${periodNumber} (${subjectCode})`;
  const body = `${subjectCode} starts at ${startTimeStr}${classroom ? ` in Room ${classroom}` : ''}${facultyName ? ` with ${facultyName}` : ''}. Prepare attendance roster!`;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: periodNumber * 1000 + now.getDate(),
          title,
          body,
          smallIcon: 'ic_notification',
          iconColor: '#3B82F6',
          schedule: { at: reminderTime },
          sound: undefined,
          actionTypeId: '',
          extra: null
        }
      ]
    });
  } catch (err) {
    const delay = reminderTime.getTime() - now.getTime();
    setTimeout(() => {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.svg' });
      }
    }, delay);
  }
}

/**
 * Schedules a reminder for an event (Exam, Assignment, Project, Test) based on its customizable reminderOffsetMinutes
 */
export async function scheduleEventReminder(task: HomeworkItem) {
  if (!task.dueDate) return;

  const [year, month, day] = task.dueDate.split('-').map(Number);
  let hours = 9;
  let minutes = 0;

  if (task.dueTime) {
    const [h, m] = task.dueTime.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      hours = h;
      minutes = m;
    }
  }

  const eventDate = new Date(year, month - 1, day, hours, minutes, 0);
  const offsetMinutes = task.reminderOffsetMinutes !== undefined ? task.reminderOffsetMinutes : 1440; // default 1 day

  const reminderDate = new Date(eventDate.getTime() - offsetMinutes * 60 * 1000);
  const now = new Date();

  if (reminderDate <= now) {
    return; // Reminder time in the past
  }

  let offsetLabel = 'Reminder';
  if (offsetMinutes === 10) offsetLabel = '10 Mins Alert';
  else if (offsetMinutes === 30) offsetLabel = '30 Mins Alert';
  else if (offsetMinutes === 60) offsetLabel = '1 Hour Alert';
  else if (offsetMinutes === 1440) offsetLabel = 'Tomorrow';
  else if (offsetMinutes === 2880) offsetLabel = 'In 2 Days';
  else if (offsetMinutes === 10080) offsetLabel = 'In 1 Week';

  const title = `[${offsetLabel}] ${task.type.toUpperCase()}: ${task.title}`;
  const body = `${task.subjectCode} • Due on ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ''}. ${task.notes || 'Tap to view details'}`;

  const notificationId = Math.abs((task.id || 1) * 10000 + offsetMinutes % 10000);

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title,
          body,
          smallIcon: 'ic_notification',
          iconColor: '#3B82F6',
          schedule: { at: reminderDate },
          sound: undefined,
          actionTypeId: '',
          extra: null
        }
      ]
    });
  } catch (err) {
    const delay = reminderDate.getTime() - now.getTime();
    setTimeout(() => {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.svg' });
      }
    }, delay);
  }
}

/**
 * Continuous real-time monitor checking classes & customizable events
 */
export function checkAndTriggerUpcomingAlerts(
  todaySchedules: ScheduleItem[],
  periodConfigs: PeriodConfig[],
  pendingTasks: HomeworkItem[],
  showToast: (title: string, msg?: string, type?: 'info' | 'warning' | 'success') => void
) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayDateStr = format(now, 'yyyy-MM-dd');

  // 1. Check 10-Minute Class Window
  todaySchedules.forEach(sched => {
    const pc = periodConfigs.find(p => p.periodNumber === sched.periodNumber);
    if (!pc || !pc.startTime) return;

    const [sh, sm] = pc.startTime.split(':').map(Number);
    const startM = sh * 60 + sm;
    const diff = startM - nowMinutes;

    // Trigger alert if within 9-10 minutes window and not already notified today
    const alertKey = `class_${todayDateStr}_p${sched.periodNumber}`;
    if (diff > 0 && diff <= 10 && !notifiedSet.has(alertKey)) {
      notifiedSet.add(alertKey);
      const title = `Upcoming Class: Period ${sched.periodNumber} (${sched.subjectCode})`;
      const msg = `Starts in ${diff} mins (${pc.startTime}) in Room ${sched.classroom || 'General'} with ${sched.facultyName || 'Faculty'}`;
      showToast(title, msg, 'info');
      sendInstantNotification(title, msg);
    }
  });

  // 2. Check Custom Event Reminders
  pendingTasks.forEach(task => {
    if (!task.dueDate) return;
    const offset = task.reminderOffsetMinutes !== undefined ? task.reminderOffsetMinutes : 1440;

    let eventDate: Date;
    if (task.dueTime) {
      const [h, m] = task.dueTime.split(':').map(Number);
      const [y, mo, d] = task.dueDate.split('-').map(Number);
      eventDate = new Date(y, mo - 1, d, h, m, 0);
    } else {
      const [y, mo, d] = task.dueDate.split('-').map(Number);
      eventDate = new Date(y, mo - 1, d, 9, 0, 0);
    }

    const diffMinutes = differenceInMinutes(eventDate, now);
    const alertKey = `event_${task.id}_${task.dueDate}_${offset}`;

    if (diffMinutes > 0 && diffMinutes <= offset && !notifiedSet.has(alertKey)) {
      notifiedSet.add(alertKey);
      const title = `Upcoming ${task.type.toUpperCase()}: ${task.title}`;
      const msg = `Due: ${task.dueDate}${task.dueTime ? ` at ${task.dueTime}` : ''} (${task.subjectCode})`;
      showToast(title, msg, 'warning');
      sendInstantNotification(title, msg);
    }
  });
}
