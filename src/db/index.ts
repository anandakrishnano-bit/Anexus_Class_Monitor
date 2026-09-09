import Dexie, { Table } from 'dexie';
import {
  Student,
  Subject,
  Faculty,
  PeriodConfig,
  ScheduleItem,
  AttendanceSession,
  HomeworkItem,
  AppSettings
} from '../types';

export class ClassManagerDatabase extends Dexie {
  students!: Table<Student, number>;
  subjects!: Table<Subject, number>;
  faculty!: Table<Faculty, number>;
  periodConfigs!: Table<PeriodConfig, number>;
  schedules!: Table<ScheduleItem, number>;
  attendanceSessions!: Table<AttendanceSession, number>;
  homeworkItems!: Table<HomeworkItem, number>;
  settings!: Table<AppSettings, number>;

  constructor() {
    super('AnexusClassManagerDB');
    this.version(1).stores({
      students: '++id, registerNo, name, batchSection',
      subjects: '++id, code, name',
      faculty: '++id, name, department',
      periodConfigs: '++periodNumber, startTime, endTime',
      schedules: '++id, [dayOfWeek+periodNumber], dayOfWeek, periodNumber, subjectCode',
      attendanceSessions: '++id, date, periodNumber, subjectCode, facultyName, createdAt',
      homeworkItems: '++id, dueDate, type, isCompleted, subjectCode',
      settings: '++id'
    });
  }
}

export const db = new ClassManagerDatabase();

export const DEFAULT_PERIOD_CONFIGS: PeriodConfig[] = [
  { periodNumber: 1, startTime: '09:00', endTime: '09:50' },
  { periodNumber: 2, startTime: '10:00', endTime: '10:50' },
  { periodNumber: 3, startTime: '11:00', endTime: '11:50' },
  { periodNumber: 4, startTime: '12:00', endTime: '12:50' },
  { periodNumber: 5, startTime: '14:00', endTime: '14:50' },
  { periodNumber: 6, startTime: '15:00', endTime: '15:50' },
  { periodNumber: 7, startTime: '16:00', endTime: '16:50' }
];

export async function seedInitialData() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.add({
      theme: 'system',
      className: 'My Class',
      section: 'Section A',
      academicYear: '2026 - 2027',
      semester: 'Semester 1',
      department: 'General',
      classRepName: 'Class Representative',
      disableSaturday: true,
      classReminderOffset: 10,
      examReminderOffset: 1440,
      holidays: [],
      notificationsEnabled: true,
      isFirstLaunchCompleted: false,
      summaryTemplate: "Attendance {DATE}\n{PERIOD}\n\nABSENTEES:\n{ABSENTEES}"
    });
  }

  const periodCount = await db.periodConfigs.count();
  if (periodCount === 0) {
    await db.periodConfigs.bulkAdd(DEFAULT_PERIOD_CONFIGS);
  }
}

export async function wipeSchedulesAndFaculty() {
  await db.schedules.clear();
  await db.faculty.clear();
}

export async function wipeAllClassData() {
  await db.students.clear();
  await db.subjects.clear();
  await db.faculty.clear();
  await db.schedules.clear();
  await db.attendanceSessions.clear();
  await db.homeworkItems.clear();
}

export const DEFAULT_REGISTRATION_SUBJECTS: Omit<Subject, 'id'>[] = [
  { code: 'MEC207', name: 'Strength of Materials', color: '#3b82f6' },
  { code: 'MEC208', name: 'Thermodynamics & Heat Transfer', color: '#ef4444' },
  { code: '212FIS3131', name: 'Fluid Power Safety', color: '#10b981' },
  { code: 'MEC209', name: 'Manufacturing Processes', color: '#f59e0b' },
  { code: 'MAT201', name: 'Engineering Mathematics III', color: '#8b5cf6' },
  { code: 'MEC210', name: 'Kinematics of Machinery', color: '#ec4899' },
  { code: 'CSE101', name: 'Python Programming Lab', color: '#06b6d4' },
  { code: 'MEC211', name: 'Fluid Mechanics Lab', color: '#14b8a6' },
  { code: 'MEC212', name: 'Strength of Materials Lab', color: '#6366f1' },
];

export const DEFAULT_FACULTY_LIST: Omit<Faculty, 'id'>[] = [
  { name: 'Dr. S. Saravanasankar', department: 'Dept: Mechanical Engineering' },
  { name: 'Dr. M. K. Loganathan', department: 'Dept: Thermal Engineering' },
  { name: 'Dr. P. Rajesh Kanna', department: 'Dept: Fluid Power & Safety' },
  { name: 'Prof. K. Venkatesan', department: 'Dept: Manufacturing Engineering' },
  { name: 'Dr. R. Srimathi', department: 'Dept: Mathematics' },
];

export async function restoreDefaultRegistrationTimetable() {
  await db.schedules.clear();
  await db.subjects.clear();
  await db.faculty.clear();
  await db.periodConfigs.clear();
  await db.periodConfigs.bulkAdd(DEFAULT_PERIOD_CONFIGS);
  await db.subjects.bulkAdd(DEFAULT_REGISTRATION_SUBJECTS);
  await db.faculty.bulkAdd(DEFAULT_FACULTY_LIST);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const sampleSchedule: Omit<ScheduleItem, 'id'>[] = [];
  days.forEach((day, dIdx) => {
    DEFAULT_PERIOD_CONFIGS.forEach((p, pIdx) => {
      const sub = DEFAULT_REGISTRATION_SUBJECTS[(dIdx + pIdx) % DEFAULT_REGISTRATION_SUBJECTS.length];
      const fac = DEFAULT_FACULTY_LIST[(dIdx + pIdx) % DEFAULT_FACULTY_LIST.length];
      sampleSchedule.push({
        dayOfWeek: day,
        periodNumber: p.periodNumber,
        subjectCode: sub.code,
        facultyName: fac.name,
        classroom: `Hall ${101 + ((dIdx + pIdx) % 4)}`
      });
    });
  });
  await db.schedules.bulkAdd(sampleSchedule);
}
