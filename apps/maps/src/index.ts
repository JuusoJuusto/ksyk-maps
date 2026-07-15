/**
 * apps/maps — public campus map entry point.
 *
 * At this stage of the migration (M5.0), the app is a thin re-export
 * from `client/src` — the shared React tree still lives there so both
 * `apps/maps` and `apps/builder` can migrate independently without
 * copying whole page trees. Once the split is complete (M5.2), the
 * consumer-facing pages move here permanently and this file will
 * import them directly.
 */
export { default as MapsApp } from "../../../client/src/App";
export { default as MapsHome } from "../../../client/src/pages/ksykmaps-home";

/** Version banner for observability. */
export const VERSION = "0.2.0-m14";
