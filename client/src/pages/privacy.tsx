import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";

interface Section {
  heading: string;
  headingEn: string;
  body: string;
  bodyEn: string;
}

const SECTIONS: Section[] = [
  {
    heading: "Mitä tietoja keräämme",
    headingEn: "What we collect",
    body: `Keräämme vain tietoja, jotka ovat välttämättömiä palvelun toimivuuden ja kehittämisen kannalta.

Analytiikka: Käytämme PostHog-analytiikkaalustaa sivunäkymien, ominaisuuksien käyttöasteen ja virheilmoitusten seuraamiseen. Tiedot ovat anonymisoituja eikä niitä yhdistetä henkilökohtaisiin tietoihin. Voit kieltäytyä analytiikan keruusta sivuston evästekonsentin kautta.

Tukipyynnöt: Kun täytät tukilomakkeen osoitteessa /support, tallennamme antamasi tiedot: otsikon, kuvauksen, typin ja prioriteetin. Nimi ja sähköpostiosoite ovat valinnaisia. Tietoja käytetään vain yhteydenoton käsittelyyn.

Järjestelmänvalvojan istunto: Järjestelmänvalvojat kirjautuvat palvelun hallintapaneeliin. Kirjautumistila tallennetaan palvelinpuolen evästeeseen (HttpOnly) — selain ei pääse siihen käsiksi JavaScriptillä.

Tavallisilla käyttäjillä ei ole käyttäjätiliä eikä sovellus kerää sijaintitietoja kartan selailusta.`,
    bodyEn: `We only collect information that is necessary for the service to function and improve.

Analytics: We use PostHog to track page views, feature usage, and error reports. This data is anonymised and not linked to personally identifying information. You can opt out through the cookie consent banner on the site.

Support tickets: When you submit a form at /support, we store what you provide: a title, description, type, and priority. Name and email are optional. This information is used only to handle your enquiry.

Admin session: Admins authenticate to the management panel. Login state is stored in a server-side cookie (HttpOnly) — JavaScript on the page cannot access it.

Regular visitors have no user account and the app does not collect location data from map browsing.`,
  },
  {
    heading: "Evästeet ja paikallinen tallennustila",
    headingEn: "Cookies and local storage",
    body: `Evästeet: Sivusto voi asettaa analytiikkaevästeitä (PostHog), jos hyväksyt ne evästekonsentin kautta. Järjestelmänvalvojan kirjautuminen käyttää HttpOnly-istuntoevästettä.

Paikallinen tallennustila (localStorage): Tallennamme laitteellesi kielivalinnan, tumman tilan ja muita sovelluksen asetuksia. Nämä tiedot eivät poistu laitteeltasi.`,
    bodyEn: `Cookies: The site may set analytics cookies (PostHog) if you accept them through the consent banner. Admin login uses an HttpOnly session cookie.

Local storage: We store language preference, dark mode, and other app settings on your device via localStorage. This data stays on your device and is never sent to our servers.`,
  },
  {
    heading: "Tietojen käyttö",
    headingEn: "How we use your data",
    body: `Analytiikkatietoja käytetään palvelun kehittämiseen: ymmärtämään mitä ominaisuuksia käytetään ja missä esiintyy virheitä.

Tukipyynnöt käsittelee KSYK Maps -tiimi. Tietoja ei jaeta kolmansille osapuolille eikä käytetä mainontaan.`,
    bodyEn: `Analytics data is used to improve the service — to understand which features are used and where errors occur.

Support tickets are handled by the KSYK Maps team. Your data is not shared with third parties and is not used for advertising.`,
  },
  {
    heading: "Tietojen säilytys",
    headingEn: "Data retention",
    body: `Tukipyynnöt säilytetään hallintapaneelissa toistaiseksi tai kunnes ne poistetaan manuaalisesti. Analytiikkatiedot säilytetään PostHogin omien käytäntöjen mukaisesti. Voit pyytää tietojesi poistoa ottamalla yhteyttä tukilomakkeen kautta.`,
    bodyEn: `Support tickets are retained in the admin panel indefinitely or until manually deleted. Analytics data is retained in accordance with PostHog's own retention policies. You may request deletion of your data by contacting us through the support form.`,
  },
  {
    heading: "Oikeutesi",
    headingEn: "Your rights",
    body: `Sinulla on oikeus pyytää pääsyä tietoihisi, niiden oikaisemista tai poistamista. Lähetä pyyntö tukilomakkeen (/support) kautta.`,
    bodyEn: `You have the right to request access to, correction of, or deletion of your data. Send your request through the support form at /support.`,
  },
  {
    heading: "Muutokset tähän selosteeseen",
    headingEn: "Changes to this policy",
    body: `Voimme päivittää tätä tietosuojaselostetta. Merkittävistä muutoksista ilmoitetaan sovelluksessa.`,
    bodyEn: `We may update this privacy policy. Significant changes will be announced within the app.`,
  },
  {
    heading: "Yhteystiedot",
    headingEn: "Contact",
    body: `Tietosuojaa koskevat kysymykset: käytä tukilomaketta osoitteessa /support.`,
    bodyEn: `Privacy enquiries: use the support form at /support.`,
  },
];

