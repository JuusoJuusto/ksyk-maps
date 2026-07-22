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

export const APP_VERSION = "3.22.0";

export const KSYK_CHANGELOG: ChangelogEntry[] = [
  {
    version: "3.22.0",
    date: "July 2026",
    title: "Announcement popup overhaul + more colorful map tiles",
    titleFi: "Ilmoituspopupin uusi ilme + värikkäämmät karttatiilet",
    latest: true,
    highlights: [
      "Announcement popup: full-bleed gradient hero (per priority), animated pulse icon in a glass circle, sparkle decoration, richer bullet points, priority-tinted CTA button",
      "Announcement banner strip: matching gradient + subtle glass shine",
      "Dot pager in the popup footer indicates which announcement is showing when there are multiple",
      "Map tiles: +15% saturation and +8% contrast in light mode (light greens/blues pop as MazeMap-style diagram), dark mode gets a gentle -10% saturation for calmer nights",
    ],
    highlightsFi: [
      "Ilmoituspopup: värillinen otsikko, sykkivä ikoni, pisteet uudessa muodossa",
      "Ilmoitusbanneri: yhtenäinen väriliuku + kiiltoheijaste",
      "Karttatiilet: +15% saturaatio ja +8% kontrasti kevyellä teemalla",
    ],
  },
  {
    version: "3.21.0",
    date: "July 2026",
    title: "Floors in builder, no-hyphen room names, nav auto-scroll + reset",
    titleFi: "Kerrokset rakentajassa, ei viivaa huoneiden nimissä, navigaation nollaus",
    highlights: [
      "Builder floor selector — MazeMap-style vertical chip in top-right; rooms filter by active floor, new rooms land on the selected floor",
      "Off-floor rooms fade to 8% opacity as ghost context — you never lose spatial awareness",
      "Room auto-naming drops the hyphen: A1, A2, B12 (was A-1, A-2, B-12)",
      "Navigation: active step auto-scrolls into view + Reset button in the timeline header",
      "Arrival banner (green Flag row) when the user taps the final step",
    ],
    highlightsFi: [
      "Rakentajan kerrosvalitsin, uudet huoneet menevät valittuun kerrokseen",
      "Muiden kerrosten huoneet häivytetään 8% läpinäkyvyyteen",
      "Huoneiden numerointi ilman viivaa: A1, A2, B12",
      "Navigaatio: aktiivinen askel vieritetään näkyviin + Nollaa-nappula",
      "Perilläolobanneri kun käyttäjä pääsee viimeiseen askeleeseen",
    ],
  },
  {
    version: "3.20.0",
    date: "July 2026",
    title: "KSYK Maps rebrand + 3D POI pillars + door/entrance markers",
    titleFi: "KSYK Maps -brändi + 3D-POI-pylväät + ovi/sisäänkäyntimerkit",
    highlights: [
      "Stripped 'by Nordbyte Studio' from browser tab, PWA manifest, splash, header, settings, landing, admin login, and version info",
      "Every generic POI (info, cafe, vending, water, first aid, AED, printer, meeting, parking, bike, restrooms) now extrudes as a 2.2 m colored pillar in 3D",
      "Doors extrude as short gray pads; entrances as taller green pads so users see building access at a glance in 3D",
      "Emergency exits render red",
      "package.json author updated to 'KSYK Maps'",
    ],
    highlightsFi: [
      "Poistettu 'by Nordbyte Studio' otsikoista, manifestista, ja käyttöliittymästä",
      "Jokainen POI näkyy nyt 3D:ssä värillisenä pylväänä",
      "Ovet lyhyinä harmaina alustoina, sisäänkäynnit korkeampina vihreinä",
      "Hätäuloskäynnit punaisia",
    ],
  },
  {
    version: "3.19.0",
    date: "July 2026",
    title: "3D map: sky, sun-lit shading, drop shadows, stair towers, ghost floors",
    titleFi: "3D-kartta: taivas, aurinkovarjostus, varjot, portaikkotornit, aavehuoneet",
    highlights: [
      "MazeMap-style directional light — buildings now cast warm sunlit shading in light mode, cool moonlit in dark mode",
      "Atmospheric sky layer visible when the map is pitched — soft blue horizon with a warm sun halo",
      "Ground drop shadows offset SE under every building for depth",
      "Stair (amber) + elevator (blue) 3D towers pierce the shell so users see where vertical transit lives",
      "Ghost lower floors: rooms below the active floor render at low opacity so the vertical stack always reads",
    ],
    highlightsFi: [
      "MazeMap-tyylinen suunnattu valo — rakennukset lämpimässä auringonvalossa",
      "Ilmakehän taivaskerros kun kartta on kallistettu",
      "Rakennusten varjot kaakkoon syvyyden luomiseksi",
      "Portaikko- (amber) ja hissi- (sininen) 3D-tornit rakennuksen läpi",
      "Alempien kerrosten huoneet läpikuultavina niin pinon rakenne näkyy",
    ],
  },
  {
    version: "3.18.1",
    date: "July 2026",
    title: "Nicer empty states + Publish success flash",
    titleFi: "Paremmat tyhjät tilat + julkaisun onnistumisvinkki",
    highlights: [
      "Search dropdown empty state: iconed hero + 'try a room number' hint",
      "Builder sidebar empty states: colored bubble + wider hint text",
      "Navigation empty state: rich card with directional prompt + how to add endpoints",
      "Publish button flashes green with a checkmark for 2s after a successful publish",
    ],
    highlightsFi: [
      "Hakuvalikko: iso ikoni + 'kokeile huoneen numeroa' -vinkki",
      "Rakentajan sivupalkki: värillinen kuvake + ohje",
      "Navigaatio: rikas ohjekortti kun aloitusta/kohdetta ei ole valittu",
      "Julkaisunappula vihertää + näyttää ✓ kun julkaisu onnistui",
    ],
  },
  {
    version: "3.18.0",
    date: "July 2026",
    title: "Keyboard cheat sheet, ⌘K search, compass pitch dial",
    titleFi: "Pikanäppäinvalikko, ⌘K haku, kompassin kallistus",
    highlights: [
      "Builder: press ? to open a MazeMap-style keyboard cheat sheet (or the floating '?' button)",
      "Header: ⌘K / Ctrl K focuses the search input; keyboard hint pill on the right",
      "Compass chip now shows a thin arc around it that fills with the current 3D pitch",
      "Search input polished: larger, rounded, focus glow, blue search icon while typing",
    ],
    highlightsFi: [
      "Rakentaja: paina ? avataksesi pikanäppäinvalikon",
      "Otsikko: ⌘K / Ctrl K kohdistaa hakukentän",
      "Kompassichip näyttää nyt kallistusmittarin renkaana",
      "Haku suurempi, pyöreämpi, sinisellä ikonin korostuksella",
    ],
  },
  {
    version: "3.17.1",
    date: "July 2026",
    title: "POI category filters, MazeMap coach chip, info sheet hero",
    titleFi: "POI-kategoriasuodattimet, työkaluvinkkichip, tietopaneelin bänneri",
    highlights: [
      "Public map: POI category filters (Transit / Info / Restrooms / Food / Safety / Amenities) in the Layers popover — hide entire groups you don't want",
      "Builder coach chip: icon + tool name + Esc hint + live cursor coords, styled per tool",
      "Feature info sheet: colored hero band matching the entity's tint, bigger title",
    ],
    highlightsFi: [
      "Kartta: POI-kategoriasuodattimet Tasot-valikossa — piilota kokonaisia ryhmiä",
      "Rakentajan ohjenappula: kuvake + työkalun nimi + Esc-vinkki + kohdistin",
      "Tietopaneeli: väriviiva kohteen värillä, isompi otsikko",
    ],
  },
  {
    version: "3.17.0",
    date: "July 2026",
    title: "MazeMap-style POI flyout — toolbar no longer squished",
    titleFi: "MazeMap-tyylinen POI-valikko — työkalupalkki ei enää ahdas",
    highlights: [
      "Builder toolbar refactored into groups: Cursor, Shape, POIs, Delete",
      "All 18 POI tools now live behind a single 'POIs' button that opens a categorised popover (Transit, Info, Restrooms, Food, Safety, Amenities)",
      "Popover tinted per category, matches the map's chip color palette",
      "Group dividers + hotkey ghosts on shape tools for CAD polish",
    ],
    highlightsFi: [
      "Rakentajan työkalupalkki ryhmitelty: Osoitin, Muodot, POI:t, Poisto",
      "18 POI-työkalua nyt yhden POI-napin takana kategoriapopoverissa",
      "Popover värikoodattu kategoreittain, sopii kartan värimaailmaan",
    ],
  },
  {
    version: "3.16.1",
    date: "July 2026",
    title: "Hover highlights, POI tooltip, drag-to-move, active step",
    titleFi: "Osoitinkorostus, POI-vinkki, siirto, aktiivinen askel",
    highlights: [
      "Room + building fill brightens on hover (MazeMap-style feature-state)",
      "Public map POIs show a floating tooltip on hover with kind + floor",
      "Builder: drag anywhere inside a selected building/room to translate the whole shape",
      "Navigation: active step highlighted in the timeline + remaining distance/time pill",
      "Past steps dim so the user's progress is visually obvious",
    ],
    highlightsFi: [
      "Huoneen + rakennuksen täyttö kirkastuu osoitettaessa",
      "Julkinen kartta: POI-vinkki tyyppi + kerros näkyy osoitettaessa",
      "Rakentaja: vedä valitun rakennuksen/huoneen sisältä siirtääksesi koko muotoa",
      "Navigaatio: aktiivinen askel korostettu + jäljellä oleva matka/aika",
      "Menneet askeleet himmenevät niin että edistyminen näkyy visuaalisesti",
    ],
  },
  {
    version: "3.16.0",
    date: "July 2026",
    title: "Configurable 3D heights, CAD polish, HD basemap, 3D toggle fix",
    titleFi: "Säädettävät 3D-korkeudet, CAD-viilaus, HD-taustakartta, 3D-korjaus",
    highlights: [
      "3D toggle fix — first press now shows extrusion (was: only tilted, needed a second press)",
      "Room fill now visible starting at zoom 15 so buildings never hide rooms in public map",
      "Per-building height controls in Style tab: heightPerFloor, totalHeight override, wallThickness",
      "Per-room slab height in Style tab (0.05–2.5 m) for column-style room visuals",
      "CAD: live dimension callouts on every polygon edge (draw + edit), Shift-axis-lock, 15° rotation snap, arrow-key nudge",
      "HD basemap: CARTO Voyager @2x tiles, fade at zoom 19+, room labels + POI chips grow at close zoom",
      "Extended map max zoom from 19 → 21 so users can inspect campus interior detail",
    ],
    highlightsFi: [
      "3D-korjaus — ensimmäinen painallus näyttää nyt rakennukset (ennen: vain kallistus)",
      "Huoneet näkyvät kartalla jo zoomilla 15, eivät piiloudu rakennusten alle",
      "Rakennuskohtaiset korkeussäätimet Style-välilehdellä",
      "Huonekohtainen laatan korkeus Style-välilehdellä",
      "CAD: mittalaput jokaisen polygonin sivulle, Shift-akselilukko, 15° kääntösnap, nuolinäppäinsiirto",
      "HD-taustakartta: CARTO Voyager @2x, hivenettävä zoomilla 19+, huonemerkinnät suuremmiksi",
      "Kartan maksimi zoomia nostettu 19 → 21 sisätilojen tarkasteluun",
    ],
  },
  {
    version: "3.15.0",
    date: "July 2026",
    title: "MazeMap-style 3D + 15 new POIs + turn-by-turn timeline",
    titleFi: "MazeMap-tyylinen 3D + 15 uutta POI:ta + reittiaikajana",
    highlights: [
      "3D scene overhaul: lower walls, floor slabs, roof caps, rooms now stack ON buildings",
      "Three.js walkthrough: hollow building shells, per-floor plates, rooms as raised platforms",
      "Builder POIs: café, vending, water, first aid, AED, printer, meeting point",
      "Navigation: MazeMap-style turn-by-turn timeline with typed icons + floor-change chips",
      "Map: hover cursor on interactive features, floor picker polish",
    ],
    highlightsFi: [
      "3D-uudistus: matalammat seinät, kerroslaatat, katot; huoneet asettuvat rakennuksen päälle",
      "Three.js-kävely: läpinäkyvät rakennuskuoret, kerroslaatat, huoneet kohotettuina alustoina",
      "Rakentajaan POI:t: kahvila, automaatti, vesi, ensiapu, AED, tulostin, tapaamispaikka",
      "Navigaatio: MazeMap-tyylinen käännösohjeaikajana ikoneilla + kerrosvaihtojen merkinnät",
      "Kartta: osoitin muuttuu klikattavien päällä, kerrosvalitsin viimeistelty",
    ],
  },
  {
    version: "3.1.6",
    date: "May 2026",
    title: "2D-only map polish",
    titleFi: "2D-kartan viimeistely",
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
