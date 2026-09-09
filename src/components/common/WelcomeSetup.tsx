import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../db';
import { useNotification } from '../../context/NotificationContext';
import { triggerHaptic } from '../../utils/haptics';
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  User,
  School,
  Sparkles,
  ClipboardCheck,
  Calendar,
  BellRing,
  Bot,
  FileSpreadsheet,
  CheckCircle2,
  X
} from 'lucide-react';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface WelcomeSetupProps {
  onComplete: () => void;
  isReplay?: boolean;
}

export const WelcomeSetup: React.FC<WelcomeSetupProps> = ({ onComplete, isReplay = false }) => {
  const { showToast } = useNotification();
  const [step, setStep] = useState<number>(1);
  const totalSteps = 4;

  // Form State
  const [className, setClassName] = useState<string>('');
  const [section, setSection] = useState<string>('');
  const [repName, setRepName] = useState<string>('');
  const [dept, setDept] = useState<string>('');

  const handleNext = () => {
    triggerHaptic('light');
    if (step < totalSteps) {
      setStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    triggerHaptic('light');
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  const handleFinish = async () => {
    triggerHaptic('success');
    const existing = await db.settings.toArray();
    const payload = {
      className: className.trim() || existing[0]?.className || 'My Class',
      section: section.trim() || existing[0]?.section || 'Section A',
      classRepName: repName.trim() || existing[0]?.classRepName || 'Class Representative',
      department: dept.trim() || existing[0]?.department || 'General',
      isFirstLaunchCompleted: true
    };

    if (existing.length > 0) {
      await db.settings.update(existing[0].id!, payload);
    } else {
      await db.settings.add({
        theme: 'system',
        academicYear: '2026 - 2027',
        semester: 'Semester 1',
        disableSaturday: true,
        classReminderOffset: 10,
        examReminderOffset: 1440,
        holidays: [],
        notificationsEnabled: true,
        summaryTemplate: "Attendance {DATE}\n{PERIOD}\n\nABSENTEES:\n{ABSENTEES}",
        ...payload
      });
    }

    showToast('Setup Completed', `Welcome, ${payload.classRepName}!`, 'success');
    onComplete();
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-dialog-open', 'true');
    return () => {
      document.body.style.overflow = 'unset';
      document.body.removeAttribute('data-dialog-open');
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xl p-0 sm:p-4 modal-backdrop-enter">
      <div className="w-full max-w-lg bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto modal-spring-enter">
        
        {/* Top Progress & Header */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shadow-md shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight">
                {step === 1 && '1. Welcome & Class Setup'}
                {step === 2 && '2. Attendance & Period Detection'}
                {step === 3 && '3. Schedule & 10-Min Reminders'}
                {step === 4 && '4. AI Assistant & Reports'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Step {step} of {totalSteps} • Interactive Walkthrough
              </p>
            </div>
          </div>

          {isReplay && (
            <button
              onClick={onComplete}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-[#262626]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map(idx => (
            <button
              key={idx}
              onClick={() => {
                triggerHaptic('light');
                setStep(idx);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                step === idx
                  ? 'w-8 bg-[var(--accent-tertiary)] shadow-[0_0_8px_var(--accent-tertiary-glow)]'
                  : 'w-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'
              }`}
              aria-label={`Go to step ${idx}`}
            />
          ))}
        </div>

        {/* STEP 1: CLASS SETUP */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in-up">
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed">
              Let&apos;s set up your class profile. You can modify these anytime later in <strong>Settings</strong>.
            </p>

            <FieldGroup className="text-xs font-semibold">
              <Field>
                <FieldLabel htmlFor="walkthrough-repname" className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Your Name (Class Representative)
                </FieldLabel>
                <Input
                  id="walkthrough-repname"
                  placeholder="e.g. John Doe"
                  value={repName}
                  onChange={e => setRepName(e.target.value)}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="walkthrough-classname" className="flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5" /> Class Name
                  </FieldLabel>
                  <Input
                    id="walkthrough-classname"
                    placeholder="e.g. CS-3A"
                    value={className}
                    onChange={e => setClassName(e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="walkthrough-section">Section</FieldLabel>
                  <Input
                    id="walkthrough-section"
                    placeholder="e.g. Section A"
                    value={section}
                    onChange={e => setSection(e.target.value)}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="walkthrough-dept">Department / Stream</FieldLabel>
                <Input
                  id="walkthrough-dept"
                  placeholder="e.g. Computer Science Engineering"
                  value={dept}
                  onChange={e => setDept(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </div>
        )}

        {/* STEP 2: ATTENDANCE & REAL-TIME PERIOD DETECTOR */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shrink-0">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Real-Time Period Detection
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Auto-highlights active period and upcoming class
                  </p>
                </div>
              </div>

              <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>1-Tap Toggle:</strong> Tap student chips to toggle between Present & Absent.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Instant Copy:</strong> Copy formatted absentee summaries with 1 click for WhatsApp / Email.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Secure Local Storage:</strong> All attendance sessions are stored privately on your device.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 3: SCHEDULE & 10-MIN CLASS REMINDERS */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    Timetable & Automated Reminders
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Never miss taking attendance or notifying faculty
                  </p>
                </div>
              </div>

              <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <BellRing className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
                  <span><strong>10-Min Pre-Class Alert:</strong> Sounds a reminder 10 minutes before every period begins.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Timetable Slot Editor:</strong> Easily assign subjects, faculty, and room numbers per day.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Holiday Calendar:</strong> Automatically skips notifications on holidays and weekends.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 4: AI ASSISTANT & REPORTS */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    AI Assistant & Comprehensive Reports
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Smart analytics directly on your device
                  </p>
                </div>
              </div>

              <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Local AI Chat:</strong> Ask &quot;Who has low attendance?&quot; or &quot;Plan today&apos;s schedule&quot;.</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Excel (.xlsx) Export:</strong> Generate full monthly attendance sheets with percentages.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
                  <span><strong>Streak Rewards:</strong> Track daily class activity streaks.</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 1 ? (
            <Button
              variant="outline"
              type="button"
              onClick={handlePrev}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              type="button"
              onClick={handleFinish}
              className="text-neutral-500"
            >
              Skip Setup
            </Button>
          )}

          <Button
            type="button"
            onClick={handleNext}
            className="gap-2 ml-auto"
          >
            <span>{step === totalSteps ? 'Get Started' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
