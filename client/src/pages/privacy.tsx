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
            {isFi ? "Päivitetty syyskuu 2026 · KSYK Maps" : "Updated September 2026 · KSYK Maps"}
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
