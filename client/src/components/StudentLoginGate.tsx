/**
 * Student login gate — first-visit modal on the main map.
 *
 * Shows once per device (a "ksyk_intro_seen" flag in localStorage); offers
 * the school sign-in path (Microsoft / @ksyk.fi) and a "continue as guest"
 * escape hatch. Once dismissed, the user lands on the map normally.
 *
 * Editorial design: serif headline (Libre Baskerville), tracked-letter
 * label rails (JetBrains Mono), warm cream background → deep navy on
 * dark mode. No backdrop blur on the map content because the map
 * underneath is already moody enough.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const SEEN_KEY = "ksyk_intro_seen_v2";
const USER_KEY = "ksyk_user";

export default function StudentLoginGate() {
  const { darkMode } = useDarkMode();
  const { i18n } = useTranslation();
  const isFi = i18n.language === "fi";
  const [open, setOpen] = useState(false);

  // Show only on first visit AND when no user session exists.
  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_KEY) === "true";
      const hasUser = !!(localStorage.getItem(USER_KEY) || localStorage.getItem("ksyk_admin_user"));
      if (!seen && !hasUser) setOpen(true);
    } catch {
      /* localStorage disabled — just show it once */
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, "true"); } catch { /* */ }
    setOpen(false);
  };

  const continueAsGuest = () => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify({
        id: `guest-${Date.now()}`,
        email: null,
        role: "guest",
        provider: "guest",
      }));
    } catch { /* */ }
    dismiss();
  };

  const signInWithMicrosoft = () => {
    window.location.href = "/api/auth/microsoft/start";
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 animate-in fade-in duration-200"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Backdrop with the actual photograph as the texture */}
      <div className="absolute inset-0">
        <img
          src="/wilma-bg.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0b1322]/96 via-[#0b1322]/88 to-[#070b16]/97" />
        <div
          aria-hidden="true"
          className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)" }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-32 w-[28rem] h-[28rem] rounded-full opacity-12 blur-3xl"
          style={{ background: "radial-gradient(circle, #fbbf24 0%, transparent 70%)" }}
        />
      </div>

      <div
        className={cn(
          "relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 duration-300",
          darkMode ? "bg-[#0e1729]" : "bg-[#fbfaf6]",
        )}
      >
        {/* Top brand strip */}
        <div className="relative px-7 pt-7 pb-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl shadow-lg",
                darkMode
                  ? "bg-gradient-to-br from-cyan-400 to-blue-500 text-[#0b1322]"
                  : "bg-gradient-to-br from-[#0b1322] to-[#1b2540] text-cyan-300",
              )}>
                <MapPin className="h-5 w-5" strokeWidth={2.4} />
              </div>
              <div>
                <p
                  className={cn(
                    "text-[10px] font-bold tracking-[0.32em] uppercase",
                    darkMode ? "text-cyan-300/80" : "text-blue-700/85",
                  )}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  KSYK · Maps
                </p>
                <p
                  className={cn(
                    "text-sm font-bold leading-tight",
                    darkMode ? "text-white" : "text-[#0b1322]",
                  )}
                >
                  Welcome to campus
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-full transition-colors",
                darkMode
                  ? "text-white/40 hover:text-white hover:bg-white/10"
                  : "text-[#0b1322]/40 hover:text-[#0b1322] hover:bg-[#0b1322]/05",
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.22em]",
              darkMode ? "bg-amber-400/15 text-amber-200" : "bg-amber-100 text-amber-800",
            )}
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              <Sparkles className="h-3 w-3" />
              {isFi ? "Tervetuloa" : "Welcome"}
            </span>
            <h2
              className={cn(
                "text-[2rem] leading-[1.05] tracking-tight",
                darkMode ? "text-white" : "text-[#0b1322]",
              )}
              style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontWeight: 700 }}
            >
              {isFi ? "Löydä koulusi luokat." : "Find your way around school."}
            </h2>
            <p className={cn(
              "text-sm leading-relaxed",
              darkMode ? "text-white/65" : "text-[#0b1322]/65",
            )}>
              {isFi
                ? "Kirjaudu KSYK-tilillesi nähdäksesi lukujärjestyksesi ja täydet ominaisuudet. Tai jatka vieraana — voit aina kirjautua myöhemmin."
                : "Sign in with your KSYK account to see your schedule and full features. Or continue as a guest — you can always sign in later."}
            </p>
          </div>
        </div>

        {/* Action stack */}
        <div className="px-7 pb-7 space-y-3">
          <Button
            type="button"
            onClick={signInWithMicrosoft}
            className={cn(
              "w-full h-12 font-semibold rounded-xl gap-2.5 text-sm tracking-tight shadow-lg",
              darkMode
                ? "bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-[#0b1322] shadow-cyan-500/25"
                : "bg-[#0b1322] hover:bg-[#1b2540] text-white shadow-[#0b1322]/15",
            )}
          >
            <MicrosoftLogo />
            {isFi ? "Kirjaudu Microsoftilla" : "Sign in with Microsoft"}
            <ArrowRight className="w-4 h-4 ml-auto opacity-60" />
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={continueAsGuest}
            className={cn(
              "w-full h-11 font-semibold rounded-xl text-sm border-2",
              darkMode
                ? "bg-transparent border-white/15 text-white hover:bg-white/[0.04]"
                : "bg-white border-[#0b1322]/12 text-[#0b1322] hover:bg-[#0b1322]/[0.02]",
            )}
          >
            {isFi ? "Jatka vieraana" : "Continue as guest"}
          </Button>

          <p className={cn(
            "text-[11px] text-center pt-1",
            darkMode ? "text-white/40" : "text-[#0b1322]/45",
          )}>
            {isFi
              ? "Vieraskäyttäjillä on rajoitettu pääsy 3D-näkymään ja lukujärjestyksiin."
              : "Guests have limited access to 3D view and schedules."}
          </p>
        </div>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="16" height="16" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022" />
      <rect x="12" y="1"  width="10" height="10" fill="#7FBA00" />
      <rect x="1"  y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
