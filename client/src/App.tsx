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
import SplashScreen from "@/components/SplashScreen";
import CookieConsent from "@/components/CookieConsent";
import DevPanel from "@/components/DevPanel";
import { lazy, Suspense, useEffect, useState } from "react";
import { initAnalytics } from "@/lib/analytics";
import { initTelemetry as initLegacyTelemetry } from "@/lib/telemetry";
import { initTelemetry, analytics } from "@/lib/analytics-sdk";
import posthog from "@/lib/posthog";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useKonamiCode } from "@/hooks/useKonamiCode";
import { useKsykEasterEggs } from "@/hooks/useKsykEasterEggs";
import { useLocation } from "wouter";

// Main page loads eagerly — it is the primary route and must render without
// any async delay. All other routes are code-split so they do not inflate the
// initial JS bundle (was 4.4 MB monolith; each lazy chunk is fetched only
// when the user actually navigates to that route).
import KSYKMapsHome from "@/pages/ksykmaps-home";

const Admin               = lazy(() => import("@/pages/admin"));
const AdminForgotPassword = lazy(() => import("@/pages/admin-forgot-password"));
const AdminResetPassword  = lazy(() => import("@/pages/admin-reset-password"));
const HSL                 = lazy(() => import("@/pages/hsl"));
const Lunch               = lazy(() => import("@/pages/lunch"));
const EasterEgg           = lazy(() => import("@/pages/easter-egg"));
const KonamiEasterEgg     = lazy(() => import("@/pages/konami"));
const DevModeEasterEgg    = lazy(() => import("@/pages/dev-mode"));
const NotFound            = lazy(() => import("@/pages/not-found"));
const BuilderPage         = lazy(() => import("@/pages/builder"));
const Support             = lazy(() => import("@/pages/support"));
import "./lib/i18n";

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  if (!offline) return null;
  const fi = typeof navigator !== "undefined" && navigator.language.startsWith("fi");
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
        background: "#1e293b", color: "#f8fafc",
        textAlign: "center", padding: "8px 16px", fontSize: "14px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
      }}
    >
      {fi
        ? "Ei internet-yhteyttä — kartta toimii, mutta tiedot päivittyvät vasta yhteyden palauduttua."
        : "No internet connection — the map works, but live data won't update until you reconnect."}
    </div>
  );
}

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
      // Cache-bust so the CDN can't leave the site in maintenance mode
      // for 30 minutes after admin disables it. Poll every 30s so the
      // public site un-maintenances itself without needing a reload.
      const r = await fetch("/api/settings?t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return null;
      return r.json();
    },
    staleTime: 90_000,
    // v4.5.53: relaxed 30s → 90s so a single tab doesn't spend a third of
    // its rate-limit budget on settings polling. Maintenance mode still
    // clears within 90 s of the admin flipping the toggle.
    refetchInterval: 90_000,
  });

  // Maintenance mode hides the public app — but admins still need to
  // get in to switch it off, so /admin* always bypasses.
  const isAdminPath = window.location.pathname.startsWith("/admin") ||
                      window.location.pathname.startsWith("/builder");
  if (appSettings?.maintenanceMode && !isAdminPath) {
    return <MaintenanceMode message={appSettings.maintenanceMessage} />;
  }

  return (
    <Suspense fallback={null}>
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
       * /admin/tickets/:ticketId is listed before /admin/:section so that
       * wouter matches the deep-link before the generic section handler.
       * Legacy paths redirect via the LegacyAdminRedirect component below
       * so old bookmarks keep working. */}
      <Route path="/admin/tickets/:ticketId" component={Admin} />
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
      <Route path="/support" component={Support} />
      {/* Alias so error boundaries + old bookmarks find the same page. */}
      <Route path="/report" component={Support} />


      {/* Easter eggs */}
      <Route path="/secret-easter-egg" component={EasterEgg} />
      <Route path="/konami-code-activated" component={KonamiEasterEgg} />
      <Route path="/dev-mode-secret" component={DevModeEasterEgg} />

      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

export default function App() {
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("ksyk_admin_user") ?? localStorage.getItem("ksyk_user");
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user?.provider !== "guest" && typeof user?.id === "string" && user.id) {
          posthog.identify(user.id, {
            email: typeof user.email === "string" ? user.email : undefined,
            role: typeof user.role === "string" ? user.role : undefined,
          });
        }
      }
    } catch {
      // Keep app startup resilient when browser storage is unavailable or malformed.
    }

    // v4.5.52: analytics-sdk is the source of truth. It handles session
    // lifecycle, page views, errors, Web Vitals, batched flush. The two
    // legacy modules stay wired for anything still calling their exports.
    initTelemetry();
    initAnalytics();
    initLegacyTelemetry();
    // Attach the SDK to window in dev builds so we can hand-fire events
    // from the browser console when testing. Guarded so it doesn't ship
    // to production users as an accidental global.
    if (import.meta.env.DEV) {
      (window as any).__ksykAnalytics = analytics;
    }
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
                  <OfflineBanner />
                  <AccessibilityClasses />
                  <CookieConsent />
                  <Toaster />
                  <Router />
                  <DevPanel />
                </HelpBubble>
              </HelpProvider>
            </TooltipProvider>
          </DarkModeProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
