import * as React from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../db';
import { useNotification } from '../../context/NotificationContext';
import { triggerHaptic } from '../../utils/haptics';
import {
  ArrowRight,
  ArrowLeft,
  User,
  School,
  Sparkles,
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
  Settings as SettingsIcon,
} from 'lucide-react';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';

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

interface StepConfig {
  bgColor: string;
  badge: string;
  title: string;
  subtitle: string;
  image: string;
  buttonText: string;
}

const STEPS: StepConfig[] = [
  {
    bgColor: '#F9CAD2',
    badge: 'Class Workspace',
    title: 'Plan With\nConfidence',
    subtitle: 'Set up your class workspace and let Anexus handle the rest.',
    image: '/illustrations/setup_pink_dev.png',
    buttonText: 'Continue  >>',
  },
  {
    bgColor: '#F9DA41',
    badge: 'Real-Time Logger',
    title: 'Track Attendance\nIn 1 Tap',
    subtitle: 'Auto-detects active periods, 1-tap toggles, and instant WhatsApp absentee summaries.',
    image: '/illustrations/setup_yellow_timetable.png',
    buttonText: 'Continue  >>',
  },
  {
    bgColor: '#D6C7FE',
    badge: '10-Min Pre-Alert',
    title: 'Timetable Alerts\nThat Work For You',
    subtitle: 'Automated pre-class alerts and effortless day-by-day timetable slot management.',
    image: '/illustrations/setup_lavender_schedule.jpg',
    buttonText: 'Continue  >>',
  },
  {
    bgColor: '#FD8B62',
    badge: 'Smart AI & Reports',
    title: 'Smart Assistant\n& Full Audits',
    subtitle: 'Ask anything about student attendance and export comprehensive Excel (.xlsx) spreadsheets.',
    image: '/illustrations/setup_coral_ai.jpg',
    buttonText: 'Get Started  >>',
  },
];

