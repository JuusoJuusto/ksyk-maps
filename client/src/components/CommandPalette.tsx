/**
 * CommandPalette — global ⌘K action launcher.
 *
 * Figma/VS-Code-style: search-first list of every action you can take
 * in the app. Ships with a fixed action catalog PLUS live results
 * from the campus data (rooms + buildings) so users can jump straight
 * to a room by typing its number.
 *
 * Registers a global ⌘K / Ctrl+K binding. NOTE: the public header
 * already binds the same shortcut to focus the search field — the
 * palette wins because it stops propagation. On pages where the
 * palette isn't mounted (login, etc.) the header search focus still
 * fires.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandShortcut,
} from "@/components/ui/command";
import {
  Compass, Building2, DoorOpen, Layers, LocateFixed, Navigation2,
  Rocket, ShieldCheck, Search, Route as RouteIcon, PlayCircle,
  Palette, Keyboard, MapPin,
} from "lucide-react";
import { useCampusData } from "@/hooks/useCampusData";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { polygonCentroid } from "@ksyk/shared";

/** Action registry entry — each entry becomes a row in the palette. */
export interface PaletteAction {
  id: string;
  label: string;
  group: "Navigation" | "Map" | "Builder" | "Data" | "Appearance" | "Help";
  Icon: typeof MapPin;
  shortcut?: string;
  keywords?: string;
  onRun: () => void;
}

