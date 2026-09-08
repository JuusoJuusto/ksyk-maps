/**
 * Student login gate — first-visit modal on the main map.
 *
 * Two choices only:
 *   • Sign in with Microsoft (@ksyk.fi) — school identity
 *   • Continue as guest                  — restricted access tier
 *
 * The access engine reads the email from `ksyk_user` (set after the
 * Microsoft callback returns) and applies loggedInTier / guestTier rules.
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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

  // Body scroll lock + Esc dismiss while gate open
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
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 animate-in fade-in duration-200"
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
          darkMode ? "bg-black/70 backdrop-blur-sm" : "bg-white/85 backdrop-blur-sm",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-login-gate-title"
        className={cn(
          "relative w-full max-w-sm rounded-2xl shadow-xl ring-1 animate-in slide-in-from-bottom-2 duration-200 overflow-hidden",
          darkMode
            ? "bg-gray-950 ring-white/10 text-gray-100"
            : "bg-white ring-black/5 text-gray-900",
        )}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className={cn(
            "absolute top-3 right-3 z-10 h-11 w-11 flex items-center justify-center rounded-full transition-colors active:scale-[0.9]",
            darkMode
              ? "text-gray-500 hover:text-white hover:bg-white/10"
              : "text-gray-400 hover:text-gray-900 hover:bg-gray-100",
          )}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 sm:px-8 pt-9 pb-7 space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <img
              src="/favicon-128.png"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
            />
            <p
              className={cn(
                "text-[10px] font-bold tracking-[0.18em] uppercase",
                darkMode ? "text-gray-500" : "text-gray-400",
              )}
            >
              {isFi ? "KSYK Kartat" : "KSYK Maps"}
            </p>
            <h2
              id="student-login-gate-title"
              className="text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] leading-tight"
            >
              {isFi ? "Tervetuloa" : "Welcome"}
            </h2>
            <p
              className={cn(
                "text-sm leading-relaxed pt-0.5 max-w-[19rem]",
                darkMode ? "text-gray-400" : "text-gray-500",
              )}
            >
              {isFi
                ? "Kirjaudu koulun Microsoft-tilillä tai jatka vieraana."
                : "Sign in with your school Microsoft account, or continue as a guest."}
            </p>
          </div>

          <div className={cn("h-px", darkMode ? "bg-white/10" : "bg-gray-200/70")} />

          <div className="space-y-2.5">
            <Button
              type="button"
              onClick={signInWithMicrosoft}
              className={cn(
                "w-full h-12 font-semibold rounded-xl gap-2.5 text-[15px] tracking-tight active:scale-[0.97] transition-transform",
                darkMode
                  ? "bg-white text-gray-900 hover:bg-gray-100"
                  : "bg-gray-900 text-white hover:bg-gray-800",
              )}
            >
              <MicrosoftLogo />
              {isFi ? "Kirjaudu Microsoftilla" : "Sign in with Microsoft"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={continueAsGuest}
              className={cn(
                "w-full h-11 font-medium rounded-xl text-sm active:scale-[0.97] transition-transform",
                darkMode
                  ? "text-gray-400 hover:text-white hover:bg-white/5"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/70",
              )}
            >
              {isFi ? "Jatka vieraana" : "Continue as guest"}
            </Button>
          </div>

          <p
            className={cn(
              "text-[11px] text-center leading-relaxed",
              darkMode ? "text-gray-500" : "text-gray-400",
            )}
          >
            {isFi
              ? "Vain @ksyk.fi-tilit saavat täyden pääsyn. Vieraat näkevät rajoitetun version."
              : "Only @ksyk.fi accounts get full access. Guests see a restricted version."}
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
