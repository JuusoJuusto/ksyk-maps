/**
 * KSYK Maps — Main home (campus map).
 *
 * The mobile bottom navigation has been removed — actions live in the
 * top header / map hamburger menu so the map gets the full viewport.
 * KSYKMapView is always mounted so Leaflet's tile cache survives the
 * settings overlay opening and closing.
 */

import { useState, useEffect } from "react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import Header from "@/components/Header";
import KSYKMapView from "@/components/KSYKMapView";
import CampusSettingsPanel from "@/components/CampusSettingsPanel";
import StudentLoginGate from "@/components/StudentLoginGate";
import AccessLockoutScreen from "@/components/AccessLockoutScreen";
import { useAccessDecision } from "@/hooks/useAccessDecision";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { cn } from "@/lib/utils";
import { trackFeature } from "@/lib/analytics";
import posthog from "@/lib/posthog";

export default function KSYKMapsHome() {
  const { darkMode } = useDarkMode();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const decision = useAccessDecision();
  const { settings: secSettings } = useSecuritySettings();

  // Debounced search feature-usage tracking. We fire only after the user
  // has paused typing for ~500 ms so we don't count every keystroke as a
  // "search used" event — the goal is to know when someone actually used
  // the search bar, not how fast they type.
  useEffect(() => {
    if (!searchQuery.trim()) return;
    const t = setTimeout(() => {
      trackFeature("home_search_used", { len: searchQuery.length });
    }, 500);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // v3.27.5 — listen for search-clear pings from KSYKMapView so the
  // input empties + dropdown closes automatically after picking a
  // result. Especially critical on mobile where the dropdown
  // otherwise blocks the info drawer that just opened.
  useEffect(() => {
    const onClear = () => setSearchQuery("");
    window.addEventListener("ksyk:search-clear", onClear);
    return () => window.removeEventListener("ksyk:search-clear", onClear);
  }, []);

  // Security gate — blocked users see the lockout screen.
  // dryRun mode logs the decision without enforcing it.
  if (decision.tier === "blocked" && !secSettings.dryRun) {
    return <AccessLockoutScreen decision={decision} />;
  }

  return (
    <div
      className={cn(
        "ksykmaps-app flex flex-col overflow-hidden",
        darkMode
          ? "bg-gradient-to-b from-gray-950 via-gray-900 to-slate-900"
          : "bg-gradient-to-b from-slate-50 via-white to-blue-50/40",
      )}
      style={{
        height: "100dvh",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <StudentLoginGate />
      <AnnouncementBanner />
      <Header
        searchQuery={settingsOpen ? undefined : searchQuery}
        onSearchChange={settingsOpen ? undefined : setSearchQuery}
        onOpenSettings={settingsOpen ? undefined : () => {
          trackFeature("campus_settings_opened");
          posthog.capture("campus_settings_opened");
          setSettingsOpen(true);
        }}
      />

      {/* Map container — full-bleed. Note: NO overflow-hidden on this
       *  wrapper. The parent `.ksykmaps-app` already has overflow-hidden
       *  so nothing leaks outside the viewport, and having a second
       *  overflow-hidden here was clipping the 240% enlarged map
       *  container inside OsmBasemap — leaving tile gaps at corners
       *  during rotation on the main page (Builder didn't have this
       *  issue because its main wrapper isn't overflow-hidden). */}
      <div className="flex-1 relative min-h-0">
        <KSYKMapView searchQuery={searchQuery} />

        {settingsOpen && (
          <div
            className={cn(
              // z-50 puts it above the map-edge button stack (z-40) so the
              // 4 map controls don't leak through into the Settings screen.
              "absolute inset-0 z-50 overflow-y-auto overscroll-contain",
              darkMode
                ? "bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950"
                : "bg-gradient-to-b from-slate-50 via-white to-blue-50/30",
            )}
          >
            <CampusSettingsPanel onBack={() => setSettingsOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
