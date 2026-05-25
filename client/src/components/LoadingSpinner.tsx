import { KSYK_MAPS_LOGO, KSYK_MAPS_LOGO_ALT } from "@/lib/branding";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  variant?: "gradient" | "white";
}

export default function LoadingSpinner({
  message = "Loading…",
  size = "md",
  fullScreen = false,
}: LoadingSpinnerProps) {
  const logoSize = { sm: "h-10 w-10", md: "h-14 w-14", lg: "h-20 w-20" }[size];

  const content = (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <div
          className={cn("rounded-2xl object-contain", logoSize)}
          style={{
            background: "transparent",
          }}
        >
          <img
            src={KSYK_MAPS_LOGO}
            alt={KSYK_MAPS_LOGO_ALT}
            className={cn(logoSize, "object-contain rounded-2xl")}
            decoding="async"
          />
        </div>
        <div
          className="absolute -inset-2 rounded-3xl border-2 border-blue-500/30 border-t-blue-600 animate-spin"
          aria-hidden
        />
      </div>
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight">KSYK Maps</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>
        <div className="flex justify-center gap-1 pt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-gray-950">
        {content}
      </div>
    );
  }

  return <div className="flex items-center justify-center p-8">{content}</div>;
}
