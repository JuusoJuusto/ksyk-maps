/**
 * Matterport 3D tour viewer — fullscreen iframe overlay.
 *
 * Accepts either a full Matterport URL (`https://my.matterport.com/show/?m=…`)
 * or a bare model ID and assembles the embed URL with sensible defaults
 * (hover-helper off, brand off, autoplay on).
 *
 * Admin sets `matterportTourUrl` in the admin map-defaults panel; the
 * map's hamburger drawer renders a "3D Tour" button only when a URL is
 * configured.
 */

import { useEffect } from "react";
import { X, Maximize2, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  rawUrl: string;
  isFi: boolean;
  onClose: () => void;
}

function buildEmbedUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Already a full URL?
  if (trimmed.startsWith("http")) {
    // Append helpful defaults if missing.
    try {
      const u = new URL(trimmed);
      if (!u.searchParams.has("play")) u.searchParams.set("play", "1");
      if (!u.searchParams.has("brand")) u.searchParams.set("brand", "0");
      if (!u.searchParams.has("hhl")) u.searchParams.set("hhl", "0");
      return u.toString();
    } catch {
      return trimmed;
    }
  }
  // Bare model id — assume Matterport's standard show URL.
  return `https://my.matterport.com/show/?m=${encodeURIComponent(trimmed)}&play=1&brand=0&hhl=0`;
}

export default function MatterportTour({ rawUrl, isFi, onClose }: Props) {
  const embedUrl = buildEmbedUrl(rawUrl);

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!embedUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#0b1322] animate-in fade-in duration-200"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center gap-3 px-4 sm:px-5 py-3 bg-gradient-to-b from-[#0b1322]/95 to-[#0b1322]/85 backdrop-blur-md border-b border-white/10"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-[#0b1322] shadow-md">
          <Sparkles className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-[9px] font-bold tracking-[0.28em] text-cyan-300/75 uppercase leading-none"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            KSYK · {isFi ? "Virtuaalikierros" : "Virtual Tour"}
          </p>
          <p className="text-sm font-bold text-white leading-tight mt-0.5 truncate">
            {isFi ? "3D-kävely campuksella" : "3D campus walkthrough"}
          </p>
        </div>
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "hidden sm:flex h-9 px-3 items-center gap-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors",
          )}
          title={isFi ? "Avaa uudessa välilehdessä" : "Open in new tab"}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {isFi ? "Uusi välilehti" : "New tab"}
        </a>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          aria-label={isFi ? "Sulje" : "Close"}
          className="h-9 w-9 p-0 rounded-xl text-white hover:bg-white/[0.1]"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Iframe */}
      <div className="relative flex-1 min-h-0 bg-black">
        <iframe
          src={embedUrl}
          title="Matterport campus tour"
          className="absolute inset-0 w-full h-full border-0"
          // Matterport needs these to enable VR + autoplay
          allow="xr-spatial-tracking; gyroscope; accelerometer; vr; fullscreen; autoplay"
          allowFullScreen
          loading="lazy"
        />
        {/* Loading veil — fades when the iframe paints (we can't reliably
            detect that across origins, so a fixed delay + pointer-events
            none keeps it from blocking interaction). */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center bg-[#0b1322]/80 animate-out fade-out duration-700"
          style={{ animationDelay: "600ms", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            <p
              className="text-[10px] font-bold tracking-[0.28em] text-cyan-300/80 uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {isFi ? "Ladataan virtuaalikierrosta" : "Loading virtual tour"}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar — "open in new tab" + close */}
      <div
        className="sm:hidden flex items-center gap-2 px-3 py-3 border-t border-white/10 bg-[#0b1322]/95 backdrop-blur-md"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <a
          href={embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] text-white text-xs font-semibold hover:bg-white/[0.1] transition-colors"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          {isFi ? "Avaa täysruutu" : "Open fullscreen"}
        </a>
        <Button
          type="button"
          onClick={onClose}
          className="h-11 px-5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-[#0b1322] text-xs font-bold hover:from-cyan-300 hover:to-blue-400"
        >
          {isFi ? "Sulje" : "Close"}
        </Button>
      </div>
    </div>
  );
}
