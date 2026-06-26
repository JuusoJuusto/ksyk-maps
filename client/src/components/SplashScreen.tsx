/**
 * KSYK Maps — minimal boot splash.
 *
 * Clean white background, single centered KSYK wordmark, thin indeterminate
 * progress bar. Auto-fades 600ms after mount. The goal is "calm, brief,
 * out of the way" — nothing to distract from the map that's about to appear.
 */

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLeaving(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      document.getElementById("ksyk-splash")?.classList.add("hidden");
    }, 350);
    return () => clearTimeout(t);
  }, [leaving]);

  return (
    <div
      id="ksyk-splash"
      aria-hidden="true"
      className={[
        "fixed inset-0 z-[9999] flex items-center justify-center bg-white",
        "transition-opacity duration-300 ease-out",
        leaving ? "opacity-0 pointer-events-none" : "opacity-100",
      ].join(" ")}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Wordmark — small, refined */}
        <p
          className="text-[11px] font-bold tracking-[0.45em] text-gray-500 uppercase"
          style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
          KSYK · Maps
        </p>
        {/* Thin progress line — indeterminate sweep */}
        <div className="h-[2px] w-32 rounded-full bg-gray-100 overflow-hidden">
          <span className="block h-full w-1/3 rounded-full bg-gray-900 splash-sweep" />
        </div>
      </div>
      <style>{`
        @keyframes ksykSweep {
          0%   { transform: translateX(-110%); }
          100% { transform: translateX(330%); }
        }
        #ksyk-splash .splash-sweep {
          animation: ksykSweep 1.1s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }
      `}</style>
    </div>
  );
}
