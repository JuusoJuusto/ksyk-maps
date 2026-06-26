/**
 * KSYK Maps — boot splash.
 *
 * Editorial cartographic splash that covers the full viewport while
 * React hydrates. Auto-fades out 600ms after mount. Lives outside the
 * normal render tree (rendered from main.tsx before createRoot calls
 * paint) so the user sees brand the instant the HTML lands.
 *
 * Design notes:
 * - Libre Baskerville K — oversized, ghosted, occupies the negative space
 * - JetBrains Mono tracked-letter coordinates strip
 * - Cyan + amber radial glows on a navy ground (matches admin login)
 * - The "loading" dots are not a spinner; they're a triplet that animates
 *   in sequence — feels less generic than the usual react-spinner
 */

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // Keep the splash up for at least one viewport refresh so the
    // brand reads as intentional, not as a flicker.
    const showAtLeast = setTimeout(() => setLeaving(true), 650);
    return () => clearTimeout(showAtLeast);
  }, []);

  useEffect(() => {
    // After fade-out animation, remove from DOM by adding `hidden`.
    if (!leaving) return;
    const t = setTimeout(() => {
      const root = document.getElementById("ksyk-splash");
      root?.classList.add("hidden");
    }, 450);
    return () => clearTimeout(t);
  }, [leaving]);

  return (
    <div
      id="ksyk-splash"
      aria-hidden="true"
      className={[
        "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#0b1322]",
        "transition-opacity duration-[450ms] ease-out",
        leaving ? "opacity-0 pointer-events-none" : "opacity-100",
      ].join(" ")}
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Ambient glow blobs */}
      <div
        aria-hidden
        className="absolute -top-32 -right-32 w-[28rem] h-[28rem] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-32 w-[28rem] h-[28rem] rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, #fbbf24 0%, transparent 70%)" }}
      />
      {/* Faint cartographic grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Massive ghosted K letterform */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center text-white/[0.04] select-none"
        style={{
          fontFamily: "'Libre Baskerville', Georgia, serif",
          fontWeight: 700,
          fontSize: "min(72vw, 64vh)",
          lineHeight: 1,
          letterSpacing: "-0.05em",
        }}
      >
        K
      </div>

      {/* Foreground content */}
      <div className="relative z-10 flex flex-col items-center gap-7 px-6 max-w-md text-center">
        {/* Coordinate strip */}
        <p
          className="text-[10px] font-bold tracking-[0.42em] text-cyan-300/75 uppercase"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          60.187°N · 25.006°E
        </p>

        {/* Brand wordmark — serif, dramatic */}
        <h1
          className="text-white text-[2.4rem] sm:text-[3rem] leading-[0.95] tracking-tight"
          style={{ fontFamily: "'Libre Baskerville', Georgia, serif", fontWeight: 700 }}
        >
          KSYK
          <em className="not-italic block bg-gradient-to-r from-cyan-200 via-amber-100 to-cyan-200 bg-clip-text text-transparent">
            Maps
          </em>
        </h1>

        {/* Status line */}
        <div className="flex items-center gap-2 text-white/55">
          <span className="dot dot-1" />
          <span className="dot dot-2" />
          <span className="dot dot-3" />
          <span
            className="ml-2 text-[10px] font-bold tracking-[0.32em] uppercase"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            Boot · Tiles · Map
          </span>
        </div>

        {/* Subtle footer */}
        <p
          className="absolute bottom-[-6rem] inset-x-0 text-center text-[10px] tracking-[0.32em] uppercase text-white/30"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          © Kulosaaren Yhteiskoulu · Nordbyte Studio
        </p>
      </div>

      <style>{`
        #ksyk-splash .dot {
          width: 6px; height: 6px; border-radius: 999px;
          background: rgba(255,255,255,0.7);
          animation: ksykDot 1.1s ease-in-out infinite;
        }
        #ksyk-splash .dot-2 { animation-delay: 0.18s; }
        #ksyk-splash .dot-3 { animation-delay: 0.36s; }
        @keyframes ksykDot {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          40%      { opacity: 1;    transform: scale(1.25); }
        }
      `}</style>
    </div>
  );
}
