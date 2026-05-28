import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Send } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Generate unique error reference ID
    const errorReferenceId = `${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    console.error('Error caught by boundary:', error, errorInfo);
    console.error('Error Reference ID:', errorReferenceId);
    
    this.setState({ 
      errorInfo,
      errorReferenceId 
    });

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
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-2xl">Oops! Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-800 mb-2">Error Reference ID:</p>
                <p className="text-lg font-mono text-red-900 bg-white px-3 py-2 rounded border border-red-300">
                  {this.state.errorReferenceId}
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Save this ID for support reference
                </p>
              </div>

              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Error Details:</p>
                <p className="text-sm text-gray-900 font-mono">
                  {this.state.error?.message}
                </p>
              </div>

              {this.state.ticketSubmitted && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    ✓ Error report submitted successfully! Our team will investigate.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReload}
                  className="flex-1 flex items-center justify-center gap-2"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2"
                  variant="outline"
                >
                  <Home className="h-4 w-4" />
                  Go Home
                </Button>
                {!this.state.ticketSubmitted && (
                  <Button
                    onClick={this.handleSubmitTicket}
                    className="flex-1 flex items-center justify-center gap-2"
                    variant="secondary"
                  >
                    <Send className="h-4 w-4" />
                    Report Error
                  </Button>
                )}
              </div>

              <p className="text-xs text-center text-gray-500">
                This error has been automatically logged. If the problem persists, please contact support with the reference ID above.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
