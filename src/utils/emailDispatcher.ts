import * as XLSX from 'xlsx';
import { buildStructuredSessionWorkbook, SingleSessionExcelData } from './excelReportGenerator';
import { AppSettings } from '../types';
import { Share } from '@capacitor/share';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export interface PendingEmailDispatch {
  id: string;
  createdAt: number;
  recipients: string[];
  subject: string;
  filename: string;
  base64Data: string;
  sessionSummary: {
    date: string;
    period: number;
    subjectCode: string;
    subjectName?: string;
    facultyName?: string;
    className?: string;
    section?: string;
    presentCount: number;
    absentCount: number;
    odCount?: number;
    totalCount: number;
    attendanceRate: string;
  };
  absentList: Array<{
    registerNo: string;
    name: string;
    remarks?: string;
  }>;
  retries: number;
  lastError?: string;
}

const QUEUE_STORAGE_KEY = '__anexus_pending_email_dispatches';

/**
 * Universal POST helper that executes native HTTP on Android/iOS (bypassing CORS)
 * and falls back to standard fetch in web/desktop browsers.
 */
async function universalPost(
  url: string,
  headers: Record<string, string>,
  data: any
): Promise<{ ok: boolean; status: number; data: any; rawText: string }> {
  // If running in Capacitor Android/iOS native container, use native Http plugin
  if (Capacitor.isNativePlatform()) {
    try {
      const nativeResponse = await CapacitorHttp.post({
        url,
        headers: {
          'Origin': 'https://anandakrishnano-bit.github.io',
          'Referer': 'https://anandakrishnano-bit.github.io/Anexus_Class_Monitor/',
          ...headers
        },
        data,
        connectTimeout: 30000,
        readTimeout: 30000
      });

      return {
        ok: nativeResponse.status >= 200 && nativeResponse.status < 300,
        status: nativeResponse.status,
        data: nativeResponse.data,
        rawText: typeof nativeResponse.data === 'string' ? nativeResponse.data : JSON.stringify(nativeResponse.data)
      };
    } catch (nativeErr: any) {
      console.warn('[universalPost] Native CapacitorHttp failed, attempting web fallback:', nativeErr?.message);
    }
  }

  // Web, Desktop (Electron), or fallback fetch
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: typeof data === 'string' ? data : JSON.stringify(data)
  });

  let parsed: any = null;
  let text = '';
  try {
    text = await res.text();
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  } catch (e) {
    //
  }

  return {
    ok: res.ok,
    status: res.status,
    data: parsed,
    rawText: text
  };
}

/**
 * Returns currently queued email dispatches from localStorage
 */
export function getPendingEmailQueue(): PendingEmailDispatch[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Failed to read email queue', err);
    return [];
  }
}

/**
 * Persists pending email dispatches
 */
export function savePendingEmailQueue(queue: PendingEmailDispatch[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to save email queue', err);
  }
}

/**
 * Enqueues an attendance session Excel sheet for email dispatch
 */
export function enqueueAttendanceEmail(
  sessionData: SingleSessionExcelData,
  settings: AppSettings
): { queued: boolean; dispatchId?: string } {
  if (!settings.autoEmailAttendanceExcel || !settings.attendanceExcelRecipients || settings.attendanceExcelRecipients.length === 0) {
    return { queued: false };
  }

  const validRecipients = settings.attendanceExcelRecipients
    .map(e => e.trim())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  if (validRecipients.length === 0) {
    return { queued: false };
  }

  // 1. Build beautiful, structured Excel workbook
  const workbook = buildStructuredSessionWorkbook(sessionData);
  const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

  const total = sessionData.records.length;
  const presentCount = sessionData.records.filter(r => r.status === 'present').length;
  const absentRecords = sessionData.records.filter(r => r.status === 'absent');
  const odCount = sessionData.records.filter(r => r.status === 'od').length;
  const absentCount = absentRecords.length;
  const attendanceRate = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0.0';

  const subjectTitle = `Attendance Report — Period ${sessionData.periodNumber} (${sessionData.subjectCode}) • ${sessionData.date}`;
  const filename = `Attendance_P${sessionData.periodNumber}_${sessionData.subjectCode}_${sessionData.date}.xlsx`;

  const item: PendingEmailDispatch = {
    id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: Date.now(),
    recipients: validRecipients,
    subject: subjectTitle,
    filename,
    base64Data,
    sessionSummary: {
      date: sessionData.date,
      period: sessionData.periodNumber,
      subjectCode: sessionData.subjectCode,
      subjectName: sessionData.subjectName,
      facultyName: sessionData.facultyName,
      className: sessionData.className,
      section: sessionData.section,
      presentCount,
      absentCount,
      odCount,
      totalCount: total,
      attendanceRate
    },
    absentList: absentRecords.map(r => ({
      registerNo: r.registerNo,
      name: r.name,
      remarks: r.remarks
    })),
    retries: 0
  };

  const queue = getPendingEmailQueue();
  queue.push(item);
  savePendingEmailQueue(queue);

  return { queued: true, dispatchId: item.id };
}

