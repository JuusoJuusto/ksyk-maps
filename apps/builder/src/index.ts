/**
 * apps/builder — CAD-style map editor entry point.
 *
 * At this stage of the migration (M5.0) the app re-exports the
 * existing `/builder` route from `client/src`. Property panel, tool
 * palette, top toolbar, status bar, autosave, and version history
 * are all wired inside `client/src/pages/builder.tsx` and its child
 * components; this file is the future permanent home for those
 * pages once the split completes (M5.2).
 */
export { default as BuilderApp } from "../../../client/src/pages/builder";

export const VERSION = "0.5.1-vercel-routes";
