import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelpProvider } from "@/contexts/HelpContext";
import { DarkModeProvider } from "@/contexts/DarkModeContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { HelpBubble } from "@/components/HelpBubble";
import ErrorBoundary from "@/components/ErrorBoundary";
import MaintenanceMode from "@/components/MaintenanceMode";
import { Analytics } from "@vercel/analytics/react";
import { useEffect } from "react";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import AdminLogin from "@/pages/admin-login";
import Builder from "@/pages/builder";
import HSL from "@/pages/hsl";
import Lunch from "@/pages/lunch";
import Features from "@/pages/features";
import EasterEgg from "@/pages/easter-egg";
import DebugBuildings from "@/pages/debug-buildings";
import StudiOWL from "@/pages/owlapps";
import NotFound from "@/pages/not-found";
import "./lib/i18n";

function Router() {
  // Check maintenance mode
  const { data: settings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 60000,
  });

  // Show maintenance mode if enabled
  if (settings?.maintenanceMode) {
    return <MaintenanceMode message={settings.maintenanceMessage} />;
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin-ksyk-management-portal" component={Admin} />
      <Route path="/builder" component={Builder} />
      <Route path="/hsl" component={HSL} />
      <Route path="/lunch" component={Lunch} />
      <Route path="/features" component={Features} />
      <Route path="/landing" component={Landing} />
      <Route path="/owlapps" component={StudiOWL} />
      <Route path="/secret-easter-egg" component={EasterEgg} />
      <Route path="/debug-buildings" component={DebugBuildings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      
      // Log to admin panel
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error',
          message: `Global Error: ${event.message}`,
          details: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error?.stack
          },
          timestamp: new Date().toISOString(),
          source: 'window.onerror'
        })
      }).catch(logError => {
        console.error('Failed to log error:', logError);
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      // Log to admin panel
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'error',
          message: `Unhandled Promise Rejection: ${event.reason}`,
          details: {
            reason: String(event.reason),
            promise: String(event.promise)
          },
          timestamp: new Date().toISOString(),
          source: 'unhandledrejection'
        })
      }).catch(logError => {
        console.error('Failed to log error:', logError);
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <DarkModeProvider>
            <TooltipProvider>
              <HelpProvider>
                <HelpBubble>
                  <Toaster />
                  <Router />
                  <Analytics />
                </HelpBubble>
              </HelpProvider>
            </TooltipProvider>
          </DarkModeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
