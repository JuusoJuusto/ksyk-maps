/**
 * KSYK Maps — minimal boot splash with KSYK brand.
 *
 * White background, centered KSYK logo (favicon-128 — same file the
 * header uses), small "KSYK MAPS" rail, thin blue indeterminate progress
 * bar. Auto-fades 600ms after mount.
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
        {/* Brand mark */}
        <img
          src="/favicon-128.png"
          alt="KSYK Maps"
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
          decoding="sync"
          fetchPriority="high"
        />
        {/* Wordmark */}
        <p
          className="text-[10px] font-bold tracking-[0.42em] text-gray-500 uppercase"
          style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
        >
          KSYK · Maps
        </p>
        {/* KSYK blue indeterminate sweep */}
        <div className="h-[2px] w-28 rounded-full bg-blue-100 overflow-hidden">
          <span className="block h-full w-1/3 rounded-full bg-blue-600 splash-sweep" />
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
