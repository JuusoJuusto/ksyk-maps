import { useState } from "react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { type CampusMap, getActiveMapId, setActiveMapId } from "@/hooks/useMaps";

interface Props {
  maps: CampusMap[];
  onSelect: (map: CampusMap) => void;
}

export default function MapSwitcherButton({ maps, onSelect }: Props) {
  const { darkMode } = useDarkMode();
  const [open, setOpen] = useState(false);
  const activeId = getActiveMapId();

  if (maps.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch map"
        className={cn(
          "flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-medium",
          "shadow-md transition-all duration-200 active:scale-95",
          "border",
          darkMode
            ? "bg-gray-900/95 border-gray-700 text-gray-200 hover:bg-gray-800"
            : "bg-white/95 border-gray-200 text-gray-700 hover:bg-gray-50",
          open && (darkMode ? "bg-gray-800" : "bg-gray-50"),
        )}
      >
        <Layers className="h-3.5 w-3.5" strokeWidth={2} />
        <span className="max-w-[120px] truncate">
          {maps.find((m) => m.id === activeId)?.name ?? maps[0]?.name ?? "Maps"}
        </span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          {/* Popover */}
          <div
            className={cn(
              "absolute bottom-full mb-2 left-0 z-40",
              "w-56 rounded-2xl shadow-xl border overflow-hidden",
              "animate-in fade-in slide-in-from-bottom-2 duration-150",
              darkMode
                ? "bg-gray-900 border-gray-700"
                : "bg-white border-gray-200",
            )}
          >
            <div className={cn(
              "px-3 py-2 text-[10px] font-bold tracking-widest uppercase",
              darkMode ? "text-gray-500" : "text-gray-400",
            )}>
              Maps
            </div>

            {maps.map((map) => {
              const active = (activeId ?? maps[0]?.id) === map.id;
              return (
                <button
                  key={map.id}
                  type="button"
                  onClick={() => {
                    setActiveMapId(map.id);
                    onSelect(map);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors",
                    active
                      ? darkMode ? "bg-blue-900/40 text-blue-300" : "bg-blue-50 text-blue-700"
                      : darkMode ? "text-gray-200 hover:bg-gray-800" : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <span
                    className="shrink-0 w-2.5 h-2.5 rounded-full"
                    style={{ background: map.color ?? "#3b82f6" }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{map.name}</span>
                    {map.description && (
                      <span className={cn(
                        "block text-xs truncate mt-0.5",
                        darkMode ? "text-gray-400" : "text-gray-500",
                      )}>
                        {map.description}
                      </span>
                    )}
                  </span>
                  {active && (
                    <svg className="shrink-0 h-3.5 w-3.5 text-blue-500" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
