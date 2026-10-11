/**
 * Global Error Handling & Diagnostic Utilities
 * Catches unhandled runtime exceptions and promise rejections across Web, Electron, and Android Capacitor.
 */

export interface ErrorReport {
  message: string;
  source?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  timestamp: string;
  type: 'runtime' | 'unhandledrejection' | 'network' | 'dexie';
}

const ERROR_LOG_KEY = 'anexus_error_logs';
const MAX_STORED_ERRORS = 20;
let inMemoryErrorLogs: ErrorReport[] = [];

/**
 * Retrieves the most recent recorded error logs from localStorage or memory
 */
export function getStoredErrorLogs(): ErrorReport[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(ERROR_LOG_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return [...inMemoryErrorLogs];
}

/**
 * Persists an error report to localStorage and memory for diagnostics
 */
export function logDiagnosticError(report: Partial<ErrorReport>): void {
  const entry: ErrorReport = {
    message: report.message || 'Unknown error',
    source: report.source,
    lineno: report.lineno,
    colno: report.colno,
    stack: report.stack,
    timestamp: new Date().toISOString(),
    type: report.type || 'runtime'
  };

  inMemoryErrorLogs = [entry, ...inMemoryErrorLogs].slice(0, MAX_STORED_ERRORS);

  try {
    if (typeof localStorage !== 'undefined') {
      const existing = getStoredErrorLogs();
      const updated = [entry, ...existing.filter(e => e.timestamp !== entry.timestamp)].slice(0, MAX_STORED_ERRORS);
      localStorage.setItem(ERROR_LOG_KEY, JSON.stringify(updated));
    }
  } catch {
    // Fail silently to avoid compounding error loops
  }
}

/**
 * Clears stored diagnostic error logs
 */
export function clearErrorLogs(): void {
  inMemoryErrorLogs = [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ERROR_LOG_KEY);
    }
  } catch {}
}

/**
 * Initializes global error listeners on window
 */
export function initGlobalErrorListeners(): void {
  if (typeof window === 'undefined') return;

  // Catch synchronous runtime errors
  window.addEventListener('error', (event: ErrorEvent) => {
    console.error('[GlobalErrorHandler] Uncaught error:', event.error || event.message);
    logDiagnosticError({
      message: event.message || String(event.error),
      source: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      type: 'runtime'
    });
  });

  // Catch unhandled async Promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason || 'Unhandled Promise Rejection');
    const stack = reason instanceof Error ? reason.stack : undefined;

    console.warn('[GlobalErrorHandler] Unhandled Promise rejection:', message);
    logDiagnosticError({
      message,
      stack,
      type: 'unhandledrejection'
    });
  });
}

/** Convenience aliases */
export const getAppErrorLogs = getStoredErrorLogs;
export const clearAppErrorLogs = clearErrorLogs;
export function logAppError(error: unknown, context?: string): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logDiagnosticError({
    message,
    stack,
    source: context,
    type: 'runtime'
  });
}
