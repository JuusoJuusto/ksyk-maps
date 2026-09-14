/**
 * FAQ page (/faq) — plain content page with expand/collapse questions.
 * Referenced from Footer + Support flow. Keeps the copy in one place so
 * admins don't answer the same 5 questions on Discord every week.
 */
import { useState } from "react";
import { Link } from "wouter";
import { ChevronDown, HelpCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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
    a: "1) Varmista että asensit uusimman APK:n (v1.82.0+). 2) Anna sovellukselle ilmoituslupa: Asetukset → Sovellukset → KSYK Maps → Ilmoitukset. 3) Avaa sovellus vähintään kerran netin kanssa — laite rekisteröityy vasta silloin.",
    qEn: "I don't get push notifications. Why?",
    aEn: "1) Make sure you installed the latest APK (v1.82.0+). 2) Grant notification permission: Settings → Apps → KSYK Maps → Notifications. 3) Open the app at least once while online — the device only registers after that.",
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
    a: "Sovelluksen sisällä: Asetukset → 'Anna palautetta' tai 'Ilmoita viasta'. Molemmat menevät suoraan hallintapaneeliin, joten kehittäjä saa ne heti.",
    qEn: "How do I request a new room or report a bug?",
    aEn: "Inside the app: Settings → 'Give feedback' or 'Report a bug'. Both go straight to the admin panel — the developer sees them immediately.",
  },
  {
    q: "Voinko käyttää sovellusta ilman kirjautumista?",
    a: "Kyllä. Kartta, huonehaku, lounas ja HSL-aikataulut toimivat ilman tunnusta. Wilma-tunnukset tarvitaan vain kun haluat oman lukujärjestyksesi automaattisesti.",
    qEn: "Can I use the app without logging in?",
    aEn: "Yes. Map, room search, lunch, and HSL times all work without an account. You only need Wilma credentials if you want your own timetable auto-imported.",
  },
  {
    q: "Miksi 'sovellus voi olla haitallinen' -varoitus asennettaessa?",
    a: "Android varoittaa aina APK-tiedostoista jotka eivät tule Play Storesta — se ei tarkoita että sovellus olisi haitallinen. Voit ohittaa varoituksen kohdasta 'Asenna kuitenkin'. Play Store -julkaisu on työn alla.",
    qEn: "Why does Android say 'app may be harmful' during install?",
    aEn: "Android always warns about APKs not from the Play Store — it doesn't mean the app is malicious. Tap 'Install anyway'. Play Store release is in progress.",
  },
  {
    q: "Missä TODO tai kehityssuunnitelma on?",
    a: "Repossa on TODO.md-tiedosto (github.com/JuusoJuusto/ksyk-maps/blob/main/TODO.md) jossa on kaikki mitä on tehty, meneillään ja jonossa.",
    qEn: "Where is the TODO or roadmap?",
    aEn: "The repo has a TODO.md file (github.com/JuusoJuusto/ksyk-maps/blob/main/TODO.md) listing everything shipped, in progress, and queued.",
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [lang, setLang] = useState<"fi" | "en">(() => {
    try { return (localStorage.getItem("i18nextLng") || "fi").startsWith("en") ? "en" : "fi"; } catch { return "fi"; }
  });
  const isFi = lang === "fi";
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <HelpCircle className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold flex-1">{isFi ? "Usein kysytyt kysymykset" : "Frequently Asked Questions"}</h1>
          <button
            onClick={() => setLang(l => l === "fi" ? "en" : "fi")}
            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-muted hover:bg-muted/70"
          >
            {isFi ? "EN" : "FI"}
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-5 py-6 space-y-2">
        {QUESTIONS.map((q, i) => {
          const open = openIdx === i;
          const question = isFi ? q.q : (q.qEn ?? q.q);
          const answer   = isFi ? q.a : (q.aEn ?? q.a);
          return (
            <div key={i} className={cn(
              "rounded-lg border border-border overflow-hidden transition-colors",
              open ? "bg-card" : "bg-card hover:bg-muted/40",
            )}>
              <button
                onClick={() => setOpenIdx(open ? null : i)}
                className="w-full flex items-center justify-between gap-3 text-left px-4 py-3.5"
              >
                <span className="font-semibold text-sm">{question}</span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
              </button>
              {open && (
                <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed border-t border-border">
                  {answer}
                </div>
              )}
            </div>
          );
        })}
        <div className="text-center py-8 text-xs text-muted-foreground">
          {isFi ? "Kysyttävää joka ei löytynyt? " : "Question not answered? "}
          <Link href="/support" className="text-primary underline">
            {isFi ? "Anna palautetta" : "Send feedback"}
          </Link>
        </div>
      </main>
    </div>
  );
}
