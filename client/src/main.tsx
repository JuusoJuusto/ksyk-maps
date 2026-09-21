import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { runBootCleanup } from "./lib/bootCleanup";
import "./lib/posthog";
import { initSentry } from "./lib/sentry";
import { startRrwebRecording } from "./lib/rrwebRecorder";

// Initialise Sentry as early as possible in the app lifecycle so it can
// capture any error thrown during React mount + subsequent renders.
initSentry();

// Strip corrupt numeric values from localStorage BEFORE any module reads
// them, so the Leaflet edge can never see NaN.
runBootCleanup();

// v4.7.12 — start rrweb DOM snapshot recording on public routes.
// Skipped automatically on /admin, /builder, admin sessions, opt-out
// storage flag, or DNT — see rrwebRecorder.shouldSkip().
startRrwebRecording();

createRoot(document.getElementById("root")!).render(<App />);
