/**
 * KSYK Maps Builder — searchable Buildings → Rooms tree.
 *
 * Fed a plain list of buildings and rooms, groups rooms under their parent
 * building, filters by a live search box, and calls back when the admin
 * clicks a node (so the map can fly to it + open the property panel).
 *
 * Purely presentational — the parent owns fetch + selection state.
 */
import { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronRight, DoorOpen, Search } from "lucide-react";
import type { Building, Room } from "@shared/schema";
import { cn } from "@/lib/utils";

interface BuilderDirectoryProps {
  buildings: Building[];
  rooms: Room[];
  selectedId: string | null;
  onSelectBuilding: (b: Building) => void;
  onSelectRoom: (r: Room) => void;
}

export default function BuilderDirectory({
  buildings,
  rooms,
  selectedId,
  onSelectBuilding,
  onSelectRoom,
}: BuilderDirectoryProps) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();

  const grouped = useMemo(() => {
    const map = new Map<string, Room[]>();
    for (const r of rooms) {
      const list = map.get(r.buildingId) ?? [];
      list.push(r);
      map.set(r.buildingId, list);
    }
    return map;
  }, [rooms]);

  const filteredBuildings = useMemo(() => {
    if (!q) return buildings;
    return buildings.filter((b) => {
      if (
        b.name?.toLowerCase().includes(q) ||
        b.nameEn?.toLowerCase().includes(q) ||
        b.nameFi?.toLowerCase().includes(q)
      ) {
        return true;
      }
      const kids = grouped.get(b.id) ?? [];
      return kids.some(
        (r) =>
          r.roomNumber?.toLowerCase().includes(q) ||
          r.name?.toLowerCase().includes(q) ||
          r.nameEn?.toLowerCase().includes(q) ||
          r.nameFi?.toLowerCase().includes(q)
      );
    });
  }, [buildings, grouped, q]);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-2.5">
      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search buildings, rooms…"
          className="w-full h-10 pl-8 pr-3 rounded-xl bg-muted/60 border border-transparent focus:bg-card focus:border-border focus:ring-2 focus:ring-blue-500/30 focus:outline-none text-sm placeholder:text-muted-foreground/70 transition-colors"
        />
      </div>

      {filteredBuildings.length === 0 && (
        <div className="text-xs text-muted-foreground italic px-2 py-6 text-center">
          {q ? "No matches." : "No buildings yet — draw one on the map."}
        </div>
      )}

      <ul className="space-y-0.5">
        {filteredBuildings.map((b) => {
          const kids = grouped.get(b.id) ?? [];
          const isOpen = expanded[b.id] ?? q.length > 0;
          const isSel = selectedId === b.id;
          return (
            <li key={b.id}>
              <div
                className={cn(
                  "flex items-center rounded-lg h-9 pr-1 group",
                  isSel && "bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500/20"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(b.id)}
                  className="w-6 h-9 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  {kids.length > 0 ? (
                    isOpen ? (
                      <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.4} />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                    )
                  ) : (
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onSelectBuilding(b)}
                  className="flex-1 flex items-center gap-2 min-w-0 text-left px-1 h-9 rounded-lg hover:bg-muted transition-colors"
                >
                  <div
                    className="h-5 w-5 rounded-md shrink-0 ring-1 ring-black/10 dark:ring-white/10"
                    style={{ background: b.colorCode || "#3b82f6" }}
                    aria-hidden
                  />
                  <span className={cn(
                    "text-sm font-semibold truncate",
                    isSel ? "text-blue-700 dark:text-blue-300" : "text-foreground"
                  )}>
                    {b.nameEn || b.name}
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-muted-foreground tabular-nums">
                    {kids.length}
                  </span>
                </button>
              </div>

              {isOpen && kids.length > 0 && (
                <ul className="ml-6 mt-0.5 mb-1 space-y-0.5 border-l border-border pl-1.5">
                  {kids
                    .filter((r) => {
                      if (!q) return true;
                      return (
                        r.roomNumber?.toLowerCase().includes(q) ||
                        r.name?.toLowerCase().includes(q) ||
                        r.nameEn?.toLowerCase().includes(q) ||
                        r.nameFi?.toLowerCase().includes(q)
                      );
                    })
                    .map((r) => {
                      const rSel = selectedId === r.id;
                      return (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => onSelectRoom(r)}
                            className={cn(
                              "w-full flex items-center gap-2 h-8 px-2 rounded-lg text-left transition-colors",
                              rSel
                                ? "bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500/20"
                                : "hover:bg-muted"
                            )}
                          >
                            <DoorOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" strokeWidth={2} />
                            <span className="text-xs font-mono font-semibold tabular-nums text-muted-foreground shrink-0 w-10">
                              {r.roomNumber}
                            </span>
                            <span className={cn(
                              "text-xs truncate",
                              rSel ? "text-blue-700 dark:text-blue-300 font-semibold" : "text-foreground"
                            )}>
                              {r.nameEn || r.name || <span className="text-muted-foreground italic">Untitled</span>}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {/* Unused import placeholder to satisfy the strict tree-shaker */}
      <Building2 className="hidden" aria-hidden />
    </div>
  );
}
