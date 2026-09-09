import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  writeBatch,
  Firestore
} from 'firebase/firestore';
import { db } from '../db';
import {
  Student,
  Subject,
  Faculty,
  PeriodConfig,
  ScheduleItem,
  AttendanceSession,
  HomeworkItem,
  AppSettings
} from '../types';
import {
  CENTRAL_FIREBASE_CONFIG,
  CentralFirebaseConfig,
  isCentralFirebaseConfigured
} from '../config/firebaseConfig';

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

let cachedApp: FirebaseApp | null = null;
let cachedDb: Firestore | null = null;
let cachedKey = '';

/**
 * Resolves the active Firebase configuration:
 * Uses custom user keys if specified, otherwise automatically uses the single central Firebase config.
 */
export function getActiveFirebaseConfig(userSettings?: Partial<AppSettings>): FirebaseConfig {
  if (userSettings?.firebaseApiKey?.trim() && userSettings?.firebaseProjectId?.trim()) {
    return {
      apiKey: userSettings.firebaseApiKey.trim(),
      projectId: userSettings.firebaseProjectId.trim(),
      authDomain: userSettings.firebaseAuthDomain?.trim() || `${userSettings.firebaseProjectId.trim()}.firebaseapp.com`,
      storageBucket: userSettings.firebaseStorageBucket?.trim(),
      appId: userSettings.firebaseAppId?.trim()
    };
  }

  return {
    apiKey: CENTRAL_FIREBASE_CONFIG.apiKey,
    projectId: CENTRAL_FIREBASE_CONFIG.projectId,
    authDomain: CENTRAL_FIREBASE_CONFIG.authDomain,
    storageBucket: CENTRAL_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: CENTRAL_FIREBASE_CONFIG.messagingSenderId,
    appId: CENTRAL_FIREBASE_CONFIG.appId
  };
}

/**
 * Initializes or returns the cached Firebase app instance safely
 */
