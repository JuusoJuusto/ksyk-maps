import { useState, useEffect } from "react";
import { X, Cookie } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";

const fireConsentEvent = () =>
  window.dispatchEvent(new CustomEvent('ksyk:analytics-consent'));

/** v1.0.1 — language-aware (English default, Finnish via ksyk_language),
 *  Wilma document look, bigger mobile touch targets (44 px), hairline
 *  borders, 6 px radius, Wilma navy CTA. */

type Lang = "en" | "fi";

const T = {
  en: {
    label: "Cookies",
    title: "We use cookies",
    body: "Necessary cookies keep the site running. Optional analytics help us improve the service.",
    acceptAll: "Accept all",
    necessaryOnly: "Only necessary",
    customize: "Customize",
    analytics: "Analytics",
    analyticsDesc: "Helps us improve the service",
    save: "Save choices",
    back: "Back",
    close: "Close",
    aria: "Cookie preferences",
  },
  fi: {
    label: "Evästeet",
    title: "Käytämme evästeitä",
    body: "Välttämättömät evästeet pitävät sivuston toiminnassa. Valinnaiset analytiikkaevästeet auttavat kehittämään palvelua.",
    acceptAll: "Hyväksy kaikki",
    necessaryOnly: "Vain välttämättömät",
    customize: "Muokkaa",
    analytics: "Analytiikka",
    analyticsDesc: "Auttaa kehittämään palvelua",
    save: "Tallenna valinnat",
    back: "Takaisin",
    close: "Sulje",
    aria: "Evästeasetukset",
  },
} as const;

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [lang, setLang] = useState<Lang>("en");
  const { darkMode } = useDarkMode();

  // Follow the app's language choice (set elsewhere by Header / Settings).
  // Default to English — more neutral baseline for first-time visitors.
  useEffect(() => {
    const read = (): Lang => {
      try {
        const stored = localStorage.getItem("ksyk_language");
        if (!stored) return "en";
        return stored.toLowerCase().startsWith("fi") ? "fi" : "en";
      } catch { return "en"; }
    };
    setLang(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ksyk_language") setLang(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Delay more than the beta banner would normally take, so the
      // first thing a user sees is the map — not stacked modals.
      setTimeout(() => setShow(true), 2500);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      necessary: true, analytics: true, timestamp: new Date().toISOString(),
    }));
    fireConsentEvent();
    setShow(false);
  };

  const acceptNecessary = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      necessary: true, analytics: false, timestamp: new Date().toISOString(),
    }));
    setShow(false);
  };

  const acceptCustom = () => {
    localStorage.setItem('cookie_consent', JSON.stringify({
      necessary: true, analytics: analyticsEnabled, timestamp: new Date().toISOString(),
    }));
    if (analyticsEnabled) fireConsentEvent();
    setShow(false);
    setShowDetails(false);
  };

  if (!show) return null;
  const t = T[lang];

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t.aria}
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 flex justify-center pointer-events-none"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-xl overflow-hidden",
          "bg-white dark:bg-gray-950",
          "border border-[#d5dae0] dark:border-[#2a3040]",
          "border-t-[3px] border-t-[#003d82]",
          "rounded-[8px]",
          "shadow-[0_20px_50px_-12px_rgba(15,23,42,0.35)]",
        )}
      >
        {/* Masthead row */}
        <div className="flex items-start gap-3 border-b border-[#d5dae0] dark:border-[#2a3040] px-4 sm:px-5 py-3">
          <span className="h-9 w-9 shrink-0 flex items-center justify-center rounded-[6px] bg-[#e6ecf3] dark:bg-[#4a90d9]/15 border border-[#d5dae0] dark:border-[#2a3040]">
            <Cookie className="h-4 w-4 text-[#003d82] dark:text-[#4a90d9]" strokeWidth={2.25} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#003d82] dark:text-[#4a90d9]">
              {t.label}
            </p>
            <p className="text-[15px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight mt-0.5">
              {t.title}
            </p>
          </div>
          <button
            onClick={acceptNecessary}
            className="shrink-0 h-9 w-9 -mr-1 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t.close}
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {!showDetails ? (
            <>
              <p className="text-[14px] leading-[1.6] text-gray-700 dark:text-gray-300 mb-4">
                {t.body}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={acceptAll}
                  className="h-11 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] text-white text-[14px] font-bold transition-colors sm:col-span-1"
                >
                  {t.acceptAll}
                </button>
                <button
                  onClick={acceptNecessary}
                  className={cn(
                    "h-11 rounded-[6px] text-[13px] font-semibold border transition-colors",
                    darkMode
                      ? "border-[#2a3040] text-gray-300 hover:bg-gray-900"
                      : "border-[#d5dae0] text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {t.necessaryOnly}
                </button>
                <button
                  onClick={() => setShowDetails(true)}
                  className={cn(
                    "h-11 rounded-[6px] text-[13px] font-semibold border transition-colors",
                    darkMode
                      ? "border-[#2a3040] text-gray-300 hover:bg-gray-900"
                      : "border-[#d5dae0] text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {t.customize}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={cn(
                "rounded-[6px] border mb-4 p-4",
                darkMode ? "border-[#2a3040] bg-[#12161f]" : "border-[#d5dae0] bg-[#f5f6f8]",
              )}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-gray-900 dark:text-white">{t.analytics}</p>
                    <p className="text-[12px] mt-0.5 text-gray-500 dark:text-gray-400">
                      {t.analyticsDesc}
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={analyticsEnabled}
                    onClick={() => setAnalyticsEnabled(e => !e)}
                    className={cn(
                      "shrink-0 relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d82]/40",
                      analyticsEnabled ? "bg-[#003d82]" : darkMode ? "bg-gray-700" : "bg-gray-300",
                    )}
                  >
                    <span className={cn(
                      "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                      analyticsEnabled ? "translate-x-6" : "translate-x-1",
                    )} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={acceptCustom}
                  className="h-11 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] text-white text-[14px] font-bold transition-colors"
                >
                  {t.save}
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className={cn(
                    "h-11 rounded-[6px] text-[13px] font-semibold border transition-colors",
                    darkMode
                      ? "border-[#2a3040] text-gray-300 hover:bg-gray-900"
                      : "border-[#d5dae0] text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {t.back}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