export const WelcomeSetup: React.FC<WelcomeSetupProps> = ({ onComplete, isReplay = false }) => {
  const { showToast } = useNotification();

  // Embla Carousel API
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const [count, setCount] = React.useState(STEPS.length);

  // Server Config Drawer / Modal state
  const [showServerConfig, setShowServerConfig] = React.useState<boolean>(false);

  // Server configuration fields
  const [firebaseApiKey,        setFirebaseApiKey]        = React.useState('');
  const [firebaseAuthDomain,    setFirebaseAuthDomain]    = React.useState('');
  const [firebaseProjectId,     setFirebaseProjectId]     = React.useState('');
  const [firebaseStorageBucket, setFirebaseStorageBucket] = React.useState('');
  const [firebaseSenderId,      setFirebaseSenderId]      = React.useState('');
  const [firebaseAppId,         setFirebaseAppId]         = React.useState('');
  const [adminPasskey,          setAdminPasskey]          = React.useState('');
  const [showApiKey,   setShowApiKey]   = React.useState(false);
  const [showPasskey,  setShowPasskey]  = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  // Class setup fields
  const [className, setClassName] = React.useState('');
  const [section,   setSection]   = React.useState('');
  const [repName,   setRepName]   = React.useState('');
  const [dept,      setDept]      = React.useState('');

  // Pre-fill from localStorage & Dexie on open
  React.useEffect(() => {
    try {
      setFirebaseApiKey(localStorage.getItem(LS_FIREBASE_API_KEY) || '');
      setFirebaseAuthDomain(localStorage.getItem(LS_FIREBASE_AUTH_DOMAIN) || '');
      setFirebaseProjectId(localStorage.getItem(LS_FIREBASE_PROJECT_ID) || '');
      setFirebaseStorageBucket(localStorage.getItem(LS_FIREBASE_STORAGE_BUCKET) || '');
      setFirebaseSenderId(localStorage.getItem(LS_FIREBASE_SENDER_ID) || '');
      setFirebaseAppId(localStorage.getItem(LS_FIREBASE_APP_ID) || '');
      setAdminPasskey(localStorage.getItem(LS_ADMIN_PASSKEY) || '');
    } catch {}

    db.settings.toArray().then(settings => {
      if (settings.length > 0) {
        if (settings[0].className) setClassName(settings[0].className);
        if (settings[0].section) setSection(settings[0].section);
        if (settings[0].classRepName) setRepName(settings[0].classRepName);
        if (settings[0].department) setDept(settings[0].department);
      }
    });
  }, []);

  // Sync Carousel API events
  React.useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on('select', onSelect);
    api.on('reInit', onSelect);

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

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
    if (current < count - 1) {
      api?.scrollNext();
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    triggerHaptic('light');
    if (current > 0) {
      api?.scrollPrev();
    }
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

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-dialog-open', 'true');
    return () => {
      document.body.style.overflow = 'unset';
      document.body.removeAttribute('data-dialog-open');
    };
  }, []);

  const currentStepConfig = STEPS[current] || STEPS[0];
  const isFirebasePartiallyFilled = !!(firebaseApiKey.trim() || firebaseProjectId.trim());

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-4 modal-backdrop-enter">
      {/* Mobile-First Playful Card with Seamless Pastel Background */}
      <div
        className="w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden transition-colors duration-500 flex flex-col max-h-[94vh] border border-black/10 relative"
        style={{ backgroundColor: currentStepConfig.bgColor }}
      >
        {/* Top Header & Navigation Bar */}
        <div className="px-6 pt-5 pb-2 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            {current > 0 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 text-neutral-900 flex items-center justify-center transition-all active:scale-95"
                title="Previous Slide"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <span className="px-3 py-1 rounded-full bg-black/10 text-[11px] font-black uppercase tracking-wider text-neutral-900">
                {currentStepConfig.badge}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowServerConfig(true);
              }}
              className="px-3 py-1.5 rounded-full bg-black/10 hover:bg-black/20 text-neutral-900 text-xs font-bold flex items-center gap-1.5 backdrop-blur-sm transition-all active:scale-95"
              title="Configure Optional Firebase & Admin Passkey"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Server Config</span>
            </button>

            {isReplay && (
              <button
                type="button"
                onClick={onComplete}
                className="w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 text-neutral-900 flex items-center justify-center transition-all active:scale-95"
                title="Close Walkthrough"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Shadcn UI Carousel Container */}
        <div className="flex-1 overflow-hidden flex flex-col justify-center px-4 py-1">
          <Carousel
            setApi={setApi}
            className="w-full"
            opts={{
              loop: false,
            }}
          >
            <CarouselContent>
              {STEPS.map((stepItem, index) => (
                <CarouselItem
                  key={index}
                  className="rounded-3xl"
                  style={{ backgroundColor: stepItem.bgColor }}
                >
                  <div className="p-1 rounded-3xl" style={{ backgroundColor: stepItem.bgColor }}>
                    <Card
                      style={{ backgroundColor: stepItem.bgColor }}
                      className="border-0 shadow-none bg-transparent dark:bg-transparent text-neutral-900 dark:text-neutral-900"
                    >
                      <CardContent
                        style={{ backgroundColor: stepItem.bgColor }}
                        className="p-2 sm:p-3 flex flex-col justify-between max-h-[64vh] overflow-y-auto scrollbar-none space-y-3 text-neutral-900 dark:text-neutral-900 rounded-2xl bg-transparent dark:bg-transparent"
                      >
                        {/* Headline & Subtitle */}
                        <div className="space-y-1.5 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-800/80 dark:text-neutral-800/80">
                              Step {index + 1} of {STEPS.length}
                            </span>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-black/10 text-neutral-900 dark:text-neutral-900">
                              {stepItem.badge}
                            </span>
                          </div>
                          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-neutral-900 tracking-tight leading-tight whitespace-pre-line">
                            {stepItem.title}
                          </h1>
                          <p className="text-xs sm:text-sm font-semibold text-neutral-800/80 dark:text-neutral-800/80 leading-relaxed">
                            {stepItem.subtitle}
                          </p>
                        </div>

                        {/* Seamless Illustration Container */}
                        <div className="relative flex items-center justify-center my-1 select-none">
                          <div
                            className="w-full max-w-[240px] sm:max-w-[260px] aspect-square rounded-3xl overflow-hidden flex items-center justify-center"
                            style={{ backgroundColor: stepItem.bgColor }}
                          >
                            <img
                              src={stepItem.image}
                              alt={stepItem.title}
                              className="w-full h-full object-contain filter contrast-105"
                              style={{ backgroundColor: stepItem.bgColor }}
                            />
                          </div>
                        </div>

                        {/* Step 1: Interactive Class Workspace Inputs */}
                        {index === 0 && (
                          <div className="p-4 rounded-3xl bg-white/80 dark:bg-white/80 backdrop-blur-md border border-black/10 shadow-sm space-y-3 animate-fade-in text-left">
                            <FieldGroup className="text-xs font-bold space-y-2.5">
                              <Field>
                                <FieldLabel htmlFor="walkthrough-repname" className="text-neutral-900 dark:text-neutral-900 flex items-center gap-1.5 text-xs font-bold">
                                  <User className="w-3.5 h-3.5 text-neutral-900" /> Your Name (Class Representative)
                                </FieldLabel>
                                <Input
                                  id="walkthrough-repname"
                                  placeholder="e.g. John Doe"
                                  value={repName}
                                  onChange={e => setRepName(e.target.value)}
                                  className="bg-white/95 dark:bg-white/95 border-black/15 text-neutral-900 dark:!text-neutral-900 rounded-xl h-9 text-xs font-semibold"
                                />
                              </Field>
                              <div className="grid grid-cols-2 gap-2.5">
                                <Field>
                                  <FieldLabel htmlFor="walkthrough-classname" className="text-neutral-900 dark:text-neutral-900 flex items-center gap-1.5 text-xs font-bold">
                                    <School className="w-3.5 h-3.5 text-neutral-900" /> Class Name
                                  </FieldLabel>
                                  <Input
                                    id="walkthrough-classname"
                                    placeholder="e.g. CS-3A"
                                    value={className}
                                    onChange={e => setClassName(e.target.value)}
                                    className="bg-white/95 dark:bg-white/95 border-black/15 text-neutral-900 dark:!text-neutral-900 rounded-xl h-9 text-xs font-semibold"
                                  />
                                </Field>
                                <Field>
                                  <FieldLabel htmlFor="walkthrough-section" className="text-neutral-900 dark:text-neutral-900 text-xs font-bold">
                                    Section
                                  </FieldLabel>
                                  <Input
                                    id="walkthrough-section"
                                    placeholder="e.g. Sec A"
                                    value={section}
                                    onChange={e => setSection(e.target.value)}
                                    className="bg-white/95 dark:bg-white/95 border-black/15 text-neutral-900 dark:!text-neutral-900 rounded-xl h-9 text-xs font-semibold"
                                  />
                                </Field>
                              </div>
                              <Field>
                                <FieldLabel htmlFor="walkthrough-dept" className="text-neutral-900 dark:text-neutral-900 text-xs font-bold">
                                  Department
                                </FieldLabel>
                                <Input
                                  id="walkthrough-dept"
                                  placeholder="e.g. Computer Science"
                                  value={dept}
                                  onChange={e => setDept(e.target.value)}
                                  className="bg-white/95 dark:bg-white/95 border-black/15 text-neutral-900 dark:!text-neutral-900 rounded-xl h-9 text-xs font-semibold"
                                />
                              </Field>
                            </FieldGroup>
                          </div>
                        )}

                        {/* Step 2: Attendance Tracking Highlights */}
                        {index === 1 && (
                          <div className="p-3.5 rounded-3xl bg-black/10 dark:bg-black/10 backdrop-blur-md space-y-2 text-xs font-bold text-neutral-900 dark:text-neutral-900 animate-fade-in text-left">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
                              <span>1-Tap quick toggle between Present & Absent</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
                              <span>One-click copy for WhatsApp & Email absentee summary</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
                              <span>Private local database: 100% offline & secure</span>
                            </div>
                          </div>
                        )}

                        {/* Step 3: Timetable & Notification Highlights */}
                        {index === 2 && (
                          <div className="p-3.5 rounded-3xl bg-black/10 dark:bg-black/10 backdrop-blur-md space-y-2 text-xs font-bold text-neutral-900 dark:text-neutral-900 animate-fade-in text-left">
                            <div className="flex items-center gap-2">
                              <BellRing className="w-4 h-4 text-neutral-900 shrink-0" />
                              <span>10-Minute Pre-Class Alert chimes before lecture starts</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-neutral-900 shrink-0" />
                              <span>Quick drag-and-drop timetable slot management</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0" />
                              <span>Automatic skips on official holidays and weekends</span>
                            </div>
                          </div>
                        )}

                        {/* Step 4: AI & Reporting Highlights */}
                        {index === 3 && (
                          <div className="p-3.5 rounded-3xl bg-black/10 dark:bg-black/10 backdrop-blur-md space-y-2 text-xs font-bold text-neutral-900 dark:text-neutral-900 animate-fade-in text-left">
                            <div className="flex items-center gap-2">
                              <Bot className="w-4 h-4 text-neutral-900 shrink-0" />
                              <span>Local AI Chat: Instant answers to attendance queries</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-neutral-900 shrink-0" />
                              <span>1-Click Excel (.xlsx) comprehensive monthly audit sheets</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-900 shrink-0" />
                              <span>Streak Rewards: Celebrate class attendance consistency</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>

            <CarouselPrevious className="bg-black/10 hover:bg-black/20 text-neutral-900 border-0" />
            <CarouselNext className="bg-black/10 hover:bg-black/20 text-neutral-900 border-0" />
          </Carousel>
        </div>

        {/* Bottom Pagination & Primary Dark Pill Button */}
        <div className="px-6 pb-6 pt-2 space-y-3 z-20">
          {/* Pagination Dots */}
          <div className="flex items-center justify-center gap-1.5">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  api?.scrollTo(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  current === idx ? 'w-6 bg-neutral-900' : 'w-2 bg-neutral-900/30 hover:bg-neutral-900/50'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-3">
            {current < count - 1 && (
              <button
                type="button"
                onClick={handleFinish}
                className="text-xs font-bold text-neutral-900/70 hover:text-neutral-900 px-3 py-2 transition-colors active:scale-95"
              >
                Skip
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex-1 h-12 rounded-full bg-neutral-900 hover:bg-neutral-800 active:scale-[0.98] text-white font-black text-sm px-6 flex items-center justify-between shadow-xl transition-all"
            >
              <span>{currentStepConfig.buttonText}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SERVER CONFIGURATION MODAL / DRAWER */}
        {showServerConfig && (
          <div className="absolute inset-0 z-50 bg-white/95 dark:bg-[#171717]/95 backdrop-blur-xl p-6 rounded-[2.5rem] flex flex-col justify-between overflow-y-auto animate-fade-in text-neutral-900 dark:text-neutral-100">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center font-bold">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-neutral-900 dark:text-white">Server & Cloud Config</h3>
                    <p className="text-[11px] text-neutral-500 font-medium">Optional credentials for cloud sync & admin console</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowServerConfig(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Admin Passkey */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#202020] border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white">
                  <Shield className="w-3.5 h-3.5 text-neutral-500" /> Admin Passkey
                </div>
                <div className="relative">
                  <Input
                    type={showPasskey ? 'text' : 'password'}
                    placeholder="admin123 (default)"
                    value={adminPasskey}
                    onChange={e => setAdminPasskey(e.target.value)}
                    className="pr-10 text-xs h-9 bg-white dark:bg-[#171717]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasskey(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPasskey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Firebase (Collapsible) */}
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(p => !p)}
                  className="w-full flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-[#202020] hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-2 text-left">
                    <Database className="w-4 h-4 text-neutral-600" />
                    <div>
                      <p className="text-xs font-bold text-neutral-900 dark:text-white">Firebase Firestore</p>
                      <p className="text-[10px] text-neutral-500">
                        {isFirebasePartiallyFilled ? 'Credentials entered' : 'Optional — configure in Settings anytime'}
                      </p>
                    </div>
                  </div>
                  {showAdvanced ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                </button>

                {showAdvanced && (
                  <div className="p-4 space-y-2.5 bg-white dark:bg-[#171717] border-t border-neutral-200 dark:border-neutral-800">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                        Web API Key
                      </label>
                      <div className="relative">
                        <Input
                          type={showApiKey ? 'text' : 'password'}
                          placeholder="AIzaSy..."
                          value={firebaseApiKey}
                          onChange={e => setFirebaseApiKey(e.target.value)}
                          className="font-mono text-xs pr-10 h-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                        >
                          {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                          Project ID
                        </label>
                        <Input
                          placeholder="my-project"
                          value={firebaseProjectId}
                          onChange={e => setFirebaseProjectId(e.target.value)}
                          className="font-mono text-xs h-8"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                          Auth Domain
                        </label>
                        <Input
                          placeholder="id.firebaseapp.com"
                          value={firebaseAuthDomain}
                          onChange={e => setFirebaseAuthDomain(e.target.value)}
                          className="font-mono text-xs h-8"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowServerConfig(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  saveFirebaseConfig();
                  setShowServerConfig(false);
                  showToast('Config Saved', 'Firebase & passkey stored locally', 'success');
                }}
              >
                Save & Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