export function getFirebaseInstance(config: FirebaseConfig): { app: FirebaseApp; firestore: Firestore } {
  const key = `${config.projectId}_${config.apiKey}`;
  if (cachedApp && cachedDb && cachedKey === key) {
    return { app: cachedApp, firestore: cachedDb };
  }

  const existingApps = getApps();
  let app: FirebaseApp;
  const appName = `anexus_${config.projectId.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const found = existingApps.find(a => a.name === appName);
  if (found) {
    app = found;
  } else {
    app = initializeApp(
      {
        apiKey: config.apiKey.trim(),
        authDomain: config.authDomain?.trim() || `${config.projectId.trim()}.firebaseapp.com`,
        projectId: config.projectId.trim(),
        storageBucket: config.storageBucket?.trim() || `${config.projectId.trim()}.appspot.com`,
        messagingSenderId: config.messagingSenderId?.trim(),
        appId: config.appId?.trim() || `1:1234567890:web:${config.projectId.trim()}`
      },
      appName
    );
  }

  const firestore = getFirestore(app);
  cachedApp = app;
  cachedDb = firestore;
  cachedKey = key;

  return { app, firestore };
}

/**
 * Ensures the client has a secure, authenticated Firebase session.
 * Uses Anonymous Authentication so the client gets an official cryptographic JWT
 * without requiring students or CRs to type passwords or log into Google accounts.
 */
export async function ensureFirebaseAuth(app: FirebaseApp): Promise<string | null> {
  try {
    const auth = getAuth(app);
    if (auth.currentUser) {
      return auth.currentUser.uid;
    }
    const cred = await signInAnonymously(auth);
    return cred.user?.uid || null;
  } catch (err: any) {
    console.warn('Firebase Auth notice:', err?.message || err);
    return null;
  }
}

/**
 * Generates or retrieves a persistent unique user sync ID
 */
export async function getOrCreateUserSyncId(): Promise<string> {
  const settingsList = await db.settings.toArray();
  const currentSettings = settingsList[0];

  if (currentSettings?.firebaseUserId?.trim()) {
    return currentSettings.firebaseUserId.trim();
  }

  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  const timeSuffix = Date.now().toString(36).toUpperCase().slice(-4);
  const newId = `USR-${randomSuffix}${timeSuffix}`;

  if (currentSettings?.id) {
    await db.settings.update(currentSettings.id, { firebaseUserId: newId });
  }

  return newId;
}

/**
 * Generates or formats a class sync code (e.g. CLASS-5101-SEC-A)
 */
export function formatClassSyncCode(className?: string, section?: string): string {
  const cleanClass = (className || 'CLASS').trim().replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
  const cleanSec = (section || 'A').trim().replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
  return `${cleanClass}-${cleanSec}`;
}

/**
 * Tests connection to the Firebase / Firestore project
 */
export async function testFirebaseConnection(
  config: FirebaseConfig
): Promise<{ success: boolean; message: string }> {
  if (!config.apiKey?.trim() || !config.projectId?.trim()) {
    return { success: false, message: 'API Key and Project ID are required.' };
  }

  try {
    const { app, firestore } = getFirebaseInstance(config);
    await ensureFirebaseAuth(app);
    const testRef = doc(firestore, 'anexus_health_check', 'ping');
    await setDoc(
      testRef,
      {
        lastPingAt: new Date().toISOString(),
        client: 'Anexus Class Manager (Single Database)',
        status: 'online'
      },
      { merge: true }
    );

    return {
      success: true,
      message: `Connected successfully to central Firebase database "${config.projectId}"!`
    };
  } catch (err: any) {
    const code = err?.code || '';
    const msg = err?.message || String(err);

    if (code === 'permission-denied') {
      return {
        success: false,
        message: 'Firebase Permission Denied: Ensure Firestore rules permit read/write.'
      };
    }
    if (code === 'invalid-api-key' || msg.includes('API key')) {
      return { success: false, message: 'Invalid Firebase API Key. Please verify project credentials.' };
    }
    if (code === 'not-found') {
      return { success: false, message: `Firebase project "${config.projectId}" not found.` };
    }

    return { success: false, message: `Firebase connection failed: ${msg}` };
  }
}

/**
 * Synchronizes local data into the single central Firebase database.
 * Stores data in:
 *  1. `app_users/{userId}` (personal backup)
 *  2. `app_classes/{classCode}` (shared class backup for co-CRs and students)
 */
export async function syncToCentralFirebase(
  customConfig?: FirebaseConfig,
  customUserId?: string,
  customClassCode?: string
): Promise<{ success: boolean; message: string; timestamp: string; userId: string; classCode: string }> {
  try {
    const settingsList = await db.settings.toArray();
    const currentSettings = settingsList[0];
    const config = customConfig || getActiveFirebaseConfig(currentSettings);

    const userId = customUserId || (await getOrCreateUserSyncId());
    const classCode = customClassCode || currentSettings?.firebaseClassCode || formatClassSyncCode(currentSettings?.className, currentSettings?.section);

    const { app, firestore } = getFirebaseInstance(config);
    await ensureFirebaseAuth(app);

    // Gather all local data
    const [
      students,
      subjects,
      faculty,
      periodConfigs,
      schedules,
      sessions,
      tasks
    ] = await Promise.all([
      db.students.toArray(),
      db.subjects.toArray(),
      db.faculty.toArray(),
      db.periodConfigs.toArray(),
      db.schedules.toArray(),
      db.attendanceSessions.toArray(),
      db.homeworkItems.toArray()
    ]);

    const timestamp = new Date().toISOString();

    const payload = {
      userId,
      classCode,
      className: currentSettings?.className || 'My Class',
      section: currentSettings?.section || 'Section A',
      classRepName: currentSettings?.classRepName || 'Class Rep',
      department: currentSettings?.department || 'General',
      academicYear: currentSettings?.academicYear || '2026 - 2027',
      semester: currentSettings?.semester || 'Semester 1',
      lastSyncedAt: timestamp,
      counts: {
        students: students.length,
        subjects: subjects.length,
        faculty: faculty.length,
        schedules: schedules.length,
        sessions: sessions.length,
        tasks: tasks.length
      },
      data: {
        students: students.map(s => {
          const copy = { ...s };
          return copy;
        }),
        subjects,
        faculty,
        periodConfigs,
        schedules,
        sessions,
        tasks,
        settings: currentSettings ? (() => {
          const { id: _, ...rest } = currentSettings;
          return rest;
        })() : {}
      }
    };

    // Deep sanitize to remove any 'undefined' fields (Firestore rejects undefined)
    const sanitizedPayload = JSON.parse(JSON.stringify(payload));

    // 1. Save to user's personal space in single database
    const userDocRef = doc(firestore, 'app_users', userId);
    await setDoc(userDocRef, sanitizedPayload);

    // 2. Save to shared class space in single database
    const classDocRef = doc(firestore, 'app_classes', classCode);
    await setDoc(classDocRef, sanitizedPayload);

    // Update local setting with last sync timestamp
    if (currentSettings?.id) {
      await db.settings.update(currentSettings.id, {
        lastFirebaseSyncAt: timestamp,
        firebaseUserId: userId,
        firebaseClassCode: classCode
      });
    }

    return {
      success: true,
      message: `Uploaded data to single database for User [${userId}] and Class [${classCode}]!`,
      timestamp,
      userId,
      classCode
    };
  } catch (err: any) {
    console.error('Central Firebase sync error:', err);
    return {
      success: false,
      message: `Sync failed: ${err?.message || String(err)}`,
      timestamp: '',
      userId: '',
      classCode: ''
    };
  }
}

/**
 * Restores data from the single central Firebase database using either User ID or Class Code
 */
export async function restoreFromCentralFirebase(
  idOrCode: string,
  mode: 'user' | 'class' = 'class',
  customConfig?: FirebaseConfig
): Promise<{
  success: boolean;
  message: string;
  stats?: { students: number; sessions: number; schedules: number; tasks: number };
}> {
  try {
    const cleanId = (idOrCode || '').trim();
    if (!cleanId) {
      return { success: false, message: 'Please enter a valid User ID or Class Sync Code.' };
    }

    const settingsList = await db.settings.toArray();
    const currentSettings = settingsList[0];
    const config = customConfig || getActiveFirebaseConfig(currentSettings);

    const { app, firestore } = getFirebaseInstance(config);
    await ensureFirebaseAuth(app);

    const collectionName = mode === 'user' ? 'app_users' : 'app_classes';
    const targetDocRef = doc(firestore, collectionName, cleanId);
    const snapshot = await getDoc(targetDocRef);

    if (!snapshot.exists()) {
      return {
        success: false,
        message: `No record found in database under ${mode === 'user' ? 'User ID' : 'Class Code'} "${cleanId}".`
      };
    }

    const payload = snapshot.data();
    const rawData = payload?.data || {};

    const students: Student[] = rawData.students || [];
    const subjects: Subject[] = rawData.subjects || [];
    const faculty: Faculty[] = rawData.faculty || [];
    const periodConfigs: PeriodConfig[] = rawData.periodConfigs || [];
    const schedules: ScheduleItem[] = rawData.schedules || [];
    const sessions: AttendanceSession[] = rawData.sessions || [];
    const tasks: HomeworkItem[] = rawData.tasks || [];

    // Transactionally update local Dexie database
    await db.transaction('rw', [
      db.students,
      db.subjects,
      db.faculty,
      db.periodConfigs,
      db.schedules,
      db.attendanceSessions,
      db.homeworkItems,
      db.settings
    ], async () => {
      if (students.length > 0) {
        await db.students.clear();
        await db.students.bulkAdd(students.map(s => ({ ...s, id: undefined })));
      }
      if (subjects.length > 0) {
        await db.subjects.clear();
        await db.subjects.bulkAdd(subjects.map(s => ({ ...s, id: undefined })));
      }
      if (faculty.length > 0) {
        await db.faculty.clear();
        await db.faculty.bulkAdd(faculty.map(f => ({ ...f, id: undefined })));
      }
      if (periodConfigs.length > 0) {
        await db.periodConfigs.clear();
        await db.periodConfigs.bulkAdd(periodConfigs);
      }
      if (schedules.length > 0) {
        await db.schedules.clear();
        await db.schedules.bulkAdd(schedules.map(sc => ({ ...sc, id: undefined })));
      }
      if (sessions.length > 0) {
        await db.attendanceSessions.clear();
        await db.attendanceSessions.bulkAdd(sessions.map(ss => ({ ...ss, id: undefined })));
      }
      if (tasks.length > 0) {
        await db.homeworkItems.clear();
        await db.homeworkItems.bulkAdd(tasks.map(t => ({ ...t, id: undefined })));
      }

      if (currentSettings?.id) {
        await db.settings.update(currentSettings.id, {
          className: payload.className || currentSettings.className,
          section: payload.section || currentSettings.section,
          department: payload.department || currentSettings.department,
          academicYear: payload.academicYear || currentSettings.academicYear,
          semester: payload.semester || currentSettings.semester,
          classRepName: payload.classRepName || currentSettings.classRepName,
          lastFirebaseSyncAt: new Date().toISOString()
        });
      }
    });

    return {
      success: true,
      message: `Successfully restored ${students.length} students, ${sessions.length} sessions, and ${tasks.length} tasks from ${mode === 'user' ? 'User' : 'Class'} [${cleanId}]!`,
      stats: {
        students: students.length,
        sessions: sessions.length,
        schedules: schedules.length,
        tasks: tasks.length
      }
    };
  } catch (err: any) {
    console.error('Restore error:', err);
    return {
      success: false,
      message: `Restore failed: ${err?.message || String(err)}`
    };
  }
}

/**
 * Deletes user and/or class cloud data from the single Firebase database
 */
export async function deleteCloudData(
  userId?: string,
  classCode?: string,
  customConfig?: FirebaseConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const settingsList = await db.settings.toArray();
    const currentSettings = settingsList[0];
    const config = customConfig || getActiveFirebaseConfig(currentSettings);

    const { app, firestore } = getFirebaseInstance(config);
    await ensureFirebaseAuth(app);

    const uId = (userId || currentSettings?.firebaseUserId || '').trim();
    const cCode = (classCode || currentSettings?.firebaseClassCode || formatClassSyncCode(currentSettings?.className, currentSettings?.section)).trim();

    const deletedItems: string[] = [];

    if (uId) {
      const userRef = doc(firestore, 'app_users', uId);
      await deleteDoc(userRef);
      deletedItems.push(`User [${uId}]`);
    }

    if (cCode) {
      const classRef = doc(firestore, 'app_classes', cCode);
      await deleteDoc(classRef);
      deletedItems.push(`Class [${cCode}]`);
    }

    if (currentSettings?.id) {
      await db.settings.update(currentSettings.id, {
        lastFirebaseSyncAt: ''
      });
    }

    return {
      success: true,
      message: `Successfully deleted ${deletedItems.join(' and ')} from Firebase cloud database.`
    };
  } catch (err: any) {
    console.error('Delete cloud data error:', err);
    return {
      success: false,
      message: `Failed to delete from cloud: ${err?.message || String(err)}`
    };
  }
}

/**
 * Admin: Fetches all registered users stored in the central Firebase database
 */
export async function fetchAllCloudUsers(
  customConfig?: FirebaseConfig
): Promise<{ success: boolean; users: any[]; message?: string }> {
  try {
    const settingsList = await db.settings.toArray();
    const currentSettings = settingsList[0];
    const config = customConfig || getActiveFirebaseConfig(currentSettings);

    const { app, firestore } = getFirebaseInstance(config);
    await ensureFirebaseAuth(app);

    const usersCol = collection(firestore, 'app_users');
    const querySnapshot = await getDocs(usersCol);

    const users: any[] = [];
    querySnapshot.forEach(docSnap => {
      users.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    return { success: true, users };
  } catch (err: any) {
    console.error('Fetch all cloud users error:', err);
    return { success: false, users: [], message: err?.message || String(err) };
  }
}

/**
 * Admin: Fetches all shared classes stored in the central Firebase database
 */
export async function fetchAllCloudClasses(
  customConfig?: FirebaseConfig
): Promise<{ success: boolean; classes: any[]; message?: string }> {
  try {
    const settingsList = await db.settings.toArray();
    const currentSettings = settingsList[0];
    const config = customConfig || getActiveFirebaseConfig(currentSettings);

    const { app, firestore } = getFirebaseInstance(config);
    await ensureFirebaseAuth(app);

    const classesCol = collection(firestore, 'app_classes');
    const querySnapshot = await getDocs(classesCol);

    const classes: any[] = [];
    querySnapshot.forEach(docSnap => {
      classes.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    return { success: true, classes };
  } catch (err: any) {
    console.error('Fetch all cloud classes error:', err);
    return { success: false, classes: [], message: err?.message || String(err) };
  }
}

/**
 * Admin: Deletes any document from app_users or app_classes
 */
export async function adminDeleteCloudDoc(
  collectionName: 'app_users' | 'app_classes',
  docId: string,
  customConfig?: FirebaseConfig
): Promise<{ success: boolean; message: string }> {
  try {
    const settingsList = await db.settings.toArray();
    const currentSettings = settingsList[0];
    const config = customConfig || getActiveFirebaseConfig(currentSettings);

    const { app, firestore } = getFirebaseInstance(config);
    await ensureFirebaseAuth(app);

    const targetRef = doc(firestore, collectionName, docId);
    await deleteDoc(targetRef);

    return {
      success: true,
      message: `Deleted document "${docId}" from collection "${collectionName}".`
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Delete failed: ${err?.message || String(err)}`
    };
  }
}

