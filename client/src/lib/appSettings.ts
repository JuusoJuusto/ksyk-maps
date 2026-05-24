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
};

const STORAGE_KEY = "ksyk_app_settings_v1";

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
