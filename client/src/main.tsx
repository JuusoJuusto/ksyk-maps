import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { runBootCleanup } from "./lib/bootCleanup";
import "./lib/posthog";
import { initSentry } from "./lib/sentry";
import { startRrwebRecording } from "./lib/rrwebRecorder";

// Stale-chunk recovery: when a deploy changes chunk hashes the browser may
// still hold old HTML referencing the previous filenames. Vercel's SPA
// catch-all serves index.html for missing asset paths, causing a MIME type
// error ("Expected JS but got text/html"). One hard reload after such a
// failure gets fresh HTML with the correct hashes.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (ev) => {
    const msg = String((ev.reason as any)?.message ?? ev.reason ?? "");
    if (msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed")) {
      // Only reload once per session to avoid infinite loops on real errors.
      const key = "ksyk_chunk_reload";
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    }
  });
}

// Initialise Sentry as early as possible in the app lifecycle so it can
// capture any error thrown during React mount + subsequent renders.
initSentry();

// Strip corrupt numeric values from localStorage BEFORE any module reads
// them, so the Leaflet edge can never see NaN.
runBootCleanup();

// Wilma+MazeMap redesign layer, product-wide.  The scoped stylesheet
// (`client/src/styles/wilma-mazemap.css`) is a no-op until this attribute
// is set — that keeps the design layer a single flip away from a full
// visual revert.  Setting it on <html> instead of the map root so the
// styling reaches marketing pages, the admin panel, standalone screens
// (lunch/hsl/faq/privacy/support/download/404), and every dialog / modal
// / toast that portals to <body>.
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-ksyk-theme", "wilma");
}

// v4.7.12 — start rrweb DOM snapshot recording on public routes.
// Skipped automatically on /admin, /builder, admin sessions, opt-out
// storage flag, or DNT — see rrwebRecorder.shouldSkip().
startRrwebRecording();

createRoot(document.getElementById("root")!).render(<App />);
