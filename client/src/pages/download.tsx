/**
 * /download - the public "get the app" page.
 *
 * Same document shell as FAQ / Privacy / Support: hairline header, uppercase
 * masthead, navy H1, hairline panels. Three honest states, all driven by the
 * admin settings (Settings > Features > Downloads):
 *   1. downloads on, no Play listing  -> the latest signed APK + install steps
 *   2. downloads on, Play link set    -> Google Play first, APK as the fallback
 *   3. downloads off                  -> a "coming soon" screen (page still works)
 * The APK version comes from shared/release.ts, the same constant the build
 * uses to verify the file exists, so the button can never point at a stale
 * or missing release.
 */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Download, Check, ExternalLink, ShieldCheck, Smartphone } from "lucide-react";
import { ANDROID_APP_VERSION, ANDROID_MIN_VERSION, apkPath } from "@shared/release";
import { APP_VERSION } from "@/lib/changelog";
import { usePublicFlags } from "@/lib/publicFlags";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";
import { trackFeatureUse } from "@/lib/analytics";
import { pageTitle } from "@shared/seo";

const hairline = "border-[#d5dae0] dark:border-[#2a3040]";
const navyText = "text-[#003d82] dark:text-[#4a90d9]";
const masthead = cn("text-[10px] font-bold tracking-[0.08em] uppercase", navyText);

const COPY = {
  en: {
    back: "Map",
    masthead: "App",
    h1: "Download KSYK Maps",
    lead: "The campus map in your pocket: works offline, with home-screen widgets and lesson reminders.",
    android: "Android",
    version: "Version",
    requires: `Android ${ANDROID_MIN_VERSION} or newer`,
    downloadApk: "Download APK",
    directApk: "Download the APK directly",
    getOnPlay: "Get it on Google Play",
    signed: "Signed release",
    free: "Free, no account needed",
    stepsTitle: "Install on Android",
    steps: [
      "Download the APK above. Your browser may ask to keep the file; choose Keep.",
      "Open the downloaded file. If Android asks, allow your browser to install apps (Install unknown apps).",
      "Tap Install, then open KSYK Maps.",
    ],
    insideTitle: "What you get",
    inside: [
      "Campus map and room search that work without a connection",
      "Home-screen widgets: now, next and today",
      "Lesson reminder notifications from your Wilma timetable",
      "Material You colours on Android 12 and newer",
    ],
    ios: "iPhone and iPad",
    iosBody: "There is no native iOS app. Install the web app instead: open ksykmaps.fi in Safari, tap Share, then Add to Home Screen. It works offline and gets its own icon.",
    soonChip: "Temporarily unavailable",
    soonH: "The app is coming soon",
    soonBody: "Downloads are paused while the next version is finished. Nothing is wrong with your phone or connection. The web app works in any browser in the meantime.",
    soonPlay: "Google Play: coming soon",
    openWeb: "Open the web app",
    support: "Questions? Contact support",
    privacy: "Privacy policy",
    loading: "Loading",
  },
  fi: {
    back: "Kartta",
    masthead: "Sovellus",
    h1: "Lataa KSYK Maps",
    lead: "Kampuskartta taskussa: toimii offline-tilassa, mukana kotinäytön widgetit ja tuntimuistutukset.",
    android: "Android",
    version: "Versio",
    requires: `Android ${ANDROID_MIN_VERSION} tai uudempi`,
    downloadApk: "Lataa APK",
    directApk: "Lataa APK suoraan",
    getOnPlay: "Hae Google Playsta",
    signed: "Allekirjoitettu julkaisu",
    free: "Ilmainen, ei tiliä",
    stepsTitle: "Asennus Androidille",
    steps: [
      "Lataa APK-tiedosto yllä olevasta painikkeesta. Selain voi kysyä säilytetäänkö tiedosto; valitse Säilytä.",
      "Avaa ladattu tiedosto. Jos Android kysyy, salli selaimelle sovellusten asennus (Tuntemattomien sovellusten asennus).",
      "Napauta Asenna ja avaa KSYK Maps.",
    ],
    insideTitle: "Mitä saat",
    inside: [
      "Kampuskartta ja huonehaku, jotka toimivat ilman verkkoyhteyttä",
      "Kotinäytön widgetit: nyt, seuraava ja tänään",
      "Tuntimuistutukset Wilma-lukujärjestyksestäsi",
      "Material You -värit Android 12:ssa ja uudemmissa",
    ],
    ios: "iPhone ja iPad",
    iosBody: "iOS-sovellusta ei ole. Asenna verkkosovellus: avaa ksykmaps.fi Safarissa, napauta Jaa ja valitse Lisää Koti-valikkoon. Se toimii offline-tilassa ja saa oman kuvakkeen.",
    soonChip: "Tilapäisesti pois käytöstä",
    soonH: "Sovellus tulee pian",
    soonBody: "Lataukset ovat tauolla, kun seuraavaa versiota viimeistellään. Puhelimessasi tai yhteydessäsi ei ole vikaa. Verkkosovellus toimii kaikilla selaimilla sillä välin.",
    soonPlay: "Google Play: tulossa",
    openWeb: "Avaa verkkosovellus",
    support: "Kysyttävää? Ota yhteyttä",
    privacy: "Tietosuojaseloste",
    loading: "Ladataan",
  },
} as const;

