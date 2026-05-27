import { KSYK_MAPS_LOGO_ALT } from "@/lib/branding";
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
  hero: "h-[5.5rem] w-[5.5rem] sm:h-[7.25rem] sm:w-[7.25rem]",
} as const;

const SIZE_PX = { sm: 44, md: 64, lg: 80, xl: 96, hero: 144 } as const;

/** Match a logical size to the right PNG. The two header sizes (sm + md)
 * both use favicon-128 — that's the brand favicon and stays consistent
 * between desktop and mobile (no surprise icon-192/512 on high-DPR phones). */
const FIXED_SRC: Record<keyof typeof SIZE_PX, string> = {
  sm: "/favicon-128.png",
  md: "/favicon-128.png",
  lg: "/favicon-128.png",
  xl: "/icon-192.png",
  hero: "/icon-512.png",
};

/** ksykmaps_logo_NEW (2).png — no borders or rings on the image */
export default function KSYKLogo({ className, size = "lg", priority = false }: KSYKLogoProps) {
  const px = SIZE_PX[size];
  return (
    <img
      // Pin a single, correctly-sized PNG per logical size. NO srcset —
      // browsers were picking icon-512.png on high-DPR mobiles even when
      // we set sizes="64px". The "wrong mobile logo" bug came from there.
      // One src per logical size means the same crisp PNG on every device.
      src={FIXED_SRC[size]}
      width={px}
      height={px}
      alt={KSYK_MAPS_LOGO_ALT}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : "auto"}
      className={cn(
        "object-contain select-none drop-shadow-lg",
        size === "hero" && "drop-shadow-2xl",
        SIZE_CLASS[size],
        className
      )}
      style={{ imageRendering: "auto" }}
    />
  );
}
