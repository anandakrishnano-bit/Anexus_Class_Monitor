export type AttendanceStatus = 'present' | 'absent' | 'od' | 'medical' | 'permission';

export interface Student {
  id?: number;
  registerNo: string;
  name: string;
  batchSection: string;
}

export interface Subject {
  id?: number;
  code: string;
  name: string;
  color?: string; // Hex color code e.g. "#1e5a80"
}

export interface Faculty {
  id?: number;
  name: string;
  department: string;
}

export interface PeriodConfig {
  periodNumber: number;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "09:50"
}

export interface ScheduleItem {
  id?: number;
  dayOfWeek: string; // "Monday", "Tuesday", etc.
  periodNumber: number;
  subjectCode: string;
  facultyName?: string;
  classroom?: string;
  isFree?: boolean;
}

export interface AttendanceRecord {
  studentId: number;
  registerNo: string;
  name: string;
  batchSection: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceSession {
  id?: number;
  date: string; // YYYY-MM-DD
  periodNumber: number;
  subjectCode: string;
  subjectName?: string;
  facultyName?: string;
  classroom?: string;
  records: AttendanceRecord[];
  createdAt: string;
}

export type TaskType = 'assignment' | 'project' | 'exam' | 'test' | 'task' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface HomeworkItem {
  id?: number;
  title: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm (e.g. 09:30)
  reminderOffsetMinutes?: number; // 10, 30, 60, 1440, etc.
  type: TaskType;
  priority?: TaskPriority;
  isCompleted: boolean;
  subjectCode: string;
  notes?: string;
  lastNotifiedAt?: string;
}

export interface HolidayEntry {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'national' | 'institutional' | 'restricted' | 'other';
}

export interface AppSettings {
  id?: number;
  theme: 'light' | 'dark' | 'system';
  className: string;
  section: string;
  academicYear: string;
  semester: string;
  department: string;
  classRepName: string;
  profilePhoto?: string; // base64 data URL
  email?: string;
  phone?: string;
  rollNumber?: string;
  bio?: string;
  disableSaturday: boolean;
  classReminderOffset: number;
  examReminderOffset: number;
  minAttendanceTarget?: number;
  holidays: HolidayEntry[];
  defaultClassroom?: string;
  notificationsEnabled: boolean;
  summaryTemplate?: string;
  isFirstLaunchCompleted?: boolean;
  geminiApiKey?: string;
  geminiModel?: string;
  aiProvider?: 'local' | 'gemini';
  firebaseSyncEnabled?: boolean;
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseAppId?: string;
  firebaseCollectionName?: string;
  firebaseUserId?: string;
  firebaseClassCode?: string;
  firebaseAutoSync?: boolean;
  lastFirebaseSyncAt?: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  subjectColor?: string;
  subjectCode?: string;
  periodNumber?: number;
  startTime?: string;
  classroom?: string;
  facultyName?: string;
  aiNote?: string;
  actionText?: string;
  onAction?: () => void;
}