export default function Privacy() {
  const { darkMode } = useDarkMode();
  // Follow the app's language setting. Default to Finnish only when no
  // preference is stored yet; anything starting with "en" is English.
  const [lang, setLang] = useState<"fi" | "en">(() => {
    try {
      const stored = localStorage.getItem("ksyk_language");
      if (!stored) return "fi";
      return stored.toLowerCase().startsWith("en") ? "en" : "fi";
    } catch { return "fi"; }
  });
  const isFi = lang === "fi";

  useEffect(() => {
    document.title = isFi ? "Tietosuoja — KSYK Maps" : "Privacy — KSYK Maps";
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
      <header className="border-b border-border/50 shrink-0 animate-fade-in">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 h-11 -ml-2 px-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {isFi ? "Takaisin kartalle" : "Back to map"}
          </Link>
          <button
            onClick={() => {
              const next = lang === "fi" ? "en" : "fi";
              setLang(next);
              try { localStorage.setItem("ksyk_language", next); } catch { /* ignore */ }
            }}
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
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-[26px] sm:text-[28px] font-semibold tracking-tight leading-[1.15]">
            {isFi ? "Tietosuojaseloste" : "Privacy policy"}
          </h1>
          <p className={cn("text-[15px] mt-1.5", darkMode ? "text-gray-400" : "text-gray-500")}>
            {isFi ? "Päivitetty syyskuu 2026" : "Updated September 2026"}
          </p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map((s, i) => (
            <section
              key={i}
              className="animate-fade-in-up"
              style={{ animationDelay: `${80 + i * 40}ms` }}
            >
              <h2 className={cn("text-[17px] font-semibold tracking-tight mb-2", darkMode ? "text-gray-100" : "text-gray-900")}>
                {isFi ? s.heading : s.headingEn}
              </h2>
              <div className={cn(
                "text-[15px] leading-relaxed space-y-3",
                darkMode ? "text-gray-300" : "text-gray-600",
              )}>
                {(isFi ? s.body : s.bodyEn).split("\n\n").map((para, j) => (
                  <p key={j}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div
          className={cn(
            "animate-fade-in text-center py-8 text-[13px]",
            darkMode ? "text-gray-500" : "text-gray-400",
          )}
          style={{ animationDelay: "500ms" }}
        >
          {isFi ? "Kysyttävää? " : "Questions? "}
          <Link href="/support" className="text-blue-500 hover:text-blue-400 underline underline-offset-2">
            {isFi ? "Ota yhteyttä" : "Contact us"}
          </Link>
        </div>
      </main>
    </div>
  );
}
