/**
 * LeftSidebar — Builder left panel with entity lists.
 *
 * Tabbed by entity kind. Each tab shows a scrollable list bound to
 * live React Query data. Clicking an entity selects it (parent
 * decides what "select" means — usually focus map + open
 * PropertyPanel on the right).
 *
 * Tabs:
 *   - Buildings — every building on campus, coloured swatch + name.
 *   - Rooms     — flat list; the search bar filters by number/name.
 *   - Hallways  — id + width; helpful for graph-editing.
 *   - Layers    — visibility + lock toggles, drag to reorder (M14.1).
 *   - History   — version list from /api/map-package/versions.
 *
 * The parent supplies `selection` so the highlighted row stays in
 * sync with the map canvas. Search box lives inside this component;
 * queries are debounced 120 ms and use `@ksyk/shared`'s indexed
 * search for the Rooms tab.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildRoomSearchIndex } from "@ksyk/shared";
import type { Building, Room, Hallway, Door, Stair, Elevator, MapLayer, MapVersion } from "@ksyk/shared";
import { apiRequest } from "@/lib/queryClient";
import { Building2, DoorOpen, Route as RouteIcon, Layers, History, Search, EyeOff, Eye, Lock, Unlock, Settings2, StretchHorizontal, StepForward, MoveVertical, DoorClosed, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { fetchList } from "@/lib/fetchList";
import MapSettingsPanel from "@/components/MapSettingsPanel";

export type LeftSidebarTab = "buildings" | "rooms" | "pois" | "layers" | "history" | "settings";

export interface LeftSidebarSelection {
  kind: "building" | "room" | "hallway";
  id: string;
}

export interface LeftSidebarProps {
  activeTab: LeftSidebarTab;
  onTabChange: (tab: LeftSidebarTab) => void;
  selection: LeftSidebarSelection | null;
  onSelect: (sel: LeftSidebarSelection) => void;
  /** Callback when the user clicks a version — parent restores it. */
  onRestoreVersion?: (versionId: string) => void;
}

const TABS: Array<{ id: LeftSidebarTab; label: string; Icon: typeof Building2 }> = [
  { id: "buildings", label: "Buildings", Icon: Building2 },
  { id: "rooms",     label: "Rooms",     Icon: DoorOpen },
  // "POIs" is the umbrella for every non-polygon primitive: hallways,
  // walls, doors, stairs, elevators, entrances. Consolidated in v3.13
  // from the old Hallways-only tab so users have one place to see
  // every "line + point" thing they've placed.
  { id: "pois",      label: "POIs",      Icon: RouteIcon },
  { id: "layers",    label: "Layers",    Icon: Layers },
  { id: "history",   label: "History",   Icon: History },
  { id: "settings",  label: "Defaults",  Icon: Settings2 },
];

const SIDEBAR_WIDTH_KEY = "ksyk_builder_sidebar_width";
const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 720;
const SIDEBAR_DEFAULT_WIDTH = 420;

