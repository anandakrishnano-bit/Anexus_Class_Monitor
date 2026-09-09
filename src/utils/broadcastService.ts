import { getFirestoreRestUrl } from '../config/firebaseConfig';

export interface BroadcastNotice {
  id: string;
  title: string;
  message: string;
  publishedBy: string;
  target: 'ALL' | string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Recursively unwraps Firestore REST field data
 */
function unwrapFirestore(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(unwrapFirestore);
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      res[k] = unwrapFirestore(v);
    }
    return res;
  }
  const res: Record<string, any> = {};
  for (const [k, v] of Object.entries(val)) {
    res[k] = unwrapFirestore(v);
  }
  return res;
}

/**
 * Wraps JavaScript object into Firestore REST format
 */
function wrapFirestore(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(wrapFirestore) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = wrapFirestore(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Fetches active broadcast announcements.
 * Validates that broadcasts are STRICTLY under 24 hours old.
 * Any expired notice is ignored and purged from the database.
 */
export async function fetchActiveBroadcasts(currentClassCode?: string): Promise<BroadcastNotice[]> {
  try {
    const res = await fetch(getFirestoreRestUrl('app_broadcasts'), {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const documents = data.documents || [];
    const now = Date.now();
    const validNotices: BroadcastNotice[] = [];

    for (const doc of documents) {
      const docId = doc.name.split('/').pop() || '';
      const raw = unwrapFirestore(doc.fields);
      
      const createdAtMs = raw.createdAt ? new Date(raw.createdAt).getTime() : 0;
      const expiresAtMs = raw.expiresAt ? new Date(raw.expiresAt).getTime() : (createdAtMs + 24 * 60 * 60 * 1000);

      // Check strict 24-hour expiration window
      const isExpired = expiresAtMs <= now || (now - createdAtMs > 24 * 60 * 60 * 1000);

      if (isExpired) {
        // Asynchronously purge expired broadcast from cloud (clean-up)
        fetch(getFirestoreRestUrl('app_broadcasts', docId), { method: 'DELETE' }).catch(() => {});
        continue;
      }

      // Check target filter: ALL or matching current classCode
      const target = (raw.target || 'ALL').toUpperCase();
      const code = (currentClassCode || '').toUpperCase();

      if (target === 'ALL' || !currentClassCode || target === code) {
        validNotices.push({
          id: docId,
          title: raw.title || 'Announcement',
          message: raw.message || '',
          publishedBy: raw.publishedBy || 'Admin',
          target: raw.target || 'ALL',
          createdAt: raw.createdAt || new Date(createdAtMs).toISOString(),
          expiresAt: raw.expiresAt || new Date(expiresAtMs).toISOString()
        });
      }
    }

    validNotices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return validNotices;
  } catch (err) {
    console.warn('Could not fetch active broadcasts:', err);
    return [];
  }
}

/**
 * Publishes a new broadcast with a strict 24-hour expiration time.
 */
export async function publishBroadcastNotice(
  title: string,
  message: string,
  target: string = 'ALL',
  publishedBy: string = 'Master Admin'
): Promise<{ success: boolean; id: string; error?: string }> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // exactly 24h
    const docId = `notice_${Date.now()}`;

    const payload = {
      title,
      message,
      target: target.trim() || 'ALL',
      publishedBy,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      durationHours: 24
    };

    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (v !== undefined) fields[k] = wrapFirestore(v);
    }
    const wrapped = { fields };

    const res = await fetch(getFirestoreRestUrl('app_broadcasts', docId), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wrapped)
    });

    if (!res.ok) {
      throw new Error(`Firestore returned status ${res.status}`);
    }

    return { success: true, id: docId };
  } catch (err: any) {
    return { success: false, id: '', error: err?.message || String(err) };
  }
}

/**
 * Deletes a broadcast notice from Firestore
 */
export async function deleteBroadcastNotice(id: string): Promise<boolean> {
  try {
    const res = await fetch(getFirestoreRestUrl('app_broadcasts', id), {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to delete broadcast:', err);
    return false;
  }
}
