import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logDiagnosticError } from '../../utils/errorHandler';
import { AlertTriangle, RefreshCw, Copy, Check, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Caught exception in subtree:', error, errorInfo);
    logDiagnosticError({
      message: error.message,
      stack: error.stack || errorInfo.componentStack || undefined,
      type: 'runtime'
    });
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleCopy = () => {
    const { error, errorInfo } = this.state;
    const text = `Error: ${error?.message}\n\nStack:\n${error?.stack || ''}\n\nComponent Stack:\n${errorInfo?.componentStack || ''}`;
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#FAFAFA] dark:bg-[#0A0A0A] text-neutral-900 dark:text-neutral-100 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-fade-in">
            {/* Warning Icon Badge */}
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Error Title & Info */}
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
                Something Went Wrong
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
                An unexpected UI rendering error occurred. Your stored attendance data and timetables remain completely safe.
              </p>
            </div>

            {/* Error Message Box */}
            {this.state.error && (
              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#202020] border border-neutral-200 dark:border-neutral-800 text-left overflow-hidden">
                <p className="text-[11px] font-mono text-red-600 dark:text-red-400 font-bold break-words line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <Button
                type="button"
                onClick={this.handleReset}
                className="w-full h-11 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={this.handleReload}
                  className="h-10 rounded-2xl border-neutral-200 dark:border-neutral-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Reload Page</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={this.handleCopy}
                  className="h-10 rounded-2xl border-neutral-200 dark:border-neutral-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{this.state.copied ? 'Copied' : 'Copy Details'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
