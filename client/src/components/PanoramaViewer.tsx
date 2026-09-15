/**
 * PanoramaViewer — shared fullscreen 360° viewer used by both the
 * Builder and the public map. Handles the URL forms admins actually
 * paste:
 *
 *   - poly.cam / polycam.ai (any path)    → auto-rewrite to /embed,
 *                                            embed as iframe.
 *   - kuula.co / roundme / momento360 /
 *     panoraven / 360cities               → embed as iframe.
 *   - Google Maps Street View share URLs → embed as iframe.
 *   - Direct image URL (.jpg/.png/.webp)  → pannellum-powered spherical
 *                                            viewer (loaded from CDN on
 *                                            demand).
 *
 * Escape closes.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { X as XIcon, Camera, Loader2 } from "lucide-react";

interface Props {
  url: string;
  title?: string;
  onClose: () => void;
}

export default function PanoramaViewer({ url, title, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const embedUrl = useMemo(() => rewritePanoramaUrl(url), [url]);
  const kind = classifyPanoramaUrl(url);
  const isImage = kind === "image";

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-95 shadow-lg"
        title="Close (Esc)"
        aria-label="Close viewer"
      >
        <XIcon className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider shadow-lg">
        <Camera className="h-3.5 w-3.5" strokeWidth={2.5} />
        360°
        {title ? <span className="ml-1 normal-case tracking-normal font-medium opacity-90">· {title}</span> : null}
        {kind === "polycam" ? <span className="ml-1 opacity-70">· Polycam</span>
         : kind === "kuula" ? <span className="ml-1 opacity-70">· Kuula</span>
         : null}
      </div>

      {isImage ? (
        <PannellumImageViewer src={url} />
      ) : kind !== "unknown" ? (
        <iframe
          src={embedUrl}
          className="w-full h-full border-0"
          allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope; magnetometer; camera"
          allowFullScreen
          title="360° viewer"
        />
      ) : (
        <div className="text-center text-white p-8 max-w-md">
          <div className="text-sm text-white/70 mb-2">This URL isn't a recognized 360° source.</div>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >Open externally</a>
        </div>
      )}
    </div>
  );
}

export function classifyPanoramaUrl(url: string): "polycam" | "kuula" | "roundme" | "momento360" | "panoraven" | "streetview" | "image" | "hosted" | "unknown" {
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(url)) return "image";
  if (/poly\.cam|polycam\.(ai|com)/i.test(url)) return "polycam";
  if (/kuula\.co/i.test(url)) return "kuula";
  if (/roundme\.com/i.test(url)) return "roundme";
  if (/momento360/i.test(url)) return "momento360";
  if (/panoraven/i.test(url)) return "panoraven";
  if (/google\.com\/maps.*streetview|maps\.google\.com|goo\.gl\/maps/i.test(url)) return "streetview";
  if (/360cities/i.test(url)) return "hosted";
  return "unknown";
}

export function rewritePanoramaUrl(url: string): string {
  try {
    // Polycam: append /embed if missing. Works for capture, space, tour URLs.
    if (/poly\.cam|polycam\.(ai|com)/i.test(url)) {
      const trimmed = url.replace(/\/$/, "");
      if (/\/embed(\?|$)/.test(trimmed)) return trimmed;
      return `${trimmed}/embed`;
    }
    // Kuula: autofullscreen flag so the panorama fills the iframe.
    if (/kuula\.co/i.test(url) && !/[?&]fs=/.test(url)) {
      return url + (url.includes("?") ? "&" : "?") + "fs=1";
    }
    return url;
  } catch { return url; }
}

/**
 * Pannellum-powered equirectangular viewer. Loads pannellum from CDN
 * on first use, then mounts an inline viewer. Falls back to a flat
 * drag preview if the CDN script fails.
 */
function PannellumImageViewer({ src }: { src: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    let viewer: { destroy?: () => void } | null = null;

    const loadPannellum = async () => {
      if ((window as unknown as { pannellum?: unknown }).pannellum) return;
      if (!document.querySelector('link[data-pannellum]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
        link.dataset.pannellum = "1";
        document.head.appendChild(link);
      }
      await new Promise<void>((resolve, reject) => {
        if (document.querySelector('script[data-pannellum]')) {
          const t = setInterval(() => {
            if ((window as unknown as { pannellum?: unknown }).pannellum) {
              clearInterval(t);
              resolve();
            }
          }, 50);
          setTimeout(() => { clearInterval(t); reject(new Error("timeout")); }, 8000);
          return;
        }
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
        s.dataset.pannellum = "1";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("load-failed"));
        document.body.appendChild(s);
      });
    };

    (async () => {
      try {
        await loadPannellum();
        if (cancelled || !containerRef.current) return;
        const pn = (window as unknown as { pannellum: { viewer: (el: HTMLElement, cfg: unknown) => { destroy?: () => void } } }).pannellum;
        viewer = pn.viewer(containerRef.current, {
          type: "equirectangular",
          panorama: src,
          autoLoad: true,
          autoRotate: -2,
          compass: false,
          showControls: true,
          showZoomCtrl: true,
          showFullscreenCtrl: false,
          mouseZoom: true,
          keyboardZoom: true,
        });
        setReady("ready");
      } catch {
        if (!cancelled) setReady("failed");
      }
    })();
    return () => {
      cancelled = true;
      try { viewer?.destroy?.(); } catch { /* noop */ }
    };
  }, [src]);

  if (ready === "failed") return <FlatPanoramaFallback src={src} />;
  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {ready === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <Loader2 className="h-8 w-8 text-white animate-spin" />
        </div>
      )}
    </div>
  );
}

function FlatPanoramaFallback({ src }: { src: string }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);
  return (
    <div
      className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onPointerDown={(e) => {
        setDragging({ x: e.clientX - offset.x, y: e.clientY - offset.y });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const x = e.clientX - dragging.x;
        const y = Math.max(-200, Math.min(200, e.clientY - dragging.y));
        setOffset({ x, y });
      }}
      onPointerUp={() => setDragging(null)}
    >
      <img
        src={src}
        alt="360° panorama"
        draggable={false}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
          maxWidth: "none",
          height: "180%",
          userSelect: "none",
        }}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white text-[11px] font-medium pointer-events-none">
        Drag to look around · CDN load failed, using flat fallback
      </div>
    </div>
  );
}

/**
 * Hook that listens for the `ksyk:panorama:open` event dispatched by
 * `installPanoramas` and manages the viewer's open state. Mount this
 * at the top of any page that hosts a map so panorama clicks
 * "just work" without wiring each caller.
 */
export function usePanoramaViewer() {
  const [view, setView] = useState<{ url: string; title?: string } | null>(null);
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ url: string; title?: string }>).detail;
      if (detail?.url) setView({ url: detail.url, title: detail.title });
    };
    window.addEventListener("ksyk:panorama:open", onOpen);
    return () => window.removeEventListener("ksyk:panorama:open", onOpen);
  }, []);
  const close = () => setView(null);
  return { view, close };
}