/**
 * Automatic Nightly Cloud Sync
 * Evaluates whether it is nighttime (after 21:00 or before 05:00) and executes
 * a silent cloud sync if not already performed tonight.
 */
export async function checkAndPerformNightlySync(
  onSynced?: (timestamp: string) => void
): Promise<boolean> {
  try {
    const settingsList = await db.settings.toArray();
    const currentSettings = settingsList[0];

    // Only run if sync is enabled
    if (currentSettings?.firebaseSyncEnabled === false) return false;

    const now = new Date();
    const hour = now.getHours();
    const isNightTime = hour >= 21 || hour < 5;
    if (!isNightTime) return false;

    const todayDateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const lastNightlySync = localStorage.getItem('anexus_last_nightly_sync');

    if (lastNightlySync === todayDateKey) {
      return false; // Already synced tonight
    }

    console.log('[AutoSync] Initiating automated nightly cloud sync...');
    const res = await syncToCentralFirebase();
    if (res.success) {
      localStorage.setItem('anexus_last_nightly_sync', todayDateKey);
      if (onSynced) onSynced(res.timestamp);
      return true;
    }
    return false;
  } catch (err) {
    console.error('[AutoSync] Nightly sync check error:', err);
    return false;
  }
}

/**
 * Backwards-compatible wrappers
 */
export async function syncAllToFirebase(
  config: FirebaseConfig,
  collectionId: string
) {
  return syncToCentralFirebase(config, collectionId, collectionId);
}

export async function restoreFromFirebase(
  config: FirebaseConfig,
  collectionId: string
) {
  return restoreFromCentralFirebase(collectionId, 'class', config);
}
