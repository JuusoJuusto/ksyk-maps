import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";

const fireConsentEvent = () =>
  window.dispatchEvent(new CustomEvent('ksyk:analytics-consent'));

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const { darkMode } = useDarkMode();

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setTimeout(() => setShow(true), 1200);
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

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Evästeasetukset"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 flex justify-center pointer-events-none"
    >
      <div
        className={cn(
          "pointer-events-auto w-full max-w-xl rounded-2xl border shadow-2xl shadow-black/20",
          darkMode
            ? "bg-gray-900 border-gray-700"
            : "bg-white border-gray-200",
        )}
      >
        <div className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <p className={cn("font-semibold text-[15px]", darkMode ? "text-white" : "text-gray-900")}>
              Evästeet
            </p>
            <button
              onClick={acceptNecessary}
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                darkMode ? "text-gray-500 hover:bg-gray-800 hover:text-gray-300" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600",
              )}
              aria-label="Sulje"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!showDetails ? (
            <>
              <p className={cn("text-sm mb-4", darkMode ? "text-gray-400" : "text-gray-600")}>
                Käytämme välttämättömiä evästeitä sivuston toiminnan varmistamiseksi sekä valinnaista analytiikkaa palvelun kehittämiseen.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={acceptAll}
                  className="flex-1 h-9 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Hyväksy kaikki
                </button>
                <button
                  onClick={acceptNecessary}
                  className={cn(
                    "flex-1 h-9 rounded-xl text-sm font-medium border transition-all active:scale-[0.98]",
                    darkMode
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  Vain välttämättömät
                </button>
                <button
                  onClick={() => setShowDetails(true)}
                  className={cn(
                    "flex-1 h-9 rounded-xl text-sm font-medium border transition-all active:scale-[0.98]",
                    darkMode
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  Muokkaa
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={cn("rounded-xl border mb-4 p-4", darkMode ? "border-gray-700 bg-gray-800/50" : "border-gray-100 bg-gray-50")}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={cn("text-sm font-semibold", darkMode ? "text-white" : "text-gray-900")}>Analytiikka</p>
                    <p className={cn("text-xs mt-0.5", darkMode ? "text-gray-400" : "text-gray-500")}>
                      Auttaa parantamaan palvelua
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={analyticsEnabled}
                    onClick={() => setAnalyticsEnabled(e => !e)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      analyticsEnabled ? "bg-blue-600" : darkMode ? "bg-gray-700" : "bg-gray-300",
                    )}
                  >
                    <span className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                      analyticsEnabled ? "translate-x-6" : "translate-x-1",
                    )} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={acceptCustom}
                  className="flex-1 h-9 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  Tallenna
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className={cn(
                    "h-9 px-4 rounded-xl text-sm font-medium border transition-all active:scale-[0.98]",
                    darkMode
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50",
                  )}
                >
                  Takaisin
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
