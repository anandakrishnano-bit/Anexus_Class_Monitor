import * as XLSX from 'xlsx';
import { Student, AttendanceSession, Subject, AttendanceStatus } from '../types';

export interface SingleSessionExcelData {
  date: string;
  periodNumber: number;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  classroom?: string;
  className?: string;
  section?: string;
  department?: string;
  records: Array<{
    registerNo: string;
    name: string;
    status: AttendanceStatus | string;
    remarks?: string;
  }>;
}

function formatStatus(status: string): string {
  const s = status.toLowerCase();
  if (s === 'present') return 'Present';
  if (s === 'absent') return 'Absent';
  if (s === 'od') return 'On Duty';
  if (s === 'medical') return 'Medical';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Creates a clean, standard, uncluttered Excel workbook for a single class session.
 */
export function buildStructuredSessionWorkbook(data: SingleSessionExcelData): XLSX.WorkBook {
  const total = data.records.length;
  const presentCount = data.records.filter(r => r.status === 'present').length;
  const absentCount = data.records.filter(r => r.status === 'absent').length;
  const odCount = data.records.filter(r => r.status === 'od').length;
  const attendanceRate = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0.0';

  const subjectDisplay = data.subjectName
    ? `${data.subjectCode} - ${data.subjectName}`
    : data.subjectCode;

  const classDisplay = [data.className, data.section].filter(Boolean).join(' - ') || 'General';

  // Clean, uncluttered layout
  const wsData: any[][] = [
    ['Class Attendance Report'],
    [],
    ['Date', data.date],
    ['Period', `Period ${data.periodNumber}`],
    ['Subject', subjectDisplay],
    ['Faculty', data.facultyName || 'Course Faculty'],
    ['Class', classDisplay],
    ['Total Students', total],
    ['Present', `${presentCount} (${attendanceRate}%)`],
    ['Absent', absentCount]
  ];

  if (odCount > 0) {
    wsData.push(['On Duty', odCount]);
  }

  wsData.push([]);
  const headerRowIndex = wsData.length + 1; // 1-based index in Excel

  wsData.push(['S.No', 'Register Number', 'Student Name', 'Status', 'Remarks']);

  data.records.forEach((rec, idx) => {
    wsData.push([
      idx + 1,
      rec.registerNo,
      rec.name,
      formatStatus(rec.status),
      rec.remarks || ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set clean, readable column widths
  ws['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 20 }, // Register Number
    { wch: 30 }, // Student Name
    { wch: 14 }, // Status
    { wch: 25 }  // Remarks
  ];

  // Add Excel auto-filter on table headers
  const lastRow = wsData.length;
  ws['!autofilter'] = {
    ref: `A${headerRowIndex}:E${lastRow}`
  };

  const wb = XLSX.utils.book_new();
  const safeSheetName = `Period ${data.periodNumber}`.substring(0, 31).replace(/[\\/?*[\]]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  return wb;
}

/**
 * Creates a clean, standard, multi-sheet workbook for full semester reporting.
 */
export function buildStructuredCompleteWorkbook(
  students: Student[],
  sessions: AttendanceSession[],
  subjects: Subject[],
  meta: { className?: string; section?: string; department?: string }
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. OVERVIEW SHEET
  const totalSessions = sessions.length;
  const totalStudents = students.length;
  const classDisplay = [meta.className, meta.section].filter(Boolean).join(' - ') || 'General';

  const summaryData: any[][] = [
    ['Class Attendance Overview'],
    [],
    ['Class', classDisplay],
    ['Department', meta.department || '-'],
    ['Total Students', totalStudents],
    ['Total Recorded Sessions', totalSessions],
    ['Generated Date', new Date().toLocaleDateString()],
    ['Generated Time', new Date().toLocaleTimeString()]
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 24 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Overview');

  // 2. STUDENT CUMULATIVE ATTENDANCE SHEET
  const studentData: any[][] = [
    ['S.No', 'Register Number', 'Student Name', 'Total Classes', 'Attended', 'Absent', 'On Duty', 'Attendance %']
  ];

  students.forEach((st, idx) => {
    let attended = 0;
    let absent = 0;
    let od = 0;

    sessions.forEach(sess => {
      const rec = sess.records.find(r => r.studentId === st.id);
      if (rec) {
        if (rec.status === 'present') attended++;
        else if (rec.status === 'absent') absent++;
        else if (rec.status === 'od') od++;
      }
    });

    const studentTotal = attended + absent + od;
    const effectiveTotal = studentTotal > 0 ? studentTotal : totalSessions;
    const pct = effectiveTotal > 0 ? ((attended / effectiveTotal) * 100).toFixed(1) : '100.0';

    studentData.push([
      idx + 1,
      st.registerNo,
      st.name,
      effectiveTotal,
      attended,
      absent,
      od,
      `${pct}%`
    ]);
  });

  const studentWs = XLSX.utils.aoa_to_sheet(studentData);
  studentWs['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 20 }, // Register No
    { wch: 30 }, // Name
    { wch: 14 }, // Total Classes
    { wch: 12 }, // Attended
    { wch: 10 }, // Absent
    { wch: 10 }, // On Duty
    { wch: 14 }  // Attendance %
  ];
  studentWs['!autofilter'] = { ref: `A1:H${studentData.length}` };
  XLSX.utils.book_append_sheet(wb, studentWs, 'Student Summary');

  // 3. SESSION LOGS SHEET
  const sessionData: any[][] = [
    ['S.No', 'Date', 'Period', 'Subject Code', 'Subject Name', 'Faculty', 'Present', 'Absent', 'On Duty', 'Attendance %']
  ];

  sessions.forEach((sess, idx) => {
    const subObj = subjects.find(s => s.code === sess.subjectCode);
    const pCount = sess.records.filter(r => r.status === 'present').length;
    const aCount = sess.records.filter(r => r.status === 'absent').length;
    const oCount = sess.records.filter(r => r.status === 'od').length;
    const sessTotal = sess.records.length;
    const rate = sessTotal > 0 ? ((pCount / sessTotal) * 100).toFixed(1) : '0.0';

    sessionData.push([
      idx + 1,
      sess.date,
      `Period ${sess.periodNumber}`,
      sess.subjectCode,
      subObj?.name || sess.subjectName || sess.subjectCode,
      sess.facultyName || 'Course Faculty',
      pCount,
      aCount,
      oCount,
      `${rate}%`
    ]);
  });

  const sessionWs = XLSX.utils.aoa_to_sheet(sessionData);
  sessionWs['!cols'] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 12 },
    { wch: 15 },
    { wch: 28 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 }
  ];
  sessionWs['!autofilter'] = { ref: `A1:J${sessionData.length}` };
  XLSX.utils.book_append_sheet(wb, sessionWs, 'Session Logs');

  return wb;
}
