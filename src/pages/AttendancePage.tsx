import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { AttendanceStatus, AttendanceRecord, Student } from '../types';
import { useNotification } from '../context/NotificationContext';
import { triggerHaptic } from '../utils/haptics';
import { recordActivity } from '../utils/streak';
import { generateAiWhatsAppAbsenteeMessage } from '../utils/smartAi';
import { formatAttendanceSummary } from '../utils/summaryFormatter';
import { Modal } from '../components/common/Modal';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DatePicker } from '@/components/ui/date-picker';
import { Slider } from '@/components/ui/slider';
import { Spinner, LoadingOverlay } from '@/components/ui/spinner';
import {
  Clock,
  Save,
  Search,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ChevronDown,
  Sparkles,
  Copy,
  FileText,
  FileSpreadsheet,
  Printer,
  UserX,
  Check,
  MessageSquare,
  UserCheck,
  ArrowRight,
  Umbrella,
  Sliders,
  X
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { exportXlsxWorkbook, exportCsvFile } from '../utils/fileExport';

export const AttendancePage: React.FC = () => {
  const { showToast } = useNotification();

  // Database Queries
  const students = useLiveQuery(() => db.students.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const facultyList = useLiveQuery(() => db.faculty.toArray()) || [];
  const periodConfigs = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray()) || [];
  const schedules = useLiveQuery(() => db.schedules.toArray()) || [];
  const sessions = useLiveQuery(() => db.attendanceSessions.toArray()) || [];
  const settingsList = useLiveQuery(() => db.settings.toArray());
  const currentSettings = settingsList?.[0];

  // Form State
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [hasUserChangedPeriod, setHasUserChangedPeriod] = useState<boolean>(false);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>('');

  // Horizontal Period Selector Indicator State & Refs
  const [periodIndicator, setPeriodIndicator] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });
  const periodRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});

  useEffect(() => {
    const el = periodRefs.current[selectedPeriod];
    if (el) {
      setPeriodIndicator({
        left: el.offsetLeft,
        width: el.offsetWidth,
        opacity: 1
      });
    }
  }, [selectedPeriod, periodConfigs.length]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'absent'>('all');

  // Attendance status mapping: Map<studentId, AttendanceStatus>
  const [statusMap, setStatusMap] = useState<Record<number, AttendanceStatus>>({});
  const [remarksMap, setRemarksMap] = useState<Record<number, string>>({});

  const selectedPeriodConfig = useMemo(() => {
    return periodConfigs.find(p => p.periodNumber === selectedPeriod);
  }, [periodConfigs, selectedPeriod]);

  const selectedSubjectObj = useMemo(() => {
    return subjects.find(s => s.code === selectedSubject);
  }, [subjects, selectedSubject]);

  const holidayForSelectedDate = useMemo(() => {
    return currentSettings?.holidays?.find(h => h.date === selectedDate);
  }, [currentSettings, selectedDate]);
  const isSelectedDateHoliday = !!holidayForSelectedDate;

  const [saveModalStep, setSaveModalStep] = useState<'confirm' | 'saved' | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Student Three Dots Action Modal State
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [studentModalStatus, setStudentModalStatus] = useState<AttendanceStatus>('present');
  const [studentRemarkInput, setStudentRemarkInput] = useState<string>('');

  // Compute optimal period based on real-time clock and timetable
  const computedCurrentPeriod = useMemo(() => {
    if (periodConfigs.length === 0) return 1;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Check currently active period (now is between startTime and endTime)
    for (const pc of periodConfigs) {
      if (!pc.startTime || !pc.endTime) continue;
      const [sh, sm] = pc.startTime.split(':').map(Number);
      const [eh, em] = pc.endTime.split(':').map(Number);
      const startM = sh * 60 + sm;
      const endM = eh * 60 + em;
      if (nowMinutes >= startM && nowMinutes <= endM) {
        return pc.periodNumber;
      }
    }

    // 2. Check next upcoming period today
    for (const pc of periodConfigs) {
      if (!pc.startTime) continue;
      const [sh, sm] = pc.startTime.split(':').map(Number);
      const startM = sh * 60 + sm;
      if (nowMinutes < startM) {
        return pc.periodNumber;
      }
    }

    // 3. Fallback: First period or last
    return 1;
  }, [periodConfigs]);

  // Autofill initial period once periodConfigs are available if user has not manually changed
  useEffect(() => {
    if (!hasUserChangedPeriod && periodConfigs.length > 0) {
      setSelectedPeriod(computedCurrentPeriod);
    }
  }, [computedCurrentPeriod, periodConfigs, hasUserChangedPeriod]);

  // AUTO-FILL PERIOD SUBJECT & FACULTY ON DATE / PERIOD CHANGE
  useEffect(() => {
    if (selectedDate && selectedPeriod && schedules.length > 0) {
      const dateObj = new Date(selectedDate);
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = days[dateObj.getDay()];

      const match = schedules.find(s => s.dayOfWeek === dayName && s.periodNumber === selectedPeriod);
      if (match && match.subjectCode && match.subjectCode !== 'FREE') {
        setSelectedSubject(match.subjectCode);
        if (match.facultyName) {
          setSelectedFaculty(match.facultyName);
        }
      } else if (subjects.length > 0) {
        const fallbackSub = subjects.find(s => s.code === match?.subjectCode) || subjects[(selectedPeriod - 1) % subjects.length];
        if (fallbackSub) {
          setSelectedSubject(fallbackSub.code);
        }
      }
    }
  }, [selectedPeriod, selectedDate, schedules, subjects]);

  // Initialize statusMap
  useEffect(() => {
    if (students.length > 0) {
      const initialMap: Record<number, AttendanceStatus> = {};
      students.forEach(st => {
        if (st.id !== undefined) {
          initialMap[st.id] = 'present';
        }
      });
      setStatusMap(initialMap);
    }
  }, [students]);

  // Load existing session if saved
  useEffect(() => {
    if (selectedDate && selectedPeriod && selectedSubject) {
      db.attendanceSessions
        .where({ date: selectedDate, periodNumber: selectedPeriod, subjectCode: selectedSubject })
        .first()
        .then(existingSession => {
          if (existingSession && existingSession.records && existingSession.records.length > 0) {
            const loadedMap: Record<number, AttendanceStatus> = {};
            const loadedRemarks: Record<number, string> = {};
            existingSession.records.forEach(r => {
              loadedMap[r.studentId] = r.status;
              if (r.remarks) loadedRemarks[r.studentId] = r.remarks;
            });
            setStatusMap(prev => ({ ...prev, ...loadedMap }));
            setRemarksMap(prev => ({ ...prev, ...loadedRemarks }));
          } else {
            // No session recorded for this period yet -> RESET ALL STUDENTS TO PRESENT!
            const freshMap: Record<number, AttendanceStatus> = {};
            students.forEach(st => {
              if (st.id !== undefined) {
                freshMap[st.id] = 'present';
              }
            });
            setStatusMap(freshMap);
            setRemarksMap({});
          }
        });
    }
  }, [selectedDate, selectedPeriod, selectedSubject, students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.registerNo.toLowerCase().includes(searchQuery.toLowerCase());

      const currentStatus = statusMap[student.id!] || 'present';
      const matchesFilter = filterMode === 'all' || (filterMode === 'absent' && currentStatus === 'absent');

      return matchesSearch && matchesFilter;
    });
  }, [students, searchQuery, filterMode, statusMap]);

  // List of Absent Students
  const absentStudents = useMemo(() => {
    return students.filter(st => statusMap[st.id!] === 'absent');
  }, [students, statusMap]);

  // Attendance Counts
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let od = 0;

    Object.values(statusMap).forEach(st => {
      if (st === 'present') present++;
      else if (st === 'absent') absent++;
      else if (st === 'od') od++;
    });

    const total = students.length;
    return { present, absent, od, total };
  }, [statusMap, students.length]);

  const currentSubjectObj = useMemo(() => {
    return subjects.find(s => s.code === selectedSubject);
  }, [subjects, selectedSubject]);

  const summaryText = useMemo(() => {
    return formatAttendanceSummary({
      template: currentSettings?.summaryTemplate,
      dateStr: selectedDate,
      periodNumber: selectedPeriod,
      subjectCode: selectedSubject,
      subjectName: currentSubjectObj?.name,
      facultyName: selectedFaculty,
      absentStudents: absentStudents,
      presentCount: counts.present,
      totalCount: counts.total,
      className: currentSettings?.className,
      section: currentSettings?.section
    });
  }, [currentSettings, selectedDate, selectedPeriod, currentSubjectObj, selectedSubject, selectedFaculty, absentStudents, counts]);

  // Card click handler: Clicking ANYWHERE on student card toggles Present <-> Absent + Haptic!
  const handleCardClick = (studentId: number) => {
    triggerHaptic('light');
    setStatusMap(prev => {
      const current = prev[studentId] || 'present';
      const nextStatus: AttendanceStatus = current === 'present' ? 'absent' : 'present';
      return { ...prev, [studentId]: nextStatus };
    });
  };

  // Open Three Dots Menu Modal for specific student
  const handleOpenStudentModal = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    triggerHaptic('medium');
    setTargetStudent(student);
    setStudentModalStatus(statusMap[student.id!] || 'present');
    setStudentRemarkInput(remarksMap[student.id!] || '');
  };

  const handleSaveStudentModal = () => {
    if (targetStudent && targetStudent.id) {
      setStatusMap(prev => ({ ...prev, [targetStudent.id!]: studentModalStatus }));
      setRemarksMap(prev => ({ ...prev, [targetStudent.id!]: studentRemarkInput }));
      showToast('Updated Student', `${targetStudent.name} -> ${studentModalStatus.toUpperCase()}`, 'success');
      setTargetStudent(null);
    }
  };

  const setAllStatus = (status: AttendanceStatus) => {
    triggerHaptic('medium');
    const updated: Record<number, AttendanceStatus> = { ...statusMap };
    students.forEach(st => {
      if (st.id !== undefined) {
        updated[st.id] = status;
      }
    });
    setStatusMap(updated);
    showToast(`Marked all students as ${status}`, undefined, 'info');
  };

  // Save Session & open Post-Confirmation Summary Export Modal!
  const handleSaveSession = async () => {
    setIsSaving(true);
    triggerHaptic('success');
    recordActivity(); // Update activity streak!

    try {
      const records: AttendanceRecord[] = students.map(st => ({
        studentId: st.id!,
        registerNo: st.registerNo,
        name: st.name,
        batchSection: st.batchSection,
        status: statusMap[st.id!] || 'present',
        remarks: remarksMap[st.id!] || ''
      }));

      const existing = await db.attendanceSessions
        .where({ date: selectedDate, periodNumber: selectedPeriod, subjectCode: selectedSubject })
        .first();

      if (existing && existing.id) {
        await db.attendanceSessions.update(existing.id, {
          subjectName: currentSubjectObj?.name || '',
          facultyName: selectedFaculty,
          records,
          createdAt: new Date().toISOString()
        });
      } else {
        await db.attendanceSessions.add({
          date: selectedDate,
          periodNumber: selectedPeriod,
          subjectCode: selectedSubject,
          subjectName: currentSubjectObj?.name || '',
          facultyName: selectedFaculty,
          records,
          createdAt: new Date().toISOString()
        });
      }

      // Smooth processing feedback before morphing into saved state
      await new Promise(resolve => setTimeout(resolve, 500));

      // Morph into the saved state within the same modal!
      setSaveModalStep('saved');
      showToast('Attendance Saved Successfully', undefined, 'success');
    } catch (err) {
      showToast('Error saving attendance', String(err), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Next Period Attendance Handler: Advances period & sets all students back to Present
  const handleNextPeriod = () => {
    triggerHaptic('medium');
    setSaveModalStep(null);
    const maxPeriods = periodConfigs.length > 0 ? periodConfigs[periodConfigs.length - 1].periodNumber : 8;
    const nextP = selectedPeriod < maxPeriods ? selectedPeriod + 1 : 1;
    setSelectedPeriod(nextP);

    const freshMap: Record<number, AttendanceStatus> = {};
    students.forEach(st => {
      if (st.id !== undefined) freshMap[st.id] = 'present';
    });
    setStatusMap(freshMap);
    setRemarksMap({});
    showToast(`Started Period ${nextP}`, 'All students set to Present', 'info');
  };

  // Copy Actions
  const copyToClipboard = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${title}`, undefined, 'success');
  };

  const copyRegNos = () => {
    const regNosStr = absentStudents.map(s => s.registerNo).join(', ');
    copyToClipboard(regNosStr || 'NIL', 'Register Numbers');
  };

  const copyNames = () => {
    const namesStr = absentStudents.map(s => s.name).join(', ');
    copyToClipboard(namesStr || 'NIL', 'Absentee Names');
  };

  const copyAiWhatsAppNotice = () => {
    const notice = generateAiWhatsAppAbsenteeMessage(
      selectedDate,
      selectedPeriod,
      selectedSubject,
      absentStudents
    );
    copyToClipboard(notice, 'WhatsApp AI Absentee Notice');
  };

  // Export Excel
  const exportSessionExcel = async () => {
    try {
      const rows = students.map(st => ({
        'Register No': st.registerNo,
        'Student Name': st.name,
        'Status': (statusMap[st.id!] || 'present').toUpperCase(),
        'Remarks': remarksMap[st.id!] || '',
        'Date': selectedDate,
        'Period': selectedPeriod,
        'Subject Code': selectedSubject,
        'Subject Name': selectedSubjectObj?.name || selectedSubject,
        'Faculty': selectedFaculty || 'Faculty'
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Period_${selectedPeriod}`);
      await exportXlsxWorkbook(workbook, `Attendance_P${selectedPeriod}_${selectedSubject}_${selectedDate}.xlsx`);
      showToast('Exported Attendance Excel', `Exported ${rows.length} student records`, 'success');
    } catch (err) {
      showToast('Export Error', String(err), 'error');
    }
  };

  // Export CSV
  const exportSessionCsv = async () => {
    try {
      const rows = students.map(st => `${st.registerNo},"${st.name}",${(statusMap[st.id!] || 'present').toUpperCase()},"Remarks: ${remarksMap[st.id!] || 'None'}","${selectedDate}",${selectedPeriod},"${selectedSubject}"`);
      const csvContent = `Register No,Student Name,Status,Remarks,Date,Period,Subject\n` + rows.join('\n');
      await exportCsvFile(csvContent, `Attendance_P${selectedPeriod}_${selectedSubject}_${selectedDate}.csv`);
      showToast('Exported Attendance CSV', `Exported ${students.length} records`, 'success');
    } catch (err) {
      showToast('Export Error', String(err), 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Target Student Stats Calculation
  const targetStudentStats = useMemo(() => {
    if (!targetStudent) return { conducted: 0, attended: 0, rate: 0 };
    let conducted = 0;
    let attended = 0;

    sessions.forEach(s => {
      const rec = s.records.find(r => r.studentId === targetStudent.id);
      if (rec) {
        conducted++;
        if (rec.status === 'present' || rec.status === 'od') attended++;
      }
    });

    const rate = conducted > 0 ? Number(((attended / conducted) * 100).toFixed(1)) : 100;
    return { conducted, attended, rate };
  }, [targetStudent, sessions]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-36 space-y-5 animate-fade-in-up">
      {/* Attendance Top Header (Replacing the "Hello" navbar with clean page context) */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="hidden md:flex shrink-0" />
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
              Attendance Logger
            </h1>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
              {format(new Date(selectedDate), 'EEEE, dd MMMM yyyy')}
            </p>
          </div>
        </div>

        {isSelectedDateHoliday && (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-black border border-amber-300/40 dark:border-amber-800/40">
            <Umbrella className="w-3.5 h-3.5" /> Holiday: {holidayForSelectedDate?.title || 'Institutional Break'}
          </span>
        )}
      </div>

      {/* Holiday Alert Banner when current selected date is a marked holiday */}
      {isSelectedDateHoliday && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start sm:items-center justify-between gap-3 text-amber-800 dark:text-amber-200 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <Umbrella className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <span className="font-black text-xs uppercase tracking-wider block">
                Official Holiday: {holidayForSelectedDate.title || 'Institutional Holiday'}
              </span>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                {selectedDate} is recorded as a holiday in settings. Attendance logging is usually not required for this date.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-500/20 text-[10px] font-black uppercase tracking-wider shrink-0">
            Holiday
          </span>
        </div>
      )}

      {/* Quick Period Scrubber with Crisp Ratchet Detents */}
      {periodConfigs.length > 1 && (
        <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-2.5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600 dark:text-neutral-400">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <Sliders className="w-3 h-3 text-[var(--accent-tertiary)]" /> Quick Period Scrubber
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-[#262626] text-neutral-900 dark:text-white font-black">
              Period {selectedPeriod}
            </span>
          </div>
          <Slider
            min={1}
            max={periodConfigs.length}
            step={1}
            value={selectedPeriod}
            onValueChange={val => {
              setHasUserChangedPeriod(true);
              setSelectedPeriod(val);
            }}
          />
          <div className="flex justify-between text-[9px] font-bold text-neutral-400 px-0.5">
            <span>Period 1</span>
            <span>Period {periodConfigs.length}</span>
          </div>
        </div>
      )}

      {/* Horizontal Period Selector Pills with sliding capsule animation */}
      <div className="relative flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* Sliding active pill indicator */}
        <div
          className="absolute top-0 bottom-1 rounded-full bg-neutral-900 dark:bg-neutral-100 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none z-0"
          style={{
            transform: `translateX(${periodIndicator.left}px)`,
            width: `${periodIndicator.width}px`,
            opacity: periodIndicator.opacity,
          }}
        />

        {periodConfigs.map(pc => {
          const isSelected = selectedPeriod === pc.periodNumber;
          const dateObj = new Date(selectedDate);
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = days[dateObj.getDay()];
          const schedMatch = schedules.find(s => s.dayOfWeek === dayName && s.periodNumber === pc.periodNumber);
          const sub = subjects.find(s => s.code === schedMatch?.subjectCode) || subjects[pc.periodNumber - 1] || subjects[0];

          return (
            <button
              key={pc.periodNumber}
              ref={el => { periodRefs.current[pc.periodNumber] = el; }}
              onClick={() => {
                triggerHaptic('light');
                setHasUserChangedPeriod(true);
                setSelectedPeriod(pc.periodNumber);
              }}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition-colors shrink-0 flex items-center gap-2 relative z-10 ${
                isSelected
                  ? 'text-white dark:text-neutral-900'
                  : 'bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#262626]'
              }`}
            >
              <span>Period {pc.periodNumber}</span>
              {sub && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                  isSelected ? 'bg-white/20 dark:bg-black/20 text-current' : 'bg-neutral-100 dark:bg-[#262626] text-neutral-600 dark:text-neutral-400'
                }`}>
                  {sub.code}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Period Session Form Card */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-neutral-100 dark:bg-[#262626] text-neutral-900 dark:text-white flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white tracking-tight">
                  Period {selectedPeriod} Attendance
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 border border-emerald-300/40 dark:border-emerald-800/40">
                  <Sparkles className="w-3 h-3 text-emerald-500" /> Auto-filled
                </span>
              </div>
              <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
                {selectedSubject || 'No Subject'} • {selectedFaculty || 'No Faculty'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('medium');
              setSaveModalStep('confirm');
            }}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs sm:text-sm shadow-md transition-all shrink-0 active:scale-95"
          >
            <Save className="w-4 h-4" /> Save Attendance
          </button>
        </div>

        <Separator className="my-4" />

        {/* Dropdown Fields in Responsive 2x2 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              PERIOD SLOT
            </label>
            <Select
              value={selectedPeriod}
              onValueChange={val => {
                setHasUserChangedPeriod(true);
                setSelectedPeriod(Number(val));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select period slot">
                  {selectedPeriodConfig ? `Period ${selectedPeriodConfig.periodNumber} (${selectedPeriodConfig.startTime} - ${selectedPeriodConfig.endTime})` : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {periodConfigs.map(pc => (
                    <SelectItem key={pc.periodNumber} value={pc.periodNumber}>
                      Period {pc.periodNumber} ({pc.startTime} - {pc.endTime})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              DATE
            </label>
            <DatePicker
              value={selectedDate}
              onChange={dateStr => setSelectedDate(dateStr)}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              SUBJECT
            </label>
            <Select
              value={selectedSubject}
              onValueChange={val => setSelectedSubject(val)}
              disabled={subjects.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={subjects.length === 0 ? "No subjects added" : "Select subject"}>
                  {selectedSubjectObj ? `${selectedSubjectObj.code} - ${selectedSubjectObj.name}` : (selectedSubject || undefined)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {subjects.map(s => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              FACULTY
            </label>
            <Select
              value={selectedFaculty}
              onValueChange={val => setSelectedFaculty(val)}
              disabled={facultyList.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={facultyList.length === 0 ? "No faculty added" : "Select faculty"}>
                  {selectedFaculty || undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {facultyList.map(f => (
                    <SelectItem key={f.id} value={f.name}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary Badges Bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 text-center shadow-sm">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-0.5">TOTAL</span>
          <span className="text-xl font-black text-neutral-900 dark:text-white">{counts.total}</span>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-3.5 text-center shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">PRESENT</span>
          <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">{counts.present}</span>
        </div>
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl p-3.5 text-center shadow-sm">
          <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block mb-0.5">ABSENT</span>
          <span className="text-xl font-black text-red-700 dark:text-red-300">{counts.absent}</span>
        </div>
      </div>

      {/* Search Bar & Quick Filter Buttons */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 shadow-sm space-y-3">
        <div className="relative">
          <InputGroup className="overflow-hidden">
            <InputGroupAddon align="inline-start">
              <Search className={`w-4 h-4 transition-colors ${searchQuery ? 'text-[var(--accent-tertiary)]' : 'text-neutral-400'}`} />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search student or roll number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-all animate-badge-pop"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </InputGroupAddon>
            )}
          </InputGroup>

          {/* Animated scanning bar when search has input */}
          {searchQuery && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-full pointer-events-none">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-[var(--accent-tertiary)] to-transparent animate-search-scan" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Sliding Capsule Filter Mode */}
          <div className="relative p-1 rounded-full bg-neutral-100 dark:bg-[#262626] flex items-center border border-neutral-200/50 dark:border-neutral-800">
            <div
              className="absolute top-1 bottom-1 rounded-full bg-neutral-900 dark:bg-neutral-100 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none z-0"
              style={{
                left: filterMode === 'all' ? '4px' : 'calc(50% + 2px)',
                width: 'calc(50% - 6px)',
              }}
            />
            <button
              onClick={() => {
                triggerHaptic('light');
                setFilterMode('all');
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors relative z-10 ${
                filterMode === 'all'
                  ? 'text-white dark:text-neutral-900'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => {
                triggerHaptic('light');
                setFilterMode('absent');
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors relative z-10 ${
                filterMode === 'absent'
                  ? 'text-white dark:text-neutral-900'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Absent ({counts.absent})
            </button>
          </div>

          <button
            onClick={() => setAllStatus('present')}
            className="px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-200 transition-colors"
          >
            All Present
          </button>
        </div>
      </div>

      {/* Student Cards List */}
      <div className="space-y-3">
        {filteredStudents.map((student, idx) => {
          const status = statusMap[student.id!] || 'present';
          const isPresent = status === 'present';
          const isAbsent = status === 'absent';
          const remark = remarksMap[student.id!];

          let cardBgClass = 'bg-neutral-900 dark:bg-[#171717] text-white border-neutral-800 dark:border-neutral-700';
          if (isAbsent) {
            cardBgClass = 'bg-[#b91c1c] dark:bg-[#991b1b] text-white border-red-500/50 shadow-red-900/30';
          } else if (status === 'od') {
            cardBgClass = 'bg-neutral-800 dark:bg-[#262626] text-white border-neutral-700';
          } else if (status === 'medical') {
            cardBgClass = 'bg-neutral-800 dark:bg-[#262626] text-white border-neutral-700';
          }

          return (
            <div
              key={student.id}
              onClick={() => handleCardClick(student.id!)}
              className={`group p-4 sm:px-6 sm:py-4 rounded-3xl ${cardBgClass} border shadow-md hover:shadow-xl cursor-pointer transition-all duration-200 flex items-center justify-between gap-3.5 min-h-[84px] w-full active:scale-[0.99] animate-result-fade`}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/10 text-white flex items-center justify-center font-black text-xs sm:text-sm shrink-0 shadow-inner">
                  {idx + 1}
                </div>

                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-extrabold uppercase tracking-wide break-words leading-snug text-white">
                      {student.name}
                    </h4>
                    {remark && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-extrabold text-[9px] uppercase shrink-0">
                        Remark
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-mono font-semibold text-white/80 block mt-0.5">
                    {student.registerNo}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="p-1 rounded-2xl bg-black/20 backdrop-blur-sm flex items-center gap-1">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setStatusMap(prev => ({ ...prev, [student.id!]: 'present' }));
                    }}
                    className={`w-9 h-8 rounded-xl font-black text-xs transition-all ${
                      isPresent
                        ? 'bg-white text-neutral-900 shadow-md font-extrabold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    P
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      triggerHaptic('light');
                      setStatusMap(prev => ({ ...prev, [student.id!]: 'absent' }));
                    }}
                    className={`w-9 h-8 rounded-xl font-black text-xs transition-all ${
                      isAbsent
                        ? 'bg-white text-[#b91c1c] shadow-md font-extrabold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    A
                  </button>
                </div>

                {/* THREE DOTS BUTTON */}
                <button
                  type="button"
                  onClick={e => handleOpenStudentModal(e, student)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shadow-sm active:scale-90"
                  title="Student Options & Remarks"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* UNIFIED ATTENDANCE SAVE MODAL (Morphs seamlessly from Confirm -> Saved) */}
      <Modal
        isOpen={saveModalStep !== null}
        onClose={() => setSaveModalStep(null)}
        title={saveModalStep === 'confirm' ? 'Confirm Session Attendance' : ''}
        subtitle={saveModalStep === 'confirm' ? `Period ${selectedPeriod} • ${selectedSubject}` : undefined}
        maxWidth={saveModalStep === 'confirm' ? 'sm' : 'md'}
      >
        <div className="relative overflow-hidden transition-all duration-300 ease-out">
          {saveModalStep === 'confirm' ? (
            /* CONFIRMATION STEP */
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Date:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Faculty:</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{selectedFaculty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Present Count:</span>
                  <span className="font-bold text-emerald-600">{counts.present}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Absent Count:</span>
                  <span className="font-bold text-red-600">{counts.absent}</span>
                </div>
              </div>

              {/* ABSENTEES LIST BOX IN CONFIRMATION MODAL */}
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-wider">
                  <UserX className="w-4 h-4" /> ABSENTEES ({absentStudents.length})
                </div>

                {absentStudents.length === 0 ? (
                  <p className="text-xs text-neutral-700 dark:text-neutral-300 font-bold italic">
                    All students present (100% Attendance)
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {absentStudents.map(st => (
                      <div key={st.id} className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/80 dark:bg-[#171717]/80">
                        <span className="font-bold text-neutral-900 dark:text-white uppercase">{st.name}</span>
                        <span className="font-mono text-neutral-500 text-[11px]">{st.registerNo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSaveModalStep(null)}
                  className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#262626]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSession}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving && <Spinner size="sm" className="text-white dark:text-neutral-900" />}
                  <span>{isSaving ? 'Saving...' : 'Confirm & Save'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* SAVED & SUMMARY STEP (Seamlessly Morphed in place with spring expansion!) */
            <div className="flex flex-col items-center text-center space-y-4 -mt-2 animate-morph-expand">
              {/* Celebratory Badge */}
              <div className="relative flex items-center justify-center pt-2">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-xl shadow-emerald-500/25 animate-scale-in">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                  Attendance Saved!
                </h2>
                <p className="text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 mt-0.5">
                  Period {selectedPeriod} • {currentSubjectObj ? currentSubjectObj.name : selectedSubject} ({selectedSubject})
                </p>
              </div>

              {/* Top 3 Info Cards */}
              <div className="grid grid-cols-3 gap-3 w-full">
                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 text-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    Date
                  </span>
                  <span className="text-xs font-extrabold text-neutral-900 dark:text-white font-mono">
                    {selectedDate}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 text-center">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                    Period
                  </span>
                  <span className="text-sm font-extrabold text-neutral-900 dark:text-white">
                    P{selectedPeriod}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-center">
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-1">
                    Absent
                  </span>
                  <span className="text-sm font-extrabold text-red-600 dark:text-red-400">
                    {counts.absent}
                  </span>
                </div>
              </div>

              {/* AI WhatsApp Notice Generator Trigger */}
              <button
                onClick={copyAiWhatsAppNotice}
                className="w-full py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <MessageSquare className="w-4 h-4" /> Copy AI WhatsApp Absentee Broadcast Notice
              </button>

              {/* ATTENDANCE SUMMARY Section Header */}
              <div className="w-full text-left pt-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-neutral-500 uppercase tracking-wider mb-2">
                  <UserX className="w-4 h-4 text-red-500" /> ATTENDANCE SUMMARY
                </div>

                <div className="p-4 rounded-2xl bg-[#0A0A0A] text-[#FAFAFA] border border-neutral-800 font-mono text-xs text-left leading-relaxed shadow-inner overflow-x-auto select-all">
                  {summaryText}
                </div>
              </div>

              {/* Action Row 1: Copy Buttons */}
              <div className="grid grid-cols-3 gap-2.5 w-full">
                <button
                  onClick={() => copyToClipboard(summaryText, 'Full Summary')}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-[#333333] transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" /> Summary
                </button>
                <button
                  onClick={copyRegNos}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-[#333333] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" /> Reg Nos
                </button>
                <button
                  onClick={copyNames}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-200 dark:hover:bg-[#333333] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" /> Names
                </button>
              </div>

              {/* Action Row 2: Export Buttons */}
              <div className="grid grid-cols-3 gap-2.5 w-full">
                <button
                  onClick={exportSessionExcel}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-extrabold hover:bg-neutral-200 dark:hover:bg-[#333333] transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4 text-neutral-600 dark:text-neutral-400" /> Excel
                </button>
                <button
                  onClick={exportSessionCsv}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-extrabold hover:bg-neutral-200 dark:hover:bg-[#333333] transition-colors"
                >
                  <FileText className="w-4 h-4 text-neutral-600 dark:text-neutral-400" /> CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-2xl bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-extrabold hover:bg-neutral-200 dark:hover:bg-[#333333] transition-colors"
                >
                  <Printer className="w-4 h-4 text-neutral-600 dark:text-neutral-400" /> Print
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={() => setSaveModalStep(null)}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-neutral-100 dark:bg-[#262626] hover:bg-neutral-200 dark:hover:bg-[#333333] text-neutral-800 dark:text-neutral-200 font-bold text-xs transition-all active:scale-95"
                >
                  Done
                </button>

                <button
                  onClick={handleNextPeriod}
                  className="w-full sm:w-auto flex-1 px-6 py-3 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-extrabold text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Log Next Period (P{selectedPeriod < (periodConfigs.length || 8) ? selectedPeriod + 1 : 1})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* STUDENT THREE DOTS OPTIONS & REMARKS MODAL */}
      {targetStudent && (
        <Modal
          isOpen={!!targetStudent}
          onClose={() => setTargetStudent(null)}
          title={`Student Options: ${targetStudent.name}`}
          subtitle={`Reg No: ${targetStudent.registerNo}`}
        >
          <div className="space-y-4 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            {/* Quick Stats Pill */}
            <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-[#262626] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400 block">Overall Attendance Rate</span>
                <span className="text-base font-black text-neutral-900 dark:text-white font-mono">
                  {targetStudentStats.rate}% ({targetStudentStats.attended}/{targetStudentStats.conducted} Classes)
                </span>
              </div>
            </div>

            {/* Attendance Status Selector */}
            <div>
              <label className="block text-neutral-400 font-bold uppercase tracking-wider mb-2">
                SET STATUS FOR THIS PERIOD
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['present', 'absent', 'od', 'medical'] as AttendanceStatus[]).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStudentModalStatus(st)}
                    className={`py-2.5 px-3 rounded-xl font-extrabold uppercase transition-all ${
                      studentModalStatus === st
                        ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-md'
                        : 'bg-neutral-100 dark:bg-[#262626] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-[#333333]'
                    }`}
                  >
                    {st === 'od' ? 'On Duty (OD)' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks / Notes Input */}
            <div>
              <label className="block text-neutral-400 font-bold uppercase tracking-wider mb-1">
                ADD STUDENT REMARK / NOTE
              </label>
              <input
                type="text"
                placeholder="e.g. Arrived 10 mins late, Lab permission granted..."
                value={studentRemarkInput}
                onChange={e => setStudentRemarkInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-white font-bold focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTargetStudent(null)}
                className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#262626]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStudentModal}
                className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
