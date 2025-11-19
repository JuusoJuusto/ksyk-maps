import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
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
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl shadow-2xl border-0">
            <CardHeader className="bg-gradient-to-r from-red-500 to-orange-600 text-white text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold">🚨 Oops! Something went wrong</CardTitle>
              <p className="text-red-100 text-lg mt-2">
                The KSYK Map encountered an unexpected error
              </p>
            </CardHeader>
            
            <CardContent className="p-8 text-center">
              <div className="space-y-6">
                <div className="bg-gray-50 border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">Error Details:</h3>
                  <p className="text-sm text-gray-600 font-mono bg-white p-3 rounded border">
                    {this.state.error?.message || "Unknown error occurred"}
                  </p>
                </div>
                
                <div className="text-gray-600">
                  <p className="mb-4">Don't worry! This is usually a temporary issue. Try one of these solutions:</p>
                  <ul className="text-left space-y-2 max-w-md mx-auto">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      Refresh the page
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      Clear your browser cache
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                      Try again in a few minutes
                    </li>
                  </ul>
                </div>
                
                <div className="flex flex-wrap justify-center gap-4">
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8 py-3"
                  >
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Refresh Page
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = "/"}
                    className="px-8 py-3"
                  >
                    <Home className="mr-2 h-5 w-5" />
                    Go Home
                  </Button>
                </div>
                
                <div className="text-sm text-gray-500 mt-8">
                  <p>If the problem persists, please contact the KSYK IT support team.</p>
                  <p className="font-mono text-xs mt-2">Error ID: {Date.now()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}