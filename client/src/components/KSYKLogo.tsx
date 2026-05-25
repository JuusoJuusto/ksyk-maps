import { KSYK_MAPS_LOGO, KSYK_MAPS_LOGO_ALT, KSYK_MAPS_LOGO_SRCSET } from "@/lib/branding";
import { cn } from "@/lib/utils";

type KSYKLogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "hero";
  priority?: boolean;
};

const SIZE_CLASS = {
  sm: "h-11 w-11",
  md: "h-14 w-14 sm:h-16 sm:w-16",
  lg: "h-16 w-16 sm:h-[5rem] sm:w-[5rem]",
  xl: "h-20 w-20 sm:h-24 sm:w-24",
  hero: "h-[5.25rem] w-[5.25rem] sm:h-[6.75rem] sm:w-[6.75rem]",
} as const;

const SIZE_PX = { sm: 44, md: 64, lg: 80, xl: 96, hero: 128 } as const;

/** Official ksykmaps_logo_new_new.png — no borders or rings */
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
      className={cn("object-contain select-none drop-shadow-md", SIZE_CLASS[size], className)}
      style={{ imageRendering: "auto" }}
    />
  );
}
