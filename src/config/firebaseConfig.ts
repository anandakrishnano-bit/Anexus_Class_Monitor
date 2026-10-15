/**
 * Central Single Firebase Database Configuration
 *
 * All users and devices connect to this ONE shared Firebase Firestore database.
 * Each user's data is partitioned by their unique User ID (/users/{userId})
 * and Class Sync Code (/classes/{classCode}).
 *
 */

/// <reference types="vite/client" />

export interface CentralFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const env = (import.meta as any).env || {};

// Runtime config keys written by the first-launch setup wizard (WelcomeSetup)
const _ls = (key: string) => { try { return localStorage.getItem(key) || ''; } catch { return ''; } };

export const CENTRAL_FIREBASE_CONFIG: CentralFirebaseConfig = {
  get apiKey() { return _ls('__rt_firebase_api_key') || env.VITE_FIREBASE_API_KEY || ''; },
  get authDomain() { return _ls('__rt_firebase_auth_domain') || env.VITE_FIREBASE_AUTH_DOMAIN || ''; },
  get projectId() { return _ls('__rt_firebase_project_id') || env.VITE_FIREBASE_PROJECT_ID || ''; },
  get storageBucket() { return _ls('__rt_firebase_storage_bucket') || env.VITE_FIREBASE_STORAGE_BUCKET || ''; },
  get messagingSenderId() { return _ls('__rt_firebase_sender_id') || env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''; },
  get appId() { return _ls('__rt_firebase_app_id') || env.VITE_FIREBASE_APP_ID || ''; },
};

/**
 * Builds Firestore REST API URLs at runtime using configured project ID
 */
export function getFirestoreRestUrl(collection?: string, docId?: string): string {
  const projectId = CENTRAL_FIREBASE_CONFIG.projectId || 'placeholder-project';
  let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  if (collection) {
    url += `/${collection}`;
    if (docId) url += `/${docId}`;
  }
  return url;
}

export async function verifyAdminAccessCode(inputCode: string): Promise<boolean> {
  const trimmed = (inputCode || '').trim();
  if (!trimmed) return false;

  // Local configured passkey check
  try {
    const customPass = localStorage.getItem('__admin_passkey_override');
    if (customPass && trimmed === customPass.trim()) {
      return true;
    }
  } catch {}

  // Do not ship a shared/default administrator passkey in client code.
  // This check is only a UI gate, not a security boundary. Sensitive operations
  // must be authorized by a trusted backend before this app is used in production.
  return false;
}

/**
 * Checks whether valid Firebase credentials have been configured
 */
export function isCentralFirebaseConfigured(config: CentralFirebaseConfig = CENTRAL_FIREBASE_CONFIG): boolean {
  return (
    !!config.apiKey &&
    !config.apiKey.includes('YOUR_CENTRAL') &&
    !!config.projectId &&
    config.apiKey.length > 10 &&
    config.projectId.length > 2
  );
}

export async function createAdminSessionToken(validityMinutes = 5): Promise<{ exp: number; nonce: string; sig: string } | null> {
  try {
    const exp = Date.now() + validityMinutes * 60 * 1000;
    const nonce = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
    const entropy = [43, 89, 12, 76, 203, 115, 9, 64];
    const str = `${exp}:${nonce}:${entropy.join('.')}`;
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      const sig = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      return { exp, nonce, sig };
    }
  } catch (err) {
    console.warn('Failed to sign admin session token', err);
  }
  return null;
}
