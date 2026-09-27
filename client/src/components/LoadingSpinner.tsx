import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KSYK_LOADER_LOGO, KSYK_LOADER_LOGO_ALT } from "@/lib/branding";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

const LOAD_STAGES_EN = [
  "Loading campus map…",
  "Fetching rooms…",
  "Almost ready…",
];

const LOAD_STAGES_FI = [
  "Ladataan kampuskarttaa…",
  "Haetaan huoneita…",
  "Melkein valmis…",
];

/**
 * Memoized ring — takes ringSize as a string so React.memo's shallow
 * comparison prevents any re-render when the parent's interval fires.
 * The CSS animation runs purely on the compositor thread; as long as
 * this subtree never re-renders the browser can never interrupt it.
 */
const SpinRing = memo(function SpinRing({
  ringSize,
  logoSize,
}: {
  ringSize: string;
  logoSize: string;
}) {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className={cn("absolute rounded-full border border-blue-200/60 dark:border-blue-900/60", ringSize)}
        aria-hidden
      />
      <div
        className={cn(
          "absolute rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-400/40 animate-[spin_1.4s_linear_infinite]",
          ringSize,
        )}
        aria-hidden
      />
      <img
        src={KSYK_LOADER_LOGO}
        alt={KSYK_LOADER_LOGO_ALT}
        decoding="sync"
        fetchPriority="high"
        className={cn("object-contain", logoSize)}
      />
    </div>
  );
});

export default function LoadingSpinner({
  message,
  size = "md",
  fullScreen = false,
}: LoadingSpinnerProps) {
  const { i18n } = useTranslation();
  const isFi = i18n.language === "fi";
  const loadStages = isFi ? LOAD_STAGES_FI : LOAD_STAGES_EN;
  const [progress, setProgress] = useState(8);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const progressId = setInterval(() => {
      // Slow but never-stalling advance: proportional to remaining room,
      // floored at 0.15% so the bar always visibly moves up to 97%.
      setProgress((p) => {
        if (p >= 97) return p;
        return Math.min(97, p + Math.max(0.15, (97 - p) * 0.06));
      });
    }, 320);
    const stageId = setInterval(() => {
      setStageIndex((i) => (i + 1) % loadStages.length);
    }, 2400);
    return () => {
      clearInterval(progressId);
      clearInterval(stageId);
    };
  }, [loadStages.length]);

  const stageText = message || loadStages[stageIndex];
  const logoSize =
    size === "sm" ? "h-14 w-14" : size === "lg" ? "h-28 w-28 sm:h-32 sm:w-32" : "h-20 w-20 sm:h-24 sm:w-24";
  const ringSize =
    size === "sm" ? "h-20 w-20" : size === "lg" ? "h-36 w-36 sm:h-40 sm:w-40" : "h-28 w-28 sm:h-32 sm:w-32";

  const content = (
    <div className="flex flex-col items-center gap-7 w-full max-w-[15rem] px-4">
      {/* SpinRing is memo'd — never re-renders due to progress/stage intervals */}
      <SpinRing ringSize={ringSize} logoSize={logoSize} />

      <div className="w-full text-center space-y-2.5">
        <p className="text-[0.8rem] text-gray-500 dark:text-gray-400 font-medium tracking-wide min-h-[1.2rem] transition-all duration-500">
          {stageText}
        </p>
        <div className="w-full h-0.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-3 bg-white dark:bg-gray-950">
        <p className="text-lg font-semibold text-gray-900 dark:text-white tracking-tight mb-1">KSYK Maps</p>
        {content}
      </div>
    );
  }

  return <div className="flex items-center justify-center p-8">{content}</div>;
}
