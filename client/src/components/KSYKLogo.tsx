import { KSYK_MAPS_LOGO, KSYK_MAPS_LOGO_ALT, KSYK_MAPS_LOGO_SRCSET } from "@/lib/branding";
import { cn } from "@/lib/utils";

type KSYKLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  priority?: boolean;
};

const SIZE_CLASS = {
  sm: "h-10 w-10",
  md: "h-12 w-12 sm:h-14 sm:w-14",
  lg: "h-14 w-14 sm:h-[4.25rem] sm:w-[4.25rem]",
  xl: "h-20 w-20 sm:h-24 sm:w-24",
} as const;

const SIZE_PX = { sm: 40, md: 56, lg: 72, xl: 96 } as const;

/** Renders the official ksykmaps_logo_new_new.png with sharp scaling */
export default function KSYKLogo({ className, size = "lg", priority = false }: KSYKLogoProps) {
  const px = SIZE_PX[size];
  return (
    <img
      src={KSYK_MAPS_LOGO}
      srcSet={KSYK_MAPS_LOGO_SRCSET}
      sizes={`${px}px`}
      width={px}
      height={px}
      alt={KSYK_MAPS_LOGO_ALT}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn(
        "object-contain rounded-2xl select-none",
        SIZE_CLASS[size],
        className
      )}
      style={{ imageRendering: "auto" }}
    />
  );
}
