import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";

interface Q { q: string; a: string; qEn?: string; aEn?: string; }

const QUESTIONS: Q[] = [
  {
    q: "Miten yhdistän Wilman lukujärjestykseeni?",
    a: "Avaa mobiilisovelluksesta Asetukset → Tili → 'Yhdistä Wilma-kalenteri'. Kopioi Wilman iCal-osoite Omat asetukset → Kalenteri → 'Kalenterien tilausosoitteet' ja liitä se sovellukseen. Tunnit ilmestyvät Lukujärjestys-välilehdelle automaattisesti.",
    qEn: "How do I connect my Wilma timetable?",
    aEn: "Open Mobile app → Settings → Account → 'Connect Wilma calendar'. Copy your Wilma iCal URL from Wilma → My settings → Calendar → 'Calendar subscription URLs' and paste it into the app. Lessons appear on the Timetable tab automatically.",
  },
  {
    q: "En saa push-ilmoituksia. Miksi?",
    a: "1) Varmista että asensit uusimman APK:n. 2) Anna sovellukselle ilmoituslupa: Asetukset → Sovellukset → KSYK Maps → Ilmoitukset. 3) Avaa sovellus vähintään kerran netin kanssa — laite rekisteröityy vasta silloin.",
    qEn: "I don't get push notifications. Why?",
    aEn: "1) Make sure you installed the latest APK. 2) Grant notification permission: Settings → Apps → KSYK Maps → Notifications. 3) Open the app at least once while online — the device only registers after that.",
  },
  {
    q: "Miten lisään widgetin kotinäytölle?",
    a: "Paina kotinäyttöä pitkään → 'Widgetit' → selaa alas 'KSYK'-kohtaan. Valitse haluamasi (Päivän lukujärjestys / Seuraava tunti / Nyt tunnilla) ja vedä paikalleen. Voit muuttaa kokoa ja asetuksia painamalla widgetiä pitkään.",
    qEn: "How do I add a widget to my home screen?",
    aEn: "Long-press your home screen → 'Widgets' → scroll to 'KSYK'. Choose the one you want (Today's Schedule / Next Lesson / Current Lesson) and drag it into place. You can resize and reconfigure by long-pressing the widget.",
  },
  {
    q: "Kartta näyttää vanhoja huoneita — miksi?",
    a: "Sovellus tallentaa kartan levylle jotta se avautuu nopeasti offline-tilassa. Pakota päivitys: Asetukset → Tallennustila → 'Tyhjennä välimuisti'. Live-tiedot latautuvat seuraavalla avauksella.",
    qEn: "The map shows outdated rooms — why?",
    aEn: "The app caches map data on disk so it opens fast offline. Force refresh: Settings → Storage → 'Clear cache'. Live data reloads on the next open.",
  },
  {
    q: "Milloin muistutus lukujärjestyksestä tulee?",
    a: "Oletuksena 5 minuuttia ennen tuntia. Voit muuttaa aikaa 0–30 minuuttiin Asetukset → Ilmoitukset → 'Muistutuksen aika ennen tuntia' -liukusäätimestä.",
    qEn: "When does the lesson reminder fire?",
    aEn: "Default is 5 minutes before class. You can change it 0–30 minutes in Settings → Notifications → 'Reminder lead time before class' slider.",
  },
  {
    q: "Kuinka pyydän uutta huonetta tai virheenkorjausta?",
    a: "Sovelluksen sisällä: Asetukset → 'Anna palautetta' tai 'Ilmoita viasta'. Molemmat menevät suoraan hallintapaneeliin.",
    qEn: "How do I request a new room or report a bug?",
    aEn: "Inside the app: Settings → 'Give feedback' or 'Report a bug'. Both go straight to the admin panel.",
  },
  {
    q: "Voinko käyttää sovellusta ilman kirjautumista?",
    a: "Kyllä. Kartta, huonehaku, lounas ja HSL-aikataulut toimivat ilman tunnusta. Wilma-tunnukset tarvitaan vain kun haluat oman lukujärjestyksesi automaattisesti.",
    qEn: "Can I use the app without logging in?",
    aEn: "Yes. Map, room search, lunch, and HSL times all work without an account. You only need Wilma credentials if you want your own timetable auto-imported.",
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const { darkMode } = useDarkMode();
  // v1.0.2 — default English when the user hasn't set a language yet
  // (matches privacy / cookie banner / login gate behaviour).  Finnish
  // is now opt-in via the Header EN/FI toggle.
  const [lang, setLang] = useState<"fi" | "en">(() => {
    try {
      const stored = localStorage.getItem("ksyk_language");
      if (!stored) return "en";
      return stored.toLowerCase().startsWith("fi") ? "fi" : "en";
    } catch { return "en"; }
  });
  const isFi = lang === "fi";

  useEffect(() => {
    document.title = isFi ? "UKK — KSYK Maps" : "FAQ — KSYK Maps";
    return () => { document.title = "KSYK Maps"; };
  }, [isFi]);

  // Keep in sync with other pages' language changes.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ksyk_language" && typeof e.newValue === "string") {
        setLang(e.newValue.toLowerCase().startsWith("fi") ? "fi" : "en");
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
      {/* ── Document header — hairline bottom, compact, Wilma-style ── */}
      <header className="border-b border-[#d5dae0] dark:border-[#2a3040] shrink-0 bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 h-9 -ml-2 px-2 rounded-[6px] text-[13px] font-semibold text-gray-700 dark:text-gray-300 hover:text-[#003d82] dark:hover:text-[#4a90d9] hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
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
        {/* ── Document title block ─────────────────────────────────── */}
        <div className="mb-6 pb-4 border-b border-[#d5dae0] dark:border-[#2a3040]">
          <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#003d82] dark:text-[#4a90d9] mb-1">
            {isFi ? "Ohje" : "Help"}
          </p>
          <h1 className="text-[22px] sm:text-[26px] font-bold tracking-tight leading-[1.15] text-gray-900 dark:text-white">
            {isFi ? "Usein kysytyt kysymykset" : "Frequently asked questions"}
          </h1>
          <p className="text-[13px] mt-1 text-gray-500 dark:text-gray-400">
            {isFi ? `${QUESTIONS.length} kysymystä` : `${QUESTIONS.length} entries`}
          </p>
        </div>

        {/* ── Hairline-divider accordion list ───────────────────────── */}
        <div className="border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] bg-white dark:bg-gray-950">
          {QUESTIONS.map((q, i) => {
            const open = openIdx === i;
            const question = isFi ? q.q : (q.qEn ?? q.q);
            const answer   = isFi ? q.a : (q.aEn ?? q.a);
            return (
              <div
                key={i}
                className={cn(
                  "border-b border-[#d5dae0] dark:border-[#2a3040] last:border-b-0 transition-colors",
                  open && "bg-[#f5f6f8] dark:bg-[#12161f]",
                )}
              >
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center gap-3 text-left px-4 py-3.5 min-h-[48px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003d82]/30 focus-visible:ring-inset transition-colors"
                  aria-expanded={open}
                >
                  <span className="text-[11px] font-bold tabular-nums text-gray-400 dark:text-gray-600 shrink-0 w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 font-semibold text-[14px] leading-snug text-gray-900 dark:text-gray-100">
                    {question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200 text-gray-500",
                      open && "rotate-180 text-[#003d82] dark:text-[#4a90d9]",
                    )}
                    strokeWidth={2.25}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 pl-[52px] text-[14px] leading-[1.6] text-gray-700 dark:text-gray-300 whitespace-pre-line">
                      {answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-4 border-t border-[#d5dae0] dark:border-[#2a3040] flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-500 dark:text-gray-400">
          <span>
            {isFi ? "Ei löytynyt vastausta?" : "Didn't find your answer?"}
          </span>
          <Link href="/support" className="text-[#003d82] dark:text-[#4a90d9] hover:underline underline-offset-2 font-semibold">
            {isFi ? "Ota yhteyttä" : "Contact support"}
          </Link>
          <span className="text-gray-300 dark:text-gray-700">·</span>
          <Link href="/privacy" className="text-[#003d82] dark:text-[#4a90d9] hover:underline underline-offset-2 font-semibold">
            {isFi ? "Tietosuoja" : "Privacy"}
          </Link>
        </div>
      </main>
    </div>
  );
}