/** External hook so callers know when the palette is open (e.g. so the
 *  header can dim its own search hint). Not exported yet — palette
 *  handles everything self-contained. */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toggleDarkMode, darkMode } = useDarkMode();
  const { buildings, rooms } = useCampusData();

  // Global ⌘K / Ctrl+K binding. Toggles open state; captures the event
  // in the capture phase so it wins over the header search focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    // Capture phase — beats other listeners.
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true } as EventListenerOptions);
  }, []);

  /** Fire an action then close. */
  const run = useCallback((fn: () => void) => {
    fn();
    setOpen(false);
  }, []);

  /** Static action catalog — global commands that don't depend on the
   *  current page's state. The builder-specific ones no-op silently on
   *  the public map. */
  const staticActions = useMemo<PaletteAction[]>(() => [
    {
      id: "nav.home",
      label: "Go to campus map",
      group: "Navigation",
      Icon: MapPin,
      keywords: "home main map",
      onRun: () => setLocation("/"),
    },
    {
      id: "nav.builder",
      label: "Open builder",
      group: "Navigation",
      Icon: Building2,
      keywords: "editor cad admin",
      onRun: () => setLocation("/builder"),
    },
    {
      id: "nav.admin",
      label: "Open admin panel",
      group: "Navigation",
      Icon: ShieldCheck,
      keywords: "admin control settings",
      onRun: () => setLocation("/admin"),
    },
    {
      id: "map.toggle3d",
      label: "Toggle 3D view",
      group: "Map",
      Icon: Layers,
      keywords: "3d 2d pitch tilt extrude",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:toggle-3d")),
    },
    {
      id: "map.recenter",
      label: "Reset map view",
      group: "Map",
      Icon: LocateFixed,
      keywords: "center reset home recenter default",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:recenter")),
    },
    {
      id: "map.compass",
      label: "Reset rotation to north",
      group: "Map",
      Icon: Compass,
      keywords: "north bearing rotate compass",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:reset-bearing")),
    },
    {
      id: "map.directions",
      label: "Open directions",
      group: "Map",
      Icon: Navigation2,
      keywords: "directions route navigation nav",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:open-directions")),
    },
    {
      id: "builder.publish",
      label: "Publish campus",
      group: "Builder",
      Icon: Rocket,
      keywords: "publish deploy release ship",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:publish")),
    },
    {
      id: "builder.import.svg",
      label: "Import SVG floor plan",
      group: "Builder",
      Icon: MapPin,
      keywords: "import svg figma illustrator floor plan",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:import-svg")),
    },
    {
      id: "builder.validate",
      label: "Validate campus",
      group: "Builder",
      Icon: ShieldCheck,
      keywords: "validate check errors warnings lint",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:validate")),
    },
    {
      id: "builder.tool.select",
      label: "Select tool",
      group: "Builder",
      Icon: Compass,
      shortcut: "V",
      keywords: "cursor pointer select v",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:tool", { detail: "select" })),
    },
    {
      id: "builder.tool.building",
      label: "Draw building",
      group: "Builder",
      Icon: Building2,
      shortcut: "B",
      keywords: "building polygon draw b",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:tool", { detail: "building" })),
    },
    {
      id: "builder.tool.rectangle",
      label: "Draw rectangle building",
      group: "Builder",
      Icon: Building2,
      shortcut: "U",
      keywords: "rectangle quick building u",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:tool", { detail: "rectangle" })),
    },
    {
      id: "builder.tool.room",
      label: "Draw room",
      group: "Builder",
      Icon: DoorOpen,
      shortcut: "R",
      keywords: "room polygon draw r",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:tool", { detail: "room" })),
    },
    {
      id: "builder.tool.hallway",
      label: "Draw hallway",
      group: "Builder",
      Icon: RouteIcon,
      shortcut: "H",
      keywords: "hallway corridor draw h",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:tool", { detail: "hallway" })),
    },
    {
      id: "builder.undo",
      label: "Undo",
      group: "Builder",
      Icon: PlayCircle,
      shortcut: "⌘Z",
      keywords: "undo revert back",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:undo")),
    },
    {
      id: "builder.redo",
      label: "Redo",
      group: "Builder",
      Icon: PlayCircle,
      shortcut: "⌘⇧Z",
      keywords: "redo again forward",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:redo")),
    },
    {
      id: "data.refresh",
      label: "Refresh campus data",
      group: "Data",
      Icon: Search,
      keywords: "refresh reload data sync",
      onRun: () => qc.invalidateQueries(),
    },
    {
      id: "appearance.theme",
      label: darkMode ? "Switch to light mode" : "Switch to dark mode",
      group: "Appearance",
      Icon: Palette,
      keywords: "theme dark light toggle",
      onRun: () => toggleDarkMode(),
    },
    {
      id: "help.shortcuts",
      label: "Show keyboard shortcuts",
      group: "Help",
      Icon: Keyboard,
      shortcut: "?",
      keywords: "help shortcuts keyboard cheat sheet",
      onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:shortcuts")),
    },
  ], [qc, setLocation, toggleDarkMode, darkMode]);

  /** Live entity actions — first N rooms + all buildings become
   *  jump-to actions. Rooms are limited to 200 to keep the palette
   *  responsive; cmdk's own fuzzy match handles filtering. */
  const entityActions = useMemo<PaletteAction[]>(() => {
    const out: PaletteAction[] = [];
    for (const b of buildings) {
      if (!b.points || b.points.length < 3) continue;
      const c = polygonCentroid(b.points);
      out.push({
        id: `entity.building.${b.id}`,
        label: `Building · ${b.name || b.id.slice(0, 6)}`,
        group: "Navigation",
        Icon: Building2,
        keywords: [b.name, b.nameEn, b.nameFi, b.description].filter(Boolean).join(" "),
        onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:fly-to", {
          detail: { lat: c.lat, lng: c.lng, zoom: 17.5 },
        })),
      });
    }
    for (const r of rooms.slice(0, 200)) {
      if (!r.points || r.points.length < 3) continue;
      const c = polygonCentroid(r.points);
      const label = [r.roomNumber, r.name].filter(Boolean).join(" · ") || "(unnamed room)";
      out.push({
        id: `entity.room.${r.id}`,
        label: `Room · ${label}`,
        group: "Navigation",
        Icon: DoorOpen,
        keywords: [r.roomNumber, r.name, r.department, r.teacher, ...(r.tags ?? [])].filter(Boolean).join(" "),
        onRun: () => window.dispatchEvent(new CustomEvent("ksyk:cmd:fly-to", {
          detail: { lat: c.lat, lng: c.lng, zoom: 19, floor: r.floor ?? null },
        })),
      });
    }
    return out;
  }, [buildings, rooms]);

  // Group actions by their `group` field for CommandGroup rendering.
  const grouped = useMemo(() => {
    const all = [...staticActions, ...entityActions];
    const map = new Map<string, PaletteAction[]>();
    for (const a of all) {
      if (!map.has(a.group)) map.set(a.group, []);
      map.get(a.group)!.push(a);
    }
    return [...map.entries()];
  }, [staticActions, entityActions]);

  const mac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command, room number, or building name…" />
      <CommandList className="max-h-[70vh]">
        <CommandEmpty>
          <div className="py-6 text-center">
            <div className="mx-auto h-11 w-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-2">
              <Search className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-foreground">No matches</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Try a room number, building name, or command like &quot;3D&quot;.
            </p>
          </div>
        </CommandEmpty>
        {grouped.map(([group, actions]) => (
          <CommandGroup key={group} heading={group}>
            {actions.map((a) => {
              const Icon = a.Icon;
              return (
                <CommandItem
                  key={a.id}
                  value={`${a.label} ${a.keywords ?? ""}`}
                  onSelect={() => run(a.onRun)}
                  className="gap-3"
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{a.label}</span>
                  {a.shortcut && (
                    <CommandShortcut>
                      {a.shortcut.replace(/⌘/g, mac ? "⌘" : "Ctrl+")}
                    </CommandShortcut>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
      <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-1">
          <kbd className="font-mono font-semibold px-1 py-0.5 rounded border border-border bg-card">↑↓</kbd>
          <span>navigate</span>
          <kbd className="ml-2 font-mono font-semibold px-1 py-0.5 rounded border border-border bg-card">↵</kbd>
          <span>run</span>
          <kbd className="ml-2 font-mono font-semibold px-1 py-0.5 rounded border border-border bg-card">Esc</kbd>
          <span>close</span>
        </span>
        <span className="font-semibold text-blue-600 dark:text-blue-400">KSYK Maps</span>
      </div>
    </CommandDialog>
  );
}
