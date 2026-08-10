/**
 * CompassChip — MazeMap-style rotation indicator.
 *
 * A small round chip in the map corner that:
 *   1. Always shows a north arrow. The arrow rotates with the map, so
 *      wherever the map bearing lands the arrow keeps pointing at
 *      true north. This is the "compass" affordance that reassures
 *      users who spun the map with right-click drag.
 *   2. Tap resets bearing + pitch to the admin's published defaults
 *      (`osmRotationDeg`, `osmPitchDeg`). Users who accidentally
 *      tilted or rotated the map get one-tap recovery.
 *   3. Auto-hides when the map is already at the default bearing +
 *      pitch (within snap tolerance), so it doesn't clutter the
 *      corner at rest.
 *
 * Rendering-only — nothing here mutates map state except the reset
 * action. Bearing is polled via a MapLibre `rotate` listener.
 */
import { useCallback, useEffect, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import { cn } from "@/lib/utils";
import { useAppSettings, pickPlatformMapDefaults } from "@/hooks/useAppSettings";

interface CompassChipProps {
  map: MaplibreMap | null;
}

const HIDE_TOLERANCE_DEG = 3;
const HIDE_TOLERANCE_PITCH = 2;

export default function CompassChip({ map }: CompassChipProps) {
  const { settings } = useAppSettings();
  const [bearing, setBearing] = useState(0);
  const [pitch, setPitch] = useState(0);

  useEffect(() => {
    if (!map) return;
    const sync = () => {
      setBearing(map.getBearing());
      setPitch(map.getPitch());
    };
    sync();
    map.on("rotate", sync);
    map.on("pitch", sync);
    return () => {
      map.off("rotate", sync);
      map.off("pitch", sync);
    };
  }, [map]);

  const defaults = pickPlatformMapDefaults(settings);
  const bearingOff = Math.abs(((bearing % 360) + 360) % 360 - ((defaults.bearing % 360) + 360) % 360);
  const pitchOff = Math.abs(pitch - defaults.pitch);
  const shouldShow = bearingOff > HIDE_TOLERANCE_DEG || pitchOff > HIDE_TOLERANCE_PITCH;

  const reset = useCallback(() => {
    if (!map) return;
    // easeTo (not setBearing) so we can co-animate bearing + pitch and
    // preserve everything else (center, zoom).
    map.easeTo({
      bearing: defaults.bearing,
      pitch: defaults.pitch,
      duration: 500,
    });
  }, [map, defaults.bearing, defaults.pitch]);

  if (!shouldShow) return null;

  // MazeMap-style pitch dial — a thin arc around the chip that fills
  // proportionally to the current pitch (0° to maxPitch=60°). Users get
  // an at-a-glance sense of "how much am I tilted" without needing to
  // read numbers.
  const pitchPct = Math.max(0, Math.min(1, pitch / 60));
  const arcCirc = 2 * Math.PI * 20; // stroke-dasharray for circle r=20
  return (
    <button
      type="button"
      onClick={reset}
      aria-label={`Rotation ${Math.round(bearing)}° · pitch ${Math.round(pitch)}° — tap to reset`}
      title="Reset rotation + tilt"
      className={cn(
        "w-11 h-11 rounded-2xl border border-white/80 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-md shadow-black/10 relative",
        "flex items-center justify-center transition-colors active:scale-[0.97]",
        "hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
      )}
    >
      {/* Pitch arc — thin blue ring that fills from top clockwise. Sits
       *  behind the compass needle. */}
      {pitchPct > 0.05 && (
        <svg
          className="absolute inset-0.5 pointer-events-none"
          viewBox="0 0 44 44"
          aria-hidden="true"
        >
          <circle
            cx="22" cy="22" r="20"
            fill="none"
            stroke="#e5e7eb"
            className="dark:stroke-gray-800"
            strokeWidth="1.5"
            strokeOpacity="0.4"
          />
          <circle
            cx="22" cy="22" r="20"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={`${arcCirc * pitchPct} ${arcCirc}`}
            transform="rotate(-90 22 22)"
          />
        </svg>
      )}
      {/* The N arrow rotates opposite to the map bearing so it always
       *  points at true geographic north. Wrapped in an inner span so
       *  the outer chip doesn't rotate. */}
      <span
        className="block relative"
        style={{
          transform: `rotate(${-bearing}deg)`,
          transition: "transform 100ms linear",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
          {/* North triangle — red top half, gray bottom half so it
           *  reads like a compass needle even at glance. */}
          <path d="M11 2 L14 12 L11 10 L8 12 Z" fill="#dc2626" />
          <path d="M11 20 L14 12 L11 14 L8 12 Z" fill="#94a3b8" />
          <text
            x="11" y="9"
            textAnchor="middle"
            fontSize="6"
            fontWeight="700"
            fill="#ffffff"
          >
            N
          </text>
        </svg>
      </span>
    </button>
  );
}
