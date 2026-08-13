import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { runBootCleanup } from "./lib/bootCleanup";

// Strip corrupt numeric values from localStorage BEFORE any module reads
// them, so the Leaflet edge can never see NaN.
runBootCleanup();

createRoot(document.getElementById("root")!).render(<App />);
