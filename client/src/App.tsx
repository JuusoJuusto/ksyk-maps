/**
 * KSYK Maps — Campus navigation app.
 *
 * Wilma routes have been moved to the standalone new-wilma app.
 * This app handles only the public campus map, admin panel, HSL, and lunch.
 */
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
import CookieConsent from "@/components/CookieConsent";
import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";
import { initTelemetry } from "@/lib/telemetry";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useKonamiCode } from "@/hooks/useKonamiCode";
import { useLocation } from "wouter";

import KSYKMapsHome from "@/pages/ksykmaps-home";
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
import NotFound from "@/pages/not-found";
import "./lib/i18n";

function AccessibilityClasses() {
  const { settings } = useAppSettings();
  useEffect(() => {
    document.documentElement.classList.toggle("large-text", settings.largeText);
  }, [settings.largeText]);
  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", settings.highContrast);
  }, [settings.highContrast]);
  return null;
}

function Router() {
  const [, setLocation] = useLocation();

  useKonamiCode(() => setLocation("/konami-code-activated"));

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const r = await fetch("/api/settings");
      if (!r.ok) return null;
      return r.json();
    },
    staleTime: 60_000,
  });

  if (appSettings?.maintenanceMode) {
    return <MaintenanceMode message={appSettings.maintenanceMessage} />;
  }

  return (
    <Switch>
      {/* Public map */}
      <Route path="/" component={KSYKMapsHome} />

      {/* Admin —
       *   /admin-login                            → AdminLogin (sign-in page)
       *   /admin-ksyk-management-portal[/:section] → Admin panel itself
       * The short /admin path was intentionally removed so a leaked
       * "?admin" URL doesn't reveal the panel exists at a guessable path. */}
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin-ksyk-management-portal/:section" component={Admin} />
      <Route path="/admin-ksyk-management-portal" component={Admin} />

      {/* Public info pages */}
      <Route path="/hsl" component={HSL} />
      <Route path="/lunch" component={Lunch} />
      <Route path="/features" component={Features} />
      <Route path="/owlapps" component={NordbyteStudio} />

      {/* Easter eggs */}
      <Route path="/secret-easter-egg" component={EasterEgg} />
      <Route path="/konami-code-activated" component={KonamiEasterEgg} />
      <Route path="/dev-mode-secret" component={DevModeEasterEgg} />

      {/* Debug (dev only) */}
      <Route path="/debug-buildings" component={DebugBuildings} />

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  useEffect(() => {
    initAnalytics();
    initTelemetry();
  }, []);

  // Global error logging to admin panel
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "error",
          message: `Global Error: ${e.message}`,
          details: { filename: e.filename, lineno: e.lineno, colno: e.colno, stack: e.error?.stack },
          timestamp: new Date().toISOString(),
          source: "window.onerror",
        }),
      }).catch(() => {});
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "error",
          message: `Unhandled Rejection: ${e.reason}`,
          details: { reason: String(e.reason) },
          timestamp: new Date().toISOString(),
          source: "unhandledrejection",
        }),
      }).catch(() => {});
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
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
                  <AccessibilityClasses />
                  <CookieConsent />
                  <Toaster />
                  <Router />
                </HelpBubble>
              </HelpProvider>
            </TooltipProvider>
          </DarkModeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
