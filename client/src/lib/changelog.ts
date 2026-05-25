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

export const APP_VERSION = "3.1.2";

export const KSYK_CHANGELOG: ChangelogEntry[] = [
  {
    version: "3.1.2",
    date: "May 2026",
    title: "Campus map refresh",
    titleFi: "Karttapäivitys",
    latest: true,
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
