import { useEffect } from "react";
import { Link } from "wouter";
import { Home, LifeBuoy, MapPin } from "lucide-react";

/**
 * 404 — genuinely lovely. Big centered numeral with a subtle fade-in,
 * one primary CTA "Go to map", one secondary link "Get help".
 * No app header — this is a full-bleed moment, not a chrome-wrapped page.
 */
export default function NotFound() {
  useEffect(() => {
    const prev = document.title;
    document.title = "Page not found — KSYK Maps";
    return () => { document.title = prev; };
  }, []);

  return (
    <div
      className="min-h-screen w-full flex flex-col bg-white dark:bg-gray-950"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          {/* Big 404 numeral */}
          <div
            className="animate-fade-in-up mb-2 select-none"
            aria-hidden="true"
          >
            <div className="text-[128px] sm:text-[160px] font-bold tracking-tight leading-none text-[#003d82] dark:text-[#4a90d9]">
              404
            </div>
          </div>

          <h1
            className="animate-fade-in-up text-[22px] sm:text-[26px] font-semibold tracking-tight text-gray-900 dark:text-white mb-3"
            style={{ animationDelay: "60ms" }}
          >
            This page took a wrong turn
          </h1>

          <p
            className="animate-fade-in-up text-[15px] leading-relaxed text-gray-600 dark:text-gray-400 mb-8 max-w-sm mx-auto"
            style={{ animationDelay: "120ms" }}
          >
            The page you're looking for isn't here. It may have moved, or the link might be off.
          </p>

          <div
            className="animate-fade-in-up flex flex-col sm:flex-row gap-3 sm:justify-center"
            style={{ animationDelay: "180ms" }}
          >
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all w-full sm:w-auto"
            >
              <Home className="h-4 w-4" strokeWidth={2.25} />
              Go to map
            </Link>
            <Link
              href="/support"
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl border border-gray-200 dark:border-gray-800 text-foreground font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 active:scale-[0.98] transition-all w-full sm:w-auto"
            >
              <LifeBuoy className="h-4 w-4" strokeWidth={2.25} />
              Get help
            </Link>
          </div>

          <p
            className="animate-fade-in mt-10 text-[13px] text-gray-500 dark:text-gray-500 inline-flex items-center gap-1.5"
            style={{ animationDelay: "260ms" }}
          >
            <MapPin className="h-3.5 w-3.5" strokeWidth={2.25} />
            KSYK Maps
          </p>
        </div>
      </div>
    </div>
  );
}
