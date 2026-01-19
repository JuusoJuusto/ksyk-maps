import React from "react";
import { AlertTriangle, RefreshCw, Home, Mail, HelpCircle, Keyboard } from "lucide-react";
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
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl shadow-2xl border-2 border-red-200">
            <CardHeader className="bg-gradient-to-r from-red-600 via-orange-600 to-red-700 text-white text-center py-8">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 shadow-lg animate-pulse">
                <AlertTriangle className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-4xl font-bold mb-2">Oops! Something went wrong</CardTitle>
              <p className="text-red-100 text-lg">
                The KSYK Map encountered an unexpected error
              </p>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Error Details */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-5 shadow-inner">
                  <h3 className="font-bold text-red-800 mb-3 flex items-center text-lg">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    Error Details
                  </h3>
                  <p className="text-sm text-gray-700 font-mono bg-white p-4 rounded-lg border border-red-200 shadow-sm">
                    {this.state.error?.message || "Unknown error occurred"}
                  </p>
                </div>
                
                {/* Solutions */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-inner">
                  <h3 className="font-bold text-blue-800 mb-4 text-lg flex items-center">
                    <HelpCircle className="h-5 w-5 mr-2" />
                    Quick Solutions
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
                          1
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1">Refresh the Page</h4>
                          <p className="text-sm text-gray-600">Click the refresh button below or press F5</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
                          2
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1">Clear Browser Cache</h4>
                          <div className="flex items-center gap-2 mt-2 bg-gray-50 p-2 rounded border">
                            <Keyboard className="h-4 w-4 text-gray-600" />
                            <code className="text-xs font-mono font-bold text-gray-700">Ctrl + Shift + R</code>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Windows/Linux</p>
                          <div className="flex items-center gap-2 mt-1 bg-gray-50 p-2 rounded border">
                            <Keyboard className="h-4 w-4 text-gray-600" />
                            <code className="text-xs font-mono font-bold text-gray-700">Cmd + Shift + R</code>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Mac</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start">
                        <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
                          3
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1">Wait & Retry</h4>
                          <p className="text-sm text-gray-600">Try again in a few minutes</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-start">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold mr-3 flex-shrink-0">
                          4
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1">Return Home</h4>
                          <p className="text-sm text-gray-600">Go back to the main page</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap justify-center gap-4">
                  <Button
                    onClick={() => window.location.reload()}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Refresh Page
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = "/"}
                    className="px-8 py-4 text-lg border-2 hover:bg-gray-50 shadow-lg"
                  >
                    <Home className="mr-2 h-5 w-5" />
                    Go Home
                  </Button>
                </div>
                
                {/* Support Contact */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-xl p-6 shadow-inner">
                  <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center justify-center">
                    <Mail className="h-5 w-5 mr-2" />
                    Need Help? Contact Support
                  </h3>
                  <div className="text-center space-y-3">
                    <p className="text-gray-700">
                      If the problem persists, please contact the <strong>KSYK Maps IT Support Team</strong>
                    </p>
                    <a 
                      href="mailto:Juuso.Kaikula@ksyk.fi?subject=KSYK Maps Error Report&body=Error ID: {Date.now()}%0D%0A%0D%0APlease describe the issue:"
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                    >
                      <Mail className="h-5 w-5" />
                      Juuso.Kaikula@ksyk.fi
                    </a>
                    <p className="text-sm text-gray-600">
                      We'll help you resolve this issue as quickly as possible
                    </p>
                  </div>
                </div>
                
                {/* Error ID */}
                <div className="text-center">
                  <div className="inline-block bg-gray-100 border border-gray-300 rounded-lg px-4 py-2">
                    <p className="text-xs text-gray-500 mb-1">Error Reference ID</p>
                    <p className="font-mono text-sm font-bold text-gray-700">
                      {Date.now()}-{Math.random().toString(36).substr(2, 9).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Include this ID when contacting support</p>
                  </div>
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