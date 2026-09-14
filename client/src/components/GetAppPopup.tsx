/**
 * "Get the app" popup — nudges web visitors to install the Android app.
 * Feature-flagged via /api/settings.showGetAppPopup. Shows once per
 * session (sessionStorage flag). Dismiss to hide for the tab.
 *
 * Sits above map with a small semi-transparent card in the bottom-right
 * on desktop, full-width bottom sheet on mobile. Follows Apple HIG
 * "Onboarding" pattern — a soft prompt, not a blocking modal.
 */
import { useEffect, useState } from "react";
import { Smartphone, X, Download } from "lucide-react";

interface Settings { showGetAppPopup?: boolean; getAppUrl?: string; }

const DISMISSED_KEY = "ksyk_get_app_dismissed_v1";

export default function GetAppPopup() {
  const [visible, setVisible] = useState(false);
  const [href, setHref] = useState("https://ksykmaps.fi/download");

  useEffect(() => {
    // Skip on the app itself — this is only for web visitors.
    if (typeof window === "undefined") return;
    if (/wv|Version.*Mobile.*Safari|(iPhone|iPad|iPod|Android)/i.test(navigator.userAgent)) {
      // Mobile web — show the popup because they can install
    }
    // Skip if dismissed this session
    try { if (sessionStorage.getItem(DISMISSED_KEY) === "1") return; } catch { /* ignore */ }

    let cancelled = false;
    fetch("/api/settings")
      .then(r => r.json())
      .then((s: Settings) => {
        if (cancelled) return;
        if (!s?.showGetAppPopup) return;
        if (s.getAppUrl) setHref(s.getAppUrl);
        // Delay 3 s so the user sees the map first
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
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-40 pointer-events-none">
      <div className="pointer-events-auto rounded-2xl shadow-2xl overflow-hidden border border-border bg-card">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">KSYK Maps mobile</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Kartta, lukujärjestys ja widgetit taskussasi. Push-ilmoitukset tunneista ja kuulutuksista.
              </p>
            </div>
            <button
              onClick={close}
              className="text-muted-foreground hover:text-foreground -mr-1 -mt-1 shrink-0"
              aria-label="Sulje"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <a
              href={href}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Lataa Android
            </a>
            <button
              onClick={close}
              className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              Ehkä myöhemmin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
