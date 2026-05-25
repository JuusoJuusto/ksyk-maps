import { useEffect, useState } from "react";
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
  "Preparing wings…",
  "Almost ready…",
];

const LOAD_STAGES_FI = [
  "Ladataan kampuskarttaa…",
  "Valmistellaan siipiä…",
  "Melkein valmis…",
];

export default function LoadingSpinner({
  message,
  size = "md",
  fullScreen = false,
}: LoadingSpinnerProps) {
  const { i18n } = useTranslation();
  const isFi = i18n.language === "fi";
  const loadStages = isFi ? LOAD_STAGES_FI : LOAD_STAGES_EN;
  const [progress, setProgress] = useState(10);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const progressId = setInterval(() => {
      setProgress((p) => {
        if (p >= 94) return 14;
        return p + 4 + Math.random() * 6;
      });
    }, 280);
    const stageId = setInterval(() => {
      setStageIndex((i) => (i + 1) % loadStages.length);
    }, 2400);
    return () => {
      clearInterval(progressId);
      clearInterval(stageId);
    };
  }, [loadStages.length]);

  const stageText = message || loadStages[stageIndex];
  const logoClass =
    size === "sm" ? "h-16 w-16" : size === "lg" ? "h-32 w-32 sm:h-36 sm:w-36" : "h-24 w-24 sm:h-28 sm:w-28";

  const content = (
    <div className="flex flex-col items-center gap-8 w-full max-w-xs px-6">
      <div className="relative flex items-center justify-center">
        <div
          className="absolute h-28 w-28 sm:h-32 sm:w-32 rounded-full border-2 border-blue-500/20 border-t-blue-500/70 animate-[spin_1.8s_linear_infinite]"
          aria-hidden
        />
        <img
          src={KSYK_LOADER_LOGO}
          alt={KSYK_LOADER_LOGO_ALT}
          width={128}
          height={128}
          decoding="sync"
          fetchPriority="high"
          className={cn("object-contain animate-[spin_2.8s_linear_infinite]", logoClass)}
        />
      </div>

      <div className="w-full text-center space-y-3">
        <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">KSYK Maps</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium min-h-[1.25rem]">{stageText}</p>
        <div className="w-full h-1 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-[9999] flex items-center justify-center",
          "bg-white dark:bg-gray-950"
        )}
      >
        <div className="relative z-10">{content}</div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <div className="flex items-center justify-center p-8">{content}</div>;
}
