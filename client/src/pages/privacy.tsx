import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { PRIVACY_UPDATED, SECTIONS } from "@/content/privacy";
import { pageTitle } from "@shared/seo";

export default function Privacy() {
  const { darkMode } = useDarkMode();
  // Follow the app's language setting. Default to English when no
  // preference is stored yet — English is the neutral / more accessible
  // baseline for the widest audience. Users who have explicitly picked
  // Finnish elsewhere will see Finnish; brand-new visitors get English.
  const [lang, setLang] = useState<"fi" | "en">(() => {
    try {
      const stored = localStorage.getItem("ksyk_language");
      if (!stored) return "en";
      return stored.toLowerCase().startsWith("en") ? "en" : "fi";
    } catch { return "en"; }
  });
  const isFi = lang === "fi";

  useEffect(() => {
    document.title = pageTitle("/privacy", isFi ? "fi" : "en");
    return () => { document.title = "KSYK Maps"; };
  }, [isFi]);

  // Sync when language changes elsewhere (Settings › Language).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ksyk_language" && typeof e.newValue === "string") {
        setLang(e.newValue.toLowerCase().startsWith("en") ? "en" : "fi");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div
      className={cn("min-h-screen flex flex-col", darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900")}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* ── Document header — same shell as FAQ / Support ─────────── */}
      <header className="border-b border-[#d5dae0] dark:border-[#2a3040] shrink-0 bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 h-9 -ml-2 px-2 rounded-[6px] text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" strokeWidth={2.25} />
            {isFi ? "Kartta" : "Map"}
          </Link>
          <button
            onClick={() => {
              const next = lang === "fi" ? "en" : "fi";
              setLang(next);
              try { localStorage.setItem("ksyk_language", next); } catch { /* ignore */ }
            }}
            className="text-[12px] font-bold tracking-wide h-8 px-2.5 rounded-[6px] border border-[#d5dae0] dark:border-[#2a3040] bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 transition-colors"
          >
            {isFi ? "EN" : "FI"}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-5 py-6 sm:py-8">
        {/* Document title block — Wilma masthead */}
        <div className="mb-6 pb-4 border-b border-[#d5dae0] dark:border-[#2a3040]">
          <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#003d82] dark:text-[#4a90d9] mb-1">
            {isFi ? "Asiakirja" : "Document"}
          </p>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-[1.15] text-gray-900 dark:text-white">
            {isFi ? "Tietosuojaseloste" : "Privacy policy"}
          </h1>
          <p className="text-[13px] mt-1 text-gray-500 dark:text-gray-400">
            {`${isFi ? PRIVACY_UPDATED.fi : PRIVACY_UPDATED.en} · KSYK Maps`}
          </p>
        </div>

        {/* Table of contents — jump links */}
        <nav aria-label={isFi ? "Sisällysluettelo" : "Table of contents"} className="mb-8 border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] bg-white dark:bg-gray-950">
          <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400 px-4 pt-3 pb-1">
            {isFi ? "Sisältö" : "Contents"}
          </p>
          <ol className="pb-2">
            {SECTIONS.map((s, i) => (
              <li key={i}>
                <a
                  href={`#section-${i}`}
                  className="flex items-center gap-3 h-9 px-4 text-[13px] font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-[#003d82] dark:hover:text-[#4a90d9] transition-colors"
                >
                  <span className="text-[11px] font-bold tabular-nums text-gray-400 dark:text-gray-600 w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{isFi ? s.heading : s.headingEn}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections — flat prose, hairline separators */}
        <article className="space-y-8">
          {SECTIONS.map((s, i) => (
            <section
              key={i}
              id={`section-${i}`}
              className="scroll-mt-16"
            >
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-[11px] font-bold tabular-nums text-gray-400 dark:text-gray-600 shrink-0">
                  §{String(i + 1).padStart(2, "0")}
                </span>
                <h2 className="text-[17px] font-bold tracking-tight text-gray-900 dark:text-white">
                  {isFi ? s.heading : s.headingEn}
                </h2>
              </div>
              <div className="text-[15px] leading-[1.65] text-gray-700 dark:text-gray-300 space-y-3 pl-6">
                {(isFi ? s.body : s.bodyEn).split("\n\n").map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </article>

        <div className="mt-10 pt-4 border-t border-[#d5dae0] dark:border-[#2a3040] flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500 dark:text-gray-400">
          <span>{isFi ? "Kysyttävää?" : "Questions?"}</span>
          <Link href="/support" className="text-[#003d82] dark:text-[#4a90d9] hover:underline underline-offset-2 font-semibold">
            {isFi ? "Ota yhteyttä" : "Contact support"}
          </Link>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <Link href="/faq" className="text-[#003d82] dark:text-[#4a90d9] hover:underline underline-offset-2 font-semibold">
            {isFi ? "UKK" : "FAQ"}
          </Link>
        </div>
      </main>
    </div>
  );
}