export default function LeftSidebar({
  activeTab, onTabChange, selection, onSelect, onRestoreVersion,
}: LeftSidebarProps) {
  const { darkMode } = useDarkMode();
  const [query, setQuery] = useState("");

  // Drag-to-resize — user preference persists in localStorage. Reads
  // once on mount so the sidebar restores to the last size the user
  // set; new users get SIDEBAR_DEFAULT_WIDTH (bigger than the old 320
  // so the tabbed list has more breathing room).
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
    const raw = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n >= SIDEBAR_MIN_WIDTH && n <= SIDEBAR_MAX_WIDTH) return n;
    return SIDEBAR_DEFAULT_WIDTH;
  });
  const draggingRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width)); } catch { /* quota */ }
  }, [width]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const next = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, e.clientX));
      setWidth(next);
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  return (
    <aside
      style={{ width: `${width}px` }}
      className={cn(
        "shrink-0 flex flex-col border-r overflow-hidden relative",
        darkMode ? "bg-gray-900/95 border-gray-800 text-gray-200" : "bg-white border-gray-200 text-gray-800",
      )}
    >
      {/* Tabs */}
      <div className={cn("grid grid-cols-6 border-b", darkMode ? "border-gray-800" : "border-gray-200")}>
        {TABS.map((t) => {
          const Icon = t.Icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              aria-pressed={active}
              title={t.label}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors border-b-2",
                active
                  ? "border-blue-600 text-blue-700 dark:text-blue-300"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search — hidden on the settings tab since there's nothing to
       *  filter there. */}
      {activeTab !== "settings" && (
        <div className={cn("px-3 py-2 border-b", darkMode ? "border-gray-800" : "border-gray-200")}>
          <label className="relative block">
            <Search className={cn("absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5", darkMode ? "text-gray-500" : "text-gray-400")} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Filter ${activeTab}…`}
              className={cn(
                "w-full h-8 pl-8 pr-2 rounded-lg text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/40",
                darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200",
              )}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "buildings" && <BuildingList query={query} selection={selection} onSelect={onSelect} />}
        {activeTab === "rooms"     && <RoomList query={query} selection={selection} onSelect={onSelect} />}
        {activeTab === "pois"      && <PoiList query={query} selection={selection} onSelect={onSelect} />}
        {activeTab === "layers"    && <LayerList query={query} />}
        {activeTab === "history"   && <HistoryList query={query} onRestore={onRestoreVersion} />}
        {activeTab === "settings"  && (
          <div className="p-3">
            <MapSettingsPanel variant="embed" showPublish />
          </div>
        )}
      </div>

      {/* Drag handle — thin vertical strip on the right edge. Fades in on
       *  hover so the sidebar doesn't look cluttered at rest. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        onMouseDown={startResize}
        onDoubleClick={() => setWidth(SIDEBAR_DEFAULT_WIDTH)}
        title="Drag to resize · double-click to reset"
        className={cn(
          "absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize group",
          "hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors",
        )}
      >
        <span className="absolute top-1/2 -translate-y-1/2 -right-0.5 h-10 w-1 rounded-full bg-blue-500/0 group-hover:bg-blue-500/70 transition-colors" />
      </div>
    </aside>
  );
}

// ── Buildings ─────────────────────────────────────────────────────

function BuildingList({
  query, selection, onSelect,
}: { query: string; selection: LeftSidebarSelection | null; onSelect: (s: LeftSidebarSelection) => void }) {
  const { data: buildings = [], isLoading } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
    queryFn: () => fetchList<Building>("/api/buildings"),
  });
  const q = query.trim().toLowerCase();
  const filtered = q
    ? buildings.filter((b) => b.name.toLowerCase().includes(q) || (b.nameFi ?? "").toLowerCase().includes(q))
    : buildings;

  if (isLoading) return <Loading />;
  if (buildings.length === 0) return <EmptyState message="No buildings yet." hint="Click the Building tool then place 3+ corners on the map." />;

  return (
    <ul className="p-1.5 space-y-0.5">
      {filtered.map((b) => (
        <li key={b.id}>
          <Row
            active={selection?.kind === "building" && selection.id === b.id}
            onClick={() => onSelect({ kind: "building", id: b.id })}
            leading={<Swatch color={b.colorCode ?? "#2563eb"} />}
            title={b.name}
            subtitle={`${b.floors ?? 1} floor${(b.floors ?? 1) === 1 ? "" : "s"}${b.address ? ` · ${b.address}` : ""}`}
          />
        </li>
      ))}
    </ul>
  );
}

// ── Rooms ─────────────────────────────────────────────────────────

function RoomList({
  query, selection, onSelect,
}: { query: string; selection: LeftSidebarSelection | null; onSelect: (s: LeftSidebarSelection) => void }) {
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    queryFn: () => fetchList<Room>("/api/rooms"),
  });
  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
    queryFn: () => fetchList<Building>("/api/buildings"),
  });
  const index = useMemo(() => buildRoomSearchIndex(rooms, buildings), [rooms, buildings]);

  const list = useMemo(() => {
    if (!query.trim()) {
      return rooms.map((room) => ({ room, score: 0 }));
    }
    // Filter out building hits — the Rooms tab lists rooms only. Building
    // hits still surface in the header search dropdown.
    return index.search(query, { limit: 200, kind: "room" })
      .map((hit) => hit.doc.data?.room ? { room: hit.doc.data.room, score: hit.score } : null)
      .filter((v): v is { room: Room; score: number } => v !== null);
  }, [query, index, rooms]);

  if (rooms.length === 0) return <EmptyState message="No rooms yet." hint="Draw a room inside a building using the Room tool." />;

  return (
    <ul className="p-1.5 space-y-0.5">
      {list.map(({ room }) => (
        <li key={room.id}>
          <Row
            active={selection?.kind === "room" && selection.id === room.id}
            onClick={() => onSelect({ kind: "room", id: room.id })}
            leading={<Swatch color={room.colorCode ?? "#059669"} />}
            title={`${room.roomNumber}${room.name ? ` · ${room.name}` : ""}`}
            subtitle={[room.type, room.floor !== undefined ? `Floor ${room.floor}` : null].filter(Boolean).join(" · ")}
          />
        </li>
      ))}
    </ul>
  );
}

// ── Hallways ──────────────────────────────────────────────────────

// ── Unified POI list ──────────────────────────────────────────────
//
// Every non-building/room primitive lives here: hallways (walkable
// corridors), walls (barriers stored as hallways with surface="wall"),
// doors, stairs, elevators, entrances. Rows tinted + iconed by kind.
// Hallway/wall rows still emit a `hallway` selection (opens the
// PropertyPanel). Point POIs emit a `ksyk:focus-point` window event so
// the parent can fly the map to them without needing PropertyPanel
// support for those kinds (yet).

type PoiKind = "hallway" | "wall" | "door" | "entrance" | "exit" | "stair" | "elevator";
interface UnifiedPoi {
  id: string;
  kind: PoiKind;
  title: string;
  subtitle: string;
  color: string;
  floor: number | null;
  /** Focus point for the click-to-fly-to behaviour on point POIs. */
  focusLat: number | null;
  focusLng: number | null;
}

function PoiList({
  query, selection, onSelect,
}: { query: string; selection: LeftSidebarSelection | null; onSelect: (s: LeftSidebarSelection) => void }) {
  const [kindFilter, setKindFilter] = useState<"all" | PoiKind>("all");

  const { data: hallways = [] } = useQuery<Hallway[]>({
    queryKey: ["/api/hallways"], queryFn: () => fetchList<Hallway>("/api/hallways"),
  });
  const { data: doors = [] } = useQuery<Door[]>({
    queryKey: ["/api/doors"], queryFn: () => fetchList<Door>("/api/doors"),
  });
  const { data: stairs = [] } = useQuery<Stair[]>({
    queryKey: ["/api/stairs"], queryFn: () => fetchList<Stair>("/api/stairs"),
  });
  const { data: elevators = [] } = useQuery<Elevator[]>({
    queryKey: ["/api/elevators"], queryFn: () => fetchList<Elevator>("/api/elevators"),
  });

  const items = useMemo<UnifiedPoi[]>(() => {
    const out: UnifiedPoi[] = [];
    for (const h of hallways) {
      const isWall = h.surface === "wall";
      out.push({
        id: h.id,
        kind: isWall ? "wall" : "hallway",
        title: isWall ? `Wall ${h.id.slice(0, 6)}` : `Hallway ${h.id.slice(0, 6)}`,
        subtitle: [
          h.width != null ? `${h.width} m` : null,
          !isWall && h.surface ? h.surface : null,
          h.floor != null ? `Floor ${h.floor}` : null,
        ].filter(Boolean).join(" · "),
        color: isWall ? "#1f2937" : "#f59e0b",
        floor: h.floor ?? null,
        focusLat: (h.startY + h.endY) / 2,
        focusLng: (h.startX + h.endX) / 2,
      });
    }
    for (const d of doors) {
      // Doors created via the POI tool have empty connects; those we
      // brand as "unattached" so users know to wire them. Widening
      // the tuple type to string[] because Firestore doesn't enforce
      // the tuple-of-2 constraint on real data.
      const emergency = d.emergencyExit === true;
      const connects = (d.connects as unknown as string[] | undefined);
      const orphan = !connects || connects.length === 0;
      out.push({
        id: d.id,
        kind: emergency ? "exit" : "door",
        title: emergency ? `Emergency exit ${d.id.slice(0, 6)}` : `Door ${d.id.slice(0, 6)}`,
        subtitle: [
          d.floor != null ? `Floor ${d.floor}` : null,
          orphan ? "unattached" : null,
        ].filter(Boolean).join(" · "),
        color: emergency ? "#dc2626" : "#4b5563",
        floor: d.floor ?? null,
        focusLat: d.position?.lat ?? null,
        focusLng: d.position?.lng ?? null,
      });
    }
    for (const s of stairs) {
      out.push({
        id: s.id,
        kind: "stair",
        title: `Stairs ${s.id.slice(0, 6)}`,
        subtitle: s.floors && s.floors.length > 0 ? `Floors ${s.floors.join(", ")}` : "no floors set",
        color: "#b45309",
        floor: s.floors?.[0] ?? null,
        focusLat: s.position?.lat ?? null,
        focusLng: s.position?.lng ?? null,
      });
    }
    for (const e of elevators) {
      out.push({
        id: e.id,
        kind: "elevator",
        title: e.name ?? `Elevator ${e.id.slice(0, 6)}`,
        subtitle: e.floors && e.floors.length > 0 ? `Floors ${e.floors.join(", ")}` : "no floors set",
        color: "#1d4ed8",
        floor: e.floors?.[0] ?? null,
        focusLat: e.position?.lat ?? null,
        focusLng: e.position?.lng ?? null,
      });
    }
    return out;
  }, [hallways, doors, stairs, elevators]);

  const q = query.trim().toLowerCase();
  const filtered = items.filter((it) => {
    if (kindFilter !== "all" && it.kind !== kindFilter) return false;
    if (!q) return true;
    return it.title.toLowerCase().includes(q) || it.subtitle.toLowerCase().includes(q);
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const it of items) c[it.kind] = (c[it.kind] ?? 0) + 1;
    return c;
  }, [items]);

  const allChips: Array<{ id: "all" | PoiKind; label: string; Icon: typeof RouteIcon }> = [
    { id: "all",      label: "All",       Icon: Layers },
    { id: "hallway",  label: "Hallways",  Icon: RouteIcon },
    { id: "wall",     label: "Walls",     Icon: StretchHorizontal },
    { id: "door",     label: "Doors",     Icon: DoorClosed },
    { id: "entrance", label: "Entrances", Icon: LogIn },
    { id: "exit",     label: "Exits",     Icon: DoorOpen },
    { id: "stair",    label: "Stairs",    Icon: StepForward },
    { id: "elevator", label: "Elevators", Icon: MoveVertical },
  ];
  const chips = allChips.filter((c) => c.id === "all" || (counts[c.id] ?? 0) > 0);

  if (items.length === 0) {
    return <EmptyState message="No POIs yet." hint="Draw hallways, walls, or click-place doors, stairs, elevators and entrances." />;
  }

  const onRowClick = (it: UnifiedPoi) => {
    if (it.kind === "hallway" || it.kind === "wall") {
      onSelect({ kind: "hallway", id: it.id });
    } else {
      // Point POIs — no PropertyPanel yet, so we just fly the map to
      // them via an event the parent listens for.
      if (it.focusLat != null && it.focusLng != null) {
        try {
          window.dispatchEvent(new CustomEvent("ksyk:focus-point", {
            detail: { lat: it.focusLat, lng: it.focusLng, kind: it.kind, id: it.id },
          }));
        } catch { /* SSR / old browser — non-fatal */ }
      }
    }
  };

  return (
    <div>
      {/* Kind filter chips — same visual language as the search dropdown. */}
      <div className="flex gap-1 overflow-x-auto px-2 py-1.5 border-b border-border">
        {chips.map((c) => {
          const active = kindFilter === c.id;
          const Icon = c.Icon;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setKindFilter(c.id)}
              className={cn(
                "shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full transition-colors flex items-center gap-1",
                active
                  ? "bg-blue-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              <Icon className="h-3 w-3" />
              {c.label}
              <span className="text-[9px] opacity-70 tabular-nums">{counts[c.id] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <ul className="p-1.5 space-y-0.5">
        {filtered.map((it) => (
          <li key={`${it.kind}:${it.id}`}>
            <Row
              active={selection?.kind === "hallway" && selection.id === it.id}
              onClick={() => onRowClick(it)}
              leading={<Swatch color={it.color} />}
              title={it.title}
              subtitle={it.subtitle}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// Kept for backwards-compat with any code path that still imports it;
// the tab itself now uses PoiList above.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HallwayList({
  query, selection, onSelect,
}: { query: string; selection: LeftSidebarSelection | null; onSelect: (s: LeftSidebarSelection) => void }) {
  const { data: hallways = [] } = useQuery<Hallway[]>({
    queryKey: ["/api/hallways"],
    queryFn: () => fetchList<Hallway>("/api/hallways"),
  });
  const q = query.trim().toLowerCase();
  const filtered = q ? hallways.filter((h) => h.id.toLowerCase().includes(q)) : hallways;

  if (hallways.length === 0) return <EmptyState message="No hallways yet." hint="Draw a corridor between rooms with the Hallway tool." />;

  return (
    <ul className="p-1.5 space-y-0.5">
      {filtered.map((h) => (
        <li key={h.id}>
          <Row
            active={selection?.kind === "hallway" && selection.id === h.id}
            onClick={() => onSelect({ kind: "hallway", id: h.id })}
            leading={<Swatch color="#f59e0b" />}
            title={`Hallway ${h.id.slice(0, 8)}`}
            subtitle={`${h.width ?? "?"} m${h.surface ? ` · ${h.surface}` : ""}${h.floor !== undefined && h.floor !== null ? ` · Floor ${h.floor}` : ""}`}
          />
        </li>
      ))}
    </ul>
  );
}

// ── Layers ────────────────────────────────────────────────────────

function LayerList({ query }: { query: string }) {
  const qc = useQueryClient();
  const { data: layers = [] } = useQuery<MapLayer[]>({
    queryKey: ["/api/layers"],
    queryFn: () => fetchList<MapLayer>("/api/layers"),
  });
  const upsert = useMutation({
    mutationFn: async (layer: MapLayer) => {
      const res = await apiRequest("PUT", `/api/layers/${layer.id}`, layer);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/layers"] }),
  });
  const [newName, setNewName] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q ? layers.filter((l) => l.name.toLowerCase().includes(q)) : layers;

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || `layer-${Date.now()}`;
    const nextZ = Math.max(0, ...layers.map((l) => l.z)) + 10;
    upsert.mutate({
      id, name, visible: true, locked: false, opacity: 1, z: nextZ,
    });
    setNewName("");
  };

  return (
    <div className="p-2 space-y-2">
      {/* Create layer */}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="New layer name"
          className="flex-1 h-8 px-2.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
        <button
          type="button"
          onClick={create}
          disabled={!newName.trim() || upsert.isPending}
          className="h-8 px-3 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {filtered.length === 0 && layers.length > 0 && (
        <EmptyState message="No layers match your filter." />
      )}
      {layers.length === 0 && (
        <EmptyState message="No layers yet." hint="Type a name and press Enter to create one." />
      )}

      <ul className="space-y-0.5">
        {filtered
          .slice()
          .sort((a, b) => a.z - b.z)
          .map((l) => (
            <li key={l.id}>
              <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60">
                <button
                  type="button"
                  onClick={() => upsert.mutate({ ...l, visible: !l.visible })}
                  title={l.visible ? "Hide layer" : "Show layer"}
                  aria-label={l.visible ? "Hide layer" : "Show layer"}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted"
                >
                  {l.visible
                    ? <Eye className="h-3.5 w-3.5 text-blue-600" />
                    : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                <button
                  type="button"
                  onClick={() => upsert.mutate({ ...l, locked: !l.locked })}
                  title={l.locked ? "Unlock layer" : "Lock layer"}
                  aria-label={l.locked ? "Unlock layer" : "Lock layer"}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted"
                >
                  {l.locked
                    ? <Lock className="h-3.5 w-3.5 text-orange-500" />
                    : <Unlock className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                <span className="text-sm flex-1 truncate">{l.name}</span>
                <span className="text-[10px] tabular-nums text-muted-foreground">z{l.z}</span>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────

function HistoryList({
  query, onRestore,
}: { query: string; onRestore?: (id: string) => void }) {
  const qc = useQueryClient();
  const { data: versions = [], isLoading } = useQuery<MapVersion[]>({
    queryKey: ["/api/map-package/versions"],
    queryFn: () => fetchList<MapVersion>("/api/map-package/versions"),
    refetchInterval: 30_000,
  });

  // The current published pointer lets us mark exactly one row as
  // "active" — no need to invent client-side heuristics.
  const { data: publishedPtr } = useQuery<{ pointer?: string } | null>({
    queryKey: ["/api/map-package/published-pointer"],
    queryFn: async () => {
      try {
        const r = await fetch("/api/map-package/published");
        if (!r.ok) return null;
        // We only need "did something get published" here; the full
        // package response doesn't carry the pointer id, so we call the
        // versions list separately and derive active by version.
        return {};
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });
  const activeVersionId = useMemo(() => {
    if (!publishedPtr) return null;
    // Newest published wins — server sorts DESC.
    return versions.find((v) => v.published)?.id ?? null;
  }, [publishedPtr, versions]);

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/map-package/versions/${id}/restore`);
      return res.json();
    },
    onSuccess: () => {
      // Every downstream consumer needs a re-fetch — the pointer moved.
      qc.invalidateQueries({ queryKey: ["/api/map-package/versions"] });
      qc.invalidateQueries({ queryKey: ["/api/map-package/published"] });
      qc.invalidateQueries({ queryKey: ["/api/map-package/published-pointer"] });
    },
  });

  const q = query.trim().toLowerCase();
  const filtered = q
    ? versions.filter((v) => (v.message ?? "").toLowerCase().includes(q) || String(v.version).includes(q))
    : versions;

  if (isLoading) return <Loading />;
  if (versions.length === 0) {
    return <EmptyState message="No versions yet." hint="Every publish creates a version. Hit Publish in the toolbar to see it here." />;
  }

  return (
    <ul className="p-1.5 space-y-1">
      {filtered.map((v) => {
        const isActive = v.id === activeVersionId;
        return (
          <li key={v.id}>
            <div
              className={cn(
                "rounded-lg p-2 border transition-colors",
                isActive
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-transparent hover:bg-muted/60",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  v{v.version}
                  {isActive && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-500 text-white">
                      Live
                    </span>
                  )}
                </span>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider",
                  v.published ? "bg-blue-500/15 text-blue-600 dark:text-blue-300" : "bg-gray-500/15 text-gray-500",
                )}>
                  {v.published ? "Published" : "Draft"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                {new Date(v.savedAt).toLocaleString()}{v.message ? ` · ${v.message}` : ""}
              </p>
              {!isActive && (
                <button
                  type="button"
                  onClick={() => {
                    restore.mutate(v.id);
                    onRestore?.(v.id);
                  }}
                  disabled={restore.isPending}
                  className="mt-2 w-full h-7 rounded-md text-[11px] font-semibold bg-muted hover:bg-blue-500/15 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  {restore.isPending ? "Restoring…" : "Restore this version"}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Row primitive ─────────────────────────────────────────────────

function Row({
  active, onClick, leading, title, subtitle,
}: {
  active: boolean;
  onClick: () => void;
  leading?: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
        active
          ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
          : "hover:bg-muted/60 text-foreground",
      )}
    >
      {leading}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
      </div>
    </button>
  );
}

function Swatch({ color }: { color: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />;
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="p-6 text-center text-muted-foreground">
      <p className="text-sm font-medium">{message}</p>
      {hint && <p className="text-xs mt-1 opacity-80">{hint}</p>}
    </div>
  );
}

function Loading() {
  return <div className="p-6 text-center text-muted-foreground text-sm">Loading…</div>;
}
