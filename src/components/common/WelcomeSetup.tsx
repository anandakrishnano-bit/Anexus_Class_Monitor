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
  X,
  Database,
  Shield,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// localStorage keys for runtime Firebase config
export const LS_FIREBASE_API_KEY        = '__rt_firebase_api_key';
export const LS_FIREBASE_AUTH_DOMAIN    = '__rt_firebase_auth_domain';
export const LS_FIREBASE_PROJECT_ID     = '__rt_firebase_project_id';
export const LS_FIREBASE_STORAGE_BUCKET = '__rt_firebase_storage_bucket';
export const LS_FIREBASE_SENDER_ID      = '__rt_firebase_sender_id';
export const LS_FIREBASE_APP_ID         = '__rt_firebase_app_id';
export const LS_ADMIN_PASSKEY           = '__admin_passkey_override';

interface WelcomeSetupProps {
  onComplete: () => void;
  isReplay?: boolean;
}

export const WelcomeSetup: React.FC<WelcomeSetupProps> = ({ onComplete, isReplay = false }) => {
  const { showToast } = useNotification();

  // Step 0 = server config (new install), Steps 1-4 = feature walkthrough
  const [step, setStep] = useState<number>(isReplay ? 1 : 0);
  const totalSteps = 4;

  // Step 0 state
  const [firebaseApiKey,        setFirebaseApiKey]        = useState('');
  const [firebaseAuthDomain,    setFirebaseAuthDomain]    = useState('');
  const [firebaseProjectId,     setFirebaseProjectId]     = useState('');
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState('');
  const [firebaseSenderId,      setFirebaseSenderId]      = useState('');
  const [firebaseAppId,         setFirebaseAppId]         = useState('');
  const [adminPasskey,          setAdminPasskey]          = useState('');
  const [showApiKey,   setShowApiKey]   = useState(false);
  const [showPasskey,  setShowPasskey]  = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Steps 1-4 state
  const [className, setClassName] = useState('');
  const [section,   setSection]   = useState('');
  const [repName,   setRepName]   = useState('');
  const [dept,      setDept]      = useState('');

  // Pre-fill from localStorage on open
  useEffect(() => {
    try {
      setFirebaseApiKey(localStorage.getItem(LS_FIREBASE_API_KEY) || '');
      setFirebaseAuthDomain(localStorage.getItem(LS_FIREBASE_AUTH_DOMAIN) || '');
      setFirebaseProjectId(localStorage.getItem(LS_FIREBASE_PROJECT_ID) || '');
      setFirebaseStorageBucket(localStorage.getItem(LS_FIREBASE_STORAGE_BUCKET) || '');
      setFirebaseSenderId(localStorage.getItem(LS_FIREBASE_SENDER_ID) || '');
      setFirebaseAppId(localStorage.getItem(LS_FIREBASE_APP_ID) || '');
      setAdminPasskey(localStorage.getItem(LS_ADMIN_PASSKEY) || '');
    } catch {}
  }, []);

  const saveFirebaseConfig = () => {
    try {
      if (firebaseApiKey.trim())        localStorage.setItem(LS_FIREBASE_API_KEY, firebaseApiKey.trim());
      if (firebaseAuthDomain.trim())    localStorage.setItem(LS_FIREBASE_AUTH_DOMAIN, firebaseAuthDomain.trim());
      if (firebaseProjectId.trim())     localStorage.setItem(LS_FIREBASE_PROJECT_ID, firebaseProjectId.trim());
      if (firebaseStorageBucket.trim()) localStorage.setItem(LS_FIREBASE_STORAGE_BUCKET, firebaseStorageBucket.trim());
      if (firebaseSenderId.trim())      localStorage.setItem(LS_FIREBASE_SENDER_ID, firebaseSenderId.trim());
      if (firebaseAppId.trim())         localStorage.setItem(LS_FIREBASE_APP_ID, firebaseAppId.trim());
      if (adminPasskey.trim())          localStorage.setItem(LS_ADMIN_PASSKEY, adminPasskey.trim());
    } catch {}
  };

  const handleNext = () => {
    triggerHaptic('light');
    if (step === 0) {
      saveFirebaseConfig();
      setStep(1);
    } else if (step < totalSteps) {
      setStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    triggerHaptic('light');
    if (step > 0) setStep(prev => prev - 1);
  };

  const handleFinish = async () => {
    triggerHaptic('success');
    saveFirebaseConfig();
    const existing = await db.settings.toArray();
    const payload = {
      className: className.trim() || existing[0]?.className || 'My Class',
      section: section.trim() || existing[0]?.section || 'Section A',
      classRepName: repName.trim() || existing[0]?.classRepName || 'Class Representative',
      department: dept.trim() || existing[0]?.department || 'General',
      isFirstLaunchCompleted: true,
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
        ...payload,
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

  const isFirebasePartiallyFilled = !!(firebaseApiKey.trim() || firebaseProjectId.trim());

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-xl p-0 sm:p-4 modal-backdrop-enter">
      <div className="w-full max-w-lg bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 max-h-[94vh] overflow-y-auto modal-spring-enter">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shadow-md shrink-0">
              {step === 0 ? <Database className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white tracking-tight">
                {step === 0 && 'Server Configuration'}
                {step === 1 && '1. Welcome & Class Setup'}
                {step === 2 && '2. Attendance & Period Detection'}
                {step === 3 && '3. Schedule & 10-Min Reminders'}
                {step === 4 && '4. AI Assistant & Reports'}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                {step === 0
                  ? 'Optional — skip and configure in Settings later'
                  : `Step ${step} of ${totalSteps} • Interactive Walkthrough`}
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

        {/* Progress dots (steps 1-4 only) */}
        {step > 0 && (
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map(idx => (
              <button
                key={idx}
                onClick={() => { triggerHaptic('light'); setStep(idx); }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step === idx
                    ? 'w-8 bg-[var(--accent-tertiary)] shadow-[0_0_8px_var(--accent-tertiary-glow)]'
                    : 'w-2 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                }`}
                aria-label={`Go to step ${idx}`}
              />
            ))}
          </div>
        )}

        {/* STEP 0: SERVER CONFIGURATION */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in-up">

            {/* Admin Passkey */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#1e1e1e] border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-neutral-600 dark:text-neutral-400 shrink-0" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Admin Passkey</h4>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Set a custom passkey for the Admin Console. Default is{' '}
                <code className="px-1 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 font-mono text-xs">admin123</code>{' '}
                if left blank.
              </p>
              <FieldGroup className="text-xs font-semibold">
                <Field>
                  <FieldLabel htmlFor="setup-admin-key" className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Admin Passkey
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="setup-admin-key"
                      type={showPasskey ? 'text' : 'password'}
                      placeholder="Enter custom passkey (optional)"
                      value={adminPasskey}
                      onChange={e => setAdminPasskey(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasskey(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                    >
                      {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
              </FieldGroup>
            </div>

            {/* Firebase (collapsible) */}
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(p => !p)}
                className="w-full flex items-center justify-between gap-3 p-4 bg-neutral-50 dark:bg-[#1e1e1e] hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-neutral-600 dark:text-neutral-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">Firebase Sync</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {isFirebasePartiallyFilled ? 'Credentials entered' : 'Optional — for cross-device sync'}
                    </p>
                  </div>
                </div>
                {showAdvanced
                  ? <ChevronUp className="w-4 h-4 text-neutral-400" />
                  : <ChevronDown className="w-4 h-4 text-neutral-400" />}
              </button>

              {showAdvanced && (
                <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 space-y-3 bg-white dark:bg-[#171717]">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Get these from your{' '}
                    <strong className="text-neutral-700 dark:text-neutral-300">
                      Firebase Console → Project Settings → Web app config
                    </strong>. The app works fully offline without Firebase.
                  </p>

                  <FieldGroup className="text-xs font-semibold space-y-3">
                    <Field>
                      <FieldLabel htmlFor="setup-fb-apikey">API Key</FieldLabel>
                      <div className="relative">
                        <Input
                          id="setup-fb-apikey"
                          type={showApiKey ? 'text' : 'password'}
                          placeholder="AIzaSy..."
                          value={firebaseApiKey}
                          onChange={e => setFirebaseApiKey(e.target.value)}
                          className="pr-10 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel htmlFor="setup-fb-projectid">Project ID</FieldLabel>
                        <Input
                          id="setup-fb-projectid"
                          placeholder="my-project-id"
                          value={firebaseProjectId}
                          onChange={e => setFirebaseProjectId(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="setup-fb-authdomain">Auth Domain</FieldLabel>
                        <Input
                          id="setup-fb-authdomain"
                          placeholder="id.firebaseapp.com"
                          value={firebaseAuthDomain}
                          onChange={e => setFirebaseAuthDomain(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel htmlFor="setup-fb-bucket">Storage Bucket</FieldLabel>
                        <Input
                          id="setup-fb-bucket"
                          placeholder="id.appspot.com"
                          value={firebaseStorageBucket}
                          onChange={e => setFirebaseStorageBucket(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="setup-fb-senderid">Sender ID</FieldLabel>
                        <Input
                          id="setup-fb-senderid"
                          placeholder="123456789"
                          value={firebaseSenderId}
                          onChange={e => setFirebaseSenderId(e.target.value)}
                          className="font-mono text-xs"
                        />
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="setup-fb-appid">App ID</FieldLabel>
                      <Input
                        id="setup-fb-appid"
                        placeholder="1:123456789:web:abcdef..."
                        value={firebaseAppId}
                        onChange={e => setFirebaseAppId(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </Field>
                  </FieldGroup>
                </div>
              )}
            </div>

            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
              All credentials are stored only on this device. Update anytime in{' '}
              <strong>Settings → Cloud Sync</strong>.
            </p>
          </div>
        )}

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

        {/* STEP 2: ATTENDANCE */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shrink-0">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Real-Time Period Detection</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Auto-highlights active period and upcoming class</p>
                </div>
              </div>
              <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-2 font-medium">
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>1-Tap Toggle:</strong> Tap student chips to toggle between Present & Absent.</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Instant Copy:</strong> Copy formatted absentee summaries with 1 click for WhatsApp / Email.</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Secure Local Storage:</strong> All attendance sessions are stored privately on your device.</span></li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 3: SCHEDULE */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Timetable & Automated Reminders</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Never miss taking attendance or notifying faculty</p>
                </div>
              </div>
              <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-2 font-medium">
                <li className="flex items-start gap-2"><BellRing className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" /><span><strong>10-Min Pre-Class Alert:</strong> Sounds a reminder 10 minutes before every period begins.</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Timetable Slot Editor:</strong> Easily assign subjects, faculty, and room numbers per day.</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Holiday Calendar:</strong> Automatically skips notifications on holidays and weekends.</span></li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 4: AI & REPORTS */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in-up">
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">AI Assistant & Comprehensive Reports</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Smart analytics directly on your device</p>
                </div>
              </div>
              <ul className="text-xs text-neutral-600 dark:text-neutral-300 space-y-2 font-medium">
                <li className="flex items-start gap-2"><Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /><span><strong>Local AI Chat:</strong> Ask &quot;Who has low attendance?&quot; or &quot;Plan today&apos;s schedule&quot;.</span></li>
                <li className="flex items-start gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><span><strong>Excel (.xlsx) Export:</strong> Generate full monthly attendance sheets with percentages.</span></li>
                <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" /><span><strong>Streak Rewards:</strong> Track daily class activity streaks.</span></li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-2">
          {step > 0 ? (
            <Button variant="outline" type="button" onClick={handlePrev} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              type="button"
              onClick={() => { saveFirebaseConfig(); setStep(1); }}
              className="text-neutral-500"
            >
              Skip for now
            </Button>
          )}

          {step > 0 && step < totalSteps && (
            <Button
              variant="ghost"
              type="button"
              onClick={handleFinish}
              className="text-neutral-500 text-xs"
            >
              Skip Setup
            </Button>
          )}

          <Button type="button" onClick={handleNext} className="gap-2 ml-auto">
            <span>{step === totalSteps ? 'Get Started' : 'Next'}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
