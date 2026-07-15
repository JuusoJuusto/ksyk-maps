/**
 * @ksyk/shared/io — export + import for KSYK map data.
 *
 * Two formats:
 *   - `.ksykmap.json` — the native `MapPackage` shape, serialised via
 *     `JSON.stringify` with a stable field order and an optional
 *     `pretty: true` flag. Round-trip is loss-free.
 *   - `.geojson` — standard GeoJSON `FeatureCollection` for interop
 *     with QGIS, Mapbox Studio, tippecanoe, etc. Round-trip is
 *     loss-free for geometry + typed metadata; anything under a
 *     `metadata` blob passes through untouched.
 *
 * Every function is pure — the caller decides where the bytes go
 * (localStorage, a `Blob` for download, `fetch` upload, ...).
 */
import type { MapPackage } from "../types";
import { MapPackageSchema } from "../schema";

export * from "./geojson";

/** Serialise a `MapPackage` to a pretty-printed JSON string. */
export function packageToJSON(pkg: MapPackage, opts: { pretty?: boolean } = {}): string {
  return JSON.stringify(pkg, null, opts.pretty ? 2 : 0);
}

/** Parse a `MapPackage` from a JSON string. Validates against the zod
 *  schema so a hostile file can't inject unexpected fields. Throws
 *  with a human-readable message when validation fails. */
export function packageFromJSON(text: string): MapPackage {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  const result = MapPackageSchema.safeParse(parsed);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(`Invalid MapPackage: ${first?.path.join(".")} — ${first?.message}`);
  }
  // zod may return with optional fields as undefined; MapPackage requires
  // them present. Cast is safe because the schema mirrors the type.
  return result.data as MapPackage;
}

/** Convenience — build a `Blob` for download. */
export function packageToBlob(pkg: MapPackage, format: "json" | "geojson" = "json"): Blob {
  if (format === "geojson") {
    // Deferred import to keep this module tree-shakeable.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { packageToGeoJSON } = require("./geojson") as typeof import("./geojson");
    return new Blob([JSON.stringify(packageToGeoJSON(pkg), null, 2)], {
      type: "application/geo+json",
    });
  }
  return new Blob([packageToJSON(pkg, { pretty: true })], {
    type: "application/json",
  });
}

/** Default filename convention: `<title>-<yyyy-mm-dd>.<ext>`. */
export function packageDefaultFilename(pkg: MapPackage, format: "json" | "geojson" = "json"): string {
  const slug = (pkg.manifest.title || "map").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const date = (pkg.manifest.publishedAt || new Date().toISOString()).slice(0, 10);
  const ext = format === "geojson" ? "geojson" : "ksykmap.json";
  return `${slug}-${date}.${ext}`;
}
