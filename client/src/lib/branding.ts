/**
 * KSYK Maps branding — do not use in /wilma routes
 *
 * Master asset: /ksykmaps_logo_new_new.png (1024×1024 PNG)
 * Regenerate favicons: python scripts/generate-brand-icons.py
 */

/** Primary logo — always the master file (best quality) */
export const KSYK_MAPS_LOGO_MASTER = "/ksykmaps_logo_new_new.png";

/** All UI surfaces use the master PNG */
export const KSYK_MAPS_LOGO = KSYK_MAPS_LOGO_MASTER;
export const KSYK_MAPS_LOGO_DISPLAY = KSYK_MAPS_LOGO_MASTER;
export const KSYK_MAPS_LOGO_HD = KSYK_MAPS_LOGO_MASTER;
export const KSYK_MAPS_LOGO_ULTRA = KSYK_MAPS_LOGO_MASTER;

export const KSYK_MAPS_LOGO_ALT = "KSYK Maps";

/** Sized derivatives for srcset (generated from master) */
export const KSYK_MAPS_LOGO_128 = "/favicon-128.png";
export const KSYK_MAPS_LOGO_512 = "/icon-512.png";

export const KSYK_MAPS_LOGO_SRCSET = [
  `${KSYK_MAPS_LOGO_128} 128w`,
  `${KSYK_MAPS_LOGO_512} 512w`,
  `${KSYK_MAPS_LOGO_MASTER} 1024w`,
].join(", ");

export const KSYK_BRAND_BLUE = "#2563eb";

export const KSYK_GITHUB_CHANGELOG =
  "https://github.com/JuusoJuusto/ksyk-maps/blob/main/CHANGELOG.md";
