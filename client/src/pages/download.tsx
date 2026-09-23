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
import { Smartphone, Apple, Download, ArrowLeft, ShieldCheck, ExternalLink } from "lucide-react";
import { APP_VERSION } from "@/lib/changelog";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";
import { trackFeatureUse } from "@/lib/analytics";

// v1.90.0 is our current Android release; keep this in sync with
// android/app/build.gradle.kts versionName. The APK is served from
// public/releases/ so no CDN or GitHub Release lookup needed.
const LATEST_ANDROID_VERSION = "1.91.0";
const APK_HREF = `/releases/ksykmaps-release-${LATEST_ANDROID_VERSION}.apk`;

export default function DownloadPage() {
  const { darkMode } = useDarkMode();

  useEffect(() => {
    try { trackFeatureUse("download_page_view"); } catch { /* noop */ }
  }, []);

  const onDownloadAndroid = () => {
    try { trackFeatureUse("download_apk_click", { version: LATEST_ANDROID_VERSION }); } catch { /* noop */ }
    // Let the browser handle the .apk href — the anchor's `download`
    // attr triggers a save-as flow on desktop; on mobile Android the
    // Chrome flow prompts to install.
  };

  return (
    <div className={cn(
      "min-h-screen w-full flex flex-col",
      darkMode ? "bg-gray-950 text-gray-100" : "bg-white text-gray-900",
    )}>
      <header className="border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to map
          </Link>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
            web {APP_VERSION}
          </span>
        </div>
      </header>

      {/* v4.7.21 — apple-design pass: dropped the giant decorative
       *  bg-blue-500/10 icon circle above the title, shrunk H1 from
       *  text-3xl/4xl to text-2xl/3xl, removed the two colored icon
       *  circles inside each platform card (name + version already
       *  identify the row). "Available"/"Coming later" chips lose
       *  their colored fills too — the copy carries the meaning. */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-xl w-full">
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
              Get the KSYK Maps app
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Faster than the browser, works offline, plus home-screen widgets for your schedule.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Android */}
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-semibold">Android</h2>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">v{LATEST_ANDROID_VERSION}</p>
                </div>
                <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  Available
                </span>
              </div>
              <ul className="text-[12px] text-muted-foreground space-y-1.5 mb-4 flex-1">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
                  Home-screen widgets (Now / Next / Today)
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
                  Lesson reminder notifications
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400 mt-0.5">✓</span>
                  Material You dynamic colors (Android 12+)
                </li>
              </ul>
              <a
                href={APK_HREF}
                onClick={onDownloadAndroid}
                download={`ksykmaps-${LATEST_ANDROID_VERSION}.apk`}
                className={cn(
                  "inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl font-semibold text-sm transition-all",
                  "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20",
                  "hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-700/30",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2",
                  "active:scale-[0.98] active:shadow-none",
                )}
              >
                <Download className="h-4 w-4" strokeWidth={2.5} />
                Download APK
              </a>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                Signed release build · direct install
              </p>
            </div>

            {/* iOS — honest coming-later state */}
            <div className="rounded-xl border border-border bg-card p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[15px] font-semibold">iOS</h2>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Not yet</p>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  Coming later
                </span>
              </div>
              <ul className="text-[12px] text-muted-foreground space-y-1.5 mb-4 flex-1">
                <li>iPhone / iPad app is in the design phase.</li>
                <li>Until then, the web app is fully installable via <b>Add to Home Screen</b> in Safari — it works offline and gets a home icon.</li>
              </ul>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl font-semibold text-sm bg-muted text-muted-foreground cursor-not-allowed"
              >
                <Apple className="h-4 w-4" strokeWidth={2.5} />
                App Store — TBA
              </button>
              <p className="text-[10px] text-muted-foreground mt-2">
                Want it sooner? <Link href="/support" className="underline hover:text-foreground">Let us know</Link>.
              </p>
            </div>
          </div>

          {/* Web fallback */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Or open the web app in your browser
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