type Lang = keyof typeof COPY;

function readLang(): Lang {
  try {
    const stored = localStorage.getItem("ksyk_language");
    return stored && stored.toLowerCase().startsWith("fi") ? "fi" : "en";
  } catch {
    return "en";
  }
}

const primaryBtn = cn(
  "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[6px] text-[14px] font-bold transition-colors",
  "bg-[#003d82] text-white hover:bg-[#002d5f] active:bg-[#002550]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d82]/40 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950",
);
const secondaryBtn = cn(
  "inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[6px] text-[14px] font-semibold transition-colors border",
  hairline,
  "bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d82]/30",
);

export default function DownloadPage() {
  const { darkMode } = useDarkMode();
  const flags = usePublicFlags();
  const [lang, setLang] = useState<Lang>(readLang);
  const t = COPY[lang];

  useEffect(() => {
    try { trackFeatureUse("download_page_view"); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    document.title = pageTitle("/download", lang);
    return () => { document.title = "KSYK Maps"; };
  }, [lang]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ksyk_language" && typeof e.newValue === "string") {
        setLang(e.newValue.toLowerCase().startsWith("fi") ? "fi" : "en");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const track = (kind: "apk" | "play") => {
    try { trackFeatureUse(kind === "apk" ? "download_apk_click" : "download_play_click", { version: ANDROID_APP_VERSION }); } catch { /* noop */ }
  };

  const apk = apkPath();
  const state: "loading" | "soon" | "play" | "apk" =
    !flags.loaded ? "loading"
    : !flags.downloadsEnabled ? "soon"
    : flags.playStoreUrl ? "play"
    : "apk";

  return (
    <div
      className={cn("min-h-screen flex flex-col", darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900")}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <header className={cn("border-b shrink-0 bg-white dark:bg-gray-950", hairline)}>
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 h-9 -ml-2 px-2 rounded-[6px] text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            {t.back}
          </Link>
          <button
            type="button"
            onClick={() => {
              const next: Lang = lang === "fi" ? "en" : "fi";
              setLang(next);
              try { localStorage.setItem("ksyk_language", next); } catch { /* ignore */ }
            }}
            className={cn("text-[12px] font-bold tracking-wide h-8 px-2.5 rounded-[6px] border bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 transition-colors", hairline)}
            aria-label={lang === "fi" ? "Switch to English" : "Vaihda suomeksi"}
          >
            {lang === "fi" ? "EN" : "FI"}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-5 py-6 sm:py-8">
        <div className={cn("mb-6 pb-4 border-b", hairline)}>
          <p className={cn(masthead, "mb-1")}>{t.masthead}</p>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-[1.15] text-gray-900 dark:text-white">
            {t.h1}
          </h1>
          <p className="text-[14px] mt-1.5 text-gray-600 dark:text-gray-400 max-w-xl">{t.lead}</p>
        </div>

        {state === "loading" && (
          <div
            className={cn("rounded-[8px] border bg-white dark:bg-gray-950 p-5 h-[168px]", hairline)}
            role="status"
            aria-label={t.loading}
          >
            <div className="h-3 w-24 rounded-[4px] bg-gray-100 dark:bg-gray-900 animate-pulse" />
            <div className="h-6 w-48 rounded-[4px] bg-gray-100 dark:bg-gray-900 animate-pulse mt-3" />
            <div className="h-11 w-44 rounded-[6px] bg-gray-100 dark:bg-gray-900 animate-pulse mt-6" />
          </div>
        )}

        {state === "soon" && (
          <section
            className="rounded-[8px] border border-amber-300/70 dark:border-amber-700/50 bg-white dark:bg-gray-950 overflow-hidden"
            aria-live="polite"
            data-testid="download-coming-soon"
          >
            <div className="px-5 pt-5 pb-1">
              <span className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[0.08em] uppercase text-amber-800 dark:text-amber-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                </span>
                {t.soonChip}
              </span>
            </div>
            <div className="px-5 pb-5">
              <h2 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-gray-900 dark:text-white mt-2">{t.soonH}</h2>
              <p className="text-[14px] leading-[1.6] text-gray-600 dark:text-gray-400 mt-1.5 max-w-xl">{t.soonBody}</p>
              <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
                <Link href="/" className={primaryBtn}>
                  {t.openWeb}
                  <ExternalLink className="h-4 w-4" strokeWidth={2.25} />
                </Link>
                <button type="button" disabled className={cn(secondaryBtn, "opacity-60 cursor-not-allowed")}>
                  <Smartphone className="h-4 w-4" strokeWidth={2.25} />
                  {t.soonPlay}
                </button>
              </div>
            </div>
          </section>
        )}

        {(state === "apk" || state === "play") && (
          <section className={cn("rounded-[8px] border bg-white dark:bg-gray-950", hairline)} data-testid="download-available">
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={masthead}>{t.android}</p>
                  <p className="text-[20px] font-bold tracking-tight text-gray-900 dark:text-white mt-1">
                    {t.version} {ANDROID_APP_VERSION}
                  </p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{t.requires}</p>
                </div>
                <span className={cn("hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-[4px] border text-gray-600 dark:text-gray-300", hairline)}>
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.25} />
                  {t.signed}
                </span>
              </div>

              <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
                {state === "play" ? (
                  <>
                    <a
                      href={flags.playStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track("play")}
                      className={primaryBtn}
                      data-testid="download-play"
                    >
                      <ExternalLink className="h-4 w-4" strokeWidth={2.25} />
                      {t.getOnPlay}
                    </a>
                    <a href={apk} download onClick={() => track("apk")} className={cn("text-[13px] font-semibold hover:underline underline-offset-2", navyText)}>
                      {t.directApk} (v{ANDROID_APP_VERSION})
                    </a>
                  </>
                ) : (
                  <a href={apk} download onClick={() => track("apk")} className={primaryBtn} data-testid="download-apk">
                    <Download className="h-4 w-4" strokeWidth={2.5} />
                    {t.downloadApk}
                  </a>
                )}
              </div>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-3">{t.free}</p>
            </div>

            {state === "apk" && (
              <div className={cn("border-t px-5 py-4", hairline)}>
                <p className={cn(masthead, "mb-2")}>{t.stepsTitle}</p>
                <ol className="space-y-2">
                  {t.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-[14px] leading-[1.55] text-gray-700 dark:text-gray-300">
                      <span className="shrink-0 w-6 text-[11px] font-bold tabular-nums text-gray-400 dark:text-gray-600 pt-[3px]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className={cn("border-t px-5 py-4", hairline)}>
              <p className={cn(masthead, "mb-2")}>{t.insideTitle}</p>
              <ul className="space-y-1.5">
                {t.inside.map((line) => (
                  <li key={line} className="flex items-start gap-2 text-[14px] leading-[1.55] text-gray-700 dark:text-gray-300">
                    <Check className={cn("h-4 w-4 mt-[3px] shrink-0", navyText)} strokeWidth={2.5} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className={cn("mt-4 rounded-[8px] border bg-white dark:bg-gray-950 p-5", hairline)}>
          <p className={masthead}>{t.ios}</p>
          <p className="text-[14px] leading-[1.6] text-gray-700 dark:text-gray-300 mt-1.5">{t.iosBody}</p>
        </section>

        <div className={cn("mt-8 pt-4 border-t flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500 dark:text-gray-400", hairline)}>
          <Link href="/support" className={cn("font-semibold hover:underline underline-offset-2", navyText)}>{t.support}</Link>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <Link href="/privacy" className={cn("font-semibold hover:underline underline-offset-2", navyText)}>{t.privacy}</Link>
          <span className="ml-auto text-[11px] font-mono uppercase tracking-wider text-gray-400">web {APP_VERSION}</span>
        </div>
      </main>
    </div>
  );
}
