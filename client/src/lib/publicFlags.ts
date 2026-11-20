/**
 * Admin-controlled switches the public site reads from GET /api/settings:
 *  - showChangelog: the "Changelog" tab in the settings panel (hidden by default)
 *  - downloadsEnabled: /download shows the app, or a "coming soon" screen
 *  - playStoreUrl: once set, the Google Play button replaces the APK download
 *
 * Failing to load them never hides the site: defaults keep downloads on and
 * the changelog off.
 */
import { useEffect, useState } from "react";

export interface PublicFlags {
  showChangelog: boolean;
  downloadsEnabled: boolean;
  playStoreUrl: string;
  /** false until the first response (or failure) arrives. */
  loaded: boolean;
}

export const DEFAULT_FLAGS: PublicFlags = {
  showChangelog: false,
  downloadsEnabled: true,
  playStoreUrl: "",
  loaded: false,
};

const PLAY_URL = /^https:\/\/play\.google\.com\/store\/apps\/details\?[^\s]+$/i;

export function parsePublicFlags(raw: unknown): PublicFlags {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const url = typeof r.playStoreUrl === "string" ? r.playStoreUrl.trim() : "";
  return {
    showChangelog: r.showChangelog === true,
    downloadsEnabled: r.downloadsEnabled !== false,
    // Re-validated here: the value ends up as a link on a public page.
    playStoreUrl: PLAY_URL.test(url) ? url : "",
    loaded: true,
  };
}

let cached: PublicFlags | null = null;
let inflight: Promise<PublicFlags> | null = null;

export function loadPublicFlags(): Promise<PublicFlags> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch("/api/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => parsePublicFlags(json))
      .catch(() => ({ ...DEFAULT_FLAGS, loaded: true }))
      .then((flags) => {
        cached = flags;
        return flags;
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function usePublicFlags(): PublicFlags {
  const [flags, setFlags] = useState<PublicFlags>(cached ?? DEFAULT_FLAGS);
  useEffect(() => {
    let live = true;
    void loadPublicFlags().then((f) => { if (live) setFlags(f); });
    return () => { live = false; };
  }, []);
  return flags;
}
