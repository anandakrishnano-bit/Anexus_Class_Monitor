import React, { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useNotification } from '../context/NotificationContext';
import { parseLocalAiExportPrompt, AiExportFilterResult } from '../utils/localExportAi';
import {
  Download,
  Printer,
  Calendar,
  FileSpreadsheet,
  Share2,
  Trash2,
  ChevronDown,
  Sparkles,
  Search,
  Filter,
  BarChart3,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Eye,
  Users,
  UserX,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportXlsxWorkbook, exportCsvFile } from '../utils/fileExport';
import { Modal } from '../components/common/Modal';
import { Slider } from '@/components/ui/slider';
import { Spinner, LoadingOverlay } from '@/components/ui/spinner';
import { fetchMaterialYouColors } from '../utils/materialYouTheme';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { DataTable } from '../components/history/data-table';
import { createColumns, type SessionRow } from '../components/history/columns';
import { AttendanceSession } from '@/types';
import { SkeletonCard } from '@/components/ui/skeleton';

export const ReportsPage: React.FC = () => {
  const { showToast } = useNotification();

  const rawSessions = useLiveQuery(() => db.attendanceSessions.toArray());
  const sessions = rawSessions || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const facultyList = useLiveQuery(() => db.faculty.toArray()) || [];
  const students = useLiveQuery(() => db.students.toArray()) || [];

  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [facultyFilter, setFacultyFilter] = useState<string>('all');

  // Dynamic Android Material You (system wallpaper theme color picker) tertiary colors
  const [materialColors, setMaterialColors] = useState<{ tertiary: string; tertiaryLight: string }>({
    tertiary: '#7C3AED',
    tertiaryLight: '#A78BFA'
  });

  useEffect(() => {
    fetchMaterialYouColors().then(colors => {
      if (colors?.tertiary) {
        setMaterialColors({
          tertiary: colors.tertiary,
          tertiaryLight: colors.tertiaryLight
        });
      }
    });
  }, []);

  const chartConfig = useMemo(() => ({
    present: {
      label: "Present Students",
      color: materialColors.tertiary,
    },
    absent: {
      label: "Absent Students",
      color: materialColors.tertiaryLight,
    },
  } satisfies ChartConfig), [materialColors]);

  // Chart data aggregated from sessions or benchmark class history
  const chartData = useMemo(() => {
    if (sessions.length >= 3) {
      const sorted = [...sessions]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(-6);

      return sorted.map(s => {
        const present = s.records.filter(r => r.status === 'present' || r.status === 'od').length;
        const absent = s.records.filter(r => r.status === 'absent').length;
        return {
          session: `P${s.periodNumber} ${s.subjectCode}`,
          present,
          absent,
        };
      });
    }

    return [
      { session: "Session 1", present: 48, absent: 4 },
      { session: "Session 2", present: 50, absent: 2 },
      { session: "Session 3", present: 45, absent: 7 },
      { session: "Session 4", present: 49, absent: 3 },
      { session: "Session 5", present: 46, absent: 6 },
      { session: "Session 6", present: 51, absent: 1 },
    ];
  }, [sessions]);

  // Small Local AI Export Engine Prompt & State
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiResult, setAiResult] = useState<AiExportFilterResult | null>(null);

  // Interactive Attendance Threshold Slider State
  const [thresholdFilter, setThresholdFilter] = useState<number>(75);
  const [isThresholdActive, setIsThresholdActive] = useState<boolean>(false);

  // Run Local AI Parser whenever aiPrompt changes
  const parsedAiRules = useMemo(() => {
    return parseLocalAiExportPrompt(aiPrompt);
  }, [aiPrompt]);

  // Student summary performance calculation
  const studentSummaries = useMemo(() => {
    return students.map(student => {
      let totalConducted = 0;
      let totalAttended = 0;

      sessions.forEach(s => {
        if (parsedAiRules.subjectCode && s.subjectCode.toUpperCase() !== parsedAiRules.subjectCode.toUpperCase()) {
          return;
        }

        const rec = s.records.find(r => r.studentId === student.id || r.registerNo === student.registerNo);
        if (rec) {
          totalConducted++;
          if (rec.status === 'present' || rec.status === 'od') {
            totalAttended++;
          }
        }
      });

      const percentage = totalConducted > 0 ? Number(((totalAttended / totalConducted) * 100).toFixed(1)) : 100;
      return {
        student,
        totalConducted,
        totalAttended,
        totalAbsent: Math.max(0, totalConducted - totalAttended),
        percentage
      };
    });
  }, [students, sessions, parsedAiRules]);

  // Students falling below the interactive threshold slider
  const atRiskStudentsCount = useMemo(() => {
    return studentSummaries.filter(s => s.percentage < thresholdFilter).length;
  }, [studentSummaries, thresholdFilter]);

  // Apply AI & Threshold Filter rules to student Summaries
  const aiFilteredSummaries = useMemo(() => {
    let list = [...studentSummaries];

    // Interactive Slider threshold filter
    if (isThresholdActive) {
      list = list.filter(s => s.percentage < thresholdFilter);
    }

    // Status filter rule
    if (parsedAiRules.statusFilter === 'absent') {
      list = list.filter(s => s.totalAbsent > 0 || s.percentage < 100);
    } else if (parsedAiRules.statusFilter === 'present') {
      list = list.filter(s => s.percentage >= 90);
    }

    if (parsedAiRules.maxPercentage !== undefined) {
      list = list.filter(s => s.percentage <= parsedAiRules.maxPercentage!);
    }

    if (parsedAiRules.minPercentage !== undefined) {
      list = list.filter(s => s.percentage >= parsedAiRules.minPercentage!);
    }

    if (parsedAiRules.section) {
      list = list.filter(s => s.student.batchSection?.toLowerCase() === parsedAiRules.section?.toLowerCase());
    }

    // Direct name or roll number search if prompt contains words not caught by rule keywords
    const cleanPrompt = aiPrompt.trim().toLowerCase();
    if (cleanPrompt && !cleanPrompt.includes('attendance') && !cleanPrompt.includes('export') && !cleanPrompt.includes('student') && !cleanPrompt.includes('below') && !cleanPrompt.includes('above')) {
      const nameMatch = list.filter(s =>
        s.student.name.toLowerCase().includes(cleanPrompt) ||
        s.student.registerNo.toLowerCase().includes(cleanPrompt)
      );
      if (nameMatch.length > 0) {
        list = nameMatch;
      }
    }

    if (parsedAiRules.sortBy === 'percentage') {
      if (parsedAiRules.sortOrder === 'asc') {
        list.sort((a, b) => a.percentage - b.percentage);
      } else {
        list.sort((a, b) => b.percentage - a.percentage);
      }
    }

    if (parsedAiRules.limit) {
      list = list.slice(0, parsedAiRules.limit);
    }

    return list;
  }, [studentSummaries, parsedAiRules, aiPrompt]);

  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [loadingText, setLoadingText] = useState<string>('');

  // Export AI Custom XLSX
  const handleAiExport = async () => {
    setIsExporting(true);
    setLoadingText('Generating AI Custom Report...');
    try {
      const rows = aiFilteredSummaries.map(s => ({
        'Register No': s.student.registerNo,
        'Student Name': s.student.name,
        'Batch / Section': s.student.batchSection || 'General',
        'Classes Conducted': s.totalConducted,
        'Classes Attended': s.totalAttended,
        'Classes Absent': s.totalAbsent,
        'Attendance Rate': `${s.percentage}%`,
        'Eligibility Status': s.percentage >= 75 ? 'Eligible (>= 75%)' : 'Shortage Warning (< 75%)'
      }));

      const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [
        { 'Message': 'No students matched this AI filter criteria' }
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'AI Custom Export');
      await exportXlsxWorkbook(workbook, `AI_Attendance_Export_${new Date().toISOString().split('T')[0]}.xlsx`);

      showToast('AI Custom Export Generated', `Exported ${rows.length} matching student records`, 'success');
    } catch (err) {
      showToast('Export Error', String(err), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    setLoadingText('Compiling Full Academic Attendance Records (.xlsx)...');
    try {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Comprehensive Student-wise Cumulative Summary
      const studentRows = studentSummaries.map(s => ({
        'Register No': s.student.registerNo,
        'Student Name': s.student.name,
        'Batch / Section': s.student.batchSection || 'General',
        'Classes Conducted': s.totalConducted,
        'Classes Attended': s.totalAttended,
        'Classes Absent': s.totalAbsent,
        'Attendance Percentage': `${s.percentage}%`,
        'Eligibility Status': s.percentage >= 75 ? 'Eligible (>= 75%)' : 'Shortage Warning (< 75%)'
      }));
      const studentWs = XLSX.utils.json_to_sheet(studentRows.length > 0 ? studentRows : [
        { 'Message': 'No student records in roster' }
      ]);
      XLSX.utils.book_append_sheet(workbook, studentWs, 'Student Summary');

      // Sheet 2: Session-wise Cumulative Logs
      const sessionRows: any[] = [];
      sessions.forEach(s => {
        const presentCount = s.records.filter(r => r.status === 'present' || r.status === 'od').length;
        const total = s.records.length;
        const rate = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0';

        sessionRows.push({
          'Date': s.date,
          'Period': s.periodNumber,
          'Subject Code': s.subjectCode,
          'Subject Name': s.subjectName || '',
          'Faculty': s.facultyName || '',
          'Total Students': total,
          'Present Count': presentCount,
          'Absent Count': total - presentCount,
          'Attendance Rate': `${rate}%`
        });
      });
      const sessionWs = XLSX.utils.json_to_sheet(sessionRows.length > 0 ? sessionRows : [
        { 'Message': 'No sessions recorded yet' }
      ]);
      XLSX.utils.book_append_sheet(workbook, sessionWs, 'Session Logs');

      // Sheet 3: Individual Attendance Session Matrix
      const detailedRows: any[] = [];
      sessions.forEach(s => {
        s.records.forEach(r => {
          detailedRows.push({
            'Date': s.date,
            'Period': s.periodNumber,
            'Subject Code': s.subjectCode,
            'Faculty': s.facultyName || '',
            'Register No': r.registerNo,
            'Student Name': r.name,
            'Status': (r.status || 'present').toUpperCase(),
            'Remarks': r.remarks || ''
          });
        });
      });
      if (detailedRows.length > 0) {
        const detailedWs = XLSX.utils.json_to_sheet(detailedRows);
        XLSX.utils.book_append_sheet(workbook, detailedWs, 'Detailed Records');
      }

      await exportXlsxWorkbook(workbook, `Class_Attendance_Complete_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Export Complete', 'Saved / Shared complete attendance report (.xlsx)', 'success');
    } catch (err) {
      showToast('Export Error', String(err), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteSession = async (id: number) => {
    await db.attendanceSessions.delete(id);
    showToast('Log Deleted', undefined, 'info');
  };

  const handleExportSelectedSessions = async (selectedRows: SessionRow[]) => {
    if (selectedRows.length === 0) return;
    setIsExporting(true);
    setLoadingText(`Exporting ${selectedRows.length} Attendance Session(s)...`);
    try {
      const workbook = XLSX.utils.book_new();

      const sessionSummaryRows = selectedRows.map(r => ({
        'Date': r.date,
        'Period': r.periodNumber,
        'Subject Code': r.subjectCode,
        'Subject Name': r.subjectName,
        'Faculty': r.facultyName,
        'Total Students': r.totalStudents,
        'Present Count': r.presentCount,
        'Absent Count': r.absentCount,
        'Attendance Rate': `${r.percentage.toFixed(1)}%`
      }));

      const summaryWs = XLSX.utils.json_to_sheet(sessionSummaryRows);
      XLSX.utils.book_append_sheet(workbook, summaryWs, 'Sessions Summary');

      // Detailed Student records
      const detailedRows: any[] = [];
      selectedRows.forEach(r => {
        r.rawSession.records.forEach(rec => {
          detailedRows.push({
            'Session Date': r.date,
            'Period': r.periodNumber,
            'Subject Code': r.subjectCode,
            'Faculty': r.facultyName,
            'Register No': rec.registerNo,
            'Student Name': rec.name,
            'Batch/Section': rec.batchSection,
            'Status': (rec.status || 'present').toUpperCase(),
            'Remarks': rec.remarks || ''
          });
        });
      });

      if (detailedRows.length > 0) {
        const detailedWs = XLSX.utils.json_to_sheet(detailedRows);
        XLSX.utils.book_append_sheet(workbook, detailedWs, 'Student Attendance');
      }

      await exportXlsxWorkbook(workbook, `Selected_Sessions_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
      showToast('Export Complete', `Exported ${selectedRows.length} session(s) (.xlsx)`, 'success');
    } catch (err) {
      showToast('Export Error', String(err), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSession = (session: AttendanceSession) => {
    const presentCount = session.records.filter(r => r.status === 'present' || r.status === 'od').length;
    const absentCount = session.records.filter(r => r.status === 'absent').length;
    const totalStudents = session.records.length;
    const percentage = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;
    const row: SessionRow = {
      id: session.id!,
      date: session.date,
      periodNumber: session.periodNumber,
      subjectCode: session.subjectCode,
      subjectName: session.subjectName || session.subjectCode,
      facultyName: session.facultyName || 'Dr. S. Muthuvel',
      presentCount,
      absentCount,
      totalStudents,
      percentage,
      rawSession: session
    };
    handleExportSelectedSessions([row]);
  };

  const handleBatchDelete = async (selectedRows: SessionRow[]) => {
    if (selectedRows.length === 0) return;
    const count = selectedRows.length;
    for (const row of selectedRows) {
      await db.attendanceSessions.delete(row.id);
    }
    showToast('Sessions Deleted', `Removed ${count} session log(s)`, 'info');
  };

  const [inspectSession, setInspectSession] = useState<AttendanceSession | null>(null);
  const [inspectFilter, setInspectFilter] = useState<'all' | 'absent' | 'present' | 'od'>('all');
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [copiedAbsentees, setCopiedAbsentees] = useState<boolean>(false);

  const handleCopySessionReport = (session: AttendanceSession) => {
    const absentees = (session.records || [])
      .filter(r => r.status === 'absent')
      .map(r => `${r.registerNo}  ${r.name?.toUpperCase()}`);
    const absText = absentees.length > 0 ? absentees.join('\n') : 'NIL';
    const presentCount = (session.records || []).filter(r => r.status === 'present' || r.status === 'od').length;
    const absentCount = (session.records || []).filter(r => r.status === 'absent').length;
    const total = (session.records || []).length;
    const pct = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0';

    const text = `Attendance Report
Date: ${session.date}
Period: ${session.periodNumber}
Subject: ${session.subjectName || session.subjectCode} (${session.subjectCode})
Faculty: ${session.facultyName || 'N/A'}
Attendance Rate: ${pct}% (Present: ${presentCount}/${total})

ABSENTEES (${absentCount}):
${absText}`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2000);
      showToast('Report Copied', 'Full attendance report copied to clipboard', 'success');
    }).catch(() => {
      showToast('Copy Failed', 'Unable to copy to clipboard', 'error');
    });
  };

  const handleCopyAbsenteesOnly = (session: AttendanceSession) => {
    const absentees = (session.records || [])
      .filter(r => r.status === 'absent')
      .map(r => `${r.registerNo}  ${r.name?.toUpperCase()}`);
    const absText = absentees.length > 0 ? absentees.join('\n') : 'NIL';
    navigator.clipboard.writeText(absText).then(() => {
      setCopiedAbsentees(true);
      setTimeout(() => setCopiedAbsentees(false), 2000);
      showToast('Absentees Copied', `Copied ${absentees.length} absentee(s) to clipboard`, 'success');
    }).catch(() => {
      showToast('Copy Failed', 'Unable to copy to clipboard', 'error');
    });
  };

  const handleExportSingleSessionCsv = async (session: AttendanceSession) => {
    const rows = [
      ['Session Attendance Report'],
      ['Date', session.date],
      ['Period', String(session.periodNumber)],
      ['Subject Code', session.subjectCode],
      ['Subject Name', session.subjectName || ''],
      ['Faculty', session.facultyName || ''],
      [],
      ['Register No', 'Student Name', 'Batch/Section', 'Status', 'Remarks'],
      ...(session.records || []).map(r => [
        `"${r.registerNo}"`,
        `"${r.name}"`,
        `"${r.batchSection || ''}"`,
        `"${(r.status || 'present').toUpperCase()}"`,
        `"${r.remarks || ''}"`
      ])
    ];
    const csvContent = rows.map(r => r.join(',')).join('\n');
    await exportCsvFile(csvContent, `Attendance_${session.subjectCode}_P${session.periodNumber}_${session.date}.csv`);
    showToast('CSV Exported', `Session exported to CSV`, 'success');
  };

  const sessionRows: SessionRow[] = useMemo(() => {
    return sessions.map(session => {
      const presentCount = session.records.filter(r => r.status === 'present' || r.status === 'od').length;
      const absentCount = session.records.filter(r => r.status === 'absent').length;
      const totalStudents = session.records.length;
      const percentage = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

      return {
        id: session.id!,
        date: session.date,
        periodNumber: session.periodNumber,
        subjectCode: session.subjectCode,
        subjectName: session.subjectName || session.subjectCode,
        facultyName: session.facultyName || 'Dr. S. Muthuvel',
        presentCount,
        absentCount,
        totalStudents,
        percentage,
        rawSession: session,
      };
    });
  }, [sessions]);

  const columns = useMemo(() => {
    return createColumns({
      onReExport: (session) => handleExportSession(session),
      onDelete: (id) => handleDeleteSession(id),
      onViewDetails: (session) => {
        setInspectSession(session);
        setInspectFilter('all');
      },
      onCopyInfo: (session) => handleCopySessionReport(session),
    });
  }, []);

  const modalStats = useMemo(() => {
    if (!inspectSession) return null;
    const records = inspectSession.records || [];
    const total = records.length;
    const present = records.filter(r => r.status === 'present' || r.status === 'od').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const od = records.filter(r => r.status === 'od').length;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : '0';
    const absenteesList = records.filter(r => r.status === 'absent');
    return { total, present, absent, od, rate, absenteesList };
  }, [inspectSession]);

  const inspectFilteredRecords = useMemo(() => {
    if (!inspectSession) return [];
    const records = inspectSession.records || [];
    if (inspectFilter === 'all') return records;
    if (inspectFilter === 'absent') return records.filter(r => r.status === 'absent');
    if (inspectFilter === 'present') return records.filter(r => r.status === 'present');
    if (inspectFilter === 'od') return records.filter(r => r.status === 'od');
    return records;
  }, [inspectSession, inspectFilter]);

  if (rawSessions === undefined) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-36 space-y-6 animate-fade-in-up">
      {/* Top Banner Card with Illustration */}
      <div className="bg-neutral-900 dark:bg-[#171717] text-white border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4 card-interactive overflow-hidden relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 dark:bg-[#262626] flex items-center justify-center shrink-0">
                <Download className="w-6 h-6 text-white animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                    Exports Hub & Attendance Logs
                  </h2>
                  <span className="px-3 py-1 rounded-full bg-neutral-800 text-neutral-200 text-xs font-bold shrink-0">
                    {sessions.length} Recorded
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed font-medium">
                  Export cumulative Excel reports, CSV spreadsheets, print summaries, or custom AI rules.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleExportExcel}
                disabled={isExporting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-100 dark:bg-white text-neutral-900 font-bold text-xs shadow-md hover:bg-neutral-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {isExporting ? (
                  <Spinner size="sm" className="text-neutral-900" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4 text-neutral-900" />
                )}
                <span>Export (.xlsx)</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs shadow-md hover:scale-105 active:scale-95 transition-all"
              >
                <Printer className="w-4 h-4 text-white" /> Print Summary
              </button>
            </div>
          </div>

          <div className="hidden sm:flex w-32 md:w-36 h-32 md:h-36 shrink-0 items-center justify-center">
            <img
              src="/illustrations/alegria_reports.jpg"
              alt="Reports and Analytics"
              className="w-full h-full object-contain blend-illustration rounded-2xl"
            />
          </div>
        </div>
      </div>

      {/* Attendance History Analytics Bar Chart */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-200/60 dark:border-neutral-800/80 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 transition-colors" style={{ color: materialColors.tertiary }} />
              <span>Attendance History Breakdown</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
              Comparative session attendance breakdown across recent classes
            </p>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="min-h-[220px] w-full">
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} stroke="rgba(128, 128, 128, 0.15)" strokeDasharray="3 3" />
            <XAxis
              dataKey="session"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{ fill: '#888888', fontSize: 11 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="present" fill="var(--color-present)" radius={4} />
            <Bar dataKey="absent" fill="var(--color-absent)" radius={4} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* INTERACTIVE ATTENDANCE TARGET & DEFICIT SLIDER */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-[#262626] flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5 text-[var(--accent-tertiary)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
                  ATTENDANCE TARGET &amp; DEFICIT DETECTOR
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-100 dark:bg-[#262626] text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700">
                  Target: {thresholdFilter}%
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Scrub the slider to dynamically inspect and filter students falling short of academic attendance criteria.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setIsThresholdActive(prev => !prev);
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                isThresholdActive
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-[#333333]'
              }`}
            >
              {isThresholdActive ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Filtering Active
                </>
              ) : (
                <>
                  <Filter className="w-3.5 h-3.5" /> Filter Table (&lt; {thresholdFilter}%)
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tactile Slider with Detents */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-neutral-300">
            <span>Minimum Required Attendance:</span>
            <span className="font-mono text-sm px-2.5 py-0.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-black shadow-sm">
              {thresholdFilter}%
            </span>
          </div>

          <Slider
            min={50}
            max={100}
            step={1}
            value={thresholdFilter}
            onValueChange={setThresholdFilter}
          />

          <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
            <span>50% (Lenient)</span>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                atRiskStudentsCount > 0
                  ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
              }`}>
                {atRiskStudentsCount} student{atRiskStudentsCount === 1 ? '' : 's'} below {thresholdFilter}%
              </span>
            </div>
            <span>100% (Strict)</span>
          </div>
        </div>
      </div>

      {/* SMALL LOCAL AI EXPORT CUSTOMIZER */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                SMALL LOCAL AI EXPORT ASSISTANT
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Type natural language rules to customize what data to export (runs 100% offline locally)
              </p>
            </div>
          </div>
        </div>

        {/* Natural Language Prompt Input */}
        <div className="relative">
          <input
            type="text"
            placeholder={subjects[0] ? `Try: "Export students with attendance less than 75%" or "Subject ${subjects[0].code} report"` : 'Try: "Export students with attendance less than 75%" or "Top performers"'}
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            className="w-full pl-4 pr-10 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none shadow-sm"
          />
        </div>

        {/* AI Quick Preset Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase text-neutral-400">Presets:</span>
          <button
            onClick={() => setAiPrompt('Export students with attendance less than 75%')}
            className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition-colors"
          >
            Low Attendance (&lt; 75%)
          </button>
          <button
            onClick={() => setAiPrompt('Export top 5 students by attendance')}
            className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition-colors"
          >
            Top 5 Performers
          </button>
          {subjects[0] && (
            <button
              onClick={() => setAiPrompt(`Subject ${subjects[0].code} breakdown`)}
              className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 hover:border-neutral-400 transition-colors"
            >
              {subjects[0].code} Only
            </button>
          )}
        </div>

        {/* AI Parsed Criteria Badge & Live Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
          <div>
            <span className="text-[10px] font-bold uppercase text-neutral-900 dark:text-white block">
              Active Rule Logic:
            </span>
            <p className="text-xs font-bold text-neutral-900 dark:text-white mt-0.5">
              {parsedAiRules.explanation}
            </p>
          </div>

          <button
            onClick={handleAiExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-extrabold text-xs shadow-md transition-all shrink-0 active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <Spinner size="sm" className="text-white dark:text-neutral-900" /> : <Download className="w-4 h-4" />}
            <span>Export Filtered Data</span>
          </button>
        </div>

        {/* AI Live Filtered Preview Table */}
        <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm overflow-hidden mt-4">
          <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Live Filter Preview ({aiFilteredSummaries.length} Records)
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#262626] text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="p-3.5 whitespace-nowrap">Reg No</th>
                  <th className="p-3.5 whitespace-nowrap">Student Name</th>
                  <th className="p-3.5 whitespace-nowrap">Batch</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Attended / Total</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-xs font-medium">
                {aiFilteredSummaries.map(s => {
                  const isLow = s.percentage < 75;
                  return (
                    <tr key={s.student.id} className="hover:bg-neutral-50 dark:hover:bg-[#262626]/50">
                      <td className="p-3.5 font-mono font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                        {s.student.registerNo}
                      </td>
                      <td className="p-3.5 font-semibold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
                        {s.student.name}
                      </td>
                      <td className="p-3.5 text-neutral-500 whitespace-nowrap">{s.student.batchSection}</td>
                      <td className="p-3.5 text-center font-bold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                        {s.totalAttended} / {s.totalConducted}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold whitespace-nowrap ${
                          isLow ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}>
                          {s.percentage}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TanStack Data Table for Attendance History Sessions */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
              <span>Attendance History Logs</span>
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-0.5">
              Powered by TanStack Data Table — sort columns, filter, toggle visibility, select rows &amp; export
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 text-xs font-bold font-mono w-fit">
            {sessionRows.length} Session{sessionRows.length === 1 ? '' : 's'}
          </span>
        </div>

        <DataTable
          columns={columns}
          data={sessionRows}
          searchKey="subjectCode"
          searchPlaceholder="Filter sessions by subject code..."
          onBatchExport={handleExportSelectedSessions}
          onBatchDelete={handleBatchDelete}
          onRowClick={(row) => {
            setInspectSession(row.rawSession);
            setInspectFilter('all');
          }}
        />
      </div>

      {/* Session Details Inspection Modal */}
      {inspectSession && modalStats && (
        <Modal
          isOpen={!!inspectSession}
          onClose={() => setInspectSession(null)}
          title={`Period ${inspectSession.periodNumber} • ${inspectSession.subjectCode}`}
          subtitle={`${inspectSession.date} • ${inspectSession.subjectName || inspectSession.subjectCode}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Faculty & Session Header Info */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200/80 dark:border-neutral-700/80 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">Faculty:</span>
                <span className="font-bold text-neutral-900 dark:text-white">
                  {inspectSession.facultyName || 'Dr. S. Muthuvel'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-200/70 dark:bg-[#333333] font-mono font-bold text-neutral-800 dark:text-neutral-200">
                  {inspectSession.date}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-bold">
                  Period {inspectSession.periodNumber}
                </span>
              </div>
            </div>

            {/* 4 Stat Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#222222] border border-neutral-200/70 dark:border-neutral-800 text-center">
                <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block">
                  Total Enrolled
                </span>
                <span className="text-xl font-black text-neutral-900 dark:text-white mt-1 block">
                  {modalStats.total}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 text-center">
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">
                  Present
                </span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block">
                  {modalStats.present}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 text-center">
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                  Absent
                </span>
                <span className="text-xl font-black text-rose-700 dark:text-rose-400 mt-1 block">
                  {modalStats.absent}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 text-center">
                <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider block">
                  Rate
                </span>
                <span className="text-xl font-black text-purple-700 dark:text-purple-300 mt-1 block">
                  {modalStats.rate}%
                </span>
              </div>
            </div>

            {/* Absentees Callout Box */}
            {modalStats.absent === 0 ? (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>100% Attendance — Zero absentees recorded in this session.</span>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-rose-800 dark:text-rose-300 uppercase tracking-wide">
                    <UserX className="w-4 h-4" />
                    <span>Absentees List ({modalStats.absent})</span>
                  </div>
                  <button
                    onClick={() => handleCopyAbsenteesOnly(inspectSession)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-sm transition-all active:scale-95"
                  >
                    {copiedAbsentees ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedAbsentees ? 'Copied!' : 'Copy Absentees'}</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                  {modalStats.absenteesList.map(st => (
                    <div
                      key={st.studentId || st.registerNo}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-[#1e1e1e] border border-rose-200/80 dark:border-rose-900/60 shadow-xs text-xs font-semibold text-neutral-800 dark:text-neutral-200"
                    >
                      <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                        {st.registerNo}
                      </span>
                      <span>{st.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Tabs & Student Roster List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Student Roster
                </span>
                <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-[#262626] rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setInspectFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      inspectFilter === 'all'
                        ? 'bg-white dark:bg-[#171717] text-neutral-900 dark:text-white shadow-xs font-bold'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    All ({modalStats.total})
                  </button>
                  <button
                    onClick={() => setInspectFilter('absent')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      inspectFilter === 'absent'
                        ? 'bg-white dark:bg-[#171717] text-rose-600 dark:text-rose-400 shadow-xs font-bold'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Absent ({modalStats.absent})
                  </button>
                  <button
                    onClick={() => setInspectFilter('present')}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      inspectFilter === 'present'
                        ? 'bg-white dark:bg-[#171717] text-emerald-600 dark:text-emerald-400 shadow-xs font-bold'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    Present ({modalStats.present - modalStats.od})
                  </button>
                  {modalStats.od > 0 && (
                    <button
                      onClick={() => setInspectFilter('od')}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        inspectFilter === 'od'
                          ? 'bg-white dark:bg-[#171717] text-amber-600 dark:text-amber-400 shadow-xs font-bold'
                          : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      OD ({modalStats.od})
                    </button>
                  )}
                </div>
              </div>

              {/* Roster Table */}
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-neutral-200/80 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-[#1a1a1a]">
                {inspectFilteredRecords.length === 0 ? (
                  <div className="p-6 text-center text-xs text-neutral-400 font-medium">
                    No students in this view
                  </div>
                ) : (
                  inspectFilteredRecords.map(rec => {
                    const status = rec.status || 'present';
                    return (
                      <div
                        key={rec.studentId || rec.registerNo}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-[#242424] transition-colors text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-neutral-900 dark:text-white">
                            {rec.registerNo}
                          </span>
                          <span className="font-medium text-neutral-700 dark:text-neutral-300">
                            {rec.name}
                          </span>
                        </div>
                        <div>
                          {status === 'present' && (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              PRESENT
                            </span>
                          )}
                          {status === 'absent' && (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                              ABSENT
                            </span>
                          )}
                          {status === 'od' && (
                            <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              ON DUTY (OD)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => handleCopySessionReport(inspectSession)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-sm hover:scale-105 active:scale-95 transition-all"
              >
                {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReport ? 'Copied to Clipboard!' : 'Copy Full Report'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportSingleSessionCsv(inspectSession)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 font-bold text-xs hover:bg-neutral-200 dark:hover:bg-[#333333] transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={() => {
                    handleExportSession(inspectSession);
                    setInspectSession(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 font-bold text-xs hover:bg-neutral-200 dark:hover:bg-[#333333] transition-all"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  onClick={() => setInspectSession(null)}
                  className="px-3.5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {isExporting && <LoadingOverlay message={loadingText} />}
    </div>
  );
};
