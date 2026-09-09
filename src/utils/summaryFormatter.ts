import { Student } from '../types';
import { format, parseISO } from 'date-fns';

export const DEFAULT_SUMMARY_TEMPLATE = `Attendance {DATE}
{PERIOD}

ABSENTEES:
{ABSENTEES}`;

export const SAMPLE_STUDENTS: { registerNo: string; name: string }[] = [
  { registerNo: '21CS101', name: 'ALEX MORGAN' },
  { registerNo: '21CS102', name: 'JORDAN LEE' },
  { registerNo: '21CS103', name: 'TAYLOR SMITH' },
  { registerNo: '21CS104', name: 'CHRIS PATEL' },
  { registerNo: '21CS105', name: 'SAMIRA KHAN' },
  { registerNo: '21CS106', name: 'DANIEL KIM' },
  { registerNo: '21CS107', name: 'EMILY DAVIS' },
  { registerNo: '21CS108', name: 'MICHAEL BROWN' }
];

export function getOrdinalPeriodName(periodNumber: number): string {
  const ordinals: Record<number, string> = {
    1: 'First period',
    2: 'Second period',
    3: 'Third period',
    4: 'Fourth period',
    5: 'Fifth period',
    6: 'Sixth period',
    7: 'Seventh period',
    8: 'Eighth period',
    9: 'Ninth period',
    10: 'Tenth period'
  };
  return ordinals[periodNumber] || `Period ${periodNumber}`;
}

export interface SummaryFormatOptions {
  template?: string;
  dateStr: string; // YYYY-MM-DD or DD-MM-YYYY
  periodNumber: number;
  subjectCode?: string;
  subjectName?: string;
  facultyName?: string;
  absentStudents: { registerNo: string; name: string }[];
  presentCount?: number;
  totalCount?: number;
  className?: string;
  section?: string;
}

export function formatAttendanceSummary(opts: SummaryFormatOptions): string {
  const template = opts.template?.trim() || DEFAULT_SUMMARY_TEMPLATE;

  // Format date to DD-MM-YYYY
  let formattedDate = opts.dateStr;
  try {
    if (opts.dateStr.includes('-')) {
      const parts = opts.dateStr.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> DD-MM-YYYY
        formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
  } catch (e) {
    formattedDate = opts.dateStr;
  }

  const periodName = getOrdinalPeriodName(opts.periodNumber);

  // Format absentee lines as "{REG_NO}  {NAME}"
  let absenteesText = 'NIL';
  if (opts.absentStudents && opts.absentStudents.length > 0) {
    absenteesText = opts.absentStudents
      .map(st => `${st.registerNo}  ${st.name.toUpperCase()}`)
      .join('\n');
  }

  const subjectCode = opts.subjectCode || '';
  const subjectName = opts.subjectName || subjectCode;
  const facultyName = opts.facultyName || '';
  const presentCount = opts.presentCount !== undefined ? String(opts.presentCount) : '';
  const absentCount = String(opts.absentStudents ? opts.absentStudents.length : 0);
  const totalCount = opts.totalCount !== undefined ? String(opts.totalCount) : '';
  const className = opts.className || '';
  const section = opts.section || '';

  return template
    .replace(/\{DATE\}/g, formattedDate)
    .replace(/\{PERIOD\}/g, periodName)
    .replace(/\{PERIOD_NUM\}/g, String(opts.periodNumber))
    .replace(/\{ABSENTEES\}/g, absenteesText)
    .replace(/\{SUBJECT\}/g, subjectCode)
    .replace(/\{SUBJECT_NAME\}/g, subjectName)
    .replace(/\{FACULTY\}/g, facultyName)
    .replace(/\{PRESENT_COUNT\}/g, presentCount)
    .replace(/\{ABSENT_COUNT\}/g, absentCount)
    .replace(/\{TOTAL_COUNT\}/g, totalCount)
    .replace(/\{CLASS_NAME\}/g, className)
    .replace(/\{SECTION\}/g, section);
}
