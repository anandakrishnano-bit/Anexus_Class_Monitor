import * as XLSX from 'xlsx';
import { Student, AttendanceRecord, AttendanceSession, Subject, AttendanceStatus } from '../types';

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

/**
 * Creates an executive, highly readable, structured, and tabulated Excel workbook
 * for a single class attendance session.
 */
export function buildStructuredSessionWorkbook(data: SingleSessionExcelData): XLSX.WorkBook {
  const total = data.records.length;
  const presentCount = data.records.filter(r => r.status === 'present').length;
  const absentCount = data.records.filter(r => r.status === 'absent').length;
  const odCount = data.records.filter(r => r.status === 'od').length;
  const attendanceRate = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0.0';

  // Construct tabular rows
  const wsData: any[][] = [
    ['ANEXUS CLASS MONITOR — ATTENDANCE AUDIT SHEET'],
    [],
    ['SESSION DETAILS', '', 'ATTENDANCE SUMMARY KPI', ''],
    ['Date', data.date, 'Total Enrolled', total],
    ['Period', `Period ${data.periodNumber}`, 'Present', `${presentCount} (${attendanceRate}%)`],
    ['Subject Code', data.subjectCode, 'Absent', absentCount],
    ['Subject Name', data.subjectName || data.subjectCode, 'On Duty (OD)', odCount],
    ['Faculty', data.facultyName || 'Course Faculty', 'Status', Number(attendanceRate) >= 75 ? 'ELIGIBLE (>=75%)' : 'DEFICIT (<75%)'],
    ['Class / Section', `${data.className || 'Class'} - ${data.section || 'A'}${data.department ? ` (${data.department})` : ''}`, 'Generated At', new Date().toLocaleString()],
    [],
    ['--- STUDENT ROSTER & ATTENDANCE RECORDS ---'],
    ['S.No', 'Register Number', 'Student Name', 'Status', 'Visual Indicator', 'Remarks']
  ];

  data.records.forEach((rec, idx) => {
    const statusUpper = rec.status.toUpperCase();
    const visual = rec.status === 'present'
      ? '🟢 PRESENT'
      : rec.status === 'absent'
      ? '🔴 ABSENT'
      : rec.status === 'od'
      ? '🟡 ON DUTY'
      : rec.status === 'medical'
      ? '🏥 MEDICAL'
      : '🔵 ' + statusUpper;
    wsData.push([
      idx + 1,
      rec.registerNo,
      rec.name,
      statusUpper,
      visual,
      rec.remarks || (rec.status === 'absent' ? 'Absent from lecture' : '-')
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Define generous column widths for crystal-clear readability
  ws['!cols'] = [
    { wch: 8 },  // S.No
    { wch: 20 }, // Register Number
    { wch: 30 }, // Student Name
    { wch: 14 }, // Status
    { wch: 18 }, // Visual Indicator
    { wch: 35 }  // Remarks
  ];

  const wb = XLSX.utils.book_new();
  const safeSheetName = `P${data.periodNumber}_${data.subjectCode}`.substring(0, 31).replace(/[\\/?*[\]]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

  return wb;
}

/**
 * Creates an executive, multi-sheet workbook for complete classroom reporting
 */
export function buildStructuredCompleteWorkbook(
  students: Student[],
  sessions: AttendanceSession[],
  subjects: Subject[],
  meta: { className?: string; section?: string; department?: string }
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();

  // 1. SUMMARY SHEET
  const totalSessions = sessions.length;
  const totalStudents = students.length;

  const summaryData: any[][] = [
    ['ANEXUS CLASS MONITOR — COMPREHENSIVE ACADEMIC AUDIT'],
    [],
    ['METRIC', 'VALUE'],
    ['Academic Class', `${meta.className || 'General'} - ${meta.section || 'Section'}`],
    ['Department', meta.department || 'N/A'],
    ['Total Registered Students', totalStudents],
    ['Total Recorded Sessions', totalSessions],
    ['Report Generated Date', new Date().toLocaleDateString()],
    ['Report Generated Time', new Date().toLocaleTimeString()],
    []
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 28 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Overview');

  // 2. STUDENT CUMULATIVE ATTENDANCE SHEET
  const studentData: any[][] = [
    ['S.No', 'Register Number', 'Student Name', 'Total Sessions', 'Attended', 'Absent', 'OD', 'Attendance %', 'Status']
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
    const status = Number(pct) >= 75 ? 'ELIGIBLE' : 'SHORTAGE';

    studentData.push([
      idx + 1,
      st.registerNo,
      st.name,
      effectiveTotal,
      attended,
      absent,
      od,
      `${pct}%`,
      status
    ]);
  });

  const studentWs = XLSX.utils.aoa_to_sheet(studentData);
  studentWs['!cols'] = [
    { wch: 6 },  // S.No
    { wch: 18 }, // Register No
    { wch: 28 }, // Name
    { wch: 16 }, // Total
    { wch: 12 }, // Attended
    { wch: 10 }, // Absent
    { wch: 8 },  // OD
    { wch: 15 }, // Attendance %
    { wch: 14 }  // Status
  ];
  XLSX.utils.book_append_sheet(wb, studentWs, 'Student Summary');

  // 3. SESSION AUDIT LOG SHEET
  const sessionData: any[][] = [
    ['S.No', 'Date', 'Period', 'Subject Code', 'Subject Name', 'Faculty', 'Present', 'Absent', 'OD', 'Rate %']
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
      `P${sess.periodNumber}`,
      sess.subjectCode,
      subObj?.name || sess.subjectName || sess.subjectCode,
      sess.facultyName || 'Faculty',
      pCount,
      aCount,
      oCount,
      `${rate}%`
    ]);
  });

  const sessionWs = XLSX.utils.aoa_to_sheet(sessionData);
  sessionWs['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 10 },
    { wch: 15 },
    { wch: 28 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 12 }
  ];
  XLSX.utils.book_append_sheet(wb, sessionWs, 'Session Logs');

  return wb;
}
