/**
 * "Get the app" popup — nudges web visitors to install the Android app.
 * Feature-flagged via /api/settings.showGetAppPopup (admin only) and
 * defaults to OFF. Shows once per session; the user can dismiss it for
 * the tab. There is no user-facing kill switch — admins control this.
 *
 * Sits above the map with a small semi-transparent card in the
 * bottom-right on desktop, full-width bottom sheet on mobile.
 */
import { useEffect, useState } from "react";
import { Smartphone, X, Download } from "lucide-react";

interface Settings { showGetAppPopup?: boolean; getAppUrl?: string; }

const DISMISSED_KEY = "ksyk_get_app_dismissed_v1";

export default function GetAppPopup() {
  const [visible, setVisible] = useState(false);
  // v4.7.12 — default to relative /download so it works on any host
  // (localhost, preview deploy, prod) without a hardcoded domain.
  const [href, setHref] = useState("/download");

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Skip if dismissed this session.
    try { if (sessionStorage.getItem(DISMISSED_KEY) === "1") return; } catch { /* ignore */ }

    let cancelled = false;
    fetch("/api/settings")
      .then(r => r.json())
      .then((s: Settings) => {
        if (cancelled) return;
        // Default off: only show when the admin has explicitly enabled it.
        if (s?.showGetAppPopup !== true) return;
        if (s.getAppUrl) setHref(s.getAppUrl);
        setTimeout(() => !cancelled && setVisible(true), 3000);
      })
      .catch(() => { /* silent — popup optional */ });

    return () => { cancelled = true; };
  }, []);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    try { sessionStorage.setItem(DISMISSED_KEY, "1"); } catch { /* ignore */ }
  };

  return (
    <div
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[22rem] z-40 pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="animate-fade-in-up pointer-events-auto rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-card">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold tracking-tight">KSYK Maps mobile</p>
              <p className="text-[13px] text-muted-foreground mt-0.5 leading-relaxed">
                Kartta, lukujärjestys ja widgetit taskussasi.
              </p>
            </div>
            <button
              onClick={close}
              className="h-8 w-8 -mr-1.5 -mt-1.5 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-90 transition-all"
              aria-label="Close / Sulje"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-4">
            <a
              href={href}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[14px] font-semibold active:scale-[0.98] transition-all"
            >
              <Download className="w-4 h-4" strokeWidth={2.5} />
              Lataa Android
            </a>
            <button
              onClick={close}
              className="h-11 px-4 rounded-xl text-[14px] font-semibold text-muted-foreground hover:bg-muted active:scale-[0.98] transition-all"
            >
              Ei nyt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
