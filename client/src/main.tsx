import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { runBootCleanup } from "./lib/bootCleanup";
import "./lib/posthog";
import "./lib/firebase";
import { initSentry } from "./lib/sentry";

// Initialise Sentry as early as possible in the app lifecycle so it can
// capture any error thrown during React mount + subsequent renders.
initSentry();

// Strip corrupt numeric values from localStorage BEFORE any module reads
// them, so the Leaflet edge can never see NaN.
runBootCleanup();

createRoot(document.getElementById("root")!).render(<App />);
