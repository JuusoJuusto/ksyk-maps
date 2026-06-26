/**
 * KSYK Maps — Maintenance mode.
 *
 * Editorial print-magazine aesthetic. Big serif headline, JetBrains Mono
 * tracker for status code, a thick rule line under it (like a Le Monde
 * front page), a "live status" pulse strip. No spinner — the page IS the
 * status. Admins are not blocked: App.tsx bypasses this on /admin*.
 */

import { useEffect, useState } from "react";
import { Wrench, ArrowRight } from "lucide-react";

interface Props {
  message?: string;
}

export default function MaintenanceMode({ message }: Props) {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const stamp = time.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour12: false,
  });

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col overflow-y-auto"
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        background: "#f7f3e7",
        color: "#0b1322",
      }}
    >
      {/* Paper grain texture */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.35] mix-blend-multiply"
        style={{
          backgroundImage:
            "radial-gradient(rgba(11,19,34,0.18) 1px, transparent 1px), radial-gradient(rgba(11,19,34,0.12) 1px, transparent 1px)",
          backgroundSize: "3px 3px, 5px 5px",
          backgroundPosition: "0 0, 1.5px 1.5px",
        }}
      />
      {/* Top-edge ticker bar */}
      <div className="relative bg-[#0b1322] text-[#f7f3e7] px-6 sm:px-10 py-3 flex items-center gap-3 sm:gap-6 text-[10px] sm:text-[11px] font-bold tracking-[0.28em] uppercase"
           style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          OUT OF SERVICE · CODE 503
        </span>
        <span className="hidden sm:inline opacity-50">|</span>
        <span className="hidden sm:inline opacity-70">{stamp}</span>
        <span className="ml-auto opacity-70">60.187°N · 25.006°E</span>
      </div>

      {/* Body — magazine column layout */}
      <main className="relative flex-1 grid lg:grid-cols-[5fr,4fr] gap-10 lg:gap-16 px-6 sm:px-10 lg:px-16 py-12 lg:py-20 max-w-7xl mx-auto w-full">
        {/* Left column — masthead + serif headline */}
        <section className="space-y-7">
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] font-bold tracking-[0.42em] uppercase"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              KSYK · MAPS · No. 001
            </span>
            <span className="flex-1 h-px bg-[#0b1322]/40" />
          </div>

          <h1
            className="leading-[0.92] tracking-tight"
            style={{
              fontFamily: "'Libre Baskerville', Georgia, serif",
              fontSize: "clamp(3rem, 9vw, 7rem)",
              fontWeight: 700,
            }}
          >
            Pardon the<br />
            <em className="not-italic underline decoration-[0.18em] decoration-amber-500 underline-offset-[0.12em]">
              dust
            </em>{". "}
          </h1>

          {/* Subhead — italic serif */}
          <p
            className="max-w-md text-lg leading-[1.55] italic text-[#0b1322]/85"
            style={{ fontFamily: "'Libre Baskerville', Georgia, serif" }}
          >
            The KSYK campus map is briefly out of service while we put new
            tile, mortar, and wire into the walls.
          </p>

          {/* Thick rule line, then admin message in clean sans */}
          <div className="space-y-3 pt-2">
            <div className="h-1 w-16 bg-[#0b1322]" />
            <p className="text-sm leading-relaxed text-[#0b1322]/75 max-w-md">
              {message || "We are currently performing maintenance. Please check back soon."}
            </p>
          </div>

          {/* Status strip */}
          <dl className="grid grid-cols-3 gap-4 max-w-md pt-3"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            {[
              { k: "STATUS", v: "503" },
              { k: "OPER.", v: "ADMIN" },
              { k: "ETA", v: "SOON" },
            ].map(({ k, v }) => (
              <div key={k} className="border-t border-[#0b1322]/30 pt-2">
                <dt className="text-[9px] font-bold tracking-[0.22em] text-[#0b1322]/55 uppercase">
                  {k}
                </dt>
                <dd className="text-base font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Right column — illustrated mark */}
        <aside className="relative hidden lg:flex flex-col justify-between">
          {/* Big stamp-style "OUT OF SERVICE" mark */}
          <div className="relative aspect-square w-full max-w-md mx-auto">
            <div className="absolute inset-0 border-[3px] border-[#0b1322] rounded-full" />
            <div className="absolute inset-3 border border-[#0b1322]/60 rounded-full" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <Wrench className="h-10 w-10 mb-4 text-[#0b1322]" strokeWidth={1.8} />
              <p
                className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#0b1322]/70"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                Under
              </p>
              <p
                className="leading-[0.92] tracking-tight my-1"
                style={{
                  fontFamily: "'Libre Baskerville', Georgia, serif",
                  fontWeight: 700,
                  fontSize: "clamp(2.5rem, 6vw, 4rem)",
                }}
              >
                Maintenance
              </p>
              <p
                className="text-[10px] font-bold tracking-[0.32em] uppercase text-[#0b1322]/70"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                · By KSYK ·
              </p>
            </div>
            {/* Rotating outer text — gives the stamp life */}
            <svg
              className="absolute inset-0 w-full h-full animate-[spin_60s_linear_infinite]"
              viewBox="0 0 200 200"
              aria-hidden
            >
              <defs>
                <path id="curve" d="M 100,100 m -86,0 a 86,86 0 1,1 172,0 a 86,86 0 1,1 -172,0" />
              </defs>
              <text
                fill="#0b1322"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: "0.42em", fontWeight: 700 }}
              >
                <textPath href="#curve">
                  · OUT OF SERVICE · KULOSAAREN YHTEISKOULU · 60.187 N · 25.006 E
                </textPath>
              </text>
            </svg>
          </div>

          {/* Footer note */}
          <div className="text-[10px] tracking-[0.32em] uppercase text-[#0b1322]/45 text-right mt-8"
               style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            © {time.getFullYear()} KSYK · Nordbyte Studio
          </div>
        </aside>
      </main>

      {/* Bottom edge — admin link strip (always visible) */}
      <footer className="relative border-t border-[#0b1322]/15 bg-[#0b1322]/[0.02] px-6 sm:px-10 py-4 flex items-center justify-between gap-3"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        <span className="text-[10px] tracking-[0.32em] uppercase text-[#0b1322]/55">
          Need access?
        </span>
        <a
          href="/admin"
          className="group inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.22em] uppercase text-[#0b1322] hover:text-amber-700 transition-colors"
        >
          Admin sign-in
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </footer>
    </div>
  );
}
