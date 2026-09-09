import React, { useState, useRef, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { PeriodConfig, Subject } from '../types';
import { useNotification } from '../context/NotificationContext';
import { triggerHaptic } from '../utils/haptics';
import { Modal } from '../components/common/Modal';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@/components/ui/select';
import {
  Calendar,
  Clock,
  Edit,
  Plus,
  Save,
  Check,
  Palette
} from 'lucide-react';

const PRESET_COLORS = [
  '#059669', // Emerald
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#e11d48', // Rose
  '#1e5a80', // Deep Teal
  '#0284c7', // Sky Blue
  '#8b3dff', // Violet
  '#db2777', // Pink
  '#4f46e5', // Indigo
  '#0d9488', // Teal
  '#b91c1c'  // Crimson
];

export const SchedulePage: React.FC = () => {
  const { showToast } = useNotification();

  const periodConfigs = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const facultyList = useLiveQuery(() => db.faculty.toArray()) || [];
  const schedules = useLiveQuery(() => db.schedules.toArray()) || [];

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayDayName = daysOfWeek[new Date().getDay() - 1] || 'Monday';
  const [activeDay, setActiveDay] = useState<string>(todayDayName);
  const [matrixViewMode, setMatrixViewMode] = useState<'cards' | 'grid'>('cards');
  const [matrixSelectedDay, setMatrixSelectedDay] = useState<string>(todayDayName);
  const [dayIndicator, setDayIndicator] = useState<{ left: number; width: number; opacity: number }>({ left: 0, width: 0, opacity: 0 });
  const dayRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    const el = dayRefs.current[activeDay];
    if (el) {
      setDayIndicator({
        left: el.offsetLeft,
        width: el.offsetWidth,
        opacity: 1
      });
    }
  }, [activeDay, periodConfigs.length]);

  // Slot Assignment Modal
  const [isSlotModalOpen, setIsSlotModalOpen] = useState<boolean>(false);
  const [targetPeriod, setTargetPeriod] = useState<number>(1);
  const [selectedSubjectCode, setSelectedSubjectCode] = useState<string>('');
  const [selectedFacultyName, setSelectedFacultyName] = useState<string>('');
  const [classroom, setClassroom] = useState<string>('');
  const [isFreePeriod, setIsFreePeriod] = useState<boolean>(false);

  // Subject Colors Modal State
  const [isColorModalOpen, setIsColorModalOpen] = useState<boolean>(false);
  const [targetSubjectCode, setTargetSubjectCode] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('#1e5a80');

  // Edit Timings Modal State
  const [isTimingsModalOpen, setIsTimingsModalOpen] = useState<boolean>(false);
  const [editableTimings, setEditableTimings] = useState<{ periodNumber: number; startTime: string; endTime: string }[]>([]);

  const handleOpenTimingsModal = () => {
    triggerHaptic('medium');
    setEditableTimings(
      periodConfigs.map(p => ({
        periodNumber: p.periodNumber,
        startTime: p.startTime,
        endTime: p.endTime
      }))
    );
    setIsTimingsModalOpen(true);
  };

  const handleSaveTimings = async () => {
    triggerHaptic('success');
    for (const item of editableTimings) {
      const existing = await db.periodConfigs.get(item.periodNumber);
      if (existing) {
        await db.periodConfigs.update(item.periodNumber, {
          startTime: item.startTime,
          endTime: item.endTime
        });
      } else {
        await db.periodConfigs.add({
          periodNumber: item.periodNumber,
          startTime: item.startTime,
          endTime: item.endTime
        });
      }
    }
    showToast('Period Slot Timings Updated', 'Saved period timings to database', 'success');
    setIsTimingsModalOpen(false);
  };

  const handleOpenAssign = (periodNum: number) => {
    triggerHaptic('light');
    setTargetPeriod(periodNum);
    const existing = schedules.find(s => s.dayOfWeek === activeDay && s.periodNumber === periodNum);

    if (existing) {
      setSelectedSubjectCode(existing.subjectCode || subjects[0]?.code || '');
      setSelectedFacultyName(existing.facultyName || facultyList[0]?.name || '');
      setClassroom(existing.classroom || '5101');
      setIsFreePeriod(!!existing.isFree);
    } else {
      setSelectedSubjectCode(subjects[0]?.code || '');
      setSelectedFacultyName(facultyList[0]?.name || '');
      setClassroom('5101');
      setIsFreePeriod(false);
    }
    setIsSlotModalOpen(true);
  };

  const handleSaveSlot = async () => {
    triggerHaptic('success');
    const existing = schedules.find(s => s.dayOfWeek === activeDay && s.periodNumber === targetPeriod);

    if (existing && existing.id) {
      await db.schedules.update(existing.id, {
        subjectCode: isFreePeriod ? 'FREE' : selectedSubjectCode,
        facultyName: isFreePeriod ? '' : selectedFacultyName,
        classroom: isFreePeriod ? '' : classroom,
        isFree: isFreePeriod
      });
    } else {
      await db.schedules.add({
        dayOfWeek: activeDay,
        periodNumber: targetPeriod,
        subjectCode: isFreePeriod ? 'FREE' : selectedSubjectCode,
        facultyName: isFreePeriod ? '' : selectedFacultyName,
        classroom: isFreePeriod ? '' : classroom,
        isFree: isFreePeriod
      });
    }

    showToast('Slot Saved', `Updated Period ${targetPeriod} for ${activeDay}`, 'success');
    setIsSlotModalOpen(false);
  };

  // Open Subject Color Customizer Modal
  const handleOpenSubjectColor = (subject: Subject) => {
    triggerHaptic('medium');
    setTargetSubjectCode(subject.code);
    setSelectedColor(subject.color || '#1e5a80');
    setIsColorModalOpen(true);
  };

  const handleSaveSubjectColor = async () => {
    triggerHaptic('success');
    const sub = subjects.find(s => s.code === targetSubjectCode);
    if (sub && sub.id) {
      await db.subjects.update(sub.id, { color: selectedColor });
      showToast('Subject Color Saved', `Updated color for ${targetSubjectCode}`, 'success');
      setIsColorModalOpen(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-36 space-y-6 animate-fade-in-up">
      {/* Top Banner Card with Illustration */}
      <div className="bg-neutral-900 dark:bg-[#171717] text-white border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4 card-interactive overflow-hidden relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-neutral-800 dark:bg-[#262626] flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Weekly Timetable & Period Configurator
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 mt-0.5 leading-relaxed font-medium">
                  Assign subject classes, faculty teachers, custom subject colors, or set Free Periods.
                </p>
              </div>
            </div>

            <button
              onClick={handleOpenTimingsModal}
              className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 rounded-2xl bg-white dark:bg-neutral-100 text-neutral-900 font-bold text-xs sm:text-sm shadow-sm hover:bg-neutral-100 hover:scale-105 active:scale-95 transition-all"
            >
              <Clock className="w-4 h-4 text-neutral-900" /> Edit Period Slot Timings ({periodConfigs.length} Slots)
            </button>
          </div>

          <div className="hidden sm:flex w-32 md:w-36 h-32 md:h-36 shrink-0 items-center justify-center">
            <img
              src="/illustrations/alegria_schedule.jpg"
              alt="Schedule Timetable"
              className="w-full h-full object-contain blend-illustration rounded-2xl"
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          WEEKLY MASTER TIMETABLE MATRIX (ON TOP, DAYS ON Y-AXIS, TIME ON X-AXIS)
          ======================================================== */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center shadow-md shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-neutral-900 dark:text-white tracking-tight">
                Weekly Timetable Matrix
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Master schedule view • Press the edit icon on any slot to modify (protected against misclicks)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 bg-neutral-100 dark:bg-[#262626] rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setMatrixViewMode('cards')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  matrixViewMode === 'cards'
                    ? 'bg-white dark:bg-[#171717] text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Day Cards
              </button>
              <button
                type="button"
                onClick={() => setMatrixViewMode('grid')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  matrixViewMode === 'grid'
                    ? 'bg-white dark:bg-[#171717] text-neutral-900 dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Full Grid
              </button>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-600 dark:text-neutral-400 text-[11px] font-bold">
              {daysOfWeek.length} Days • {periodConfigs.length} Periods
            </span>
          </div>
        </div>

        {/* MOBILE DAY CARDS VIEW (Clean & high-contrast, no horizontal scrolling needed) */}
        {matrixViewMode === 'cards' && (
          <div className="space-y-4 sm:hidden">
            {/* Day Selector Horizontal Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {daysOfWeek.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setMatrixSelectedDay(d);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    matrixSelectedDay === d
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm'
                      : 'bg-neutral-100 dark:bg-[#262626] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
                  }`}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>

            {/* Vertical Period Cards Stack for Selected Day */}
            <div className="space-y-2.5">
              {periodConfigs.map(pc => {
                const slot = schedules.find(s => s.dayOfWeek === matrixSelectedDay && s.periodNumber === pc.periodNumber);
                const sub = subjects.find(s => s.code === slot?.subjectCode);
                const isAssigned = slot && slot.subjectCode && slot.subjectCode !== 'FREE';

                return (
                  <div
                    key={pc.periodNumber}
                    className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#1C1C1C] border border-neutral-200/80 dark:border-neutral-700/60 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-neutral-200/70 dark:bg-[#262626] flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 uppercase font-black">
                          P{pc.periodNumber}
                        </span>
                        <span className="text-[9px] font-bold text-neutral-500 dark:text-neutral-400">
                          {pc.startTime?.slice(0, 5) || '--:--'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        {isAssigned ? (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-neutral-900 dark:text-white truncate">
                                {sub?.name || slot.subjectCode}
                              </span>
                              <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[10px] bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 shrink-0">
                                {slot.subjectCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                              {slot.facultyName || 'Faculty'} {slot.classroom ? `• Room ${slot.classroom}` : ''}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs font-semibold text-neutral-400">
                            Unassigned / Free Period
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('medium');
                        setActiveDay(matrixSelectedDay);
                        handleOpenAssign(pc.periodNumber);
                      }}
                      className="p-2 rounded-xl bg-white dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 shadow-xs shrink-0 active:scale-95"
                      title="Edit slot"
                    >
                      {isAssigned ? <Edit className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FULL GRID VIEW */}
        <div className={`overflow-x-auto custom-scrollbar rounded-2xl border border-neutral-200 dark:border-neutral-800 ${
          matrixViewMode === 'cards' ? 'hidden sm:block' : 'block'
        }`}>
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            {/* Header: X-Axis (Time / Periods) */}
            <thead>
              <tr className="bg-neutral-50 dark:bg-[#121212] text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-3 px-4 font-black uppercase text-[11px] tracking-wider border-r border-neutral-200 dark:border-neutral-800 sticky left-0 bg-neutral-50 dark:bg-[#121212] z-10 w-28">
                  Day \ Time
                </th>
                {periodConfigs.map(pc => (
                  <th key={pc.periodNumber} className="py-2.5 px-3 text-center border-r border-neutral-200 dark:border-neutral-800 last:border-r-0 min-w-[115px]">
                    <div className="font-extrabold text-neutral-900 dark:text-white text-xs">
                      Period {pc.periodNumber}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5 whitespace-nowrap">
                      {pc.startTime || '--:--'} - {pc.endTime || '--:--'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body: Y-Axis (Days of Week) */}
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {daysOfWeek.map(day => {
                const isCurrentActive = day === activeDay;
                return (
                  <tr
                    key={day}
                    className={`transition-colors ${
                      isCurrentActive
                        ? 'bg-amber-500/5 dark:bg-amber-500/5'
                        : 'hover:bg-neutral-50 dark:hover:bg-[#1C1C1C]/50'
                    }`}
                  >
                    {/* Day Column (Y-Axis) */}
                    <td className={`py-3.5 px-4 font-extrabold text-xs border-r border-neutral-200 dark:border-neutral-800 sticky left-0 z-10 ${
                      isCurrentActive
                        ? 'bg-amber-50 dark:bg-[#1A1A1A] text-amber-600 dark:text-amber-400'
                        : 'bg-white dark:bg-[#171717] text-neutral-800 dark:text-neutral-200'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        {isCurrentActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                        )}
                        <span>{day}</span>
                      </div>
                    </td>

                    {/* Periods for this Day (X-Axis) - MISCLICK PROTECTED (NO TD ONCLICK) */}
                    {periodConfigs.map(pc => {
                      const slot = schedules.find(s => s.dayOfWeek === day && s.periodNumber === pc.periodNumber);
                      const sub = subjects.find(s => s.code === slot?.subjectCode);
                      const isAssigned = slot && slot.subjectCode && slot.subjectCode !== 'FREE';

                      return (
                        <td
                          key={pc.periodNumber}
                          className="py-2.5 px-2.5 text-center border-r border-neutral-200 dark:border-neutral-800 last:border-r-0 select-none"
                        >
                          {isAssigned ? (
                            <div className="p-2 rounded-xl bg-neutral-50 dark:bg-[#1C1C1C] border border-neutral-200 dark:border-neutral-700/60 shadow-xs text-left space-y-1 group hover:border-neutral-400 dark:hover:border-neutral-500 transition-all">
                              <div className="flex items-center justify-between gap-1">
                                <span
                                  className="font-black text-[11px] px-1.5 py-0.5 rounded-md text-white shrink-0 truncate max-w-[65px]"
                                  style={{ backgroundColor: sub?.color || '#2563eb' }}
                                >
                                  {slot.subjectCode}
                                </span>
                                {/* DEDICATED EDIT BUTTON TO PREVENT MISCLICKS */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerHaptic('medium');
                                    setActiveDay(day);
                                    handleOpenAssign(pc.periodNumber);
                                  }}
                                  className="p-1 rounded-lg bg-neutral-200 hover:bg-neutral-900 hover:text-white dark:bg-neutral-800 dark:hover:bg-white dark:hover:text-neutral-900 text-neutral-600 dark:text-neutral-300 transition-all shadow-xs"
                                  title={`Edit ${day} Period ${pc.periodNumber}`}
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              </div>
                              <div className="text-[10px] font-semibold text-neutral-800 dark:text-neutral-200 truncate leading-tight">
                                {sub?.name || slot.subjectCode}
                              </div>
                              <div className="flex items-center justify-between text-[9px] text-neutral-400 font-medium">
                                <span className="truncate max-w-[60px]">{slot.facultyName || '—'}</span>
                                {slot.classroom && (
                                  <span className="font-mono text-neutral-500 shrink-0 ml-1">R.{slot.classroom}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="py-2 px-2 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-neutral-400 dark:text-neutral-600 group hover:border-neutral-400 transition-colors">
                              <span className="text-[10px] font-mono ml-1">—</span>
                              {/* DEDICATED ASSIGN PLUS BUTTON */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerHaptic('light');
                                  setActiveDay(day);
                                  handleOpenAssign(pc.periodNumber);
                                }}
                                className="p-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-900 hover:text-white dark:hover:bg-white dark:hover:text-neutral-900 text-neutral-400 hover:text-white transition-all"
                                title={`Assign class for ${day} Period ${pc.periodNumber}`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


      {/* Subject Color Badges Bar */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 shadow-sm space-y-2">
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
          SUBJECT COLOR PALETTES (TAP TO CUSTOMIZE COLOR)
        </span>
        <div className="flex flex-wrap gap-2">
          {subjects.map(s => (
            <button
              key={s.code}
              onClick={() => handleOpenSubjectColor(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-sm transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: s.color || '#171717' }}
            >
              <span>{s.code}</span>
              <Palette className="w-3 h-3 text-white/80" />
            </button>
          ))}
        </div>
      </div>

      {/* Day Selector Tabs with sliding capsule animation */}
      <div className="relative flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {/* Sliding active pill indicator */}
        <div
          className="absolute top-0 bottom-1 rounded-full bg-neutral-900 dark:bg-neutral-100 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none z-0"
          style={{
            transform: `translateX(${dayIndicator.left}px)`,
            width: `${dayIndicator.width}px`,
            opacity: dayIndicator.opacity,
          }}
        />

        {daysOfWeek.map(day => {
          const isActive = activeDay === day;
          return (
            <button
              key={day}
              ref={el => { dayRefs.current[day] = el; }}
              onClick={() => {
                triggerHaptic('light');
                setActiveDay(day);
              }}
              className={`px-4 py-2.5 rounded-full text-xs font-bold transition-colors shrink-0 flex items-center gap-2 relative z-10 ${
                isActive
                  ? 'text-white dark:text-neutral-900'
                  : 'bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#262626]'
              }`}
            >
              <span>{day}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] transition-colors ${
                isActive ? 'bg-white/20 dark:bg-black/20 text-current' : 'bg-neutral-100 dark:bg-[#262626] text-neutral-500'
              }`}>
                {periodConfigs.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Class Schedule Section */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
            {activeDay} Class Schedule
          </h3>
          <span className="text-xs font-bold text-neutral-400">
            {periodConfigs.length} Daily Period Slots
          </span>
        </div>

        <div className="space-y-3">
          {periodConfigs.map(pc => {
            const slot = schedules.find(s => s.dayOfWeek === activeDay && s.periodNumber === pc.periodNumber);
            const sub = subjects.find(s => s.code === slot?.subjectCode);

            return (
              <div
                key={pc.periodNumber}
                className="p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-full text-white flex items-center justify-center font-black text-xs shrink-0 shadow-md"
                    style={{ backgroundColor: sub?.color || '#171717' }}
                  >
                    P{pc.periodNumber}
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-neutral-400 block">
                      {pc.startTime} - {pc.endTime}
                    </span>
                    {slot ? (
                      slot.isFree ? (
                        <span className="text-xs font-bold text-neutral-500 block mt-0.5">
                          Free Period / Library
                        </span>
                      ) : (
                        <div className="mt-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                              {sub ? `${sub.name} (${sub.code})` : slot.subjectCode}
                            </h4>
                            {sub?.color && (
                              <span
                                className="w-2.5 h-2.5 rounded-full inline-block"
                                style={{ backgroundColor: sub.color }}
                              />
                            )}
                          </div>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400 block mt-0.5 font-medium">
                            {slot.facultyName && `Faculty: ${slot.facultyName}`}
                            {slot.classroom && ` • Room: ${slot.classroom}`}
                          </span>
                        </div>
                      )
                    ) : (
                      <span className="text-xs text-neutral-400 italic block mt-0.5">
                        No class assigned (Free Period)
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleOpenAssign(pc.periodNumber)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs transition-all shrink-0 self-end sm:self-center"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Slot
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* CUSTOM SUBJECT COLOR PALETTE MODAL */}
      <Modal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        title={`Assign Subject Color: ${targetSubjectCode}`}
        subtitle="Choose a custom Material 3 color badge for this course"
      >
        <div className="space-y-4 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          <div>
            <label className="block text-neutral-400 font-bold uppercase tracking-wider mb-2">
              PRESET COLOR PALETTE
            </label>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  className={`h-12 rounded-2xl flex items-center justify-center transition-all ${
                    selectedColor === c ? 'ring-4 ring-neutral-900 dark:ring-white scale-105 shadow-lg' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                >
                  {selectedColor === c && <Check className="w-5 h-5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-neutral-400 font-bold uppercase tracking-wider mb-1">
              CUSTOM HEX COLOR CODE
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedColor}
                onChange={e => setSelectedColor(e.target.value)}
                className="w-10 h-10 rounded-xl border-none cursor-pointer"
              />
              <input
                type="text"
                value={selectedColor}
                onChange={e => setSelectedColor(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] font-mono font-bold text-xs text-neutral-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsColorModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#262626]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSubjectColor}
              className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md"
            >
              Save Subject Color
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT PERIOD SLOT TIMINGS MODAL */}
      <Modal
        isOpen={isTimingsModalOpen}
        onClose={() => setIsTimingsModalOpen(false)}
        title="Edit Period Slot Timings"
        subtitle={`Configure daily start and end times for Period 1 to Period ${editableTimings.length}`}
      >
        <div className="space-y-4 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {editableTimings.map((item) => (
              <div
                key={item.periodNumber}
                className="p-3 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center font-bold text-xs">
                    P{item.periodNumber}
                  </div>
                  <span className="font-extrabold text-neutral-900 dark:text-white">
                    Period {item.periodNumber}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={item.startTime}
                    onChange={e => {
                      const val = e.target.value;
                      setEditableTimings(prev =>
                        prev.map(p => p.periodNumber === item.periodNumber ? { ...p, startTime: val } : p)
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#171717] text-neutral-900 dark:text-white font-mono text-xs font-bold"
                  />
                  <span className="text-neutral-400 font-bold">-</span>
                  <input
                    type="time"
                    value={item.endTime}
                    onChange={e => {
                      const val = e.target.value;
                      setEditableTimings(prev =>
                        prev.map(p => p.periodNumber === item.periodNumber ? { ...p, endTime: val } : p)
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#171717] text-neutral-900 dark:text-white font-mono text-xs font-bold"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsTimingsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#262626]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTimings}
              className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Timings
            </button>
          </div>
        </div>
      </Modal>

      {/* Assign Slot Modal */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title={`Assign Slot - ${activeDay} (Period ${targetPeriod})`}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-neutral-50 dark:bg-[#262626]">
            <input
              type="checkbox"
              id="free"
              checked={isFreePeriod}
              onChange={e => setIsFreePeriod(e.target.checked)}
              className="rounded text-neutral-900 dark:text-white focus:ring-neutral-900"
            />
            <label htmlFor="free" className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Mark as Free Period
            </label>
          </div>

          {!isFreePeriod && (
            <>
              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  SUBJECT
                </label>
                <Select
                  value={selectedSubjectCode}
                  onValueChange={val => setSelectedSubjectCode(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
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
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  FACULTY
                </label>
                <Select
                  value={selectedFacultyName}
                  onValueChange={val => setSelectedFacultyName(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select faculty" />
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

              <div>
                <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  CLASSROOM
                </label>
                <input
                  type="text"
                  value={classroom}
                  onChange={e => setClassroom(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-white text-sm font-medium focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsSlotModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-[#262626]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSlot}
              className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md"
            >
              Save Slot
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
