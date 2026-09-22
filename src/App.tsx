import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, seedInitialData } from './db';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { ToastContainer } from './components/common/ToastContainer';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { SidebarProvider } from './components/ui/sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { LocalAiChatbox } from './components/common/LocalAiChatbox';
import { SplashScreen } from './components/common/SplashScreen';
import { WelcomeSetup } from './components/common/WelcomeSetup';
import { syncLiveAndroidNotification } from './utils/liveNotification';
import { checkAndTriggerUpcomingAlerts, scheduleClassStart10MinReminder, requestNotificationPermission } from './utils/notifications';
import { checkAndPerformNightlySync } from './utils/firebaseSync';
import { format } from 'date-fns';

import { Dashboard } from './pages/Dashboard';
import { AttendancePage } from './pages/AttendancePage';
import { SchedulePage } from './pages/SchedulePage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentsPage } from './pages/StudentsPage';
import { SubjectsFacultyPage } from './pages/SubjectsFacultyPage';
import { ProfilePage } from './pages/ProfilePage';

const TAB_ORDER = ['dashboard', 'attendance', 'schedule', 'reports', 'students', 'subjects', 'settings', 'profile'];

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>('right');
  const prevTabRef = useRef<string>('dashboard');
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const { showToast } = useNotification();

  const handleTabChange = (newTab: string) => {
    if (newTab === activeTab) return;
    const prevIndex = TAB_ORDER.indexOf(activeTab);
    const nextIndex = TAB_ORDER.indexOf(newTab);
    const dir = (nextIndex === -1 || prevIndex === -1)
      ? 'right'
      : nextIndex >= prevIndex
      ? 'right'
      : 'left';
    setSlideDirection(dir);
    prevTabRef.current = activeTab;
    setActiveTab(newTab);
  };

  const settingsList = useLiveQuery(() => db.settings.toArray());
  const currentSettings = settingsList?.[0];
  const schedules = useLiveQuery(() => db.schedules.toArray()) || [];
  const periodConfigs = useLiveQuery(() => db.periodConfigs.orderBy('periodNumber').toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const tasks = useLiveQuery(() => db.homeworkItems.toArray()) || [];

  useEffect(() => {
    seedInitialData();
    // Prompt notification permissions for Android 13+ and Web
    requestNotificationPermission().catch(() => {});
  }, []);

  // Continuous background scheduler: checks every 15 seconds for upcoming classes and event reminders
  // Also keeps the native Android 16 ongoing live activity notification (with progress bar or standby state) synced
  useEffect(() => {
    if (schedules.length === 0 || periodConfigs.length === 0) return;
    if (currentSettings && currentSettings.notificationsEnabled === false) return;

    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[now.getDay()];
    const todayDateStr = format(now, 'yyyy-MM-dd');

    const isSaturdayDisabled = todayName === 'Saturday' && currentSettings?.disableSaturday !== false;
    const isSunday = todayName === 'Sunday';
    const isHoliday = currentSettings?.holidays?.some(h => h.date === todayDateStr);

    const isClassDay = !isSaturdayDisabled && !isSunday && !isHoliday;
    const todaySchedules = isClassDay ? schedules.filter(s => s.dayOfWeek === todayName) : [];
    const pendingTasks = tasks.filter(t => !t.isCompleted);

    // Initial check & Android 16 Live Activity Sync (pass full schedules for next-class standby detection)
    checkAndTriggerUpcomingAlerts(todaySchedules, periodConfigs, pendingTasks, showToast);
    syncLiveAndroidNotification(schedules, periodConfigs, subjects, currentSettings);

    // Auto schedule next periods if class day
    if (isClassDay) {
      todaySchedules.forEach(item => {
        const pc = periodConfigs.find(p => p.periodNumber === item.periodNumber);
        if (pc && pc.startTime) {
          scheduleClassStart10MinReminder(
            item.periodNumber,
            item.subjectCode,
            pc.startTime,
            item.classroom,
            item.facultyName
          );
        }
      });
    }

    // Automatic Nightly Cloud Sync check
    checkAndPerformNightlySync(ts => {
      showToast('Nightly Backup Done', `Class synced to cloud at ${format(new Date(ts), 'HH:mm')}`, 'info');
    }).catch(() => {});

    let foregroundInterval: any = null;

    const startForegroundInterval = () => {
      if (foregroundInterval) clearInterval(foregroundInterval);
      foregroundInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          checkAndTriggerUpcomingAlerts(todaySchedules, periodConfigs, pendingTasks, showToast);
          syncLiveAndroidNotification(schedules, periodConfigs, subjects, currentSettings);
          checkAndPerformNightlySync(ts => {
            showToast('Nightly Backup Done', `Class synced to cloud at ${format(new Date(ts), 'HH:mm')}`, 'info');
          }).catch(() => {});
        }
      }, 15000);
    };

    const stopForegroundInterval = () => {
      if (foregroundInterval) {
        clearInterval(foregroundInterval);
        foregroundInterval = null;
      }
    };

    if (document.visibilityState === 'visible') {
      startForegroundInterval();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndTriggerUpcomingAlerts(todaySchedules, periodConfigs, pendingTasks, showToast);
        syncLiveAndroidNotification(schedules, periodConfigs, subjects, currentSettings);
        startForegroundInterval();
      } else {
        // Halt JS background polling completely to achieve 0% CPU, 0% GPU and minimal battery/RAM usage
        stopForegroundInterval();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    window.addEventListener('blur', handleVisibilityChange);

    return () => {
      stopForegroundInterval();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      window.removeEventListener('blur', handleVisibilityChange);
    };
  }, [schedules, periodConfigs, subjects, tasks, currentSettings, showToast]);

  const [showWalkthrough, setShowWalkthrough] = useState<boolean>(false);

  const renderActivePage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={handleTabChange} />;
      case 'attendance':
        return <AttendancePage />;
      case 'schedule':
        return <SchedulePage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage onOpenWalkthrough={() => setShowWalkthrough(true)} onNavigateToProfile={() => handleTabChange('profile')} />;
      case 'profile':
        return <ProfilePage setActiveTab={handleTabChange} />;
      case 'students':
        return <StudentsPage />;
      case 'subjects':
        return <SubjectsFacultyPage />;
      default:
        return <Dashboard setActiveTab={handleTabChange} />;
    }
  };

  const isFirstLaunch = currentSettings && currentSettings.isFirstLaunchCompleted === false;
  const shouldDisplayWalkthrough = (!showSplash && isFirstLaunch) || showWalkthrough;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-[100dvh] max-h-[100dvh] bg-[#FAFAFA] dark:bg-[#0A0A0A] text-neutral-900 dark:text-neutral-100 flex flex-col font-sans relative w-full overflow-hidden">
        {/* Splash Animation on App Open */}
        {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

        {/* First-time / New user entry setup modal or manual walkthrough replay */}
        {shouldDisplayWalkthrough && (
          <WelcomeSetup
            isReplay={showWalkthrough}
            onComplete={async () => {
              setShowWalkthrough(false);
              if (currentSettings?.id) {
                await db.settings.update(currentSettings.id, { isFirstLaunchCompleted: true });
              }
            }}
          />
        )}

        <div className="shrink-0 z-30 w-full">
          <Navbar activeTab={activeTab} setActiveTab={handleTabChange} />
        </div>
        <ToastContainer />

        <div className="flex flex-1 min-h-0 w-full relative overflow-hidden">
          <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
          <main
            key={activeTab}
            className={`flex-1 min-w-0 h-full overflow-y-auto overscroll-y-contain ${
              slideDirection === 'right' ? 'page-slide-right' : 'page-slide-left'
            } pb-24 md:pb-8`}
          >
            {renderActivePage()}
          </main>
        </div>

        <LocalAiChatbox />
        <BottomNav activeTab={activeTab} setActiveTab={handleTabChange} />
      </div>
    </SidebarProvider>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
