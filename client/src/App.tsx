import { Switch, Route, useLocation } from "wouter";
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
import SessionTimeoutHandler from "@/components/SessionTimeoutHandler";

/**
 * Only run the Wilma session-timeout watcher when the user is actually inside Wilma.
 * KSYK Maps is anonymous/public — no timeout should fire on /, /lunch, /hsl, etc.
 */
function WilmaScopedSessionTimeout() {
  const [location] = useLocation();
  const isWilma = location.startsWith("/wilma");
  if (!isWilma) return null;
  return <SessionTimeoutHandler />;
}
import CookieConsent from "@/components/CookieConsent";
// Vercel Analytics removed - causing ERR_BLOCKED_BY_CLIENT errors
// import { Analytics } from "@vercel/analytics/react";
import { useEffect } from "react";
import { trackPageView, trackEasterEgg, initAnalytics } from "@/lib/analytics";
import { useKonamiCode } from "@/hooks/useKonamiCode";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Admin from "@/pages/admin";
import AdminLogin from "@/pages/admin-login";
import HSL from "@/pages/hsl";
import Lunch from "@/pages/lunch";
import Features from "@/pages/features";
import EasterEgg from "@/pages/easter-egg";
import KonamiEasterEgg from "@/pages/konami";
import DevModeEasterEgg from "@/pages/dev-mode";
import DebugBuildings from "@/pages/debug-buildings";
import NordbyteStudio from "@/pages/owlapps";
import Wilma from "@/pages/wilma";
import WilmaStudent from "@/pages/wilma-student";
import WilmaTeacher from "@/pages/wilma-teacher";
import WilmaParentOld from "@/pages/wilma-parent";
import WilmaHome from "@/pages/wilma-home";
import WilmaParent from "@/pages/wilma-parent";
import WilmaRouter from "@/pages/wilma-router";
import WilmaAdmin from "@/pages/wilma-admin-new";
import WilmaSupportStaff from "@/pages/wilma-support-staff";
import WilmaDesktopEnhanced from "@/pages/wilma-desktop-enhanced";
import WilmaDesktopManager from "@/components/WilmaDesktopManager";
import WilmaLanding from "@/pages/wilma-landing";
import StudentForm from "@/pages/student-form";
import StudentDetail from "@/pages/student-detail";
import ClassDetail from "@/pages/class-detail";
import ChessPage from "@/pages/chess";
import ResetPassword from "@/pages/reset-password";
import ForgotPassword from "@/pages/forgot-password";
import LearnCoding from "@/pages/learn-coding";
import NotFound from "@/pages/not-found";
import KSYKMapsHome from "@/pages/ksykmaps-home";
import "./lib/i18n";

function Router() {
  const [, setLocation] = useLocation();
  
  // Konami code easter egg
  useKonamiCode(() => {
    setLocation("/konami-code-activated");
  });
  
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
      <Route path="/" component={KSYKMapsHome} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin-ksyk-management-portal" component={Admin} />
      <Route path="/hsl" component={HSL} />
      <Route path="/lunch" component={Lunch} />
      
      {/* NEW WILMA ROUTING - Simplified */}
      <Route path="/wilma" component={Wilma} />
      <Route path="/wilma/forgot-password" component={ForgotPassword} />
      <Route path="/wilma/reset-password" component={ResetPassword} />
      
      {/* Student/Parent routes - Use studentId (6-digit) */}
      <Route path="/wilma/:studentId/learn-coding/:section?" component={LearnCoding} />
      <Route path="/wilma/:studentId/learn-coding" component={LearnCoding} />
      <Route path="/wilma/:studentId/desktop" component={WilmaDesktopEnhanced} />
      <Route path="/wilma/:studentId/chess" component={ChessPage} />
      <Route path="/wilma/:studentId/:section" component={WilmaRouter} />
      <Route path="/wilma/:studentId" component={WilmaRouter} />
      
      {/* Admin/Teacher routes - Use Firebase ID */}
      <Route path="/wilma-admin/landing" component={WilmaLanding} />
      <Route path="/wilma-admin/:adminId/learn-coding/:section?" component={LearnCoding} />
      <Route path="/wilma-admin/:adminId/learn-coding" component={LearnCoding} />
      <Route path="/wilma-admin/:adminId/desktop" component={WilmaDesktopEnhanced} />
      <Route path="/wilma-admin/:adminId/desktop-manager" component={WilmaDesktopManager} />
      <Route path="/wilma-admin/:adminId/class/:classId" component={ClassDetail} />
      <Route path="/wilma-admin/:adminId/groups/:groupId" component={ClassDetail} />
      <Route path="/wilma-admin/:adminId/chess" component={ChessPage} />
      <Route path="/wilma-admin/:adminId/student-view/:studentId" component={StudentDetail} />
      <Route path="/wilma-admin/:adminId/student/:studentId" component={StudentForm} />
      <Route path="/wilma-admin/:adminId/add-student" component={StudentForm} />
      <Route path="/wilma-admin/:adminId/:section" component={WilmaAdmin} />
      <Route path="/wilma-admin/:adminId" component={WilmaAdmin} />
      <Route path="/wilma-admin" component={WilmaAdmin} />
      
      {/* OLD ROUTES - Keep for backward compatibility but redirect */}
      <Route path="/wilma-home" component={WilmaHome} />
      <Route path="/wilma-student/:userId/:section" component={WilmaStudent} />
      <Route path="/wilma-student/:userId" component={WilmaStudent} />
      <Route path="/wilma-teacher/:userId/:section" component={WilmaTeacher} />
      <Route path="/wilma-teacher/:userId" component={WilmaTeacher} />
      <Route path="/wilma-parent/:userId/:section" component={WilmaParentOld} />
      <Route path="/wilma-parent/:userId" component={WilmaParentOld} />
      <Route path="/wilma-kuraattori/:userId/:section" component={WilmaSupportStaff} />
      <Route path="/wilma-kuraattori/:userId" component={WilmaSupportStaff} />
      <Route path="/wilma-terveydenhoitaja/:userId/:section" component={WilmaSupportStaff} />
      <Route path="/wilma-terveydenhoitaja/:userId" component={WilmaSupportStaff} />
      <Route path="/wilma-psykologi/:userId/:section" component={WilmaSupportStaff} />
      <Route path="/wilma-psykologi/:userId" component={WilmaSupportStaff} />
      <Route path="/wilma-nuoriso-ohjaaja/:userId/:section" component={WilmaSupportStaff} />
      <Route path="/wilma-nuoriso-ohjaaja/:userId" component={WilmaSupportStaff} />
      <Route path="/wilma-sosiaalityontekija/:userId/:section" component={WilmaSupportStaff} />
      <Route path="/wilma-sosiaalityontekija/:userId" component={WilmaSupportStaff} />
      
      <Route path="/features" component={Features} />
      <Route path="/landing" component={Landing} />
      <Route path="/owlapps" component={NordbyteStudio} />
      <Route path="/secret-easter-egg" component={EasterEgg} />
      <Route path="/konami-code-activated" component={KonamiEasterEgg} />
      <Route path="/dev-mode-secret" component={DevModeEasterEgg} />
      <Route path="/debug-buildings" component={DebugBuildings} />
      <Route path="/classic" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize analytics
  useEffect(() => {
    initAnalytics();
  }, []);

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
                  <WilmaScopedSessionTimeout />
                  <CookieConsent />
                  <Toaster />
                  <Router />
                  {/* Vercel Analytics removed - causing ERR_BLOCKED_BY_CLIENT errors */}
                  {/* <Analytics /> */}
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
