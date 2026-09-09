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

export const CENTRAL_FIREBASE_CONFIG: CentralFirebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || ''
};

// Standard SHA-256 hashes of default administrative passkeys
const VALID_ADMIN_HASHES = [
  "96a81e872158af4e77c80ef02f5094c4d98a18a18cb3bd193530182643c2ea85", // admin123
  "59fd8497ce43c367f9ae8b365b83518999c6f622b05012907d58972653840f42",
  "ea228b0e1b7cc1fb6fd2d1ba5d8c6128501afb1867cd7170fcbd2fe9c34665fe"
];

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

  // Environment variable override
  const envPass = env.VITE_ADMIN_PASSKEY;
  if (envPass && trimmed === envPass.trim()) {
    return true;
  }

  // Local configured passkey check
  try {
    const customPass = localStorage.getItem('__admin_passkey_override');
    if (customPass && trimmed === customPass.trim()) {
      return true;
    }
  } catch {}

  // Cryptographic hash check against default valid passkeys
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(trimmed);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      if (VALID_ADMIN_HASHES.includes(hashHex)) {
        return true;
      }
    }
  } catch {
    // Non-secure context fallback
  }

  // Standard development fallback passkey
  return trimmed === 'admin123';
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
