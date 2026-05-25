/** In-app changelog — sync with CHANGELOG.md on GitHub */

export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  titleFi?: string;
  highlights: string[];
  highlightsFi?: string[];
  latest?: boolean;
};

export const APP_VERSION = "3.1.6";

export const KSYK_CHANGELOG: ChangelogEntry[] = [
  {
    version: "3.1.6",
    date: "May 2026",
    title: "2D-only map polish",
    titleFi: "2D-kartan viimeistely",
    latest: true,
    highlights: [
      "Removed 2D/3D toggle — home is 2D campus map only for now",
      "Richer map visuals: campus plate, shadows, search results, status legend",
      "Improved builder canvas and room editing panels",
    ],
    highlightsFi: [
      "2D/3D-valitsin poistettu — vain 2D-kartta etusivulla",
      "Kartta: kampusalusta, varjot, haku ja tilalegenda",
      "Rakentajan ulkoasu ja tilamuokkaus parannettu",
    ],
  },
  {
    version: "3.1.5",
    date: "May 2026",
    title: "Aalto Space–style campus map",
    titleFi: "Aalto Space -tyylinen kampuskartta",
    highlights: [
      "2D map: floating search, floor selector, room status colors, layer toggles, bottom sheets",
      "Campus builder: floor-based room editing with Aalto-style controls",
      "3D home view: room blocks per floor on wing footprints",
    ],
    highlightsFi: [
      "2D-kartta: haku, kerrosvalitsin, tilavärit, tasot ja alapaneelit",
      "Rakentaja: kerroskohtaiset tilat Aalto-tyylisillä ohjaimilla",
      "3D-näkymä: tilakuutiot kerroksittain siipien päällä",
    ],
  },
  {
    version: "3.1.4",
    date: "May 2026",
    title: "Official owl logo file & map builders",
    titleFi: "Virallinen pöllölogo ja rakentajat",
    highlights: [
      "App loads ksykmaps_logo_NEW (2).png directly; favicons regenerated from it",
      "2D map wing chips with fly-to-wing zoom and drop shadows",
      "3D view rotates toward selected wing with Finnish labels",
      "Map builder uses campus outline colors and reference labels",
    ],
    highlightsFi: [
      "Sovellus käyttää suoraan ksykmaps_logo_NEW (2).png -tiedostoa",
      "2D-kartta: siipinapit ja zoomaus valittuun siipeen",
      "3D-näkymä kääntyy valitun siiven suuntaan",
      "Karttarakentajan referenssipiirrokset ja värit",
    ],
  },
  {
    version: "3.1.3",
    date: "May 2026",
    title: "New owl logo & map polish",
    titleFi: "Uusi pöllölogo ja karttaselkeys",
    highlights: [
      "New owl map icon across the app, favicons, and PWA manifest",
      "Larger borderless logo on the home screen with soft glow",
      "Wing info cards, touch pan, and pinch-to-zoom on the 2D map",
      "Richer 3D campus view with wing quick-select chips",
      "Premium loader with Finnish and English status messages",
    ],
    highlightsFi: [
      "Uusi pöllö-karttakuvake koko sovelluksessa ja kuvakkeissa",
      "Suurempi reunaton logo etusivulla",
      "Siipitiedot, kosketuspanorointi ja nipistyszoomaus 2D-kartalla",
      "Parannettu 3D-näkymä siipivalitsimilla",
      "Uudistettu latausnäkymä suomeksi ja englanniksi",
    ],
  },
  {
    version: "3.1.2",
    date: "May 2026",
    title: "Campus map refresh",
    titleFi: "Karttapäivitys",
    highlights: [
      "New KSYK Maps logo and sharper icons across the app",
      "Unified top bar with Lunch, HSL, and Settings",
      "Clean wing-outline map (A, U, K, M, R, B) with 2D and 3D views",
      "Redesigned settings with changelog and accessibility options",
      "Improved map builder with undo/redo and pan/zoom",
    ],
    highlightsFi: [
      "Uusi KSYK Maps -logo ja terävämmät kuvakkeet",
      "Yhtenäinen yläpalkki: ruokalista, HSL ja asetukset",
      "Selkeä siipikartta (A, U, K, M, R, B) 2D- ja 3D-näkymillä",
      "Uudistetut asetukset ja muutosloki",
      "Parannettu karttarakentaja",
    ],
  },
  {
    version: "3.1.0",
    date: "March 2026",
    title: "Mobile & admin polish",
    titleFi: "Mobiili ja hallinta",
    highlights: [
      "Enhanced mobile navigation and theme system",
      "Admin settings panel with global theme controls",
      "Announcement banner on home page",
    ],
    highlightsFi: [
      "Parannettu mobiilinavigaatio ja teemat",
      "Hallinta-asetukset",
      "Tiedotebanneri etusivulla",
    ],
  },
  {
    version: "3.0.0",
    date: "2026",
    title: "Nordbyte Studio rebrand",
    titleFi: "Nordbyte Studio -brändäys",
    highlights: [
      "Rebranded to KSYK Maps by Nordbyte Studio",
      "Firebase-backed campus data",
      "Classic and modern map experiences",
    ],
    highlightsFi: [
      "KSYK Maps -brändäys",
      "Firebase-kampusdata",
      "Klassinen ja moderni karttanäkymä",
    ],
  },
];
