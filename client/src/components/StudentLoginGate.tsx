/**
 * Student login gate — first-visit modal on the main map.
 *
 * v4.7.49 Wilma document rewrite.  Two choices only:
 *   • Sign in with Microsoft (@ksyk.fi) — school identity
 *   • Continue as guest                  — restricted access tier
 *
 * The access engine reads the email from `ksyk_user` (set after the
 * Microsoft callback returns) and applies loggedInTier / guestTier rules.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { X, ArrowRight, User } from "lucide-react";
import { cn } from "@/lib/utils";

const SEEN_KEY = "ksyk_intro_seen_v2";
const USER_KEY = "ksyk_user";

export default function StudentLoginGate() {
  const { darkMode } = useDarkMode();
  const { i18n } = useTranslation();
  const isFi = i18n.language === "fi";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(SEEN_KEY) === "true";
      const hasUser = !!(localStorage.getItem(USER_KEY) || localStorage.getItem("ksyk_admin_user"));
      if (!seen && !hasUser) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, "true"); } catch { /* */ }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    try { localStorage.setItem(SEEN_KEY, "true"); } catch { /* */ }
    window.location.href = "/api/auth/microsoft/start";
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-3 sm:px-4"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)",
      }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={dismiss}
        className={cn(
          "absolute inset-0",
          darkMode ? "bg-black/70" : "bg-black/40",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-login-gate-title"
        className={cn(
          "relative w-full max-w-md rounded-[8px] border overflow-hidden animate-in slide-in-from-bottom-2 duration-200",
          "border-t-[3px] border-t-[#003d82]",
          darkMode
            ? "bg-gray-950 border-[#2a3040] text-gray-100"
            : "bg-white border-[#d5dae0] text-gray-900",
          "shadow-[0_20px_50px_-12px_rgba(15,23,42,0.4)]",
        )}
      >
        {/* Wilma masthead header — matches FAQ / Settings / Support / Admin */}
        <div className={cn(
          "border-b px-5 sm:px-6 py-4 flex items-start justify-between gap-3",
          darkMode ? "border-[#2a3040]" : "border-[#d5dae0]",
        )}>
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/favicon-128.png"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 object-contain shrink-0"
            />
            <div className="min-w-0 leading-none">
              <p className={cn(
                "text-[10px] font-bold tracking-[0.08em] uppercase",
                darkMode ? "text-gray-500" : "text-gray-500",
              )}>
                {isFi ? "Sisäänkirjautuminen" : "Sign in"}
              </p>
              <p className="text-[15px] font-bold tracking-tight text-[#003d82] dark:text-[#4a90d9] mt-1">
                KSYK Maps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className={cn(
              "shrink-0 h-8 w-8 rounded-[6px] flex items-center justify-center transition-colors",
              darkMode
                ? "text-gray-500 hover:text-white hover:bg-gray-800"
                : "text-gray-500 hover:text-gray-900 hover:bg-gray-100",
            )}
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-5">
          {/* Big H1 + subtitle — Wilma document title block */}
          <div className="mb-5">
            <h2
              id="student-login-gate-title"
              className="text-[24px] sm:text-[28px] font-bold tracking-tight leading-[1.15] text-gray-900 dark:text-white"
            >
              {isFi ? "Tervetuloa" : "Welcome"}
            </h2>
            <p className={cn(
              "text-[14px] leading-[1.6] mt-2",
              darkMode ? "text-gray-400" : "text-gray-600",
            )}>
              {isFi
                ? "Kirjaudu koulun Microsoft-tilillä tai jatka vieraana."
                : "Sign in with your school Microsoft account, or continue as a guest."}
            </p>
          </div>

          {/* Buttons stacked, primary navy first */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={signInWithMicrosoft}
              className="w-full h-11 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] text-white text-[14px] font-bold inline-flex items-center justify-center gap-2.5 transition-colors"
            >
              <MicrosoftLogo />
              {isFi ? "Kirjaudu Microsoftilla" : "Sign in with Microsoft"}
              <ArrowRight className="h-4 w-4 opacity-80" strokeWidth={2.25} />
            </button>

            <button
              type="button"
              onClick={continueAsGuest}
              className={cn(
                "w-full h-11 rounded-[6px] border text-[14px] font-semibold inline-flex items-center justify-center gap-2 transition-colors",
                darkMode
                  ? "border-[#2a3040] bg-gray-950 text-gray-200 hover:bg-gray-900 hover:border-[#3a4152]"
                  : "border-[#d5dae0] bg-white text-gray-800 hover:bg-gray-50 hover:border-[#b7bdc6]",
              )}
            >
              <User className="h-4 w-4" strokeWidth={2} />
              {isFi ? "Jatka vieraana" : "Continue as guest"}
            </button>
          </div>

          {/* Footer meta — hairline separator, uppercase disclosure */}
          <div className={cn(
            "mt-5 pt-4 border-t text-[11px] leading-[1.5]",
            darkMode ? "border-[#2a3040] text-gray-500" : "border-[#d5dae0] text-gray-500",
          )}>
            <p>
              {isFi
                ? "Vain @ksyk.fi-tilit saavat täyden pääsyn. Vieraat näkevät rajoitetun version."
                : "Only @ksyk.fi accounts get full access. Guests see a restricted version."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg width="15" height="15" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="1"  y="1"  width="10" height="10" fill="#F25022" />
      <rect x="12" y="1"  width="10" height="10" fill="#7FBA00" />
      <rect x="1"  y="12" width="10" height="10" fill="#00A4EF" />
      <rect x="12" y="12" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
