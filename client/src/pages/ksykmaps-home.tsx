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
import WilmaScheduleCard from "@/components/WilmaScheduleCard";
import StudentLoginGate from "@/components/StudentLoginGate";
import AccessLockoutScreen from "@/components/AccessLockoutScreen";
import { useAccessDecision } from "@/hooks/useAccessDecision";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { getStoredUrl } from "@/lib/wilmaCalendar";
import { cn } from "@/lib/utils";
import { trackFeature } from "@/lib/analytics";

export default function KSYKMapsHome() {
  const { darkMode } = useDarkMode();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const decision = useAccessDecision();
  const { settings: secSettings } = useSecuritySettings();
  const hasCalendar = !!getStoredUrl();

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

        {/* Floating schedule button — bottom-left, above map controls */}
        {!settingsOpen && (
          <button
            onClick={() => {
              trackFeature("schedule_card_opened");
              setScheduleOpen(o => !o);
            }}
            title="My schedule"
            className={cn(
              "absolute bottom-24 left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl",
              "shadow-lg border text-sm font-medium transition-all",
              scheduleOpen
                ? "bg-blue-600 border-blue-500 text-white"
                : darkMode
                  ? "bg-gray-900/90 border-gray-700 text-gray-200 hover:bg-gray-800"
                  : "bg-white/90 border-slate-200 text-slate-700 hover:bg-white",
            )}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Schedule</span>
            {hasCalendar && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>
        )}

        {/* Wilma schedule card — floats over the map */}
        {scheduleOpen && !settingsOpen && (
          <WilmaScheduleCard
            onClose={() => setScheduleOpen(false)}
            onNavigateToRoom={(roomId) => {
              setScheduleOpen(false);
              window.dispatchEvent(
                new CustomEvent("ksyk:navigate-to-room", { detail: { roomId } })
              );
            }}
          />
        )}

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
