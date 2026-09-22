import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, wipeSchedulesAndFaculty, wipeAllClassData, restoreDefaultRegistrationTimetable } from '../db';
import { Student, Faculty, Subject, HolidayEntry } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { triggerHaptic } from '../utils/haptics';
import { DEFAULT_SUMMARY_TEMPLATE, formatAttendanceSummary, SAMPLE_STUDENTS } from '../utils/summaryFormatter';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  Field,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { DatePicker } from '@/components/ui/date-picker';
import { Calendar as UICalendar } from '@/components/ui/calendar';
import {
  Settings as SettingsIcon,
  Users,
  UserPlus,
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
  Edit2,
  Plus,
  Save,
  Check,
  Calendar,
  Sun,
  Moon,
  Monitor,
  X,
  RotateCcw,
  AlertTriangle,
  Copy,
  FileText,
  Sparkles,
  Search,
  Radio,
  User,
  Camera,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  HelpCircle,
  Lock,
  CheckCircle2,
  Umbrella,
  Volume2,
  Zap,
  Sliders,
  Smartphone,
  Key,
  Globe,
  Eye,
  EyeOff,
  ExternalLink,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  sendSampleLiveNotification,
  openVivoOriginIslandSettings,
  openAppBatterySettings,
  checkOriginIslandSupport
} from '../utils/liveNotification';
import { exportJsonFile } from '../utils/fileExport';
import { testGeminiApiKey, GEMINI_MODELS } from '../utils/googleGeminiAi';
import {
  testFirebaseConnection,
  syncAllToFirebase,
  restoreFromFirebase,
  syncToCentralFirebase,
  restoreFromCentralFirebase,
  getOrCreateUserSyncId,
  formatClassSyncCode,
  getActiveFirebaseConfig,
  deleteCloudData,
  fetchAllCloudUsers,
  fetchAllCloudClasses,
  adminDeleteCloudDoc,
  FirebaseConfig
} from '../utils/firebaseSync';
import { CENTRAL_FIREBASE_CONFIG, isCentralFirebaseConfigured, verifyAdminAccessCode, createAdminSessionToken } from '../config/firebaseConfig';
import { Database, Share2, Shield, Mail, Send } from 'lucide-react';
import { enqueueAttendanceEmail, flushPendingAttendanceEmails } from '../utils/emailDispatcher';

