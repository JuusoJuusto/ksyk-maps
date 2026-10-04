import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ExternalLink, Loader2 } from "lucide-react";
import { trackFeature } from "@/lib/analytics";
import posthog from "@/lib/posthog";

const BOARD_URL = "https://omatnaytot.hsl.fi/static?url=501f6d3a-2a43-5958-b3fc-a169c7521878";
// The board is cross-origin, so the iframe gives no error event. A missing
// `load` after this delay is the only failure signal we get.
const BOARD_TIMEOUT_MS = 10_000;

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
  const { i18n } = useTranslation();
  const isFi = i18n.language === "fi";
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");

  useEffect(() => {
    if (status !== "loading") return;
    const timer = window.setTimeout(() => {
      posthog.capture("hsl_board_load_timed_out", { timeout_ms: BOARD_TIMEOUT_MS });
      setStatus("failed");
    }, BOARD_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    document.title = "HSL — KSYK Maps";
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
        src={BOARD_URL}
        onLoad={() => setStatus("loaded")}
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
      {status !== "loaded" && (
        <div
          role="status"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            padding: "1.5rem",
            color: "rgba(255,255,255,0.85)",
            textAlign: "center",
            fontSize: "0.9375rem",
          }}
        >
          {status === "loading" ? (
            <>
              <Loader2 size={28} className="animate-spin" aria-hidden />
              <span>{isFi ? "Ladataan HSL-näyttöä…" : "Loading HSL departures…"}</span>
            </>
          ) : (
            <>
              <span>{isFi ? "HSL-näyttö ei ole juuri nyt saatavilla." : "The HSL board is not available right now."}</span>
              <a
                href={BOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 1rem",
                  borderRadius: "8px",
                  background: "#003d82",
                  color: "white",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                {isFi ? "Avaa HSL-näyttö uudessa välilehdessä" : "Open the HSL board in a new tab"}
                <ExternalLink size={16} aria-hidden />
              </a>
            </>
          )}
        </div>
      )}
      {/* Floating back button — sits above the overlay so users always
       *  have an escape route without needing the browser back button. */}
      <button
        type="button"
        onClick={() => setLocation("/")}
        aria-label="Back"
        className="animate-fade-in-up"
        style={{
          position: "fixed",
          top: "max(1rem, env(safe-area-inset-top, 1rem))",
          left: "1rem",
          zIndex: 10001,
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
          transition: "transform 120ms ease, background 120ms ease",
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.94)"; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      >
        <ChevronLeft size={22} strokeWidth={2.5} />
      </button>
    </div>
  );
}