/**
 * Attempts to deliver an individual email item
 */
async function deliverEmail(item: PendingEmailDispatch, settings?: AppSettings): Promise<{ success: boolean; note?: string }> {
  const config = settings?.emailServiceConfig;
  const rawKey = config?.apiKey?.trim();

  // Option 1: Resend API Direct Integration (Sends .xlsx attachment directly)
  // Triggered when an API key is provided
  if (rawKey && (rawKey.startsWith('re_') || (!config?.endpoint && rawKey.length > 5))) {
    const fromAddress = config?.fromEmail?.trim() || 'Anexus Attendance <onboarding@resend.dev>';
    const res = await universalPost(
      'https://api.resend.com/emails',
      {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rawKey}`
      },
      {
        from: fromAddress,
        to: item.recipients,
        subject: item.subject,
        html: `
          <h2>Class Attendance Report</h2>
          <p>Attached is the attendance sheet (.xlsx) for:</p>
          <ul>
            <li><strong>Date:</strong> ${item.sessionSummary.date}</li>
            <li><strong>Period:</strong> Period ${item.sessionSummary.period}</li>
            <li><strong>Subject:</strong> ${item.sessionSummary.subjectCode} — ${item.sessionSummary.subjectName || ''}</li>
            <li><strong>Faculty:</strong> ${item.sessionSummary.facultyName || 'Faculty'}</li>
            <li><strong>Present:</strong> ${item.sessionSummary.presentCount} / ${item.sessionSummary.totalCount} (${item.sessionSummary.attendanceRate}%)</li>
            <li><strong>Absent:</strong> ${item.sessionSummary.absentCount}</li>
          </ul>
          <h3>Absentees:</h3>
          ${item.absentList.length > 0
            ? '<ol>' + item.absentList.map(a => `<li><strong>${a.registerNo}</strong>: ${a.name}${a.remarks ? ` (${a.remarks})` : ''}</li>`).join('') + '</ol>'
            : '<p><em>All students present (100% attendance).</em></p>'
          }
          <p style="font-size: 11px; color: #888;">Sent from Anexus Class Manager.</p>
        `,
        attachments: [
          {
            filename: item.filename,
            content: item.base64Data
          }
        ]
      }
    );

    if (!res.ok) {
      const errDetail = res.data?.message || res.rawText || `Status ${res.status}`;
      throw new Error(`Resend Error: ${errDetail}`);
    }
    return { success: true, note: `Delivered via Resend with Excel attachment to ${item.recipients.join(', ')}` };
  }

  // Option 2: Custom Webhook / Google Apps Script
  if (config?.endpoint) {
    const payload = {
      recipients: item.recipients,
      subject: item.subject,
      filename: item.filename,
      fileBase64: item.base64Data,
      summary: item.sessionSummary,
      absentList: item.absentList,
      from: config.fromEmail || 'attendance@anexus.edu'
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (rawKey) {
      headers['Authorization'] = `Bearer ${rawKey}`;
    }

    const res = await universalPost(config.endpoint, headers, payload);

    if (!res.ok) {
      throw new Error(`Endpoint responded with status ${res.status}: ${res.rawText || 'Request failed'}`);
    }
    return { success: true, note: 'Delivered via custom webhook' };
  }

  // Option 3: FormSubmit Direct Delivery (Zero-config direct dispatch to any email inbox)
  // Sends formatted tabular summary with full absentee rosters
  const absenteeText = item.absentList && item.absentList.length > 0
    ? item.absentList.map((a, i) => `${i + 1}. [${a.registerNo}] ${a.name}${a.remarks ? ` (${a.remarks})` : ''}`).join('\n')
    : 'None (100% Attendance)';

  let lastNote = '';
  for (const recipient of item.recipients) {
    try {
      const formPayload = {
        _subject: item.subject,
        _template: 'table',
        _captcha: 'false',
        'Session Date': item.sessionSummary.date,
        'Period': `Period ${item.sessionSummary.period}`,
        'Subject': `${item.sessionSummary.subjectCode} ${item.sessionSummary.subjectName ? `(${item.sessionSummary.subjectName})` : ''}`,
        'Faculty': item.sessionSummary.facultyName || 'Course Faculty',
        'Class': `${item.sessionSummary.className || ''} ${item.sessionSummary.section || ''}`.trim() || 'General',
        'Attendance KPI': `Present: ${item.sessionSummary.presentCount}/${item.sessionSummary.totalCount} (${item.sessionSummary.attendanceRate}%) | Absent: ${item.sessionSummary.absentCount}`,
        'Absentees': absenteeText,
        'Generated At': new Date().toLocaleString(),
        'Platform': 'Anexus Class Monitor'
      };

      const res = await universalPost(
        `https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`,
        {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        formPayload
      );

      if (!res.ok) {
        throw new Error(`FormSubmit HTTP ${res.status}: ${res.rawText || 'Failed to dispatch'}`);
      }

      const json = typeof res.data === 'object' && res.data !== null ? res.data : {};
      if (json.message && json.message.toLowerCase().includes('activation')) {
        lastNote = `Activation email sent to ${recipient}. Please click 'Activate Form' in your inbox once.`;
      } else {
        lastNote = `Delivered to ${recipient}`;
      }
    } catch (err: any) {
      console.warn(`[Email Dispatcher] Delivery failed for ${recipient}:`, err);
      throw new Error(`Delivery failed: ${err?.message || err}`);
    }
  }

  return { success: true, note: lastNote || `Dispatched to ${item.recipients.length} recipient(s)` };
}

/**
 * Flushes all pending emails if device is online
 */
export async function flushPendingAttendanceEmails(
  settings?: AppSettings,
  onDelivered?: (count: number, note?: string) => void
): Promise<{ processed: number; succeeded: number; failed: number; lastNote?: string; lastError?: string }> {
  // Only check navigator.onLine on non-native environments (browser/desktop)
  // On native Android/iOS, WebView's navigator.onLine can be inaccurate; let native HTTP handle network connectivity
  if (!Capacitor.isNativePlatform() && typeof navigator !== 'undefined' && !navigator.onLine) {
    return { processed: 0, succeeded: 0, failed: 0, lastError: 'Device is offline' };
  }

  const queue = getPendingEmailQueue();
  if (queue.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  const remaining: PendingEmailDispatch[] = [];
  let succeeded = 0;
  let failed = 0;
  let lastNote = '';
  let lastError = '';

  for (const item of queue) {
    try {
      const res = await deliverEmail(item, settings);
      succeeded++;
      if (res.note) lastNote = res.note;
    } catch (err: any) {
      console.warn(`[Email Dispatcher] Failed to deliver ${item.id}:`, err?.message);
      item.retries += 1;
      item.lastError = String(err?.message || err);
      lastError = item.lastError;
      if (item.retries < 5) {
        remaining.push(item);
      }
      failed++;
    }
  }

  savePendingEmailQueue(remaining);

  if (succeeded > 0 && onDelivered) {
    onDelivered(succeeded, lastNote);
  }

  return { processed: queue.length, succeeded, failed, lastNote, lastError };
}

/**
 * Native Device Share & Mail App helper
 * Opens device's native share sheet or mail client with the generated report
 */
export async function shareAttendanceReport(sessionData: SingleSessionExcelData): Promise<boolean> {
  const workbook = buildStructuredSessionWorkbook(sessionData);
  const total = sessionData.records.length;
  const presentCount = sessionData.records.filter(r => r.status === 'present').length;
  const absentRecords = sessionData.records.filter(r => r.status === 'absent');
  const absentCount = absentRecords.length;
  const rate = total > 0 ? ((presentCount / total) * 100).toFixed(1) : '0.0';

  const absenteeText = absentRecords.length > 0
    ? absentRecords.map((a, i) => `${i + 1}. [${a.registerNo}] ${a.name}`).join('\n')
    : 'All students present';

  const shareText = `Anexus Class Attendance Report\nDate: ${sessionData.date}\nPeriod: Period ${sessionData.periodNumber} (${sessionData.subjectCode})\nPresent: ${presentCount}/${total} (${rate}%)\nAbsent (${absentCount}):\n${absenteeText}`;

  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title: `Attendance Report - Period ${sessionData.periodNumber}`,
        text: shareText,
        dialogTitle: 'Share Attendance Report'
      });
      return true;
    } catch (e) {
      // Fallback
    }
  }

  // Web Share or Mailto fallback
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: `Attendance Report - Period ${sessionData.periodNumber}`,
        text: shareText
      });
      return true;
    } catch (e) {
      // Fallback to mailto
    }
  }

  // Mailto fallback
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(`Attendance Report: Period ${sessionData.periodNumber} (${sessionData.subjectCode})`)}&body=${encodeURIComponent(shareText)}`;
  window.open(mailtoUrl, '_blank');
  return true;
}
