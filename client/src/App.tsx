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
// Vercel Analytics removed 2026-07-16 — the /_vercel/insights/script.js
// asset is on every major ad-block filter list (EasyPrivacy, uBO base
// filters). Loading it just produces console noise + a "Failed to load
// script" error for every visitor with an adblocker. Our own
// /api/telemetry/* sink already captures pageviews + events
// adblock-resistantly, so Vercel Analytics adds nothing.
import SplashScreen from "@/components/SplashScreen";
import CookieConsent from "@/components/CookieConsent";
import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";
import { initTelemetry } from "@/lib/telemetry";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useKonamiCode } from "@/hooks/useKonamiCode";
import { useKsykEasterEggs } from "@/hooks/useKsykEasterEggs";
import { useLocation } from "wouter";

import KSYKMapsHome from "@/pages/ksykmaps-home";
import Admin from "@/pages/admin";
import AdminForgotPassword from "@/pages/admin-forgot-password";
import AdminResetPassword from "@/pages/admin-reset-password";
import HSL from "@/pages/hsl";
import Lunch from "@/pages/lunch";
import Features from "@/pages/features";
import EasterEgg from "@/pages/easter-egg";
import KonamiEasterEgg from "@/pages/konami";
import DevModeEasterEgg from "@/pages/dev-mode";
import DebugBuildings from "@/pages/debug-buildings";
import NordbyteStudio from "@/pages/owlapps";
import NotFound from "@/pages/not-found";
import BuilderPage from "@/pages/builder";
import "./lib/i18n";

/** Sends visitors at legacy admin URLs to the single canonical /admin. */
function LegacyAdminRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/admin"); }, [setLocation]);
  return null;
}

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
  useKsykEasterEggs();

  const { data: appSettings } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const r = await fetch("/api/settings");
      if (!r.ok) return null;
      return r.json();
    },
    staleTime: 60_000,
  });

  // Maintenance mode hides the public app — but admins still need to
  // get in to switch it off, so /admin* always bypasses.
  const isAdminPath = window.location.pathname.startsWith("/admin");
  if (appSettings?.maintenanceMode && !isAdminPath) {
    return <MaintenanceMode message={appSettings.maintenanceMessage} />;
  }

  return (
    <Switch>
      {/* Public map */}
      <Route path="/" component={KSYKMapsHome} />

      {/* Admin password reset flow — these must be listed BEFORE the
       *  catch-all /admin/:section route so wouter matches them first
       *  (route order matters — later definitions don't override
       *  earlier matches). */}
      <Route path="/admin/forgot-password" component={AdminForgotPassword} />
      <Route path="/admin/reset-password" component={AdminResetPassword} />

      {/* Admin — single route. Renders the login screen when no session
       * exists, the panel when authed. Invalid tokens bounce back to the
       * login view automatically (AdminDashboard's gate detects them).
       *
       * Legacy paths redirect via the LegacyAdminRedirect component below
       * so old bookmarks keep working. */}
      <Route path="/admin/:section" component={Admin} />
      <Route path="/admin" component={Admin} />
      <Route path="/admin-login" component={LegacyAdminRedirect} />
      <Route path="/admin-ksyk-management-portal/:section" component={LegacyAdminRedirect} />
      <Route path="/admin-ksyk-management-portal" component={LegacyAdminRedirect} />

      {/* Builder — MapLibre-based campus editor with admin auth gate. */}
      <Route path="/builder" component={BuilderPage} />

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
      {/* Vercel Analytics widget removed — see top-of-file note. */}
      <QueryClientProvider client={queryClient}>
        {/* Splash lives INSIDE QueryClientProvider because its boot
         *  loader uses React Query to detect readiness. */}
        <SplashScreen />
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
