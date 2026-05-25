import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import KSYKLogo from "@/components/KSYKLogo";
import { KSYK_BUILDING_LETTERS } from "@/lib/ksykCampusOutlines";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

const LOAD_STAGES_EN = [
  "Preparing campus outlines…",
  "Loading wing geometry…",
  "Syncing map layers…",
  "Almost ready…",
];

const LOAD_STAGES_FI = [
  "Valmistellaan kampuksen ääriviivat…",
  "Ladataan siipien geometriaa…",
  "Synkronoidaan karttatasoja…",
  "Melkein valmis…",
];

export default function LoadingSpinner({
  message = "Loading campus map…",
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
      setProgress((p) => {
        if (p >= 96) return 12;
        return p + 3 + Math.random() * 7;
      });
    }, 240);
    const stageId = setInterval(() => {
      setStageIndex((i) => (i + 1) % loadStages.length);
    }, 2200);
    return () => {
      clearInterval(progressId);
      clearInterval(stageId);
    };
  }, []);

  const logoSize = size === "sm" ? "md" : size === "lg" ? "hero" : "xl";
  const stageText = message || loadStages[stageIndex];

  const content = (
    <div className="flex flex-col items-center gap-10 w-full max-w-sm px-6">
      <div className="relative w-full flex justify-center">
        <div
          className="absolute h-40 w-40 rounded-full bg-gradient-to-tr from-blue-400/30 via-indigo-400/20 to-violet-400/25 blur-3xl animate-pulse"
          aria-hidden
        />
        <div
          className="absolute h-52 w-52 rounded-full border border-blue-400/20 animate-[spin_12s_linear_infinite]"
          aria-hidden
        />
        <div
          className="absolute h-44 w-44 rounded-full border border-indigo-400/15 animate-[spin_18s_linear_infinite_reverse]"
          aria-hidden
        />
        <div className="relative animate-[float_3.2s_ease-in-out_infinite]">
          <div className="absolute inset-0 bg-indigo-500/25 blur-3xl rounded-full scale-150" aria-hidden />
          <KSYKLogo size={logoSize} priority className="relative drop-shadow-2xl" />
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 w-full">
        {KSYK_BUILDING_LETTERS.map((letter, i) => (
          <span
            key={letter}
            className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center text-sm font-black",
              "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30",
              "animate-[wingPop_0.6s_ease-out_both]"
            )}
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            {letter}
          </span>
        ))}
      </div>

      <div className="w-full text-center space-y-4">
        <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-500 bg-clip-text text-transparent">
          KSYK Maps
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 font-medium min-h-[1.25rem] transition-opacity duration-500">
          {stageText}
        </p>
        <div className="relative w-full h-2 rounded-full bg-gray-200/90 dark:bg-gray-800 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(59,130,246,0.5)]"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute inset-y-0 w-1/3 rounded-full bg-white/40 animate-[shimmer_1.8s_ease-in-out_infinite]"
            style={{ left: `${Math.max(0, progress - 25)}%` }}
          />
        </div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 font-bold">
          Nordbyte Studio
        </p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden",
          "bg-gradient-to-br from-white via-blue-50/50 to-indigo-50/40",
          "dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950/30"
        )}
      >
        <div
          className="absolute inset-0 opacity-50 dark:opacity-35 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 15% 25%, rgba(59,130,246,0.18) 0%, transparent 42%),
              radial-gradient(circle at 85% 75%, rgba(99,102,241,0.14) 0%, transparent 40%),
              radial-gradient(circle at 50% 90%, rgba(139,92,246,0.1) 0%, transparent 35%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative z-10">{content}</div>
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.02); }
          }
          @keyframes wingPop {
            from { opacity: 0; transform: scale(0.6) translateY(8px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes shimmer {
            0%, 100% { opacity: 0.2; }
            50% { opacity: 0.7; }
          }
        `}</style>
      </div>
    );
  }

  return <div className="flex items-center justify-center p-8">{content}</div>;
}
