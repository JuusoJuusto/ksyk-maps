import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Send, CheckCircle } from 'lucide-react';
import { analytics } from '@/lib/analytics-sdk';
import posthog from '@/lib/posthog';
import Sentry from '@/lib/sentry';

interface Props {
  children: ReactNode;
  /** Custom fallback UI instead of the full-screen error card. */
  fallback?: ReactNode;
  /** Name shown in console.error for easier debugging. */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorReferenceId: string | null;
  ticketSubmitted: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorReferenceId: null,
      ticketSubmitted: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // MapLibre transient render errors ("Cannot read properties of
    // undefined (reading 'get' | '0' | 'getLayer')" originating from
    // Om.renderLayer / Object.circle / _render) fire mid-frame when a
    // source is torn down before its layer is removed. They're
    // self-recovering — the next frame paints fine — so we log them via
    // analytics but don't paint the fatal-error screen.
    const msg = String(error?.message || '');
    const stack = String(error?.stack || '');
    const isMapLibreRender =
      /Cannot read properties of undefined \(reading '(get|getLayer|0)'\)/.test(msg) &&
      /(renderLayer|_render|Object\.(circle|line|fill|symbol)|Om\.render|setUniform)/.test(stack);
    if (isMapLibreRender) {
      // eslint-disable-next-line no-console
      console.warn('[ErrorBoundary] swallowed transient MapLibre render error:', msg);
      try {
        // Fire-and-forget report so we can still see the frequency.
        import('@/lib/analytics-sdk').then(m => m.analytics.error(error, {
          area: 'maplibre-transient', swallowed: true,
        }));
      } catch { /* ignore */ }
      return {};
    }
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Generate unique error reference ID
    const errorReferenceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    console.error('Error caught by boundary:', error, errorInfo, { errorReferenceId });
    
    this.setState({
      errorInfo,
      errorReferenceId
    });

    // First-party SDK — writes to appLogs via /api/session/heartbeat.
    try {
      analytics.error(error, {
        area: this.props.name || 'root',
        componentStack: errorInfo.componentStack?.slice(0, 2000),
        errorReferenceId,
      });
    } catch { /* never crash on telemetry */ }

    // Send errors handled by React boundaries to PostHog Error Tracking.
    try { posthog.captureException?.(error); } catch { /* ignore */ }
    // Mirror to Sentry so the crash shows up in the Sentry Issues feed
    // with a session replay attached (when the user was on-error sampled).
    try { Sentry.captureException?.(error, { extra: { errorReferenceId } }); } catch { /* ignore */ }

    // Log error to backend with reference ID
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: 'error',
          message: `React Error: ${error.message}`,
          errorReferenceId,
          errorStack: error.stack,
          errorInfo: {
            componentStack: errorInfo.componentStack,
            errorBoundary: true,
          },
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });

      // Auto-create ticket for critical errors
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error',
          title: `Auto-reported Error: ${error.message}`,
          description: `An error was automatically detected and reported.\n\nError: ${error.message}\n\nStack: ${error.stack}\n\nComponent Stack: ${errorInfo.componentStack}`,
          priority: 'critical',
          errorReferenceId,
          errorStack: error.stack,
          errorInfo: {
            componentStack: errorInfo.componentStack,
          },
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
    } catch (err) {
      console.error('Failed to log error:', err);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleSubmitTicket = async () => {
    const { error, errorInfo, errorReferenceId } = this.state;
    
    try {
      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bug',
          title: `User-reported Error: ${error?.message}`,
          description: `User manually submitted error report.\n\nError: ${error?.message}\n\nStack: ${error?.stack}\n\nComponent Stack: ${errorInfo?.componentStack}`,
          priority: 'high',
          errorReferenceId,
          errorStack: error?.stack,
          errorInfo: {
            componentStack: errorInfo?.componentStack,
          },
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });
      
      this.setState({ ticketSubmitted: true });
    } catch (err) {
      console.error('Failed to submit ticket:', err);
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;
      return (
        <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            {/* Alarm card — Wilma-style: single navy accent bar, hairline
             *  border, no oversized shadow.  Reads as an institutional
             *  error message, not a marketing crash screen. */}
            <div className="bg-card border border-border rounded-md shadow-sm overflow-hidden">
              {/* Red accent bar for alarm — solid, no gradient */}
              <div className="h-1 w-full bg-red-600" />

              <div className="p-6 sm:p-8">
                {/* Big alarm icon in a red ring */}
                <div className="flex justify-center mb-5">
                  <div className="h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-950/60 ring-1 ring-red-200 dark:ring-red-900/60 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" strokeWidth={2.25} />
                  </div>
                </div>

                {/* Editorial "ERROR" kicker + bold title */}
                <div className="text-center mb-6">
                  <div className="text-[10px] font-bold tracking-[0.22em] uppercase text-red-600 dark:text-red-400 mb-2">
                    Fatal error
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight mb-2">
                    Something broke.
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    The app hit an error we didn't expect. Our team gets an
                    automatic report every time this happens.
                  </p>
                </div>

                {/* Error reference ID — alarming red card */}
                <div className="rounded-2xl ring-1 ring-red-200 dark:ring-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-600 dark:text-red-400 mb-1.5">
                    Error reference
                  </p>
                  <p className="text-sm font-mono font-bold text-red-900 dark:text-red-200 bg-white/70 dark:bg-red-950/50 px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/60 break-all">
                    {this.state.errorReferenceId}
                  </p>
                  <p className="text-[11px] text-red-700/80 dark:text-red-300/80 mt-2">
                    Share this ID with support if you're stuck.
                  </p>
                </div>

                {/* Error message — muted card */}
                {this.state.error?.message && (
                  <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/5 bg-muted p-3 mb-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">
                      Details
                    </p>
                    <p className="text-[13px] font-mono text-foreground break-all">
                      {this.state.error.message}
                    </p>
                  </div>
                )}

                {/* Success banner */}
                {this.state.ticketSubmitted && (
                  <div className="rounded-2xl ring-1 ring-emerald-200 dark:ring-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30 p-3 mb-4 text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    Report submitted. We'll investigate.
                  </div>
                )}

                {/* Actions — KSYK-blue primary, neutral secondary */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={this.handleReload}
                    className="flex-1 h-11 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98]"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload
                  </Button>
                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1 h-11 rounded-xl font-semibold active:scale-[0.98]"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go home
                  </Button>
                  {!this.state.ticketSubmitted && (
                    <>
                      <Button
                        onClick={this.handleSubmitTicket}
                        variant="outline"
                        className="flex-1 h-11 rounded-xl font-semibold active:scale-[0.98] border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Quick report
                      </Button>
                      {/* Full ticket form — opens /support and pre-fills
                       *  it with the error reference ID so the user can
                       *  add details (their email, what they were doing). */}
                      <a
                        href={`/support?ref=${encodeURIComponent(this.state.errorReferenceId || '')}&msg=${encodeURIComponent(this.state.error?.message || '')}`}
                        className="flex-1 h-11 rounded-xl font-semibold flex items-center justify-center active:scale-[0.98] border border-input bg-transparent hover:bg-accent hover:text-accent-foreground text-sm"
                      >
                        Contact support
                      </a>
                    </>
                  )}
                </div>

                {/* Footer — subtle attribution */}
                <p className="text-[11px] text-center text-muted-foreground mt-5">
                  KSYK Maps · Auto-logged. Contact support if it keeps happening.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
