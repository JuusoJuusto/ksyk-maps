export type OsmTileProvider =
  | "osm"
  | "carto-voyager"
  | "carto-positron"
  | "carto-dark-matter"
  | "stadia-toner-lite"
  | "stadia-alidade-dark";

/** A theme-aware tile pack — light and dark are picked automatically by the
 * current app theme. Admins choose a pack (e.g. "Carto") rather than two
 * separate providers. */
export type OsmTileTheme = "default" | "minimal" | "high-contrast" | "osm-standard";

export const OSM_TILE_THEMES: Record<
  OsmTileTheme,
  { name: string; nameFi: string; light: OsmTileProvider; dark: OsmTileProvider; description: string }
> = {
  default: {
    name: "Default (Carto)",
    nameFi: "Oletus (Carto)",
    light: "carto-voyager",
    dark: "carto-dark-matter",
    description: "Carto Voyager (light) + Dark Matter (dark) — best all-round readability.",
  },
  minimal: {
    name: "Minimal",
    nameFi: "Minimaalinen",
    light: "carto-positron",
    dark: "carto-dark-matter",
    description: "Muted, low-detail tiles that let overlays breathe.",
  },
  "high-contrast": {
    name: "High Contrast",
    nameFi: "Korkea kontrasti",
    light: "stadia-toner-lite",
    dark: "stadia-alidade-dark",
    description: "Stark monochrome tiles for accessibility.",
  },
  "osm-standard": {
    name: "OpenStreetMap Standard",
    nameFi: "OpenStreetMap",
    light: "osm",
    dark: "carto-dark-matter",
    description: "Classic OSM tiles (no dark variant; falls back to Dark Matter).",
  },
};

export type AppSettings = {
  showGrid: boolean;
  showWingLabels: boolean;
  smoothPan: boolean;
  mapZoomSpeed: number;
  threeDQuality: "low" | "medium" | "high";
  threeDShadows: boolean;
  threeDAutoRotate: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  devShowDebug: boolean;
  devShowCoords: boolean;
  // Campus geolocation + OSM overlay config
  useOsmBasemap: boolean;
  osmCenterLat: number;
  osmCenterLng: number;
  osmDefaultZoom: number;
  osmMaxZoom: number;
  osmMinZoom: number;
  osmRotationDeg: number;
  osmPitchDeg: number;
  osmTileProvider: OsmTileProvider;
  /** Tile provider used when dark mode is active. Falls back to osmTileProvider if unset. */
  osmTileProviderDark: OsmTileProvider;
  /** Preferred way to pick tiles — a theme-aware pack. When this is set the
   * raw providers above are derived from it on every render. */
  osmTileTheme: OsmTileTheme;
  // Where the SVG campus (1600x900 world) maps onto the real world (degrees of arc).
  // 1 world-unit = ~0.1m, so 1600 units = ~160m. We anchor the SVG centre to the
  // (lat, lng) above and scale by the bbox span below.
  osmCampusSpanMeters: number;
  /** When enabled, Leaflet restricts panning to a bounding box. The four
   * values define the corners. If disabled, users can pan freely. */
  osmMaxBoundsEnabled: boolean;
  osmMaxBoundsNorth: number;
  osmMaxBoundsEast: number;
  osmMaxBoundsSouth: number;
  osmMaxBoundsWest: number;
};

const STORAGE_KEY = "ksyk_app_settings_v2";

export const DEFAULT_APP_SETTINGS: AppSettings = {
  showGrid: true,
  showWingLabels: true,
  smoothPan: true,
  mapZoomSpeed: 1,
  threeDQuality: "high",
  threeDShadows: true,
  threeDAutoRotate: false,
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  devShowDebug: false,
  devShowCoords: false,
  useOsmBasemap: true,
  // Kulosaaren Yhteiskoulu (KSYK), Helsinki — already referenced in fmiWeather.ts
  osmCenterLat: 60.187,
  osmCenterLng: 25.006,
  osmDefaultZoom: 19.5,
  osmMaxZoom: 20,
  osmMinZoom: 15,
  osmRotationDeg: 0,
  osmPitchDeg: 0,
  osmTileProvider: "carto-voyager",
  osmTileProviderDark: "carto-dark-matter",
  osmTileTheme: "default",
  osmCampusSpanMeters: 220,
  // Default bounds ≈ ±400 m around the KSYK centre so users can't pan to
  // another country, but still have headroom for exploring the neighbourhood.
  osmMaxBoundsEnabled: true,
  osmMaxBoundsNorth: 60.1906,
  osmMaxBoundsEast: 25.0125,
  osmMaxBoundsSouth: 60.1834,
  osmMaxBoundsWest: 24.9995,
};

export const OSM_TILE_PROVIDERS: Record<OsmTileProvider, { name: string; url: string; attribution: string; maxNativeZoom: number }> = {
  osm: {
    name: "OpenStreetMap Standard",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
  },
  "carto-voyager": {
    name: "Carto Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19,
  },
  "carto-positron": {
    name: "Carto Positron (light)",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19,
  },
  "carto-dark-matter": {
    name: "Carto Dark Matter",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19,
  },
  "stadia-toner-lite": {
    name: "Stadia Stamen Toner Lite",
    url: "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://stamen.com">Stamen</a>, &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxNativeZoom: 18,
  },
  "stadia-alidade-dark": {
    name: "Stadia Alidade Smooth Dark",
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxNativeZoom: 20,
  },
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
