/**
 * KSYK Maps — Maintenance mode.  v4.7.54 Wilma document rewrite.
 * Same shell as every other full-page screen: hairline top bar +
 * uppercase masthead + big H1.  Admins bypass this at App.tsx.
 */

import { Wrench, ArrowLeft } from "lucide-react";
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
      {/* Document header */}
      <header className="border-b border-[#d5dae0] dark:border-[#2a3040] shrink-0 bg-white dark:bg-gray-950">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-gray-300">
            <ArrowLeft className="h-4 w-4 opacity-40" strokeWidth={2.25} />
            KSYK Maps
          </span>
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase text-amber-700 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-[1px] bg-amber-500 animate-pulse" />
            Maintenance
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-5 py-10 sm:py-16 flex flex-col justify-center">
        <div className="pb-4 border-b border-[#d5dae0] dark:border-[#2a3040] mb-6">
          <div className="flex items-start gap-3 mb-3">
            <span className="h-9 w-9 shrink-0 flex items-center justify-center rounded-[6px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
              <Wrench className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <div>
              <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-amber-700 dark:text-amber-400">
                Notice
              </p>
              <h1 className="text-[24px] sm:text-[30px] font-bold tracking-tight leading-[1.1] text-gray-900 dark:text-white mt-1">
                Be right back
              </h1>
            </div>
          </div>
        </div>

        <div className="border border-[#d5dae0] dark:border-[#2a3040] rounded-[6px] bg-white dark:bg-gray-950 p-5">
          <p className="text-[15px] leading-[1.65] text-gray-700 dark:text-gray-300">
            {message || "We're making a few quick updates. The campus map will be back shortly."}
          </p>
        </div>

        <p className="mt-6 text-[11px] text-gray-500 dark:text-gray-500 text-center">
          © KSYK Maps
        </p>
      </main>
    </div>
  );
}
