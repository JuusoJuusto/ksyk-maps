/**
 * /download — public app-download landing page (v4.7.12).
 *
 * Purpose: single canonical URL for "get the KSYK Maps app" links —
 * QR codes on posters, the in-app popup, external channels. We link
 * to the latest signed APK for Android and surface an iOS "coming
 * later" state honestly rather than a dead placeholder button.
 *
 * The version string comes from client changelog.APP_VERSION so a
 * bump in one place feeds the download page automatically.
 */
import { useEffect } from "react";
import { Link } from "wouter";
import { Apple, Download, ArrowLeft, ShieldCheck, ExternalLink, Check } from "lucide-react";
import { APP_VERSION, ANDROID_APP_VERSION } from "@/lib/changelog";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";
import { trackFeatureUse } from "@/lib/analytics";

const APK_HREF = `/releases/ksykmaps-release-${ANDROID_APP_VERSION}.apk`;

export default function DownloadPage() {
  const { darkMode } = useDarkMode();

  useEffect(() => {
    try { trackFeatureUse("download_page_view"); } catch { /* noop */ }
    document.title = "Download — KSYK Maps";
    return () => { document.title = "KSYK Maps"; };
  }, []);

  const onDownloadAndroid = () => {
    try { trackFeatureUse("download_apk_click", { version: ANDROID_APP_VERSION }); } catch { /* noop */ }
  };

  const androidFeatures = [
    "Home-screen widgets (Now / Next / Today)",
    "Lesson reminder notifications",
    "Material You dynamic colors (Android 12+)",
  ];

  return (
    <div
      className={cn(
        "min-h-screen w-full flex flex-col",
        darkMode ? "bg-gray-950 text-gray-100" : "bg-white text-gray-900",
      )}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <header className="border-b border-border/50 animate-fade-in">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 h-11 -ml-2 px-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to map
          </Link>
          <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">
            web {APP_VERSION}
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-10 sm:py-12">
        <div className="max-w-xl w-full">
          <div className="text-center mb-8 animate-fade-in-up">
            <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-tight leading-[1.15] mb-2">
              Get the KSYK Maps app
            </h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground max-w-md mx-auto">
              Faster than the browser, works offline, home-screen widgets for your schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Android */}
            <div
              className="animate-fade-in-up rounded-2xl border border-gray-200 dark:border-gray-800 bg-card p-5 flex flex-col shadow-sm"
              style={{ animationDelay: "80ms" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-semibold tracking-tight">Android</h2>
                  <p className="text-[12px] font-mono text-muted-foreground mt-0.5">v{ANDROID_APP_VERSION}</p>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Available
                </span>
              </div>
              <ul className="text-[13px] leading-relaxed text-muted-foreground space-y-2 mb-5 flex-1">
                {androidFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 mt-1 shrink-0 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href={APK_HREF}
                onClick={onDownloadAndroid}
                download={`ksykmaps-${ANDROID_APP_VERSION}.apk`}
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl font-semibold text-[15px] transition-all",
                  "bg-blue-600 text-white",
                  "hover:bg-blue-700",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                  "active:scale-[0.98]",
                )}
              >
                <Download className="h-4 w-4" strokeWidth={2.5} />
                Download APK
              </a>
              <p className="text-[12px] text-muted-foreground mt-2.5 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.25} />
                Signed release · direct install
              </p>
            </div>

            {/* iOS — honest coming-later state */}
            <div
              className="animate-fade-in-up rounded-2xl border border-gray-200 dark:border-gray-800 bg-card p-5 flex flex-col shadow-sm"
              style={{ animationDelay: "160ms" }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[16px] font-semibold tracking-tight">iOS</h2>
                  <p className="text-[12px] font-mono text-muted-foreground mt-0.5">In design</p>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Coming later
                </span>
              </div>
              <ul className="text-[13px] leading-relaxed text-muted-foreground space-y-2 mb-5 flex-1">
                <li>The iPhone / iPad app is still in design.</li>
                <li>Until then, install the web app from Safari: Share → <b className="text-foreground">Add to Home Screen</b>. Works offline, gets a home icon.</li>
              </ul>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl font-semibold text-[15px] border border-gray-200 dark:border-gray-800 text-muted-foreground cursor-not-allowed"
              >
                <Apple className="h-4 w-4" strokeWidth={2.5} />
                App Store — TBA
              </button>
              <p className="text-[12px] text-muted-foreground mt-2.5">
                Want it sooner? <Link href="/support" className="underline underline-offset-2 hover:text-foreground">Let us know</Link>.
              </p>
            </div>
          </div>

          {/* Web fallback */}
          <div
            className="animate-fade-in-up mt-6 flex flex-col items-center gap-2 text-center"
            style={{ animationDelay: "240ms" }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 h-11 px-3 text-[14px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Or open the web app in your browser
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/privacy"
              className="text-[12px] text-muted-foreground/70 hover:text-muted-foreground transition-colors underline underline-offset-2"
            >
              Privacy policy
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
