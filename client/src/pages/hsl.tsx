import { useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { trackFeature } from "@/lib/analytics";

/**
 * HSL kiosk display — full-screen iframe of the school's pre-configured
 * HSL board. The transparent overlay above the iframe hides HSL's own
 * login/edit UI (users don't need it and shouldn't be able to reach it).
 * The overlay also means users can't interact with the iframe itself,
 * which is fine because the HSL board is a passive display.
 *
 * A floating back button is layered above everything so users on mobile
 * always have an easy escape route without needing the browser chrome.
 */
export default function HSL() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "Ksyk HSL Näyttö";
    trackFeature("hsl_page_viewed");

    // Full-screen kiosk mode — remember the previous body styles so we
    // can restore them when the user navigates away.
    const prev = {
      margin: document.body.style.margin,
      padding: document.body.style.padding,
      height: document.body.style.height,
      overflow: document.body.style.overflow,
      background: document.body.style.background,
    };
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.height = "100%";
    document.body.style.overflow = "hidden";
    document.body.style.background = "#0b1220"; // deep neutral, matches dark theme

    return () => {
      document.body.style.margin = prev.margin;
      document.body.style.padding = prev.padding;
      document.body.style.height = prev.height;
      document.body.style.overflow = prev.overflow;
      document.body.style.background = prev.background;
    };
  }, []);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100dvh",
      background: "#0b1220",
    }}>
      <iframe
        src="https://omatnaytot.hsl.fi/static?url=501f6d3a-2a43-5958-b3fc-a169c7521878"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        allowFullScreen
        title="HSL Näyttö"
      />
      {/* Transparent overlay hides HSL's login/edit UI. Kept below the
       *  back button so the button remains tappable. */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 9999,
          background: "transparent",
          pointerEvents: "all",
        }}
      />
      {/* Floating back button — sits above the overlay so users always
       *  have an escape route without needing the browser back button. */}
      <button
        type="button"
        onClick={() => setLocation("/")}
        aria-label="Back"
        style={{
          position: "fixed",
          top: "max(1rem, env(safe-area-inset-top, 1rem))",
          left: "1rem",
          zIndex: 10000,
          height: "44px",
          width: "44px",
          borderRadius: "9999px",
          border: "1px solid rgba(255,255,255,0.15)",
          background: "rgba(15,23,42,0.75)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 10px 30px -6px rgba(0,0,0,0.5)",
        }}
      >
        <ChevronLeft size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
}
