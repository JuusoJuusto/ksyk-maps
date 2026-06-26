/**
 * KSYK Maps — boot splash.
 *
 * Production-grade: white background, KSYK Maps logo in the centre with a
 * spinning ring around it. Smooth fade-out, no flicker. The previous
 * version glitched because the "hidden" class fired at the same time as
 * the parent re-render; this one uses a single CSS class toggle and a
 * `display:none` only after the opacity transition has fully ended.
 *
 * Hides itself after 700ms (enough for the brand to register) + 380ms
 * fade. While visible it covers the full viewport above everything else.
 */

import { useEffect, useState } from "react";

const VISIBLE_MS = 700;
const FADE_MS = 380;

export default function SplashScreen() {
  /** "in"  → fully shown / fading in
   *  "out" → fading out
   *  "gone"→ display:none, removed from accessible tree */
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("out"), VISIBLE_MS);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("gone"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
        opacity: phase === "out" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
        pointerEvents: phase === "out" ? "none" : "auto",
      }}
    >
      {/* Logo + ring stack */}
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Spinning ring — arc segment of a circle, rotates */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 80 80"
          aria-hidden="true"
          style={{ animation: "ksyk-ring-spin 0.95s linear infinite" }}
        >
          {/* Track */}
          <circle
            cx={40}
            cy={40}
            r={34}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={3}
          />
          {/* Active arc — KSYK blue, ~260° */}
          <circle
            cx={40}
            cy={40}
            r={34}
            fill="none"
            stroke="#2563eb"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="155 60"
            transform="rotate(-90 40 40)"
          />
        </svg>
        {/* KSYK Maps logo */}
        <img
          src="/favicon-128.png"
          alt=""
          width={44}
          height={44}
          className="relative block object-contain"
          decoding="sync"
          fetchPriority="high"
          draggable={false}
        />
      </div>

      <style>{`
        @keyframes ksyk-ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
