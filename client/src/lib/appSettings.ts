export type OsmTileProvider = "osm" | "carto-voyager" | "carto-positron" | "stadia-toner-lite";

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
  // Where the SVG campus (1600x900 world) maps onto the real world (degrees of arc).
  // 1 world-unit = ~0.1m, so 1600 units = ~160m. We anchor the SVG centre to the
  // (lat, lng) above and scale by the bbox span below.
  osmCampusSpanMeters: number;
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
  osmDefaultZoom: 19,
  osmMaxZoom: 20,
  osmMinZoom: 14,
  osmRotationDeg: 0,
  osmPitchDeg: 0,
  osmTileProvider: "carto-voyager",
  osmCampusSpanMeters: 220,
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
  "stadia-toner-lite": {
    name: "Stadia Stamen Toner Lite",
    url: "https://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://stamen.com">Stamen</a>, &copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxNativeZoom: 18,
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
