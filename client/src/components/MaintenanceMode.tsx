/**
 * KSYK Maps — Maintenance mode.  v4.7.54 Wilma document rewrite.
 * Same shell as every other full-page screen: hairline top bar +
 * uppercase masthead + big H1.  Admins bypass this at App.tsx.
 */

import { Wrench } from "lucide-react";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";

interface Props {
  message?: string;
}

export default function MaintenanceMode({ message }: Props) {
  const { darkMode } = useDarkMode();
  return (
    <div className={cn(
      "fixed inset-0 z-[9999] flex flex-col",
      darkMode ? "bg-gray-950 text-gray-100" : "bg-gray-50 text-gray-900",
    )}
    style={{
      paddingTop: "env(safe-area-inset-top, 0px)",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {/* v4.7.56 — document header: KSYK Maps logo + wordmark on the
       *  left, maintenance badge on the right.  Arrow dropped per user
       *  request. */}
      <header className="border-b border-[#d5dae0] dark:border-[#2a3040] shrink-0 bg-white dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/favicon-128.png"
              alt="KSYK Maps"
              width={24}
              height={24}
              className="h-6 w-6 object-contain shrink-0"
            />
            <span className="text-[14px] font-bold tracking-tight text-[#003d82] dark:text-[#4a90d9]">
              KSYK Maps
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase text-amber-700 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-[1px] bg-amber-500 animate-pulse" />
            Maintenance
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-5 py-8 sm:py-16 flex flex-col justify-center">
        {/* Hero: big KSYK logo + title block */}
        <div className="flex flex-col items-center text-center mb-8">
          <img
            src="/favicon-128.png"
            alt=""
            width={72}
            height={72}
            className="h-16 w-16 sm:h-18 sm:w-18 object-contain mb-5 opacity-95"
          />
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase text-amber-700 dark:text-amber-400 mb-2">
            <Wrench className="h-3 w-3" strokeWidth={2.5} />
            Notice
          </p>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white">
            Be right back
          </h1>
          <p className="text-[13px] mt-2 text-gray-500 dark:text-gray-400 max-w-sm">
            KSYK Maps is temporarily unavailable while we push updates.
          </p>
        </div>

        {/* Message card */}
        <div className="border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] bg-white dark:bg-gray-950 overflow-hidden">
          <div className="border-b border-[#d5dae0] dark:border-[#2a3040] px-5 py-3 bg-[#f5f6f8] dark:bg-[#12161f]">
            <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-gray-500 dark:text-gray-400">
              Message from admins
            </p>
          </div>
          <div className="p-5">
            <p className="text-[15px] leading-[1.65] text-gray-800 dark:text-gray-200">
              {message || "We're making a few quick updates. The campus map will be back shortly."}
            </p>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-gray-500 dark:text-gray-500 text-center">
          © KSYK Maps · {new Date().getFullYear()}
        </p>
      </main>
    </div>
  );
}
