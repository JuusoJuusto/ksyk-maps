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
  const [lang, setLang] = useState<"fi" | "en">(() => {
    try { return (localStorage.getItem("ksyk_language") || "fi").startsWith("en") ? "en" : "fi"; } catch { return "fi"; }
  });
  const isFi = lang === "fi";

  useEffect(() => {
    document.title = isFi ? "UKK — KSYK Maps" : "FAQ — KSYK Maps";
    return () => { document.title = "KSYK Maps"; };
  }, [isFi]);

  return (
    <div
      className={cn("min-h-screen flex flex-col", darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900")}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <header className="border-b border-border/50 shrink-0 animate-fade-in">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 h-11 -ml-2 px-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {isFi ? "Takaisin kartalle" : "Back to map"}
          </Link>
          <button
            onClick={() => setLang(l => l === "fi" ? "en" : "fi")}
            className={cn(
              "text-[13px] font-semibold h-9 px-3 rounded-lg transition-colors",
              darkMode
                ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
                : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200",
            )}
          >
            {isFi ? "In English" : "Suomeksi"}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-5 py-8">
        <div className="mb-6 animate-fade-in-up">
          <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight leading-[1.15]">
            {isFi ? "Usein kysytyt kysymykset" : "Frequently asked questions"}
          </h1>
          <p className={cn("text-[15px] mt-1.5", darkMode ? "text-gray-400" : "text-gray-500")}>
            {isFi ? `${QUESTIONS.length} kysymystä` : `${QUESTIONS.length} questions`}
          </p>
        </div>

        <div className="space-y-2">
          {QUESTIONS.map((q, i) => {
            const open = openIdx === i;
            const question = isFi ? q.q : (q.qEn ?? q.q);
            const answer   = isFi ? q.a : (q.aEn ?? q.a);
            return (
              <div
                key={i}
                className={cn(
                  "animate-fade-in-up rounded-2xl border overflow-hidden transition-colors duration-150",
                  darkMode
                    ? open
                      ? "bg-gray-900 border-gray-700"
                      : "bg-gray-900/50 border-gray-800 hover:border-gray-700"
                    : open
                      ? "bg-white border-gray-200 shadow-sm"
                      : "bg-white/70 border-gray-100 hover:bg-white hover:border-gray-200",
                )}
                style={{ animationDelay: `${60 + i * 40}ms` }}
              >
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="w-full flex items-center justify-between gap-3 text-left px-5 py-4 min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset rounded-2xl active:scale-[0.995] transition-transform"
                  aria-expanded={open}
                >
                  <span className={cn("font-medium text-[15px] leading-snug", darkMode ? "text-gray-100" : "text-gray-900")}>
                    {question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      open && "rotate-180",
                      darkMode ? "text-gray-500" : "text-gray-400",
                    )}
                  />
                </button>
                {/* CSS grid trick: animates height without JS measurement */}
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out",
                    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className={cn(
                      "px-5 pb-5 pt-2 text-[14px] leading-relaxed border-t",
                      darkMode ? "text-gray-300 border-gray-800" : "text-gray-600 border-gray-100",
                    )}>
                      {answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className={cn(
            "animate-fade-in text-center py-8 text-[13px] space-y-2",
            darkMode ? "text-gray-500" : "text-gray-400",
          )}
          style={{ animationDelay: "400ms" }}
        >
          <div>
            {isFi ? "Ei löytynyt vastausta? " : "Didn't find your answer? "}
            <Link href="/support" className="text-blue-500 hover:text-blue-400 underline underline-offset-2 transition-colors">
              {isFi ? "Ota yhteyttä" : "Contact us"}
            </Link>
          </div>
          <div>
            <Link href="/privacy" className="text-blue-500 hover:text-blue-400 underline underline-offset-2 transition-colors">
              {isFi ? "Tietosuojaseloste" : "Privacy policy"}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