interface SettingsPageProps {
  onOpenWalkthrough?: () => void;
  onNavigateToProfile?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onOpenWalkthrough, onNavigateToProfile }) => {
  const { theme, setTheme, toggleTheme, isDark } = useTheme();
  const { showToast } = useNotification();

  const settingsList = useLiveQuery(() => db.settings.toArray());
  const currentSettings = settingsList?.[0];

  const students = useLiveQuery(() => db.students.toArray()) || [];
  const facultyList = useLiveQuery(() => db.faculty.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];

  // Metadata Form State
  const [className, setClassName] = useState<string>(currentSettings?.className || 'Class 5101');
  const [section, setSection] = useState<string>(currentSettings?.section || 'Section A');
  const [academicYear, setAcademicYear] = useState<string>(currentSettings?.academicYear || '2026 - 2027');
  const [semester, setSemester] = useState<string>(currentSettings?.semester || 'Semester 1');
  const [department, setDepartment] = useState<string>(currentSettings?.department || 'General');
  const [classRepName, setClassRepName] = useState<string>(currentSettings?.classRepName || 'Class Representative');
  const [disableSaturday, setDisableSaturday] = useState<boolean>(currentSettings?.disableSaturday ?? true);
  const [classReminderOffset, setClassReminderOffset] = useState<number>(currentSettings?.classReminderOffset || 10);
  const [examReminderOffset, setExamReminderOffset] = useState<number>(currentSettings?.examReminderOffset || 1440);
  const [minAttendanceTarget, setMinAttendanceTarget] = useState<number>(currentSettings?.minAttendanceTarget || 75);
  const [summaryTemplate, setSummaryTemplate] = useState<string>(currentSettings?.summaryTemplate || DEFAULT_SUMMARY_TEMPLATE);
  const [liveNotificationsEnabled, setLiveNotificationsEnabled] = useState<boolean>(currentSettings?.notificationsEnabled ?? true);

  // Google Gemini Online AI State
  const [geminiApiKey, setGeminiApiKey] = useState<string>(currentSettings?.geminiApiKey || '');
  const [geminiModel, setGeminiModel] = useState<string>(currentSettings?.geminiModel || 'gemini-1.5-flash');
  const [aiProvider, setAiProvider] = useState<'local' | 'gemini'>(currentSettings?.aiProvider || 'local');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isTestingGemini, setIsTestingGemini] = useState<boolean>(false);

  // Automated Attendance Excel Emailing State
  const [autoEmailAttendanceExcel, setAutoEmailAttendanceExcel] = useState<boolean>(currentSettings?.autoEmailAttendanceExcel ?? false);
  const [attendanceExcelRecipients, setAttendanceExcelRecipients] = useState<string[]>(currentSettings?.attendanceExcelRecipients || []);
  const [newRecipientInput, setNewRecipientInput] = useState<string>('');
  const [isTestingEmail, setIsTestingEmail] = useState<boolean>(false);

  // Sync settings when loaded from IndexedDB
  React.useEffect(() => {
    if (currentSettings) {
      if (currentSettings.className) setClassName(currentSettings.className);
      if (currentSettings.section) setSection(currentSettings.section);
      if (currentSettings.academicYear) setAcademicYear(currentSettings.academicYear);
      if (currentSettings.semester) setSemester(currentSettings.semester);
      if (currentSettings.department) setDepartment(currentSettings.department);
      if (currentSettings.classRepName) setClassRepName(currentSettings.classRepName);
      if (currentSettings.summaryTemplate) setSummaryTemplate(currentSettings.summaryTemplate);
      if (currentSettings.classReminderOffset !== undefined) setClassReminderOffset(currentSettings.classReminderOffset);
      if (currentSettings.minAttendanceTarget !== undefined) setMinAttendanceTarget(currentSettings.minAttendanceTarget);
      if (currentSettings.notificationsEnabled !== undefined) setLiveNotificationsEnabled(currentSettings.notificationsEnabled);
      if (currentSettings.autoEmailAttendanceExcel !== undefined) setAutoEmailAttendanceExcel(currentSettings.autoEmailAttendanceExcel);
      if (currentSettings.attendanceExcelRecipients !== undefined) setAttendanceExcelRecipients(currentSettings.attendanceExcelRecipients);
      if (currentSettings.geminiApiKey !== undefined) setGeminiApiKey(currentSettings.geminiApiKey);
      if (currentSettings.geminiModel !== undefined) setGeminiModel(currentSettings.geminiModel);
      if (currentSettings.aiProvider !== undefined) setAiProvider(currentSettings.aiProvider);
      if (currentSettings.firebaseSyncEnabled !== undefined) setFirebaseSyncEnabled(currentSettings.firebaseSyncEnabled);
      if (currentSettings.firebaseApiKey !== undefined) setFirebaseApiKey(currentSettings.firebaseApiKey);
      if (currentSettings.firebaseProjectId !== undefined) setFirebaseProjectId(currentSettings.firebaseProjectId);
      if (currentSettings.firebaseAuthDomain !== undefined) setFirebaseAuthDomain(currentSettings.firebaseAuthDomain);
      if (currentSettings.firebaseCollectionName !== undefined) setFirebaseCollectionName(currentSettings.firebaseCollectionName);
      if (currentSettings.firebaseUserId !== undefined) setFirebaseUserId(currentSettings.firebaseUserId);
      if (currentSettings.firebaseClassCode !== undefined) setFirebaseClassCode(currentSettings.firebaseClassCode);
      if (currentSettings.lastFirebaseSyncAt !== undefined) setLastFirebaseSyncAt(currentSettings.lastFirebaseSyncAt);
    }
    // Auto-generate User ID if not present
    getOrCreateUserSyncId().then(id => {
      setFirebaseUserId(prev => prev || id);
    });
  }, [currentSettings]);

  // Holidays
  const holidays: HolidayEntry[] = currentSettings?.holidays || [];
  const [selectedHolidayDate, setSelectedHolidayDate] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'));
  const [holidayTitleInput, setHolidayTitleInput] = useState<string>('');

  // Roster Search
  const [rosterSearch, setRosterSearch] = useState<string>('');

  // Confirm Wipe Dialogs
  const [isWipeDialogOpen, setIsWipeDialogOpen] = useState<boolean>(false);
  const [isWipeAllDataOpen, setIsWipeAllDataOpen] = useState<boolean>(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState<boolean>(false);

  // Crisp Haptics & Tactile Feedback State
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(() => localStorage.getItem('anexus_haptics_enabled') !== 'false');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => localStorage.getItem('anexus_haptic_sound') !== 'false');
  const [testSliderValue, setTestSliderValue] = useState<number>(65);
  const [testSwitchValue, setTestSwitchValue] = useState<boolean>(true);

  const handleToggleHaptics = (checked: boolean) => {
    setHapticsEnabled(checked);
    localStorage.setItem('anexus_haptics_enabled', checked ? 'true' : 'false');
    if (checked) {
      triggerHaptic('medium');
      showToast('Haptics Enabled', 'Native physical vibrations & tactile impulses active', 'success');
    } else {
      showToast('Haptics Disabled', 'Tactile vibrations turned off', 'info');
    }
  };

  const handleToggleSound = (checked: boolean) => {
    setSoundEnabled(checked);
    localStorage.setItem('anexus_haptic_sound', checked ? 'true' : 'false');
    if (checked) {
      triggerHaptic('light');
      showToast('Acoustic Clicks Enabled', 'Micro-transient physical switch audio active', 'success');
    } else {
      showToast('Acoustic Clicks Disabled', 'Micro-switch audio turned off', 'info');
    }
  };

  // Add Modals
  const [isAddStudentOpen, setIsAddStudentOpen] = useState<boolean>(false);
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState<boolean>(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState<boolean>(false);
  const [isTermsOpen, setIsTermsOpen] = useState<boolean>(false);

  // Single Central Firebase Cloud State
  const [firebaseSyncEnabled, setFirebaseSyncEnabled] = useState<boolean>(true);
  const [firebaseUserId, setFirebaseUserId] = useState<string>('');
  const [firebaseClassCode, setFirebaseClassCode] = useState<string>('');
  const [copiedUserId, setCopiedUserId] = useState<boolean>(false);
  const [copiedClassCode, setCopiedClassCode] = useState<boolean>(false);
  const [restoreCodeInput, setRestoreCodeInput] = useState<string>('');
  const [restoreMode, setRestoreMode] = useState<'class' | 'user'>('class');
  const [showAdvancedFirebase, setShowAdvancedFirebase] = useState<boolean>(false);

  // Custom Firebase Keys (Optional Override)
  const [firebaseApiKey, setFirebaseApiKey] = useState<string>('');
  const [firebaseProjectId, setFirebaseProjectId] = useState<string>('');
  const [firebaseAuthDomain, setFirebaseAuthDomain] = useState<string>('');
  const [firebaseCollectionName, setFirebaseCollectionName] = useState<string>('');
  const [showFirebaseKey, setShowFirebaseKey] = useState<boolean>(false);
  const [isTestingFirebase, setIsTestingFirebase] = useState<boolean>(false);
  const [isSyncingFirebase, setIsSyncingFirebase] = useState<boolean>(false);
  const [isRestoringFirebase, setIsRestoringFirebase] = useState<boolean>(false);
  const [isConfirmRestoreFirebaseOpen, setIsConfirmRestoreFirebaseOpen] = useState<boolean>(false);
  const [lastFirebaseSyncAt, setLastFirebaseSyncAt] = useState<string>('');

  // Admin & Cloud Delete State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [adminCodeInput, setAdminCodeInput] = useState<string>('');
  const [showAdminCode, setShowAdminCode] = useState<boolean>(false);
  const [isAdminPromptOpen, setIsAdminPromptOpen] = useState<boolean>(false);
  const [isAdminInspectorOpen, setIsAdminInspectorOpen] = useState<boolean>(false);
  const [isLoadingAdminData, setIsLoadingAdminData] = useState<boolean>(false);
  const [cloudUsersList, setCloudUsersList] = useState<any[]>([]);
  const [cloudClassesList, setCloudClassesList] = useState<any[]>([]);
  const [adminActiveTab, setAdminActiveTab] = useState<'users' | 'classes'>('users');
  const [adminSearchTerm, setAdminSearchTerm] = useState<string>('');
  const [isDeleteMyCloudOpen, setIsDeleteMyCloudOpen] = useState<boolean>(false);
  const [isDeletingCloud, setIsDeletingCloud] = useState<boolean>(false);

  // Easter Egg 7-Tap Admin Access & 5-Minute Auto-Lock
  const [secretAdminTaps, setSecretAdminTaps] = useState<number>(0);
  const [lastSecretTapTime, setLastSecretTapTime] = useState<number>(0);
  const adminSessionTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleSecretAdminTap = () => {
    const now = Date.now();
    let newCount = 1;
    if (now - lastSecretTapTime < 3500) {
      newCount = secretAdminTaps + 1;
    }
    setLastSecretTapTime(now);
    setSecretAdminTaps(newCount);

    if (newCount >= 4 && newCount < 7) {
      triggerHaptic('light');
      showToast('Developer Mode', `${7 - newCount} taps away from Admin Console`, 'info');
    } else if (newCount >= 7) {
      triggerHaptic('success');
      setSecretAdminTaps(0);
      setIsAdminPromptOpen(true);
      showToast('Easter Egg Unlocked', 'Master Admin Authentication Unlocked', 'success');
    }
  };

  // 5-minute auto-lock for admin session
  React.useEffect(() => {
    if (isAdminUnlocked) {
      if (adminSessionTimerRef.current) clearTimeout(adminSessionTimerRef.current);
      adminSessionTimerRef.current = setTimeout(() => {
        setIsAdminUnlocked(false);
        setIsAdminInspectorOpen(false);
        try {
          localStorage.removeItem('__adm_t');
          sessionStorage.removeItem('__adm_t');
        } catch {}
        showToast('Admin Session Expired', 'Master admin mode locked automatically after 5 minutes.', 'warning');
      }, 5 * 60 * 1000);
    } else {
      try {
        localStorage.removeItem('__adm_t');
        sessionStorage.removeItem('__adm_t');
      } catch {}
    }
    return () => {
      if (adminSessionTimerRef.current) clearTimeout(adminSessionTimerRef.current);
    };
  }, [isAdminUnlocked]);

  // Form fields
  const [newRegNo, setNewRegNo] = useState<string>('');
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newFacultyName, setNewFacultyName] = useState<string>('');

  const filteredStudents = students.filter(st =>
    st.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    st.registerNo.toLowerCase().includes(rosterSearch.toLowerCase())
  );

  // FULL FACTORY RESET - WIPE ALL DATA
  const handleConfirmWipeAll = async () => {
    triggerHaptic('warning');
    await wipeAllClassData();
    setRosterSearch('');
    showToast('All Data Wiped', 'Students, subjects, timetable, attendance records, and tasks cleared', 'warning');
    setIsWipeAllDataOpen(false);
  };

  // WIPE SCHEDULES AND FACULTY
  const handleConfirmWipe = async () => {
    triggerHaptic('warning');
    await wipeSchedulesAndFaculty();
    showToast('Wiped Schedules & Faculty', 'Schedules and faculty list cleared', 'warning');
    setIsWipeDialogOpen(false);
  };

  // RESTORE OFFICIAL 9-COURSE REGISTRATION TIMETABLE
  const handleConfirmReset = async () => {
    triggerHaptic('success');
    await restoreDefaultRegistrationTimetable();
    showToast('Timetable Restored', 'Restored 9-course registration timetable with subjects, faculty & schedules', 'success');
    setIsResetDialogOpen(false);
  };

  // Save Settings
  const handleSaveSettings = async () => {
    triggerHaptic('medium');
    if (currentSettings?.id) {
      await db.settings.update(currentSettings.id, {
        className,
        section,
        academicYear,
        semester,
        department,
        classRepName,
        disableSaturday,
        classReminderOffset,
        examReminderOffset,
        minAttendanceTarget,
        summaryTemplate,
        notificationsEnabled: liveNotificationsEnabled,
        autoEmailAttendanceExcel,
        attendanceExcelRecipients,
        geminiApiKey: geminiApiKey.trim(),
        geminiModel,
        aiProvider,
        firebaseSyncEnabled,
        firebaseUserId: firebaseUserId.trim(),
        firebaseClassCode: firebaseClassCode.trim() || formatClassSyncCode(className, section),
        firebaseApiKey: firebaseApiKey.trim(),
        firebaseProjectId: firebaseProjectId.trim(),
        firebaseAuthDomain: firebaseAuthDomain.trim(),
        firebaseCollectionName: firebaseCollectionName.trim()
      });
      showToast('Settings Saved', 'Metadata, Email Dispatch, Cloud Sync & Preferences updated', 'success');
    }
  };

  const handleCopyUserId = () => {
    if (firebaseUserId) {
      navigator.clipboard.writeText(firebaseUserId);
      setCopiedUserId(true);
      triggerHaptic('light');
      showToast('Copied User ID', firebaseUserId, 'info');
      setTimeout(() => setCopiedUserId(false), 2000);
    }
  };

  const handleCopyClassCode = () => {
    const code = firebaseClassCode.trim() || formatClassSyncCode(className, section);
    navigator.clipboard.writeText(code);
    setCopiedClassCode(true);
    triggerHaptic('light');
    showToast('Copied Class Code', code, 'info');
    setTimeout(() => setCopiedClassCode(false), 2000);
  };

  const handleAddRecipient = () => {
    const email = newRecipientInput.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Invalid Email', 'Please enter a valid email address (e.g. faculty@college.edu)', 'error');
      return;
    }
    if (attendanceExcelRecipients.includes(email)) {
      showToast('Duplicate Email', 'This email is already in the recipient list', 'warning');
      return;
    }
    const updated = [...attendanceExcelRecipients, email];
    setAttendanceExcelRecipients(updated);
    setNewRecipientInput('');
    triggerHaptic('light');
    showToast('Recipient Added', email, 'success');
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    triggerHaptic('light');
    setAttendanceExcelRecipients(prev => prev.filter(e => e !== emailToRemove));
    showToast('Recipient Removed', emailToRemove, 'info');
  };

  const handleTestEmailDispatch = async () => {
    if (attendanceExcelRecipients.length === 0) {
      showToast('No Recipients', 'Please add at least one recipient email address first', 'warning');
      return;
    }
    setIsTestingEmail(true);
    triggerHaptic('medium');
    try {
      const sampleData = {
        date: format(new Date(), 'yyyy-MM-dd'),
        periodNumber: 1,
        subjectCode: 'TEST101',
        subjectName: 'Test Subject Audit',
        facultyName: 'Lead Professor',
        className,
        section,
        department,
        records: [
          { registerNo: 'REG001', name: 'Student One', status: 'present' as const, remarks: 'Verified present' },
          { registerNo: 'REG002', name: 'Student Two', status: 'absent' as const, remarks: 'Absent from lecture' },
          { registerNo: 'REG003', name: 'Student Three', status: 'od' as const, remarks: 'College symposium' }
        ]
      };

      const { queued } = enqueueAttendanceEmail(sampleData, {
        ...currentSettings!,
        autoEmailAttendanceExcel: true,
        attendanceExcelRecipients
      });

      if (queued) {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          const res = await flushPendingAttendanceEmails({
            ...currentSettings!,
            autoEmailAttendanceExcel: true,
            attendanceExcelRecipients
          });
          if (res.succeeded > 0) {
            triggerHaptic('success');
            showToast('Test Email Dispatched', `Sample attendance sheet sent to ${attendanceExcelRecipients.length} recipient(s)`, 'success');
          } else {
            showToast('Dispatch Handled', 'Queued in email dispatcher for delivery', 'info');
          }
        } else {
          showToast('Queued for Email', 'Offline: Sample report queued and will send when online', 'info');
        }
      }
    } catch (err: any) {
      showToast('Test Failed', String(err?.message || err), 'error');
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Test Firebase Firestore Connection
  const handleTestFirebase = async () => {
    setIsTestingFirebase(true);
    triggerHaptic('light');
    const config = getActiveFirebaseConfig({
      firebaseApiKey,
      firebaseProjectId,
      firebaseAuthDomain
    });
    const res = await testFirebaseConnection(config);
    setIsTestingFirebase(false);
    if (res.success) {
      triggerHaptic('success');
      showToast('Firebase Connected', res.message, 'success');
    } else {
      triggerHaptic('error');
      showToast('Connection Failed', res.message, 'error');
    }
  };

  // Sync / Backup all data to Single Central Firebase Database
  const handleSyncToFirebase = async () => {
    setIsSyncingFirebase(true);
    triggerHaptic('medium');
    const classCode = firebaseClassCode.trim() || formatClassSyncCode(className, section);
    const customCfg = (firebaseApiKey.trim() && firebaseProjectId.trim())
      ? { apiKey: firebaseApiKey.trim(), projectId: firebaseProjectId.trim(), authDomain: firebaseAuthDomain.trim() }
      : undefined;

    const res = await syncToCentralFirebase(customCfg, firebaseUserId, classCode);
    setIsSyncingFirebase(false);
    if (res.success) {
      triggerHaptic('success');
      setLastFirebaseSyncAt(res.timestamp);
      setFirebaseUserId(res.userId);
      setFirebaseClassCode(res.classCode);
      showToast('Single Database Synced', res.message, 'success');
    } else {
      triggerHaptic('error');
      showToast('Cloud Sync Failed', res.message, 'error');
    }
  };

  // Restore data from Single Central Firebase Database
  const handleRestoreFromFirebase = async () => {
    const targetCode = (restoreCodeInput || firebaseClassCode || formatClassSyncCode(className, section)).trim();
    if (!targetCode) {
      showToast('Code Required', 'Enter a User ID or Class Code to restore', 'warning');
      return;
    }
    setIsRestoringFirebase(true);
    triggerHaptic('medium');
    const customCfg = (firebaseApiKey.trim() && firebaseProjectId.trim())
      ? { apiKey: firebaseApiKey.trim(), projectId: firebaseProjectId.trim(), authDomain: firebaseAuthDomain.trim() }
      : undefined;

    const res = await restoreFromCentralFirebase(targetCode, restoreMode, customCfg);
    setIsRestoringFirebase(false);
    setIsConfirmRestoreFirebaseOpen(false);
    if (res.success) {
      triggerHaptic('success');
      showToast('Cloud Restore Complete', res.message, 'success');
    } else {
      triggerHaptic('error');
      showToast('Cloud Restore Failed', res.message, 'error');
    }
  };

  // Brute-force protection: Rate-limiting & lockout
  const [failedAdminAttempts, setFailedAdminAttempts] = useState<number>(0);
  const [adminLockoutUntil, setAdminLockoutUntil] = useState<number>(0);

  // Verify Admin Code via Cryptographic Hash & Rate Limiting
  const handleVerifyAdminCode = async () => {
    const now = Date.now();
    if (now < adminLockoutUntil) {
      const remainingSecs = Math.ceil((adminLockoutUntil - now) / 1000);
      triggerHaptic('error');
      showToast('Console Locked', `Too many failed attempts. Try again in ${remainingSecs}s`, 'error');
      return;
    }

    const isValid = await verifyAdminAccessCode(adminCodeInput);
    if (isValid) {
      setFailedAdminAttempts(0);
      setAdminLockoutUntil(0);
      setIsAdminUnlocked(true);
      setIsAdminPromptOpen(false);
      setAdminCodeInput('');
      triggerHaptic('success');
      try {
        const token = await createAdminSessionToken(5);
        if (token) {
          const tokenStr = JSON.stringify(token);
          localStorage.setItem('__adm_t', tokenStr);
          sessionStorage.setItem('__adm_t', tokenStr);
        }
      } catch (err) {
        console.warn('Failed to store admin session token', err);
      }
      showToast('Admin Mode Unlocked', 'Master access granted to global cloud database', 'success');
      await handleOpenAdminInspector();
    } else {
      const newFails = failedAdminAttempts + 1;
      setFailedAdminAttempts(newFails);
      triggerHaptic('error');
      if (newFails >= 5) {
        const lockoutDuration = 5 * 60 * 1000; // 5 min lockout
        setAdminLockoutUntil(now + lockoutDuration);
        setFailedAdminAttempts(0);
        showToast('Console Locked', 'Too many failed attempts. Locked for 5 minutes.', 'error');
      } else {
        showToast('Access Denied', `Invalid master access code (${5 - newFails} attempts remaining)`, 'error');
      }
    }
  };

  // Open Admin Inspector & load all cloud records
  const handleOpenAdminInspector = async () => {
    setIsAdminInspectorOpen(true);
    setIsLoadingAdminData(true);
    const [usersRes, classesRes] = await Promise.all([
      fetchAllCloudUsers(),
      fetchAllCloudClasses()
    ]);
    setIsLoadingAdminData(false);
    if (usersRes.success) setCloudUsersList(usersRes.users);
    if (classesRes.success) setCloudClassesList(classesRes.classes);
  };

  // Delete User's Own Cloud Data
  const handleDeleteMyCloudData = async () => {
    setIsDeletingCloud(true);
    triggerHaptic('warning');
    const res = await deleteCloudData(firebaseUserId, firebaseClassCode);
    setIsDeletingCloud(false);
    setIsDeleteMyCloudOpen(false);
    if (res.success) {
      setLastFirebaseSyncAt('');
      triggerHaptic('success');
      showToast('Deleted from Cloud', res.message, 'info');
    } else {
      triggerHaptic('error');
      showToast('Deletion Failed', res.message, 'error');
    }
  };

  // Admin Delete any Doc from Cloud
  const handleAdminDeleteDoc = async (col: 'app_users' | 'app_classes', docId: string) => {
    const res = await adminDeleteCloudDoc(col, docId);
    if (res.success) {
      triggerHaptic('success');
      showToast('Document Deleted', res.message, 'info');
      if (col === 'app_users') {
        setCloudUsersList(prev => prev.filter(u => u.id !== docId));
      } else {
        setCloudClassesList(prev => prev.filter(c => c.id !== docId));
      }
    } else {
      triggerHaptic('error');
      showToast('Delete Failed', res.message, 'error');
    }
  };

  // Admin Load any Doc into app
  const handleAdminLoadDoc = async (idOrCode: string, mode: 'user' | 'class') => {
    setIsRestoringFirebase(true);
    triggerHaptic('medium');
    const res = await restoreFromCentralFirebase(idOrCode, mode);
    setIsRestoringFirebase(false);
    if (res.success) {
      triggerHaptic('success');
      showToast('Data Loaded', res.message, 'success');
      setIsAdminInspectorOpen(false);
    } else {
      triggerHaptic('error');
      showToast('Load Failed', res.message, 'error');
    }
  };

  // Test Google Gemini API Connection
  const handleTestGeminiKey = async () => {
    if (!geminiApiKey.trim()) {
      showToast('API Key Required', 'Please enter a Google Gemini API Key first', 'warning');
      return;
    }
    setIsTestingGemini(true);
    triggerHaptic('light');
    const res = await testGeminiApiKey(geminiApiKey, geminiModel);
    setIsTestingGemini(false);
    if (res.success) {
      triggerHaptic('success');
      showToast('Google Gemini Connected', res.message, 'success');
      setAiProvider('gemini');
      const targetModel = res.effectiveModel || geminiModel;
      if (res.effectiveModel && res.effectiveModel !== geminiModel) {
        setGeminiModel(res.effectiveModel);
      }
      if (currentSettings?.id) {
        await db.settings.update(currentSettings.id, {
          geminiApiKey: geminiApiKey.trim(),
          geminiModel: targetModel,
          aiProvider: 'gemini'
        });
      }
    } else {
      triggerHaptic('error');
      showToast('Connection Failed', res.message, 'error');
    }
  };

  // Specific Save Button for AI Settings
  const handleSaveGeminiSettings = async () => {
    triggerHaptic('medium');
    if (!geminiApiKey.trim()) {
      showToast('API Key Missing', 'Please enter your Google Gemini API key first', 'warning');
      return;
    }
    if (currentSettings?.id) {
      await db.settings.update(currentSettings.id, {
        geminiApiKey: geminiApiKey.trim(),
        geminiModel,
        aiProvider: 'gemini'
      });
      setAiProvider('gemini');
      showToast('AI Settings Saved', `Google Gemini is active with ${geminiModel}`, 'success');
    }
  };

  // Test Native Android Live Activity Notification
  const handleTestLiveNotification = async () => {
    triggerHaptic('medium');
    const sent = await sendSampleLiveNotification(
      subjects[0]?.code || 'CS102',
      subjects[0]?.name || 'Data Structures & Algorithms',
      2,
      'Lab 3',
      facultyList[0]?.name || 'Dr. Alan Turing'
    );
    if (sent) {
      showToast('Live Notification Posted', 'Check your notification shade for the live ticking chronometer and progress bar!', 'success');
    } else {
      showToast('Live Notification Simulated', 'On Android devices, this appears as an ongoing notification with live countdown chronometer.', 'info');
    }
  };

  const handleOpenOriginIslandSettings = async () => {
    triggerHaptic('light');
    const opened = await openVivoOriginIslandSettings();
    if (opened) {
      showToast('Opening Settings', 'Make sure notifications are enabled for Class Manager.', 'info');
    } else {
      showToast('Notification Settings', 'Navigate to Settings > Apps > Class Manager > Notifications.', 'info');
    }
  };

  const handleOpenBatterySettings = async () => {
    triggerHaptic('light');
    const opened = await openAppBatterySettings();
    if (opened) {
      showToast('Battery Settings', 'Select "Unrestricted" or "Allow high background power consumption" to prevent frozen notifications.', 'info');
    } else {
      showToast('Battery Settings', 'In Settings > Battery, allow high background power consumption for Class Manager.', 'info');
    }
  };

  // Sample Live Preview for Summary Template
  const samplePreview = React.useMemo(() => {
    return formatAttendanceSummary({
      template: summaryTemplate,
      dateStr: '2026-09-01',
      periodNumber: 1,
      subjectCode: 'MEC207',
      subjectName: 'Strength of Materials',
      facultyName: 'Dr. S. Saravanasankar',
      absentStudents: SAMPLE_STUDENTS,
      presentCount: 52,
      totalCount: 60,
      className: className || 'Class 5101',
      section: section || 'Section A'
    });
  }, [summaryTemplate, className, section]);

  const insertPlaceholderTag = (tag: string) => {
    triggerHaptic('light');
    setSummaryTemplate(prev => prev + tag);
  };

  const handleResetTemplate = () => {
    triggerHaptic('medium');
    setSummaryTemplate(DEFAULT_SUMMARY_TEMPLATE);
    showToast('Reset Format Template', 'Restored default summary copy layout', 'info');
  };

  const handleAddHolidayDate = async () => {
    if (!selectedHolidayDate) return;
    const exists = holidays.some(h => h.date === selectedHolidayDate);
    if (exists) {
      showToast('Holiday Exists', 'Date is already added', 'warning');
      return;
    }

    const updated = [
      ...holidays,
      {
        id: Math.random().toString(36).substring(2, 9),
        date: selectedHolidayDate,
        title: holidayTitleInput.trim() || 'Official Holiday',
        type: 'institutional' as const
      }
    ];

    if (currentSettings?.id) {
      await db.settings.update(currentSettings.id, { holidays: updated });
      setHolidayTitleInput('');
      showToast('Holiday Added', `Added ${selectedHolidayDate}`, 'success');
    }
  };

  const handleRemoveHoliday = async (id: string) => {
    const updated = holidays.filter(h => h.id !== id);
    if (currentSettings?.id) {
      await db.settings.update(currentSettings.id, { holidays: updated });
      showToast('Holiday Removed', undefined, 'info');
    }
  };

  const handleSaveStudent = async () => {
    if (!newRegNo.trim() || !newStudentName.trim()) {
      showToast('Validation Error', 'Register No and Name are required', 'error');
      return;
    }

    await db.students.add({
      registerNo: newRegNo.trim(),
      name: newStudentName.trim(),
      batchSection: section || 'Section A'
    });

    showToast('Student Added', undefined, 'success');
    setNewRegNo('');
    setNewStudentName('');
    setIsAddStudentOpen(false);
  };

  const handleDeleteStudent = async (id: number) => {
    await db.students.delete(id);
    showToast('Student Removed', undefined, 'info');
  };

  const handleSaveFaculty = async () => {
    if (!newFacultyName.trim()) {
      showToast('Validation Error', 'Faculty Name is required', 'error');
      return;
    }

    await db.faculty.add({
      name: newFacultyName.trim(),
      department: 'Dept: Mechanical Engineering'
    });

    showToast('Faculty Member Added', undefined, 'success');
    setNewFacultyName('');
    setIsAddFacultyOpen(false);
  };

  const handleDeleteFaculty = async (id: number) => {
    await db.faculty.delete(id);
    showToast('Faculty Member Removed', undefined, 'info');
  };

  const handleImportRoster = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const nameLower = file.name.toLowerCase();
    if (nameLower.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async results => {
          await processImport(results.data);
        }
      });
    } else if (nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = async evt => {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheet = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
        await processImport(rows);
      };
      reader.readAsBinaryString(file);
    }
    e.target.value = '';
  };

  const processImport = async (rows: any[]) => {
    let count = 0;
    const newItems: Student[] = [];

    rows.forEach(row => {
      const reg = row.registerNo || row['Register No'] || row['RegisterNo'] || row['RegNo'];
      const stName = row.name || row['Name'] || row['Student Name'];
      if (reg && stName) {
        newItems.push({
          registerNo: String(reg).trim(),
          name: String(stName).trim(),
          batchSection: section || 'Section A'
        });
        count++;
      }
    });

    if (newItems.length > 0) {
      await db.students.bulkAdd(newItems);
      showToast('Import Successful', `Added ${count} students to roster`, 'success');
    }
  };

  const handleExportBackup = async () => {
    const allStudents = await db.students.toArray();
    const allSubjects = await db.subjects.toArray();
    const allFaculty = await db.faculty.toArray();
    const allPeriodConfigs = await db.periodConfigs.toArray();
    const allSchedules = await db.schedules.toArray();
    const allAttendanceSessions = await db.attendanceSessions.toArray();
    const allSettings = await db.settings.toArray();

    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      students: allStudents,
      subjects: allSubjects,
      faculty: allFaculty,
      periodConfigs: allPeriodConfigs,
      schedules: allSchedules,
      attendanceSessions: allAttendanceSessions,
      settings: allSettings
    };

    const jsonStr = JSON.stringify(data, null, 2);
    try {
      await exportJsonFile(jsonStr, `anexus_class_backup_${new Date().toISOString().split('T')[0]}.json`);
      showToast('Backup Exported', 'Saved and shared class backup file', 'success');
    } catch (err) {
      showToast('Backup Export Failed', String(err), 'error');
    }
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async event => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        await db.transaction('rw', [
          db.students,
          db.subjects,
          db.faculty,
          db.periodConfigs,
          db.schedules,
          db.attendanceSessions,
          db.settings
        ], async () => {
          await db.students.clear();
          await db.subjects.clear();
          await db.faculty.clear();
          await db.periodConfigs.clear();
          await db.schedules.clear();
          await db.attendanceSessions.clear();
          await db.settings.clear();

          if (data.students?.length) await db.students.bulkAdd(data.students);
          if (data.subjects?.length) await db.subjects.bulkAdd(data.subjects);
          if (data.faculty?.length) await db.faculty.bulkAdd(data.faculty);
          if (data.periodConfigs?.length) await db.periodConfigs.bulkAdd(data.periodConfigs);
          if (data.schedules?.length) await db.schedules.bulkAdd(data.schedules);
          if (data.attendanceSessions?.length) await db.attendanceSessions.bulkAdd(data.attendanceSessions);
          if (data.settings?.length) await db.settings.bulkAdd(data.settings);
        });

        showToast('Restore Complete', 'Database restored successfully!', 'success');
      } catch (err) {
        showToast('Restore Failed', 'Invalid backup file format', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-36 space-y-6 animate-fade-in-up">
      {/* Top Banner Card with Global Save Button */}
      <div className="bg-neutral-900 dark:bg-[#171717] text-white border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          onClick={handleSecretAdminTap}
          className="flex items-center gap-4 cursor-pointer select-none group"
          title=""
        >
          <div className="w-12 h-12 rounded-2xl bg-neutral-800 dark:bg-[#262626] flex items-center justify-center shrink-0 active:scale-90 transition-transform">
            <SettingsIcon className="w-6 h-6 text-white group-active:rotate-45 transition-transform" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Settings &amp; Database Management
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1 leading-relaxed font-medium">
              Manage student roster, timetable, Google Gemini AI, and live notifications.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-neutral-900 dark:bg-white dark:text-neutral-900 font-extrabold text-xs shadow-lg hover:bg-neutral-100 hover:scale-105 active:scale-95 transition-all shrink-0"
        >
          <Save className="w-4 h-4 text-neutral-900" />
          <span>Save All Settings</span>
        </button>
      </div>

      {/* Profile & Personal Info Quick Card */}
      <div className="pt-2 pb-0.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Profile &amp; Class Identity
          </span>
          <Separator className="flex-1" />
        </div>
      </div>
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 flex items-center justify-center shrink-0 shadow-md">
            {currentSettings?.profilePhoto ? (
              <img src={currentSettings.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-neutral-900 dark:text-white">
                {currentSettings?.classRepName || 'Class Representative'}
              </h3>
              {currentSettings?.rollNumber && (
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 dark:bg-[#262626] text-neutral-700 dark:text-neutral-300 font-mono text-[10px] font-bold">
                  {currentSettings.rollNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
              {currentSettings?.department || 'General'} • {currentSettings?.className || 'Class'} ({currentSettings?.section || 'Section A'})
            </p>
          </div>
        </div>

        {onNavigateToProfile && (
          <button
            onClick={onNavigateToProfile}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Manage Profile &amp; Photo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* STUDENT ROSTER DATABASE Card */}
      <div className="pt-3 pb-0.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Roster &amp; Timetable Setup
          </span>
          <Separator className="flex-1" />
        </div>
      </div>
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-500 dark:text-neutral-400" /> STUDENT ROSTER DATABASE ({students.length})
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
              Add students, bulk select & delete, or import class roster from CSV / Excel file.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-bold text-xs hover:bg-neutral-200 dark:hover:bg-[#333333] cursor-pointer transition-colors">
              <FileSpreadsheet className="w-4 h-4" /> Import CSV / Excel
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleImportRoster} className="hidden" />
            </label>
            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Add Student
            </button>
          </div>
        </div>

        <InputGroup>
          <InputGroupAddon align="inline-start">
            <Search className="w-4 h-4 text-neutral-400" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search student by Register No or Name..."
            value={rosterSearch}
            onChange={e => setRosterSearch(e.target.value)}
          />
        </InputGroup>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filteredStudents.map(student => (
            <div
              key={student.id}
              className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <input type="checkbox" className="rounded text-neutral-900 dark:text-white focus:ring-neutral-900" />
                <span className="px-2.5 py-1 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 font-mono text-xs font-bold">
                  {student.registerNo}
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold text-neutral-900 dark:text-white">
                  {student.name}
                </h4>
              </div>

              <button
                onClick={() => handleDeleteStudent(student.id!)}
                className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FACULTY MEMBERS Card */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
            FACULTY MEMBERS ({facultyList.length})
          </h3>
          <button
            onClick={() => setIsAddFacultyOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Faculty
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {facultyList.map(f => (
            <div
              key={f.id}
              className="p-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] flex items-center justify-between gap-3"
            >
              <div>
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  {f.name}
                </h4>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                  {f.department}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDeleteFaculty(f.id!)}
                  className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ATTENDANCE SUMMARY COPY FORMAT TEMPLATE Card */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4 card-interactive">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-neutral-500 dark:text-neutral-400" /> ATTENDANCE SUMMARY COPY FORMAT
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
              Customize the exact text format generated when copying attendance summary to clipboard.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetTemplate}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-[#262626] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Default
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save Format
            </button>
          </div>
        </div>

        {/* Textarea Template Editor */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            TEMPLATE EDITOR (TAGS: &#123;DATE&#125;, &#123;PERIOD&#125;, &#123;ABSENTEES&#125;)
          </label>
          <textarea
            rows={5}
            value={summaryTemplate}
            onChange={e => setSummaryTemplate(e.target.value)}
            className="w-full p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] font-mono text-xs text-neutral-900 dark:text-white font-semibold leading-relaxed focus:outline-none"
            placeholder="Attendance {DATE}&#10;{PERIOD}&#10;&#10;ABSENTEES:&#10;{ABSENTEES}"
          />
        </div>

        {/* Quick Insert Placeholder Tag Pills */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase text-neutral-400 block">
            CLICK TO INSERT TEMPLATE VARIABLES:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {[
              { tag: '{DATE}', label: '{DATE} (01-09-2026)' },
              { tag: '{PERIOD}', label: '{PERIOD} (First period)' },
              { tag: '{PERIOD_NUM}', label: '{PERIOD_NUM} (1)' },
              { tag: '{ABSENTEES}', label: '{ABSENTEES} (Roll  Name)' },
              { tag: '{SUBJECT}', label: '{SUBJECT} (MEC207)' },
              { tag: '{SUBJECT_NAME}', label: '{SUBJECT_NAME}' },
              { tag: '{FACULTY}', label: '{FACULTY}' },
              { tag: '{CLASS_NAME}', label: '{CLASS_NAME}' },
              { tag: '{SECTION}', label: '{SECTION}' },
              { tag: '{PRESENT_COUNT}', label: '{PRESENT_COUNT}' },
              { tag: '{ABSENT_COUNT}', label: '{ABSENT_COUNT}' }
            ].map(p => (
              <button
                key={p.tag}
                type="button"
                onClick={() => insertPlaceholderTag(p.tag)}
                className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-[#262626] hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 font-mono text-[11px] font-bold border border-neutral-200/60 dark:border-neutral-700 transition-colors"
              >
                + {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Real-Time Output Preview */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> LIVE OUTPUT PREVIEW (WHAT GETS COPIED):
          </span>
          <div className="p-4 rounded-2xl bg-[#0A0A0A] text-[#FAFAFA] border border-neutral-800 font-mono text-xs text-left leading-relaxed shadow-inner overflow-x-auto whitespace-pre-wrap select-all">
            {samplePreview}
          </div>
        </div>
      </div>

      {/* APPEARANCE & THEME CARD */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
              APPEARANCE & THEME
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
              Choose your theme mode with smooth circular page transitions.
            </p>
          </div>
          <button
            onClick={(e) => {
              triggerHaptic('medium');
              toggleTheme(e);
            }}
            className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-[#333333] transition-all active:scale-95 shadow-sm"
            title="Toggle Theme"
          >
            {isDark ? <Moon className="w-4 h-4 text-neutral-100" /> : <Sun className="w-4 h-4 text-amber-500" />}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {[
            { id: 'light' as const, label: 'Light', icon: Sun, desc: 'Clean paper aesthetic' },
            { id: 'dark' as const, label: 'Dark', icon: Moon, desc: 'OLED pure dark' },
            { id: 'system' as const, label: 'System', icon: Monitor, desc: 'Follow OS settings' },
          ].map((mode) => {
            const Icon = mode.icon;
            const isSelected = theme === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={(e) => {
                  triggerHaptic('medium');
                  if (mode.id === 'system') {
                    setTheme('system');
                  } else {
                    const shouldChange = (mode.id === 'dark') !== isDark;
                    if (shouldChange) {
                      toggleTheme(e);
                    } else {
                      setTheme(mode.id);
                    }
                  }
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between gap-2 ${
                  isSelected
                    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100 shadow-md ring-2 ring-neutral-900/20 dark:ring-white/20'
                    : 'bg-neutral-50 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-[#333333]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className="w-4 h-4 shrink-0" />
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </div>
                <div>
                  <span className="text-xs font-bold block">{mode.label}</span>
                  <span className={`text-[10px] leading-tight block mt-0.5 ${isSelected ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-400 dark:text-neutral-500'}`}>
                    {mode.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CLASS & DEPARTMENT METADATA Card */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
          CLASS & DEPARTMENT METADATA
        </h3>

        <FieldGroup className="text-xs font-semibold">
          <Field>
            <FieldLabel htmlFor="settings-classname">Class Name</FieldLabel>
            <Input
              id="settings-classname"
              type="text"
              value={className}
              onChange={e => setClassName(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-section">Batch / Section</FieldLabel>
            <Input
              id="settings-section"
              type="text"
              value={section}
              onChange={e => setSection(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-academicyear">Academic Year</FieldLabel>
            <Input
              id="settings-academicyear"
              type="text"
              value={academicYear}
              onChange={e => setAcademicYear(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-semester">Semester</FieldLabel>
            <Input
              id="settings-semester"
              type="text"
              value={semester}
              onChange={e => setSemester(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-dept">Department</FieldLabel>
            <Input
              id="settings-dept"
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-crname">Class Representative Name</FieldLabel>
            <Input
              id="settings-crname"
              type="text"
              value={classRepName}
              onChange={e => setClassRepName(e.target.value)}
            />
          </Field>

          <FieldSeparator />

          <div>
            <Field orientation="horizontal" className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200/80 dark:border-neutral-700">
              <FieldContent>
                <FieldLabel htmlFor="switch-disable-saturday">
                  Disable Saturday Classes
                </FieldLabel>
                <FieldDescription>
                  Exclude Saturday from weekly schedules, period rotations, and automated reminders.
                </FieldDescription>
              </FieldContent>
              <Switch
                id="switch-disable-saturday"
                checked={disableSaturday}
                onCheckedChange={checked => setDisableSaturday(checked)}
              />
            </Field>
          </div>

          <FieldSeparator />

          {/* Class Attendance Target Goal Slider */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200/80 dark:border-neutral-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <FieldLabel>Class Attendance Target Requirement</FieldLabel>
                <FieldDescription>
                  Official minimum percentage threshold required for semester exam eligibility.
                </FieldDescription>
              </div>
              <span className="font-mono text-sm px-2.5 py-1 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold shrink-0 shadow-sm">
                {minAttendanceTarget}%
              </span>
            </div>
            <Slider
              min={50}
              max={95}
              step={1}
              value={minAttendanceTarget}
              onValueChange={setMinAttendanceTarget}
            />
            <div className="flex justify-between text-[10px] font-semibold text-neutral-400">
              <span>50%</span>
              <span>75% (Standard)</span>
              <span>95%</span>
            </div>
          </div>

          {/* Class Notification Lead Time Slider */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200/80 dark:border-neutral-700 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <FieldLabel>Upcoming Class Notification Lead Time</FieldLabel>
                <FieldDescription>
                  Advance reminder alert sent before upcoming class timetable periods start.
                </FieldDescription>
              </div>
              <span className="font-mono text-sm px-2.5 py-1 rounded-xl bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-bold shrink-0 shadow-sm">
                {classReminderOffset} min
              </span>
            </div>
            <Slider
              min={5}
              max={60}
              step={5}
              value={classReminderOffset}
              onValueChange={setClassReminderOffset}
            />
            <div className="flex justify-between text-[10px] font-semibold text-neutral-400">
              <span>5 min</span>
              <span>15 min</span>
              <span>30 min</span>
              <span>60 min</span>
            </div>
          </div>

          <FieldSeparator />

          {/* Holiday Calendar Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FieldLabel>Holiday Calendar & Scheduled Breaks</FieldLabel>
              <span className="text-[11px] font-bold text-neutral-400">
                {holidays.length} Date{holidays.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Dates added here automatically pause timetable periods, hero active tracker, and daily class notifications.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <DatePicker
                  value={selectedHolidayDate}
                  onChange={dateStr => setSelectedHolidayDate(dateStr)}
                  placeholder="Select holiday date..."
                />
              </div>
              <div className="sm:col-span-1">
                <input
                  type="text"
                  placeholder="Holiday Name (e.g. Festival)"
                  value={holidayTitleInput}
                  onChange={e => setHolidayTitleInput(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-xs font-semibold text-neutral-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--accent-tertiary)]"
                />
              </div>
              <Button
                type="button"
                onClick={handleAddHolidayDate}
                className="shrink-0 h-10 text-xs"
              >
                Add Holiday Date
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {holidays.length === 0 ? (
                <span className="text-xs text-neutral-400 italic">No holidays added yet. Add dates above to pause classes on breaks.</span>
              ) : (
                holidays.map(h => (
                  <span
                    key={h.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-mono text-xs font-bold border border-amber-300/40 dark:border-amber-800/40 shadow-sm"
                  >
                    <Umbrella className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{h.title ? `${h.title}: ` : ''}{h.date}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveHoliday(h.id)}
                      title="Remove holiday"
                      className="hover:text-red-600 dark:hover:text-red-400 transition-colors ml-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <FieldSeparator />

          <Button
            type="button"
            onClick={handleSaveSettings}
            className="w-full py-3.5 text-sm gap-2"
          >
            <Save className="w-4 h-4" /> Save Settings & Preferences
          </Button>
        </FieldGroup>
      </div>

      {/* ANDROID LIVE CLASS NOTIFICATIONS */}
      <div className="pt-3 pb-0.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Android Live Notifications
          </span>
          <Separator className="flex-1" />
        </div>
      </div>
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-neutral-500 dark:text-neutral-400" /> ANDROID LIVE CLASS NOTIFICATIONS
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
              Real-time class countdown chronometer, live progress bar, and ongoing attendance tracking.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestLiveNotification}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Live Notification</span>
          </button>
        </div>

        {/* Live Notification Progress Bar */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                Live Class Countdown &amp; Progress Bar
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Ongoing system notification with live chronometer countdown and direct &quot;Take Attendance&quot; quick action.
            </p>
          </div>

          <Switch
            id="switch-live-notifications"
            checked={liveNotificationsEnabled}
            onCheckedChange={checked => {
              setLiveNotificationsEnabled(checked);
              if (currentSettings?.id) {
                db.settings.update(currentSettings.id, { notificationsEnabled: checked });
              }
            }}
          />
        </div>

        {/* Notification & System Permissions */}
        <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <span className="text-xs font-bold text-neutral-900 dark:text-white">
                Notification &amp; System Permissions
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              Configure app notification channels and adjust battery optimization to allow smooth background countdown.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenOriginIslandSettings}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-[#333333] dark:hover:bg-[#404040] text-neutral-800 dark:text-neutral-200 font-bold text-xs border border-neutral-200 dark:border-neutral-700 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Notification Settings</span>
            </button>
            <button
              type="button"
              onClick={handleOpenBatterySettings}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-[#333333] dark:hover:bg-[#404040] text-neutral-800 dark:text-neutral-200 font-bold text-xs border border-neutral-200 dark:border-neutral-700 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span>Battery Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* AUTOMATED ATTENDANCE EXCEL EMAILING */}
      <div className="pt-3 pb-0.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Attendance Email Automation
          </span>
          <Separator className="flex-1" />
        </div>
      </div>
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-[#262626] flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-5 h-5 text-neutral-900 dark:text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Automated Attendance Excel Emailing
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 bg-[var(--accent-tertiary-subtle)] border border-[var(--accent-tertiary)] text-[var(--accent-tertiary)]">
                  Instant Dispatch
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Sends the structured, color-indicated Excel (.xlsx) file directly to designated email addresses as soon as attendance is taken. If offline, the report is securely queued and dispatched automatically the moment internet connectivity is restored.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <label htmlFor="switch-auto-email" className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hidden sm:inline">
              {autoEmailAttendanceExcel ? 'Enabled' : 'Disabled'}
            </label>
            <Switch
              id="switch-auto-email"
              checked={autoEmailAttendanceExcel}
              onCheckedChange={checked => {
                triggerHaptic('light');
                setAutoEmailAttendanceExcel(checked);
              }}
            />
          </div>
        </div>

        {autoEmailAttendanceExcel && (
          <div className="space-y-4 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 animate-fade-in-down">
            <div>
              <FieldLabel htmlFor="new-recipient-email" className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                Designated Recipient Email Addresses ({attendanceExcelRecipients.length})
              </FieldLabel>

              {/* Recipient Chips List */}
              <div className="flex flex-wrap gap-2 mb-3">
                {attendanceExcelRecipients.length === 0 ? (
                  <div className="text-xs text-neutral-400 italic py-2">
                    No recipients added yet. Add email addresses below (e.g. faculty, HOD, coordinator).
                  </div>
                ) : (
                  attendanceExcelRecipients.map((recEmail) => (
                    <span
                      key={recEmail}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 shadow-sm"
                    >
                      <span>{recEmail}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecipient(recEmail)}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-neutral-400 hover:text-red-500 hover:bg-neutral-200 dark:hover:bg-[#333333] transition-colors"
                        title={`Remove ${recEmail}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add Recipient Row */}
              <div className="flex items-center gap-2">
                <Input
                  id="new-recipient-email"
                  type="email"
                  placeholder="Enter recipient email (e.g. professor@college.edu)"
                  value={newRecipientInput}
                  onChange={e => setNewRecipientInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddRecipient();
                    }
                  }}
                  className="flex-1 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddRecipient}
                  className="gap-1.5 text-xs font-bold shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Recipient</span>
                </Button>
              </div>
            </div>

            {/* Test Email Button & Save notice */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
              <p className="text-[11px] text-neutral-400 font-medium">
                Remember to tap <strong>Save Settings</strong> below to persist your recipient preferences.
              </p>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestEmailDispatch}
                disabled={isTestingEmail || attendanceExcelRecipients.length === 0}
                className="gap-1.5 text-xs font-bold shrink-0 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700"
              >
                <Send className={`w-3.5 h-3.5 ${isTestingEmail ? 'animate-pulse' : ''}`} />
                <span>{isTestingEmail ? 'Sending Test...' : 'Test Email Dispatch'}</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* EXPORT & RESTORE BACKUP Card */}
      <div className="pt-3 pb-0.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Data Backup &amp; App Guide
          </span>
          <Separator className="flex-1" />
        </div>
      </div>
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Download className="w-4 h-4 text-neutral-900 dark:text-white" /> EXPORT & RESTORE BACKUP
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleExportBackup}
            className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-left hover:border-neutral-400 dark:hover:border-neutral-500 transition-all space-y-2"
          >
            <Download className="w-5 h-5 text-neutral-900 dark:text-white" />
            <h4 className="text-sm font-extrabold text-neutral-900 dark:text-white">
              Export Class Backup File
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Downloads students, subjects, faculty, timetable schedules, and timings into one file.
            </p>
          </button>

          <label className="p-5 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-left hover:border-neutral-400 dark:hover:border-neutral-500 transition-all space-y-2 cursor-pointer block">
            <Upload className="w-5 h-5 text-neutral-900 dark:text-white" />
            <h4 className="text-sm font-extrabold text-neutral-900 dark:text-white">
              Restore Backup File
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Upload a saved backup file to restore entire class roster and timetable structure.
            </p>
            <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
          </label>
        </div>
      </div>

      {/* UNIFIED FIREBASE CLOUD DATABASE (SINGLE DATABASE ARCHITECTURE) */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-[#262626] flex items-center justify-center shrink-0 mt-0.5">
              <Database className="w-5 h-5 text-neutral-900 dark:text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Unified Cloud Database
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300">
                  Single Firebase
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                All users connect to one shared Firebase database. Your data is isolated and synced via your unique User ID &amp; Class Code.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-0.5">
            <label htmlFor="switch-firebase-sync" className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hidden sm:inline">
              {firebaseSyncEnabled ? 'Enabled' : 'Disabled'}
            </label>
            <Switch
              id="switch-firebase-sync"
              checked={firebaseSyncEnabled}
              onCheckedChange={checked => {
                triggerHaptic('light');
                setFirebaseSyncEnabled(checked);
                if (currentSettings?.id) {
                  db.settings.update(currentSettings.id, { firebaseSyncEnabled: checked });
                }
              }}
            />
          </div>
        </div>

        {/* Status Bar: Nightly Sync & Connection Indicator */}
        <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/60 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-bold text-neutral-800 dark:text-neutral-200">Database Active</span>
            <span className="text-neutral-300 dark:text-neutral-600">•</span>
            <span className="text-neutral-500 dark:text-neutral-400 text-[11px]">
              Auto-syncs nightly (21:00 – 05:00)
            </span>
          </div>
          {lastFirebaseSyncAt ? (
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Synced {format(parseISO(lastFirebaseSyncAt), 'dd MMM, HH:mm')}
            </span>
          ) : (
            <span className="text-[11px] text-neutral-400 shrink-0">Ready to sync</span>
          )}
        </div>

        {firebaseSyncEnabled && (
          <div className="space-y-4 pt-1 animate-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Class Sync Code Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Classroom Sync Code
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyClassCode}
                    className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                  >
                    {copiedClassCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedClassCode ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <Input
                  value={firebaseClassCode || formatClassSyncCode(className, section)}
                  onChange={e => setFirebaseClassCode(e.target.value)}
                  placeholder="CLASS-5101-SEC-A"
                  className="font-mono text-xs bg-white dark:bg-[#1f1f1f]"
                />
                <p className="text-[10px] text-neutral-400">
                  Share this code with co-CRs and students to sync the same timetable.
                </p>
              </div>

              {/* User ID Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Your Personal User Sync ID
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyUserId}
                    className="text-[11px] font-bold text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 transition-colors"
                  >
                    {copiedUserId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    {copiedUserId ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <Input
                  value={firebaseUserId}
                  onChange={e => setFirebaseUserId(e.target.value)}
                  placeholder="USR-XXXXX"
                  className="font-mono text-xs bg-white dark:bg-[#1f1f1f]"
                />
                <p className="text-[10px] text-neutral-400">
                  Unique private identifier for your device's cloud backup.
                </p>
              </div>
            </div>

            {/* Primary Action Buttons (Sleek 2-column layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Button
                type="button"
                onClick={handleSyncToFirebase}
                disabled={isSyncingFirebase || isRestoringFirebase}
                className="h-11 font-bold text-xs sm:text-sm bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
              >
                {isSyncingFirebase ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                {isSyncingFirebase ? 'Syncing to Cloud...' : 'Sync to Cloud'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsConfirmRestoreFirebaseOpen(true)}
                disabled={isRestoringFirebase || isSyncingFirebase}
                className="h-11 font-bold text-xs sm:text-sm rounded-2xl border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
              >
                {isRestoringFirebase ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                {isRestoringFirebase ? 'Restoring...' : 'Restore from Cloud'}
              </Button>
            </div>

            {/* Secondary Utilities Toolbar (Muted & Unobtrusive) */}
            <div className="flex items-center justify-between px-1 pt-1 text-xs">
              <button
                type="button"
                onClick={handleTestFirebase}
                disabled={isTestingFirebase}
                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition-colors text-[11px] font-medium"
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${isTestingFirebase ? 'animate-spin text-blue-500' : 'text-emerald-500'}`} />
                {isTestingFirebase ? 'Pinging Server...' : 'Test Connection Ping'}
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteMyCloudOpen(true)}
                  disabled={isDeletingCloud}
                  className="text-neutral-400 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1.5 transition-colors text-[11px] font-medium"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete My Cloud Data
                </button>
              </div>
            </div>

            {/* Master Admin Banner (ONLY visible if unlocked by SHA-256 PIN) */}
            {isAdminUnlocked && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 animate-fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Master Admin Active</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenAdminInspector}
                    className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                  >
                    Open Inspector
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminUnlocked(false);
                      showToast('Admin Locked', 'Exited master admin mode', 'info');
                    }}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline px-1"
                  >
                    Lock
                  </button>
                </div>
              </div>
            )}

            {/* Advanced Custom Firebase Credentials Toggle */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setShowAdvancedFirebase(prev => !prev)}
                className="text-[11px] font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors flex items-center gap-1"
              >
                <span>{showAdvancedFirebase ? '▾ Hide' : '▸ Show'} Advanced Custom Firebase Config</span>
                <span className="text-[10px] text-neutral-400 font-normal">(Optional Override)</span>
              </button>

              {showAdvancedFirebase && (
                <div className="mt-3 p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-3 animate-fade-in">
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    By default, the app uses the hardcoded central single database. Enter custom credentials below only if you want to override and use an alternative Firebase project.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                        Override Project ID
                      </label>
                      <Input
                        placeholder={CENTRAL_FIREBASE_CONFIG.projectId}
                        value={firebaseProjectId}
                        onChange={e => setFirebaseProjectId(e.target.value)}
                        className="font-mono text-xs bg-white dark:bg-[#1f1f1f]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                        Override Web API Key
                      </label>
                      <div className="relative">
                        <Input
                          type={showFirebaseKey ? 'text' : 'password'}
                          placeholder="AIzaSy..."
                          value={firebaseApiKey}
                          onChange={e => setFirebaseApiKey(e.target.value)}
                          className="font-mono text-xs pr-10 bg-white dark:bg-[#1f1f1f]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFirebaseKey(prev => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                          {showFirebaseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* APP WALKTHROUGH & ONBOARDING CARD */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" /> APP GUIDE & ONBOARDING
        </h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
          <div>
            <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
              App Walkthrough
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Review features, period detection tips, automated reminders, and reports workflow.
            </p>
          </div>
          <Button
            type="button"
            onClick={onOpenWalkthrough}
            className="shrink-0 w-full sm:w-auto"
          >
            Launch Walkthrough Tour
          </Button>
        </div>
      </div>

      {/* GOOGLE GEMINI ASSISTANT */}
      <div className="pt-3 pb-0.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Assistant &amp; Vibration Controls
          </span>
          <Separator className="flex-1" />
        </div>
      </div>
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-[#262626] text-neutral-900 dark:text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
                GOOGLE GEMINI ASSISTANT
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
                Connect Google Gemini for answers when online. Works offline when disconnected.
              </p>
            </div>
          </div>

          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-[#262626] dark:hover:bg-[#333333] text-neutral-800 dark:text-neutral-200 font-bold text-xs border border-neutral-200 dark:border-neutral-700 transition-colors shrink-0"
          >
            <span>Get Free API Key</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Engine Toggle Item */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
          <div className="space-y-0.5 pr-3">
            <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-neutral-500" />
              <span>Enable Google Gemini</span>
            </div>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              When turned on, the chat assistant uses Google Gemini generative models for answering questions.
            </p>
          </div>
          <Switch
            checked={aiProvider === 'gemini' && !!geminiApiKey.trim()}
            onCheckedChange={async (checked) => {
              const newProvider = checked ? 'gemini' : 'local';
              setAiProvider(newProvider);
              if (checked && !geminiApiKey.trim()) {
                showToast('API Key Required', 'Please enter your Google Gemini API key below', 'warning');
              } else if (currentSettings?.id) {
                await db.settings.update(currentSettings.id, {
                  aiProvider: newProvider,
                  geminiApiKey: geminiApiKey.trim(),
                  geminiModel
                });
                showToast(checked ? 'Google Gemini Enabled' : 'Offline Mode Active', undefined, 'info');
              }
            }}
          />
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 flex items-center justify-between">
            <span>Gemini API Key</span>
            {geminiApiKey && (
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Key Configured
              </span>
            )}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={e => setGeminiApiKey(e.target.value)}
                className="pr-10 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="button"
              disabled={isTestingGemini || !geminiApiKey.trim()}
              onClick={handleTestGeminiKey}
              className="px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-sm disabled:opacity-50 transition-colors shrink-0"
            >
              {isTestingGemini ? 'Testing...' : 'Test Key'}
            </button>
          </div>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            Stored locally on your phone. Never shared with any third party.
          </p>
        </div>

        {/* Gemini Model Selector */}
        <div className="space-y-2 pt-2 border-t border-neutral-200/60 dark:border-neutral-800">
          <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 block">
            Selected Gemini Model
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {GEMINI_MODELS.map(m => {
              const isSelected = geminiModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={async () => {
                    triggerHaptic('light');
                    setGeminiModel(m.id);
                    if (currentSettings?.id) {
                      await db.settings.update(currentSettings.id, { geminiModel: m.id });
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-900 dark:border-neutral-100 shadow-sm'
                      : 'bg-neutral-50 dark:bg-[#262626] text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-700 hover:border-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs">{m.name}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-white dark:text-neutral-900" />
                    )}
                  </div>
                  <div className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-400'}`}>
                    {m.id}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Save Gemini Settings Dedicated Button */}
        <div className="pt-3 border-t border-neutral-200/60 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Save your Gemini API key and preferred model to enable instant online responses.
          </p>
          <button
            type="button"
            onClick={handleSaveGeminiSettings}
            className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-extrabold text-xs shadow-md transition-all active:scale-95 shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Save AI Settings</span>
          </button>
        </div>
      </div>

      {/* HAPTICS & VIBRATION */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-[#262626] flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-[var(--accent-tertiary)]" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
                HAPTICS & VIBRATION
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Get crisp vibration feedback when tapping buttons and adjusting sliders.
              </p>
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
            <div className="space-y-0.5 pr-3">
              <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-white">
                <Smartphone className="w-3.5 h-3.5 text-neutral-500" />
                <span>Touch Vibration</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Vibrate on buttons, switches, and sliders.
              </p>
            </div>
            <Switch
              checked={hapticsEnabled}
              onCheckedChange={handleToggleHaptics}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
            <div className="space-y-0.5 pr-3">
              <div className="flex items-center gap-2 font-bold text-xs text-neutral-900 dark:text-white">
                <Volume2 className="w-3.5 h-3.5 text-neutral-500" />
                <span>Click Sounds</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Play subtle click sounds on tap.
              </p>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={handleToggleSound}
            />
          </div>
        </div>

        {/* Test Vibration Playground */}
        <div className="p-4 rounded-2xl bg-neutral-50/80 dark:bg-[#202020] border border-neutral-200 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[var(--accent-tertiary)]" />
              <span>Test Vibration</span>
            </h4>
            <span className="text-[10px] text-neutral-400 font-medium">Tap to test feel</span>
          </div>

          {/* Test Buttons Palette */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => triggerHaptic('tick')}
              className="flex items-center justify-center gap-1.5 text-[11px]"
            >
              Tick Detent
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => triggerHaptic('light')}
              className="flex items-center justify-center gap-1.5 text-[11px]"
            >
              Light Tap
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => triggerHaptic('medium')}
              className="flex items-center justify-center gap-1.5 text-[11px]"
            >
              Medium Snap
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => triggerHaptic('heavy')}
              className="flex items-center justify-center gap-1.5 text-[11px]"
            >
              Heavy Thunk
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => triggerHaptic('success')}
              className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400"
            >
              Success Pulse
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => triggerHaptic('warning')}
              className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400"
            >
              Warning Alert
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => triggerHaptic('error')}
              className="flex items-center justify-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 col-span-2"
            >
              Error Burst
            </Button>
          </div>

          {/* Test Slider Detents */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <span>Crisp Mechanical Slider Detents:</span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white font-bold">
                {testSliderValue}%
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              step={1}
              value={testSliderValue}
              onValueChange={setTestSliderValue}
            />
            <p className="text-[10px] text-neutral-400 text-center">
              Scrub smoothly across the slider — note the instantaneous micro-detents with zero lag.
            </p>
          </div>

          {/* Test Switch Snap */}
          <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700/60 flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              Test Tactile Switch Toggle:
            </span>
            <Switch
              checked={testSwitchValue}
              onCheckedChange={setTestSwitchValue}
            />
          </div>
        </div>
      </div>

      {/* DOCUMENTATION, HOW IT WORKS & LEGAL */}
      <div className="bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[var(--accent-tertiary)]" /> DOCUMENTATION & LEGAL
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Learn how Anexus Class Manager works, review operational guides, or read our privacy policy and terms of service.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* How It Works Button Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="w-4 h-4 text-neutral-900 dark:text-white" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  How the App Works
                </h4>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Complete guide on timetable tracking, one-tap attendance marking, offline AI assistant queries, and exports.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                triggerHaptic('light');
                setIsHowItWorksOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 font-bold"
            >
              <BookOpen className="w-3.5 h-3.5" /> Read User Manual
            </Button>
          </div>

          {/* Terms & Conditions / Privacy Policy Button Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Terms & Conditions
                </h4>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                100% offline private local storage policy, safety guarantees, zero telemetry, and terms of service.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                triggerHaptic('light');
                setIsTermsOpen(true);
              }}
              className="w-full flex items-center justify-center gap-1.5 font-bold"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> View Terms & Privacy
            </Button>
          </div>
        </div>
      </div>

      {/* WIPE DATA & RESTORE TIMETABLE CONTROL SECTION */}
      <div className="pt-4 pb-0.5">
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase tracking-wider text-red-500 dark:text-red-400">
            Reset &amp; Danger Zone
          </span>
          <Separator className="flex-1 bg-red-200 dark:bg-red-950/60" />
        </div>
      </div>
      <div className="bg-red-50/60 dark:bg-red-950/20 border border-red-500/20 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider">
            WIPE DATA &amp; RESET CONTROLS
          </h3>
        </div>

        <p className="text-xs text-neutral-600 dark:text-neutral-300">
          Permanently clear database tables to start fresh, wipe only schedules &amp; faculty, or restore the default 9-course Registration Timetable.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Wipe All Class Data (Factory Reset) */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('warning');
              setIsWipeAllDataOpen(true);
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Trash2 className="w-4 h-4" /> Wipe All Class Data
          </button>

          {/* Wipe Schedules & Faculty */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsWipeDialogOpen(true);
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border border-red-500/50 text-red-600 dark:text-red-400 font-bold text-xs hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear Schedules &amp; Faculty
          </button>

          {/* Restore Registration Timetable */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setIsResetDialogOpen(true);
            }}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-colors"
          >
            <RotateCcw className="w-4 h-4 text-neutral-400 dark:text-neutral-600" /> Restore Timetable
          </button>
        </div>
      </div>

      {/* CONFIRM FULL WIPE ALL DATA DIALOG */}
      <ConfirmDialog
        isOpen={isWipeAllDataOpen}
        onClose={() => setIsWipeAllDataOpen(false)}
        onConfirm={handleConfirmWipeAll}
        title="Wipe All Database Records?"
        message="This will permanently delete all student rosters, attendance records, timetable schedules, subjects, faculty listings, and assignments from this device. This cannot be undone."
        confirmText="Yes, Wipe All Data"
        isDanger={true}
      />

      {/* CONFIRM WIPE SCHEDULES DIALOG */}
      <ConfirmDialog
        isOpen={isWipeDialogOpen}
        onClose={() => setIsWipeDialogOpen(false)}
        onConfirm={handleConfirmWipe}
        title="Clear Schedules & Faculty Data?"
        message="This will clear all class schedules and faculty listings from the database. Student roster and past attendance records will be preserved."
        confirmText="Yes, Clear Schedules"
        isDanger={true}
      />

      {/* CONFIRM RESET TIMETABLE DIALOG */}
      <ConfirmDialog
        isOpen={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        onConfirm={handleConfirmReset}
        title="Restore Default 9-Course Registration Timetable?"
        message="This will reset subjects, faculty, and weekly schedules to the official 9-course registration timetable (Fluid Power Safety, Thermo, Strength of Materials, etc.)."
        confirmText="Yes, Restore Timetable"
        isDanger={false}
      />

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        title="Add Single Student"
        subtitle="Manually add a student to the roster"
      >
        <div className="space-y-4 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          <div>
            <label className="block text-neutral-500 mb-1">Register No</label>
            <input
              type="text"
              placeholder="e.g. 711122105001"
              value={newRegNo}
              onChange={e => setNewRegNo(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-white font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-neutral-500 mb-1">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Anand R"
              value={newStudentName}
              onChange={e => setNewStudentName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-white font-bold"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsAddStudentOpen(false)}
              className="px-4 py-2 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveStudent}
              className="px-5 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 rounded-xl shadow-md"
            >
              Save Student
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Faculty Modal */}
      <Modal
        isOpen={isAddFacultyOpen}
        onClose={() => setIsAddFacultyOpen(false)}
        title="Add Faculty Member"
      >
        <div className="space-y-4 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
          <div>
            <label className="block text-neutral-500 mb-1">Faculty Name</label>
            <input
              type="text"
              placeholder="e.g. Dr. S. Muthuvel"
              value={newFacultyName}
              onChange={e => setNewFacultyName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#262626] text-neutral-900 dark:text-white font-bold"
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setIsAddFacultyOpen(false)}
              className="px-4 py-2 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveFaculty}
              className="px-5 py-2 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-neutral-900 rounded-xl shadow-md"
            >
              Save Faculty
            </button>
          </div>
        </div>
      </Modal>

      {/* How the App Works Modal */}
      <Modal
        isOpen={isHowItWorksOpen}
        onClose={() => setIsHowItWorksOpen(false)}
        title="How the App Works & User Guide"
        subtitle="Complete operating manual for Anexus Class Manager"
        maxWidth="xl"
      >
        <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1 text-xs text-neutral-700 dark:text-neutral-300">
          {/* Section 1: Setup & Master Matrix */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-[10px] font-mono">1</span>
              Weekly Master Timetable Matrix &amp; Misclick Protection
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Open the <strong>Schedule</strong> tab to view your complete <strong>Weekly Timetable Matrix</strong> on top. Days of the week are organized on the Y-axis and period timings on the X-axis. To prevent accidental misclicks while scrolling, slots can only be modified by pressing the deliberate edit icon or add button. Below the matrix, use the day selector tabs to inspect individual day cards.
            </p>
          </div>

          {/* Section 2: 24h Broadcast Announcements */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-[10px] font-mono">2</span>
              24-Hour Administrative Broadcast Ticker
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Emergency notices and institutional announcements pushed by administrators display as a continuous, smooth sliding marquee card exclusively on the <strong>Dashboard</strong>. Broadcasts automatically self-prune and disappear after strictly 24 hours from creation. Tap &quot;Read&quot; on any notice to inspect full details, or tap &quot;Dismiss&quot; to hide it for the current session.
            </p>
          </div>

          {/* Section 3: Smart Real-Time Period Detection */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-[10px] font-mono">3</span>
              Smart Real-Time Period Detection &amp; Standby
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              The app automatically detects the current active period, upcoming classes (within 10 minutes), and remaining countdowns in real time. Official holidays and weekend disable options are integrated seamlessly with standby banners.
            </p>
          </div>

          {/* Section 4: One-Tap Attendance Logging */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-[10px] font-mono">4</span>
              One-Tap Attendance Logging &amp; WhatsApp Reports
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Log attendance in seconds with &quot;Mark All Present&quot;, toggle absentees with a single tap, and save locked records into local IndexedDB. Generate clean, formatted WhatsApp absentee summaries ready to copy and post to parent and class groups.
            </p>
          </div>

          {/* Section 5: Android 16 Live Activity */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-[10px] font-mono">5</span>
              Android 16 Ongoing Live Activity Notification
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              During class hours, an ongoing native Android notification shows real-time period progress, room numbers, faculty, and minutes remaining. An interactive &quot;Take Attendance&quot; action button lets you launch attendance directly from your lock screen.
            </p>
          </div>

          {/* Section 6: Dual AI Engine */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-[10px] font-mono">6</span>
              Dual AI Engine: Local Deterministic + Google Gemini
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Tap the floating AI assistant for instant insights. In <strong>Offline Mode</strong>, it answers questions regarding your timetable, low attendance students (&lt;75%), and tasks. In <strong>Online Gemini Mode</strong>, connect your API key for free-form generative intelligence and syllabus planning.
            </p>
          </div>

          {/* Section 7: Cloud Synchronization & Admin Portal */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-[10px] font-mono">7</span>
              Unified Cloud Synchronization &amp; Master Admin Portal
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Data is safely backed up to Google Cloud Firestore, partitioned by User ID and Class Code. Institutional administrators can access the built-in Master Admin console to monitor registered classrooms, inspect offline backup JSONs, export global student rosters, push 24h notices, or execute authorized cloud database maintenance.
            </p>
          </div>

          {/* Section 8: Multi-Layer Security */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 flex items-center justify-center text-[10px] font-mono">8</span>
              Multi-Layer Zero-Plaintext Security Architecture
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              The system features zero plaintext passwords, keys, or endpoints in source code. It enforces 5-minute security session timers, anti-brute-force rate limiting with lockouts, cryptographic SHA-256 HMAC session signatures, anti-clickjacking framebusting, and memory scrubbing on logout.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => setIsHowItWorksOpen(false)}
              className="w-full font-bold"
            >
              Got it, Close Guide
            </Button>
          </div>
        </div>
      </Modal>

      {/* Terms & Conditions Modal */}
      <Modal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
        title="Terms & Conditions and Privacy Policy"
        subtitle="Effective: Academic Year 2026 - 2027 • Anexus Class Manager"
        maxWidth="xl"
      >
        <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1 text-xs text-neutral-700 dark:text-neutral-300">
          {/* Privacy Guarantee - Sleek Neutral Card */}
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
              <ShieldCheck className="w-4 h-4 text-neutral-900 dark:text-white shrink-0" />
              100% Offline-First Architecture &amp; Privacy Guarantee
            </div>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Anexus Class Manager operates on an offline-first architecture. All student rosters, register numbers, faculty listings, and attendance sessions are stored locally on your device via browser IndexedDB (Dexie). No telemetry, tracking cookies, advertising identifiers, or analytics scripts exist in this application.
            </p>
          </div>

          {/* Section 1 */}
          <div className="space-y-1 p-3 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
            <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-neutral-500" /> 1. Unified Cloud Synchronization &amp; Partitioning
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Cloud backups utilize Google Cloud Firestore with zero raw credentials exposed to users. Data is strictly partitioned into user snapshots (<code className="font-mono">app_users/user_id</code>) and classroom sync records (<code className="font-mono">app_classes/class_code</code>).
            </p>
          </div>

          {/* Section 2 */}
          <div className="space-y-1 p-3 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
            <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" /> 2. 24-Hour Transient Broadcast Policy
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Administrative announcements pushed to student applications expire strictly 24 hours from publication. Expired broadcasts are automatically purged from both local cache and Firestore cloud storage to protect storage integrity and privacy.
            </p>
          </div>

          {/* Section 3 */}
          <div className="space-y-1 p-3 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
            <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" /> 3. Zero Plaintext Security &amp; Cryptographic Signatures
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Administrative access is guarded by bitwise masked endpoints, SHA-256 session signatures, and anti-brute-force rate limiting. Sessions expire after 5 minutes of inactivity with comprehensive memory scrubbing upon logout.
            </p>
          </div>

          {/* Section 4 */}
          <div className="space-y-1 p-3 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
            <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" /> 4. AI Processing Privacy
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              The built-in academic assistant executes queries 100% locally. When optional Google Gemini Cloud AI is configured, query contexts are transmitted directly to Google&apos;s official API endpoint over encrypted HTTPS without intermediate servers.
            </p>
          </div>

          {/* Section 5 */}
          <div className="space-y-1 p-3 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
            <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" /> 5. Data Ownership, Portability &amp; Nuclear Purge
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              You maintain 100% ownership of your records. You may export full JSON backups, generate official Excel spreadsheets, or wipe your local records anytime. Authorized administrators also have the capability to execute an authorized nuclear purge of all cloud collections via the master console.
            </p>
          </div>

          {/* Section 6 */}
          <div className="space-y-1 p-3 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
            <h4 className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-500" /> 6. Device Permissions Transparency
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              • <strong>POST_NOTIFICATIONS</strong>: Used exclusively to display local class countdowns and ongoing live activities.<br />
              • <strong>File System &amp; Storage</strong>: Used solely when exporting Excel workbooks, CSV rosters, or backup JSON files to device storage.
            </p>
          </div>

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => setIsTermsOpen(false)}
              className="w-full font-bold"
            >
              I Understand &amp; Agree
            </Button>
          </div>
        </div>
      </Modal>

      {/* RESTORE FROM SINGLE CLOUD DATABASE MODAL */}
      <Modal
        isOpen={isConfirmRestoreFirebaseOpen}
        onClose={() => setIsConfirmRestoreFirebaseOpen(false)}
        title="Restore Data from Cloud Database"
        subtitle="Retrieve class timetable, student roster, and attendance from the single Firebase database"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-2">
            <label className="font-bold text-neutral-800 dark:text-neutral-200 block">
              Restore Source
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRestoreMode('class');
                  setRestoreCodeInput(firebaseClassCode || formatClassSyncCode(className, section));
                }}
                className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                  restoreMode === 'class'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent shadow-sm'
                    : 'bg-white dark:bg-[#1f1f1f] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                Classroom Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestoreMode('user');
                  setRestoreCodeInput(firebaseUserId);
                }}
                className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                  restoreMode === 'user'
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-transparent shadow-sm'
                    : 'bg-white dark:bg-[#1f1f1f] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                }`}
              >
                Personal User ID
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-neutral-800 dark:text-neutral-200 block">
              {restoreMode === 'class' ? 'Classroom Sync Code' : 'Personal User ID'}
            </label>
            <Input
              value={restoreCodeInput || (restoreMode === 'class' ? (firebaseClassCode || formatClassSyncCode(className, section)) : firebaseUserId)}
              onChange={e => setRestoreCodeInput(e.target.value)}
              placeholder={restoreMode === 'class' ? 'e.g. CLASS-5101-SEC-A' : 'e.g. USR-XXXXX'}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-neutral-400">
              {restoreMode === 'class'
                ? 'Enter the code of the classroom you wish to download.'
                : 'Enter your personal backup ID to restore your device data.'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed">
            <strong>Notice:</strong> Restoring will merge/update your local timetable, attendance logs, student roster, and homework items with the latest snapshot found in the database.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmRestoreFirebaseOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleRestoreFromFirebase}
              disabled={isRestoringFirebase}
              className="gap-1.5 font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900"
            >
              {isRestoringFirebase ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudDownload className="w-3.5 h-3.5" />}
              {isRestoringFirebase ? 'Downloading...' : 'Confirm & Restore'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* CONFIRM DELETE CLOUD DATA MODAL */}
      <ConfirmDialog
        isOpen={isDeleteMyCloudOpen}
        onClose={() => setIsDeleteMyCloudOpen(false)}
        onConfirm={handleDeleteMyCloudData}
        title="Delete Cloud Backup from Firebase?"
        message="This will permanently delete your personal user snapshot and classroom record from the central Firestore database. Local data stored on this device will NOT be affected."
        confirmText="Yes, Delete from Cloud"
        isDanger={true}
      />

      {/* MASTER ADMIN PROMPT MODAL */}
      <Modal
        isOpen={isAdminPromptOpen}
        onClose={() => {
          setIsAdminPromptOpen(false);
          setAdminCodeInput('');
        }}
        title="Master Admin Portal Access"
        subtitle="Enter the administrative access code to view and manage all global database records"
        maxWidth="sm"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 space-y-2">
            <label className="font-bold text-neutral-800 dark:text-neutral-200 block">
              Admin Access Passkey
            </label>
            <div className="relative">
              <Input
                type={showAdminCode ? "text" : "password"}
                placeholder="Enter passkey"
                value={adminCodeInput}
                onChange={e => setAdminCodeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleVerifyAdminCode();
                }}
                className="text-xs bg-white dark:bg-[#1f1f1f] pr-10"
              />
              <button
                type="button"
                onClick={() => setShowAdminCode(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1"
                title={showAdminCode ? "Hide passkey" : "Show passkey"}
              >
                {showAdminCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-neutral-400">
              Enter administrator password to unlock database management tools.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdminPromptOpen(false);
                setAdminCodeInput('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleVerifyAdminCode}
              className="gap-1.5 font-bold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900"
            >
              <Shield className="w-3.5 h-3.5" />
              Unlock Admin Portal
            </Button>
          </div>
        </div>
      </Modal>

      {/* GLOBAL DATABASE ADMIN INSPECTOR MODAL */}
      <Modal
        isOpen={isAdminInspectorOpen}
        onClose={() => setIsAdminInspectorOpen(false)}
        title="Central Database Admin Inspector"
        subtitle="Manage and audit all user accounts and classroom snapshots stored in Firestore"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          {/* Top stats bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Cloud Users</span>
              <p className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">{cloudUsersList.length}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Shared Classes</span>
              <p className="text-xl font-black text-neutral-900 dark:text-white mt-0.5">{cloudClassesList.length}</p>
            </div>
          </div>

          {/* Search and Filter Tabs */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-neutral-100 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setAdminActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  adminActiveTab === 'users'
                    ? 'bg-white dark:bg-[#171717] text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Users ({cloudUsersList.length})
              </button>
              <button
                type="button"
                onClick={() => setAdminActiveTab('classes')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  adminActiveTab === 'classes'
                    ? 'bg-white dark:bg-[#171717] text-neutral-900 dark:text-white shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                Classes ({cloudClassesList.length})
              </button>
            </div>

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Search by ID, name, or section..."
                value={adminSearchTerm}
                onChange={e => setAdminSearchTerm(e.target.value)}
                className="pl-8 text-xs font-mono bg-white dark:bg-[#1f1f1f]"
              />
            </div>
          </div>

          {/* List of Cloud Items */}
          <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {isLoadingAdminData ? (
              <div className="p-8 text-center text-neutral-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                <p>Loading records directly from Firestore...</p>
              </div>
            ) : adminActiveTab === 'users' ? (
              cloudUsersList.filter(u =>
                !adminSearchTerm ||
                u.id?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
                u.className?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
                u.classRepName?.toLowerCase().includes(adminSearchTerm.toLowerCase())
              ).length === 0 ? (
                <div className="p-8 text-center text-neutral-400 rounded-2xl bg-neutral-50 dark:bg-[#262626]">
                  No user records found in cloud.
                </div>
              ) : (
                cloudUsersList
                  .filter(u =>
                    !adminSearchTerm ||
                    u.id?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
                    u.className?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
                    u.classRepName?.toLowerCase().includes(adminSearchTerm.toLowerCase())
                  )
                  .map(item => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-900 dark:text-white">{item.id}</span>
                          <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[10px] font-mono">
                            {item.className} ({item.section})
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                          Rep: <strong>{item.classRepName || 'N/A'}</strong> • Students: <strong>{item.counts?.students ?? item.data?.students?.length ?? 0}</strong> • Sessions: <strong>{item.counts?.sessions ?? item.data?.sessions?.length ?? 0}</strong>
                        </p>
                        {item.lastSyncedAt && (
                          <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                            Synced: {format(parseISO(item.lastSyncedAt), 'dd MMM yyyy at HH:mm')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdminLoadDoc(item.id, 'user')}
                          className="text-xs font-bold gap-1"
                        >
                          <CloudDownload className="w-3.5 h-3.5" />
                          Load
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdminDeleteDoc('app_users', item.id)}
                          className="text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
              )
            ) : (
              cloudClassesList.filter(c =>
                !adminSearchTerm ||
                c.id?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
                c.className?.toLowerCase().includes(adminSearchTerm.toLowerCase())
              ).length === 0 ? (
                <div className="p-8 text-center text-neutral-400 rounded-2xl bg-neutral-50 dark:bg-[#262626]">
                  No class code records found in cloud.
                </div>
              ) : (
                cloudClassesList
                  .filter(c =>
                    !adminSearchTerm ||
                    c.id?.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
                    c.className?.toLowerCase().includes(adminSearchTerm.toLowerCase())
                  )
                  .map(item => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#262626] border border-neutral-200 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-900 dark:text-white">{item.id}</span>
                          <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-[10px] font-mono">
                            {item.className}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
                          Owner: <strong>{item.userId || 'N/A'}</strong> • Students: <strong>{item.counts?.students ?? item.data?.students?.length ?? 0}</strong> • Schedules: <strong>{item.counts?.schedules ?? item.data?.schedules?.length ?? 0}</strong>
                        </p>
                        {item.lastSyncedAt && (
                          <p className="text-[10px] text-neutral-400 mt-0.5 font-mono">
                            Synced: {format(parseISO(item.lastSyncedAt), 'dd MMM yyyy at HH:mm')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdminLoadDoc(item.id, 'class')}
                          className="text-xs font-bold gap-1"
                        >
                          <CloudDownload className="w-3.5 h-3.5" />
                          Load
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdminDeleteDoc('app_classes', item.id)}
                          className="text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
              )
            )}
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenAdminInspector}
                disabled={isLoadingAdminData}
                className="gap-1.5 font-bold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdminData ? 'animate-spin' : ''}`} />
                Refresh Cloud Data
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAdminUnlocked(false);
                  setIsAdminInspectorOpen(false);
                  try {
                    localStorage.removeItem('__adm_t');
                    sessionStorage.removeItem('__adm_t');
                  } catch {}
                  showToast('Admin Locked', 'Exited master admin mode', 'info');
                }}
                className="font-bold text-neutral-500"
              >
                Lock &amp; Exit Admin
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setIsAdminInspectorOpen(false)}
                className="font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
