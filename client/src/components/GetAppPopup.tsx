/**
 * "Get the app" popup — v4.7.57 Wilma rewrite.
 *
 * Admin-flag gated via `/api/settings.showGetAppPopup`.  Visible once
 * per session, dismissible, slides up from the bottom.  Styled to
 * match the rest of the Wilma chrome: hairline border, 6 px radius,
 * uppercase 10 px masthead, Wilma-navy CTA.
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Smartphone, X, Download, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Settings { showGetAppPopup?: boolean; getAppUrl?: string; }

const DISMISSED_KEY = "ksyk_get_app_dismissed_v1";
const USER_ENABLED_KEY = "ksyk_get_app_enabled_v1";

export default function GetAppPopup() {
  const { i18n } = useTranslation();
  const isFi = i18n.language === "fi";
  const [visible, setVisible] = useState(false);
  const [href, setHref] = useState("/download");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try { if (sessionStorage.getItem(DISMISSED_KEY) === "1") return; } catch { /* */ }
    // Per-user kill switch (admin-independent)
    try { if (localStorage.getItem(USER_ENABLED_KEY) === "0") return; } catch { /* */ }

    let cancelled = false;

    // v1.0.1 — wait for the map to signal ready before even fetching
    // settings.  First-load UX was being swamped by overlapping modals.
    const kick = () => {
      if (cancelled) return;
      fetch("/api/settings")
        .then(r => r.json())
        .then((s: Settings) => {
          if (cancelled) return;
          if (s?.showGetAppPopup !== true) return;
          if (s.getAppUrl) setHref(s.getAppUrl);
          // 20 s after the map is ready — gives the user ample time
          // to actually use the product before pitching the APK.
          setTimeout(() => !cancelled && setVisible(true), 20_000);
        })
        .catch(() => { /* silent */ });
    };

    const onMapReady = () => {
      window.removeEventListener("ksyk:map-ready", onMapReady);
      kick();
    };
    window.addEventListener("ksyk:map-ready", onMapReady);
    // Fallback — if the map-ready event never fires (admin panel, offline),
    // still fetch after 25 s so admins can test the popup.
    const fallback = window.setTimeout(() => {
      window.removeEventListener("ksyk:map-ready", onMapReady);
      kick();
    }, 25_000);

    return () => {
      cancelled = true;
      window.removeEventListener("ksyk:map-ready", onMapReady);
      clearTimeout(fallback);
    };
  }, []);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    try { sessionStorage.setItem(DISMISSED_KEY, "1"); } catch { /* */ }
  };

  return (
    <div
      className="fixed bottom-3 right-3 left-3 sm:left-auto sm:w-[22rem] z-40 pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className={cn(
          "pointer-events-auto overflow-hidden",
          "bg-white dark:bg-gray-950",
          "border border-[#d5dae0] dark:border-[#2a3040]",
          "border-t-[3px] border-t-[#003d82]",
          "rounded-[8px]",
          "shadow-[0_20px_40px_-12px_rgba(15,23,42,0.3)]",
          "animate-fade-in-up",
        )}
      >
        {/* Masthead row */}
        <div className="flex items-start gap-3 px-4 pt-3.5 pb-2">
          <span className="h-9 w-9 shrink-0 flex items-center justify-center rounded-[6px] bg-[#e6ecf3] dark:bg-[#4a90d9]/15 border border-[#d5dae0] dark:border-[#2a3040]">
            <Smartphone className="h-4 w-4 text-[#003d82] dark:text-[#4a90d9]" strokeWidth={2.25} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#003d82] dark:text-[#4a90d9]">
              {isFi ? "Mobiili" : "Mobile app"}
            </p>
            <p className="text-[14px] font-bold tracking-tight text-gray-900 dark:text-white leading-tight mt-0.5">
              {isFi ? "KSYK Maps taskussasi" : "KSYK Maps in your pocket"}
            </p>
          </div>
          <button
            onClick={close}
            className="shrink-0 h-7 w-7 -mr-1 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={isFi ? "Sulje" : "Close"}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        </div>

        {/* Body */}
        <p className="px-4 pb-3 text-[13px] leading-snug text-gray-600 dark:text-gray-400">
          {isFi
            ? "Kartta, lukujärjestys ja widgetit kotinäytölle."
            : "Map, timetable and widgets on your home screen."}
        </p>

        {/* Hairline + action row */}
        <div className="border-t border-[#d5dae0] dark:border-[#2a3040] flex items-stretch">
          <button
            onClick={close}
            className="flex-1 h-10 text-[13px] font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            {isFi ? "Ei nyt" : "Not now"}
          </button>
          <span className="w-px bg-[#d5dae0] dark:bg-[#2a3040]" />
          <a
            href={href}
            className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[13px] font-bold text-white bg-[#003d82] hover:bg-[#002d5f] transition-colors"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2.5} />
            {isFi ? "Lataa" : "Download"}
            <ArrowRight className="h-3.5 w-3.5 opacity-80" strokeWidth={2.25} />
          </a>
        </div>
      </div>
    </div>
  );
}
