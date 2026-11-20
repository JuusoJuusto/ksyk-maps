/**
 * Public-route registry — the single source of truth for what search engines
 * may index.  Read by the build-time prerender (scripts/prerender.ts), the
 * client's RouteMeta, the sitemap generator and the SEO tests.  Adding a page
 * here is what makes it appear in sitemap.xml; nothing else lists URLs.
 */

/**
 * Canonical origin.  Production serves content on www; the apex host answers
 * with a redirect to it, so canonicals must name www.  Flip this (and the
 * Vercel domain redirect) together if the apex ever becomes primary.
 */
export const SITE_ORIGIN = "https://www.ksykmaps.fi";
export const SITE_NAME = "KSYK Maps";

export type SeoLang = "en" | "fi";

export type PageKind = "home" | "lunch" | "download" | "faq" | "support" | "privacy";

export interface PublicPage {
  /** Canonical path, no trailing slash except "/". */
  path: string;
  kind: PageKind;
  title: { en: string; fi?: string };
  description: { en: string; fi?: string };
}

export const PUBLIC_PAGES: readonly PublicPage[] = [
  {
    path: "/",
    kind: "home",
    title: {
      en: "KSYK Maps - Campus map of Kulosaaren yhteiskoulu",
      fi: "KSYK Maps - Kulosaaren yhteiskoulun kampuskartta",
    },
    description: {
      en: "Interactive map of Kulosaaren yhteiskoulu (KSYK) in Helsinki: find classrooms, get directions, check the lunch menu and bus times, or get the Android app.",
      fi: "Kulosaaren yhteiskoulun (KSYK) interaktiivinen kartta: etsi luokkahuoneet, saa reittiohjeet, katso ruokalista ja bussiajat tai lataa Android-sovellus.",
    },
  },
  {
    path: "/lunch",
    kind: "lunch",
    title: {
      en: "Lunch menu (Ruokalista) - KSYK Maps",
      fi: "Ruokalista - KSYK Maps",
    },
    description: {
      en: "This week's lunch menu (ruokalista) at the Kulosaaren yhteiskoulu school restaurant: lunch, vegetarian option and dessert for each weekday, from Amica.",
      fi: "Kulosaaren yhteiskoulun kouluravintolan viikon ruokalista: lounas, kasvislounas ja jälkiruoka arkipäiville, Amican tarjoama.",
    },
  },
  {
    path: "/download",
    kind: "download",
    // The page is what people land on from "ksyk maps", so the title says what
    // it is (a download) rather than just the brand.
    title: {
      en: "Download KSYK Maps - free Android app (APK)",
      fi: "Lataa KSYK Maps - Android-sovellus (APK)",
    },
    description: {
      en: "Download the free KSYK Maps app for Android: offline campus map, home-screen widgets and lesson reminders. iPhone users can add the web app to the home screen.",
      fi: "Lataa ilmainen KSYK Maps -sovellus Androidille: offline-kampuskartta, kotinäytön widgetit ja tuntimuistutukset. iPhonella voit lisätä verkkosovelluksen kotinäytölle.",
    },
  },
  {
    path: "/faq",
    kind: "faq",
    title: {
      en: "KSYK Maps FAQ - Wilma timetable, widgets and offline use",
      fi: "UKK - KSYK Maps: Wilma, widgetit ja offline-käyttö",
    },
    description: {
      en: "Frequently asked questions about KSYK Maps: connecting your Wilma timetable, home-screen widgets, lesson reminders, offline use and finding your classroom.",
      fi: "Usein kysytyt kysymykset KSYK Mapsista: Wilma-lukujärjestyksen yhdistäminen, widgetit, tuntimuistutukset, offline-käyttö ja reitit luokkiin.",
    },
  },
  {
    path: "/support",
    kind: "support",
    title: { en: "Support and bug reports - KSYK Maps" },
    description: {
      en: "Report a bug, request a feature or ask a question about KSYK Maps. The support form goes to the KSYK Maps team.",
    },
  },
  {
    path: "/privacy",
    kind: "privacy",
    title: {
      en: "Privacy policy - KSYK Maps",
      fi: "Tietosuojaseloste - KSYK Maps",
    },
    description: {
      en: "How KSYK Maps handles data: analytics, cookies, local storage, support tickets and your rights. Visitors need no account and no location data is collected.",
      fi: "Miten KSYK Maps käsittelee tietoja: analytiikka, evästeet, paikallinen tallennustila, tukipyynnöt ja oikeutesi. Käyttäjätiliä ei tarvita eikä sijaintitietoa kerätä.",
    },
  },
];

/**
 * First path segment of every route that must never be indexed: private
 * screens, token URLs, API, and public-but-thin utility pages (HSL kiosk) or
 * duplicate aliases (/app → /download, /report → /support).  vercel.json turns
 * this list into an X-Robots-Tag header; a test keeps the two in step.
 */
export const NOINDEX_ROOTS: readonly string[] = [
  "admin",
  "admin-login",
  "admin-ksyk-management-portal",
  "builder",
  "grant",
  "api",
  "hsl",
  "app",
  "report",
  "secret-easter-egg",
  "konami-code-activated",
  "dev-mode-secret",
];

const normalise = (path: string) => {
  const clean = path.split(/[?#]/)[0] || "/";
  return clean.length > 1 ? clean.replace(/\/+$/, "") : clean;
};

export function findPublicPage(path: string): PublicPage | undefined {
  const p = normalise(path);
  return PUBLIC_PAGES.find((page) => page.path === p);
}

export function canonicalUrl(path: string): string {
  const p = normalise(path);
  return p === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${p}`;
}

function required(path: string): PublicPage {
  const page = findPublicPage(path);
  if (!page) throw new Error(`seo: "${path}" is not a registered public page`);
  return page;
}

export function pageTitle(path: string, lang: SeoLang = "en"): string {
  const { title } = required(path);
  return (lang === "fi" && title.fi) || title.en;
}

export function pageDescription(path: string, lang: SeoLang = "en"): string {
  const { description } = required(path);
  return (lang === "fi" && description.fi) || description.en;
}
