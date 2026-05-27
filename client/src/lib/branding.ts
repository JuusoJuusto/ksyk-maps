/**
 * KSYK Maps branding — do not use in /wilma routes
 *
 * Master asset: public/ksykmaps_logo_NEW (2).png (1024×1024 PNG)
 * Regenerate favicons: npm run icons:generate
 */

/** Filename on disk (public/) */
export const KSYK_MAPS_LOGO_FILE = "ksykmaps_logo_NEW (2).png";

/** URL-safe path for <img src> and links */
export const KSYK_MAPS_LOGO_MASTER = `/${encodeURI(KSYK_MAPS_LOGO_FILE)}`;

/** All UI surfaces use the master PNG */
export const KSYK_MAPS_LOGO = KSYK_MAPS_LOGO_MASTER;
export const KSYK_MAPS_LOGO_DISPLAY = KSYK_MAPS_LOGO_MASTER;
export const KSYK_MAPS_LOGO_HD = KSYK_MAPS_LOGO_MASTER;
export const KSYK_MAPS_LOGO_ULTRA = KSYK_MAPS_LOGO_MASTER;

export const KSYK_MAPS_LOGO_ALT = "KSYK Maps";

/** Spinning loader — classic owl (no background) */
export const KSYK_LOADER_LOGO_FILE = "ksyk_logo_old-no_bg (1).png";
export const KSYK_LOADER_LOGO = `/${encodeURI(KSYK_LOADER_LOGO_FILE)}`;
export const KSYK_LOADER_LOGO_ALT = "KSYK Maps";

/** Sized derivatives for srcset (generated from master via icons:generate) */
export const KSYK_MAPS_LOGO_128 = "/favicon-128.png";
export const KSYK_MAPS_LOGO_192 = "/favicon-192.png";
export const KSYK_MAPS_LOGO_256 = "/icon-192.png"; // 192 actually, but treated as 256 step
export const KSYK_MAPS_LOGO_512 = "/icon-512.png";
export const KSYK_MAPS_LOGO_1024 = "/icon-1024.png";

/** srcset with fine-grained steps so high-DPR mobiles still pick the small
 * favicon-128 PNG instead of downloading the 512/1024 master. */
export const KSYK_MAPS_LOGO_SRCSET = [
  `${KSYK_MAPS_LOGO_128} 128w`,
  `${KSYK_MAPS_LOGO_192} 192w`,
  `${KSYK_MAPS_LOGO_512} 512w`,
  `${KSYK_MAPS_LOGO_1024} 1024w`,
].join(", ");

export const KSYK_BRAND_BLUE = "#2563eb";

export const KSYK_GITHUB_CHANGELOG =
  "https://github.com/JuusoJuusto/ksyk-maps/blob/main/CHANGELOG.md";
