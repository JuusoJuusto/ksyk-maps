/**
 * KSYK Maps — beta welcome message (v4.7.56).
 *
 * Shown once per visitor on first map load.  Explains the beta status
 * and where to report issues.  Finnish-only (per user) with an English
 * fallback for non-Finnish visitors.  Dismissible, remembers it via
 * localStorage.  Rendered as a Wilma-document dialog so it matches the
 * rest of the chrome.
 */

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, X, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const SEEN_KEY = "ksyk_beta_welcome_seen_v1";

export default function BetaWelcomeBanner() {
  const { i18n } = useTranslation();
  const isFi = i18n.language === "fi";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) === "1") return;
      // Delay so the map renders first — avoids the banner stealing
      // focus mid-boot and spooking users with a modal on first paint.
      const t = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(t);
    } catch {
      /* localStorage unavailable — skip the banner silently */
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* */ }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent
        className={cn(
          "p-0 gap-0 overflow-hidden flex flex-col",
          "bg-white dark:bg-gray-950",
          "shadow-[0_24px_60px_-12px_rgba(15,23,42,0.4)]",
          "[&>button:first-of-type]:hidden",
          "fixed inset-0 translate-x-0 translate-y-0 top-0 left-0 right-0 bottom-0",
          "w-screen h-[100dvh] max-w-none max-h-none rounded-none",
          "border-0",
          "sm:fixed sm:top-[50%] sm:left-[50%] sm:bottom-auto sm:right-auto",
          "sm:-translate-x-1/2 sm:-translate-y-1/2 sm:inset-auto",
          "sm:h-auto sm:max-h-[88dvh] sm:w-[min(94vw,32rem)] sm:max-w-[32rem]",
          "sm:rounded-[8px] sm:border sm:border-[#d5dae0] sm:dark:border-[#2a3040]",
        )}
      >
        {/* Amber beta accent bar */}
        <div className="shrink-0 h-[3px] bg-amber-500" />

        {/* Header */}
        <div
          className="shrink-0 border-b border-[#d5dae0] dark:border-[#2a3040] px-5 sm:px-6 py-4 sm:py-5 flex items-start justify-between gap-3"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top, 1rem))" }}
        >
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase text-amber-700 dark:text-amber-400 mb-1">
              <AlertTriangle className="h-3 w-3" strokeWidth={2.5} />
              {isFi ? "Beta-vaihe" : "Beta release"}
            </p>
            <DialogTitle className="text-[20px] sm:text-[24px] font-bold tracking-tight leading-tight text-gray-900 dark:text-white">
              {isFi ? "Tervetuloa käyttämään KSYK Mapsia" : "Welcome to KSYK Maps"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isFi ? "Palvelu on beta-vaiheessa." : "This service is in beta."}
            </DialogDescription>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 h-9 w-9 rounded-[6px] flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={isFi ? "Sulje" : "Close"}
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        {/* Body */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 sm:py-6"
          style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 1.25rem))" }}
        >
          <div className="text-[14px] sm:text-[15px] leading-[1.7] text-gray-800 dark:text-gray-200 space-y-3">
            {isFi ? (
              <>
                <p>
                  Palvelu on tällä hetkellä beta-vaiheessa, joten saatat vielä kohdata bugeja,
                  puuttuvia tietoja tai keskeneräisiä ominaisuuksia.
                </p>
                <p>
                  Jos löydät bugin, tarvitset apua tai sinulla on kehitysehdotus, ota yhteyttä
                  tukitiimiin osoitteessa{" "}
                  <a
                    href="/support"
                    onClick={dismiss}
                    className="font-semibold text-[#003d82] dark:text-[#4a90d9] hover:underline underline-offset-2"
                  >
                    ksykmaps.fi/support
                  </a>
                  .
                </p>
                <p>Kiitos, että käytät KSYK Mapsia.</p>
              </>
            ) : (
              <>
                <p>
                  KSYK Maps is currently in beta, so you may still run into bugs, missing data,
                  or unfinished features.
                </p>
                <p>
                  Spot a bug, need help, or have a suggestion? Reach the support team at{" "}
                  <a
                    href="/support"
                    onClick={dismiss}
                    className="font-semibold text-[#003d82] dark:text-[#4a90d9] hover:underline underline-offset-2"
                  >
                    ksykmaps.fi/support
                  </a>
                  .
                </p>
                <p>Thanks for using KSYK Maps.</p>
              </>
            )}
          </div>
        </div>

        {/* Footer action */}
        <div
          className="shrink-0 border-t border-[#d5dae0] dark:border-[#2a3040] px-5 sm:px-6 py-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))" }}
        >
          <button
            type="button"
            onClick={dismiss}
            className="w-full h-10 rounded-[6px] bg-[#003d82] hover:bg-[#002d5f] text-white text-[13px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors"
          >
            {isFi ? "Jatka karttaan" : "Open the map"}
            <ArrowRight className="h-4 w-4 opacity-80" strokeWidth={2.25} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
