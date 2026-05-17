'use client';

import React from 'react';
import { Button } from './ui/button-premium';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
                Something went wrong
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              {this.state.error && (
                <details className="text-left mb-6">
                  <summary className="text-sm text-neutral-500 dark:text-neutral-400 cursor-pointer mb-2">
                    Error details
                  </summary>
                  <pre className="text-xs bg-neutral-100 dark:bg-neutral-800 p-4 rounded-lg overflow-auto max-h-40">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex gap-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                >
                  Refresh Page
                </Button>
                <Button
                  onClick={() => window.location.href = '/dashboard'}
                  variant="outline"
                  className="flex-1"
                >
                  Go to Dashboard
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
