/**
 * PropertyPanel — Builder right-sidebar entity editor.
 *
 * Real "properties" panel per the master prompt: transform, style,
 * metadata, custom fields — bound to whichever entity is currently
 * selected in the builder canvas. Kind-dispatched via `entity.kind`:
 *   - "building" → name / colour / floors / rotation / metadata
 *   - "room"     → number / name / type / capacity / colour / tags
 *   - "hallway"  → width / surface / directions / accessibility
 *
 * Live-syncs edits by calling the shared PATCH mutation and
 * invalidating the relevant React Query key on success. Custom-fields
 * tab exposes `metadata` as a JSON editor for anything that doesn't
 * fit the typed schema.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { UndoAction } from "@/hooks/useUndoStack";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2, X, ClipboardList, Palette, Move3d, Puzzle, Pipette, Navigation, Plus } from "lucide-react";
import type { Building, Room, Hallway, RoomType } from "@ksyk/shared";
import { pickColor } from "@/lib/colorEyedropper";
import { useNavGraph, type NavNode } from "@/lib/navGraph";

type HistoryRecord = React.RefObject<HistoryRecordFn | undefined>;

function makeUpdateInverse(
  label: string,
  url: string,
  from: unknown,
  to: unknown,
  qc: QueryClient,
  invalidateKey: string[],
): UndoAction {
  return {
    label: `Undo ${label}`,
    run: async () => {
      await apiRequest("PATCH", url, from);
      qc.invalidateQueries({ queryKey: invalidateKey });
      return makeUpdateInverse(label, url, to, from, qc, invalidateKey);
    },
  };
}

/** Selection dispatched to the panel. Union so the panel can render
 *  a different form per entity kind. v3.28.1 — added point-POI kinds
 *  so doors/stairs/elevators/generic POIs are editable in the
 *  builder. v3.38.0 — "corridor" is its own kind (Room with type=hallway). */
export type SelectedEntity =
  | { kind: "building"; data: Building }
  | { kind: "room"; data: Room }
  | { kind: "corridor"; data: Room }
  | { kind: "hallway"; data: Hallway }
  | { kind: "door"; data: PointPoi & { isEntrance?: boolean; isExit?: boolean } }
  | { kind: "stair"; data: PointPoi }
  | { kind: "elevator"; data: PointPoi }
  | { kind: "poi"; data: PointPoi & { kind?: string } }
  | { kind: "node"; data: NavNode };

export interface PointPoi {
  id: string;
  floor?: number | null;
  mapPositionX?: number | null;
  mapPositionY?: number | null;
  metadata?: Record<string, unknown> | null;
  [k: string]: unknown;
}

interface PropertyPanelProps {
  entity: SelectedEntity;
  onDelete: () => void;
  onClose: () => void;
  onTabChange?: (tab: string) => void;
  onHistoryRecord?: (action: UndoAction) => void;
  activeFloor?: number | null;
  onAddFloorShape?: (floorNum: number) => void;
}

type HistoryRecordFn = (action: UndoAction) => void;

/** Same eight-swatch palette the previous inline builder used. Extended
 *  slightly to give rooms + buildings the same swatch set. */
const COLORS = [
  "#2563eb", "#dc2626", "#7c3aed", "#059669",
  "#f59e0b", "#ec4899", "#06b6d4", "#6b7280",
];

const ROOM_TYPES: RoomType[] = [
  "classroom", "lab", "office", "lobby", "auditorium", "gym", "storage",
  "bathroom", "locker_room", "elevator", "stairs", "mechanical",
  "cafeteria", "library", "entrance", "exit", "outdoor", "emergency",
  "other",
];

const TABS = [
  { id: "props", label: "Properties", Icon: ClipboardList },
  { id: "style", label: "Style", Icon: Palette },
  { id: "transform", label: "Transform", Icon: Move3d },
  { id: "custom", label: "Custom", Icon: Puzzle },
] as const;
type TabId = typeof TABS[number]["id"];

export default function PropertyPanel({ entity, onDelete, onClose, onTabChange, onHistoryRecord, activeFloor, onAddFloorShape }: PropertyPanelProps) {
  const [tab, setTab] = useState<TabId>("props");
  const onHistoryRecordRef = useRef<HistoryRecordFn | undefined>(onHistoryRecord);
  onHistoryRecordRef.current = onHistoryRecord;
  const changeTab = (t: TabId) => { setTab(t); onTabChange?.(t); };
  const title = useMemo(() => {
    if (entity.kind === "corridor") return "Corridor";
    if (entity.kind === "hallway") {
      const sf = (entity.data as Hallway).surface;
      if (sf === "inner-wall") return "Inner Wall";
      if (sf === "wall") return "Exterior Wall";
      return "Path / Hallway";
    }
    return entity.kind[0].toUpperCase() + entity.kind.slice(1);
  }, [entity.kind, entity.kind === "hallway" ? (entity.data as Hallway).surface : null]);
  // v3.28.1 — point POI kinds (door/stair/elevator/poi) don't have
  // polygon-style, transform, or per-feature metadata knobs yet.
  // v3.50.0 — nav nodes are the same: properties only.
  const isPointPoi = entity.kind === "door" || entity.kind === "stair" ||
                     entity.kind === "elevator" || entity.kind === "poi" ||
                     entity.kind === "node";
  const visibleTabs = isPointPoi
    ? TABS.filter((t) => t.id === "props")
    : TABS;

  return (
    <div className="absolute top-3 right-3 z-30 w-80 rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <KindDot entity={entity} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground leading-none">
              {title}
            </p>
            <p className="text-sm font-semibold text-foreground truncate mt-0.5">
              {titleFor(entity)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Close property panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className={cn("grid border-b border-border bg-muted/40", isPointPoi ? "grid-cols-1" : "grid-cols-4")}>
        {visibleTabs.map((t) => {
          const Icon = t.Icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => changeTab(t.id)}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-colors border-b-2",
                active
                  ? "border-blue-600 text-blue-700 dark:text-blue-300 bg-background"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={active}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      <div className="p-4 max-h-[65vh] overflow-y-auto">
        {tab === "props" && <PropsTab entity={entity} onHistoryRecord={onHistoryRecordRef} />}
        {tab === "style" && <StyleTab entity={entity} />}
        {tab === "transform" && <TransformTab entity={entity} activeFloor={activeFloor} onAddFloorShape={onAddFloorShape} />}
        {tab === "custom" && <CustomTab entity={entity} />}
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-3 border-t border-border bg-muted/40">
        <Button
          type="button"
          onClick={onDelete}
          variant="ghost"
          className="h-9 px-3 rounded-lg text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function KindDot({ entity }: { entity: SelectedEntity }) {
  let color: string;
  switch (entity.kind) {
    case "building":  color = entity.data.colorCode ?? "#2563eb"; break;
    case "room":      color = entity.data.colorCode ?? "#059669"; break;
    case "corridor":  color = entity.data.colorCode ?? "#94a3b8"; break;
    case "hallway": {
      const sf = (entity.data as Hallway).surface;
      color = sf === "inner-wall" ? "#64748b" : sf === "wall" ? "#1f2937" : "#f59e0b";
      break;
    }
    case "door":      color = entity.data.isEntrance ? "#16a34a" : entity.data.isExit ? "#dc2626" : "#374151"; break;
    case "stair":     color = "#f59e0b"; break;
    case "elevator":  color = "#2563eb"; break;
    case "poi":       color = "#8b5cf6"; break;
    case "node":      color = "#7c3aed"; break;
  }
  return <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: color }} />;
}

function titleFor(entity: SelectedEntity): string {
  if (entity.kind === "building") return entity.data.name ?? "(unnamed building)";
  if (entity.kind === "room") {
    return [entity.data.roomNumber, entity.data.name].filter(Boolean).join(" · ") || "(unnamed room)";
  }
  if (entity.kind === "corridor") {
    return entity.data.name || entity.data.roomNumber || "Unnamed corridor";
  }
  if (entity.kind === "hallway") {
    const sf = (entity.data as Hallway).surface;
    const prefix = sf === "inner-wall" ? "Inner wall" : sf === "wall" ? "Ext. wall" : "Hallway";
    return `${prefix} ${entity.data.id.slice(0, 8)}`;
  }
  if (entity.kind === "door") return entity.data.isEntrance ? "Entrance" : entity.data.isExit ? "Exit" : "Door";
  if (entity.kind === "stair") return "Stairs";
  if (entity.kind === "elevator") return "Elevator";
  if (entity.kind === "node") return entity.data.label || `Nav node ${entity.data.id.slice(2, 8)}`;
  return `POI (${entity.data.kind ?? "other"})`;
}

// ── Shared field primitives ───────────────────────────────────────

function TextField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      />
    </div>
  );
}

function NumberField({
  label, value, onChange, min, max, step,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      />
    </div>
  );
}

function ColorSwatchGrid({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          className={cn(
            "h-7 rounded-lg border-2 transition-all",
            value === c ? "border-blue-500 scale-110" : "border-transparent hover:border-border",
          )}
          style={{ background: c }}
        />
      ))}
    </div>
  );
}

function DirtySaveButton({
  isDirty, isPending, onSave,
}: { isDirty: boolean; isPending: boolean; onSave: () => void }) {
  return (
    <Button
      type="button"
      onClick={onSave}
      disabled={!isDirty || isPending}
      className="w-full h-10 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98] disabled:opacity-40"
    >
      {isPending ? "Saving…" : isDirty ? "Save changes" : "Saved"}
    </Button>
  );
}

// ── Per-kind tabs ─────────────────────────────────────────────────

function PropsTab({ entity, onHistoryRecord }: { entity: SelectedEntity; onHistoryRecord?: React.RefObject<((a: UndoAction) => void) | undefined> }) {
  if (entity.kind === "building") return <BuildingProps building={entity.data} onHistoryRecord={onHistoryRecord} />;
  if (entity.kind === "room") return <RoomProps room={entity.data} onHistoryRecord={onHistoryRecord} />;
  if (entity.kind === "corridor") return <CorridorProps room={entity.data} onHistoryRecord={onHistoryRecord} />;
  if (entity.kind === "hallway") return <HallwayProps hallway={entity.data} onHistoryRecord={onHistoryRecord} />;
  if (entity.kind === "node") return <NavNodeProps node={entity.data} />;
  // v3.28.1 — point POI forms. All four share the same core (floor +
  // position + delete); doors additionally have isEntrance/isExit
  // toggles; generic POIs have a `kind` string.
  const resource =
    entity.kind === "door" ? "doors" :
    entity.kind === "stair" ? "stairs" :
    entity.kind === "elevator" ? "elevators" :
    "pois";
  return <PointPoiProps poi={entity.data} kind={entity.kind} resource={resource} />;
}

/** Inline editor for a localStorage-backed nav graph node. */
function NavNodeProps({ node }: { node: NavNode }) {
  const { updateNode } = useNavGraph();
  const [label, setLabel] = useState(node.label ?? "");
  const [floor, setFloor] = useState(node.floor);
  const [kind, setKind] = useState<NavNode["kind"]>(node.kind ?? "junction");

  const dirty = label !== (node.label ?? "") || floor !== node.floor || kind !== (node.kind ?? "junction");

  const save = () => {
    updateNode(node.id, { label: label.trim() || undefined, floor, kind });
  };

  return (
    <div className="space-y-4">
      <TextField label="Label" value={label} onChange={setLabel} placeholder="e.g. K corridor junction 3" />
      <NumberField label="Floor" value={floor} onChange={setFloor} min={0} max={10} step={1} />
      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kind</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as NavNode["kind"])}
          className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <option value="junction">Junction (corridor crossing)</option>
          <option value="room">Room entrance</option>
          <option value="stairs">Stairs landing</option>
          <option value="elevator">Elevator stop</option>
          <option value="entrance">Building entrance</option>
        </select>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Position</p>
        <p className="text-xs font-mono text-muted-foreground tabular-nums">
          {node.lat.toFixed(6)}, {node.lng.toFixed(6)}
        </p>
        <p className="text-[11px] text-muted-foreground">
          Saved in localStorage — synced to server with the routing API.
        </p>
      </div>
      <DirtySaveButton isDirty={dirty} isPending={false} onSave={save} />
    </div>
  );
}

/** Point-POI editor — one form for door / stair / elevator / poi. */
function PointPoiProps({
  poi, kind, resource,
}: {
  poi: PointPoi & { isEntrance?: boolean; isExit?: boolean; kind?: string };
  kind: "door" | "stair" | "elevator" | "poi";
  resource: "doors" | "stairs" | "elevators" | "pois";
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [floor, setFloor] = useState<number>((poi.floor as number | null) ?? 1);
  const [isEntrance, setIsEntrance] = useState<boolean>(!!poi.isEntrance);
  const [isExit, setIsExit] = useState<boolean>(!!poi.isExit);
  const [poiKind, setPoiKind] = useState<string>(String(poi.kind ?? ""));
  // v3.28.2 — per-POI icon size override (px radius). Stored in
  // metadata.style.iconSize so BuilderPois + CampusOverlay honour it
  // via ["case",["has","iconSize"], ["get","iconSize"], …]. 0 = "use
  // default zoom-interpolated size."
  const initialMeta = (poi.metadata ?? {}) as Record<string, unknown>;
  const initialStyle = (initialMeta.style ?? {}) as Record<string, unknown>;
  const initialIconSize = typeof initialStyle.iconSize === "number" ? initialStyle.iconSize : 0;
  const [iconSize, setIconSize] = useState<number>(initialIconSize);

  const patch = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", `/api/${resource}/${poi.id}`, body);
      try { return await res.json(); } catch { return null; }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/${resource}`] }),
    onError: (err: any) => toast({
      title: "Save failed",
      description: err?.message ?? "Could not save changes. Are you logged in?",
      variant: "destructive",
    }),
  });

  const dirty =
    floor !== ((poi.floor as number | null) ?? 1) ||
    (kind === "door" && (isEntrance !== !!poi.isEntrance || isExit !== !!poi.isExit)) ||
    (kind === "poi" && poiKind !== String(poi.kind ?? "")) ||
    iconSize !== initialIconSize;

  const label =
    kind === "door" ? "Door" :
    kind === "stair" ? "Stairs" :
    kind === "elevator" ? "Elevator" :
    "POI";

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Type</p>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm font-semibold">
          {label}
        </div>
      </div>
      <NumberField label="Floor" value={floor} onChange={setFloor} min={-5} max={30} />
      {kind === "door" && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isEntrance}
              onChange={(e) => {
                setIsEntrance(e.target.checked);
                if (e.target.checked) setIsExit(false);
              }}
              className="h-4 w-4 accent-emerald-600"
            />
            <span>Is entrance <span className="text-muted-foreground text-xs">(green E)</span></span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isExit}
              onChange={(e) => {
                setIsExit(e.target.checked);
                if (e.target.checked) setIsEntrance(false);
              }}
              className="h-4 w-4 accent-red-600"
            />
            <span>Is exit only <span className="text-muted-foreground text-xs">(red X)</span></span>
          </label>
        </div>
      )}
      {kind === "poi" && (
        <TextField
          label="POI kind"
          value={poiKind}
          onChange={setPoiKind}
          placeholder="e.g. restroom, cafe, info"
        />
      )}
      <div>
        <label className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
          <span>Icon size</span>
          <span className="tabular-nums text-foreground normal-case">
            {iconSize > 0 ? `${iconSize}px` : "auto"}
          </span>
        </label>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={iconSize}
          onChange={(e) => setIconSize(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <p className="text-[10px] text-muted-foreground">Drag to 0 to use the default zoom-scaled size.</p>
      </div>
      <div className="pt-2 border-t border-border">
        <p className="text-[11px] text-muted-foreground mb-2">
          Position: {typeof poi.mapPositionY === "number" && typeof poi.mapPositionX === "number"
            ? `${poi.mapPositionY.toFixed(6)}, ${poi.mapPositionX.toFixed(6)}`
            : "unknown"}
        </p>
      </div>
      <DirtySaveButton
        isDirty={dirty}
        isPending={patch.isPending}
        onSave={() => {
          const body: Record<string, unknown> = { floor };
          if (kind === "door") { body.isEntrance = isEntrance; body.isExit = isExit; }
          if (kind === "poi") { body.kind = poiKind || null; }
          // v3.28.2 — merge iconSize into metadata.style so we don't
          // clobber unrelated metadata keys.
          const nextStyle: Record<string, unknown> = { ...initialStyle };
          if (iconSize > 0) nextStyle.iconSize = iconSize;
          else delete nextStyle.iconSize;
          const nextMeta: Record<string, unknown> = { ...initialMeta, style: nextStyle };
          body.metadata = nextMeta;
          patch.mutate(body);
        }}
      />
    </div>
  );
}

function BuildingProps({ building, onHistoryRecord }: { building: Building; onHistoryRecord?: HistoryRecord }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState(building.name);
  const [nameEn, setNameEn] = useState(building.nameEn ?? "");
  const [nameFi, setNameFi] = useState(building.nameFi ?? "");
  const [floors, setFloors] = useState(building.floors ?? 1);
  const [floorMin, setFloorMin] = useState<number>(building.floorMin ?? 1);
  const [floorMax, setFloorMax] = useState<number>(
    building.floorMax ?? (building.floors ?? 1),
  );
  const [address, setAddress] = useState(building.address ?? "");

  const patch = useMutation({
    mutationFn: async (body: Partial<Building>) => {
      const res = await apiRequest("PATCH", `/api/buildings/${building.id}`, body);
      return { result: await res.json(), body };
    },
    onSuccess: ({ body }) => {
      qc.invalidateQueries({ queryKey: ["/api/buildings"] });
      const oldBody: Partial<Building> = {
        name: building.name, nameEn: building.nameEn ?? null, nameFi: building.nameFi ?? null,
        floors: building.floors ?? 1, floorMin: building.floorMin ?? 1,
        floorMax: building.floorMax ?? building.floors ?? 1, address: building.address ?? null,
      };
      onHistoryRecord?.current?.(makeUpdateInverse("building edit", `/api/buildings/${building.id}`, oldBody, body, qc, ["/api/buildings"]));
    },
    onError: (err: any) => toast({
      title: "Save failed",
      description: err?.message ?? "Could not save building. Are you logged in?",
      variant: "destructive",
    }),
  });

  const dirty =
    name !== building.name ||
    nameEn !== (building.nameEn ?? "") ||
    nameFi !== (building.nameFi ?? "") ||
    floors !== (building.floors ?? 1) ||
    floorMin !== (building.floorMin ?? 1) ||
    floorMax !== (building.floorMax ?? (building.floors ?? 1)) ||
    address !== (building.address ?? "");

  const spanValid = floorMax >= floorMin;

  return (
    <div className="space-y-3">
      <TextField label="Name" value={name} onChange={setName} />
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Name (EN)" value={nameEn} onChange={setNameEn} />
        <TextField label="Name (FI)" value={nameFi} onChange={setNameFi} />
      </div>
      <TextField label="Address" value={address} onChange={setAddress} placeholder="Street 1" />
      <NumberField label="Floors (count)" value={floors} onChange={setFloors} min={1} max={40} />

      {/* Explicit floor range — for buildings that don't start at 1.
       *  Basement -1 to floor 4 supported. */}
      <div className="rounded-lg border border-border p-2.5 bg-muted/30 space-y-2">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
          Floor range
        </p>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Lowest" value={floorMin} onChange={setFloorMin} min={-3} max={40} />
          <NumberField label="Highest" value={floorMax} onChange={setFloorMax} min={-3} max={40} />
        </div>
        {!spanValid && (
          <p className="text-[10px] text-red-600 dark:text-red-400">
            Highest must be ≥ lowest.
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          Buildings can span e.g. −1 to 3. The floor selector on the map
          takes the union across every building.
        </p>
      </div>

      <DirtySaveButton
        isDirty={dirty && spanValid}
        isPending={patch.isPending}
        onSave={() => patch.mutate({
          name, nameEn, nameFi, floors, floorMin, floorMax,
          address: address || null,
        })}
      />
    </div>
  );
}

function RoomProps({ room, onHistoryRecord }: { room: Room; onHistoryRecord?: HistoryRecord }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [roomNumber, setRoomNumber] = useState(room.roomNumber);
  const [name, setName] = useState(room.name ?? "");
  // v3.28.0 — English + Finnish name fields alongside the base name.
  // Server schema already had nameEn/nameFi columns; the property
  // panel just wasn't exposing them.
  const [nameEn, setNameEn] = useState((room as unknown as { nameEn?: string | null }).nameEn ?? "");
  const [nameFi, setNameFi] = useState((room as unknown as { nameFi?: string | null }).nameFi ?? "");
  const [type, setType] = useState<RoomType | null>(room.type ?? null);
  const [capacity, setCapacity] = useState(room.capacity ?? 0);
  const [department, setDepartment] = useState(room.department ?? "");
  const [teacher, setTeacher] = useState(room.teacher ?? "");
  const [tagsInput, setTagsInput] = useState((room.tags ?? []).join(", "));
  const [floor, setFloor] = useState<number>(room.floor ?? 1);
  // v3.27.3 — info fields (photo + hours + description) editable
  // right here without diving into the Custom-JSON tab.
  // v3.29.0 — photoUrl + hours are first-class Room columns now;
  // read top-level first, fall back to metadata for rooms authored
  // before the column existed.
  const initialMeta = (room.metadata as Record<string, unknown> | null | undefined) ?? {};
  const initialInfo = ((initialMeta.info as Record<string, unknown> | undefined) ?? initialMeta) as Record<string, unknown>;
  const initialPhotoUrl = ((room as unknown as { photoUrl?: string | null }).photoUrl)
    ?? (initialInfo.photoUrl as string | undefined)
    ?? (initialMeta.photoUrl as string | undefined)
    ?? "";
  const initialHoursVal = ((room as unknown as { hours?: string | null }).hours)
    ?? (initialInfo.hours as string | undefined)
    ?? (initialMeta.hours as string | undefined)
    ?? "";
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [hours, setHours] = useState(initialHoursVal);
  const [description, setDescription] = useState(room.description ?? "");
  // External schedule link. scheduleLabel is the button text; scheduleUrl is the target.
  const initialScheduleUrl = ((room as unknown as { scheduleUrl?: string | null }).scheduleUrl)
    ?? (initialMeta.scheduleUrl as string | undefined) ?? "";
  const initialScheduleLabel = ((room as unknown as { scheduleLabel?: string | null }).scheduleLabel)
    ?? (initialMeta.scheduleLabel as string | undefined) ?? "";
  const [scheduleUrl, setScheduleUrl] = useState(initialScheduleUrl);
  const [scheduleLabel, setScheduleLabel] = useState(initialScheduleLabel);
  // Multi-floor: stored as metadata.floorIds (number[]). A room can
  // appear on more than one floor with the same polygon.
  const initialFloorIds: number[] = Array.isArray(initialMeta.floorIds) ? (initialMeta.floorIds as number[]) : [];
  const [floorIdsInput, setFloorIdsInput] = useState(initialFloorIds.join(", "));

  const patch = useMutation({
    mutationFn: async (body: Partial<Room>) => {
      const res = await apiRequest("PATCH", `/api/rooms/${room.id}`, body);
      return { result: await res.json(), body };
    },
    onSuccess: ({ body }) => {
      qc.invalidateQueries({ queryKey: ["/api/rooms"] });
      const oldBody: Partial<Room> = {
        roomNumber: room.roomNumber, name: room.name ?? null, nameEn: (room as any).nameEn ?? null,
        nameFi: (room as any).nameFi ?? null, type: room.type ?? null, floor: room.floor ?? 1,
        capacity: room.capacity ?? null, department: room.department ?? null, teacher: room.teacher ?? null,
        description: room.description ?? null, metadata: room.metadata ?? null,
      };
      onHistoryRecord?.current?.(makeUpdateInverse("room edit", `/api/rooms/${room.id}`, oldBody, body, qc, ["/api/rooms"]));
    },
    onError: (err: any) => toast({
      title: "Save failed",
      description: err?.message ?? "Could not save room. Are you logged in?",
      variant: "destructive",
    }),
  });

  const dirty =
    roomNumber !== room.roomNumber ||
    name !== (room.name ?? "") ||
    nameEn !== ((room as unknown as { nameEn?: string | null }).nameEn ?? "") ||
    nameFi !== ((room as unknown as { nameFi?: string | null }).nameFi ?? "") ||
    type !== (room.type ?? null) ||
    capacity !== (room.capacity ?? 0) ||
    department !== (room.department ?? "") ||
    teacher !== (room.teacher ?? "") ||
    tagsInput !== (room.tags ?? []).join(", ") ||
    floor !== (room.floor ?? 1) ||
    photoUrl !== initialPhotoUrl ||
    hours !== initialHoursVal ||
    scheduleUrl !== initialScheduleUrl ||
    scheduleLabel !== initialScheduleLabel ||
    description !== (room.description ?? "") ||
    floorIdsInput !== initialFloorIds.join(", ");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Number" value={roomNumber} onChange={setRoomNumber} />
        <TextField label="Name" value={name} onChange={setName} />
      </div>
      {/* v3.28.0 — bilingual name fields. Empty = fall back to base
       *  name; used by i18n-aware displays (search index, info drawer
       *  once localized). */}
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Name (English)" value={nameEn} onChange={setNameEn} placeholder="e.g. Music room" />
        <TextField label="Name (Finnish)" value={nameFi} onChange={setNameFi} placeholder="esim. Musiikkiluokka" />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Type</label>
        <select
          value={type ?? ""}
          onChange={(e) => setType((e.target.value || null) as RoomType | null)}
          className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <option value="">— none —</option>
          {ROOM_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace("_", " ")}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <NumberField label="Floor" value={floor} onChange={setFloor} min={-5} max={30} />
        <NumberField label="Capacity" value={capacity} onChange={setCapacity} min={0} max={5000} />
        <TextField label="Department" value={department} onChange={setDepartment} />
      </div>
      <TextField
        label="Also on floors (comma-separated)"
        value={floorIdsInput}
        onChange={setFloorIdsInput}
        placeholder="e.g. 1, 2, 3 — room appears on all listed floors"
      />
      <TextField label="Teacher" value={teacher} onChange={setTeacher} />
      <TextField label="Tags (comma-separated)" value={tagsInput} onChange={setTagsInput} />
      {/* v3.27.3 — info fields section. Anything typed here becomes
       *  the room's info drawer on the public map. Simple text inputs;
       *  the schema-first proper upload widget is a follow-up. */}
      <div className="pt-2 mt-2 border-t border-border">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Info drawer content
        </p>
        <div className="space-y-2">
          <TextField
            label="Photo URL"
            value={photoUrl}
            onChange={setPhotoUrl}
            placeholder="https://…/room-photo.jpg"
          />
          <TextField
            label="Hours"
            value={hours}
            onChange={setHours}
            placeholder="Mon–Fri 8–16 · Closed weekends"
          />
          <div className="grid grid-cols-1 gap-2 pt-2 mt-2 border-t border-border">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Schedule link (external)
            </p>
            <TextField
              label="Button label"
              value={scheduleLabel}
              onChange={setScheduleLabel}
              placeholder="e.g. Open schedule"
            />
            <TextField
              label="URL"
              value={scheduleUrl}
              onChange={setScheduleUrl}
              placeholder="https://…"
            />
            <p className="text-[10px] text-muted-foreground">
              Shown as a blue button in the room's info drawer. If label
              is empty, we render "Open schedule."
            </p>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="One-line or paragraph. Shown as the About row in the info drawer."
              className="mt-1 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
            />
          </div>
        </div>
      </div>
      <DirtySaveButton
        isDirty={dirty}
        isPending={patch.isPending}
        onSave={() => {
          // v3.27.3 — merge the info fields into metadata WITHOUT
          // clobbering unrelated keys (e.g. `style` set from the
          // Style tab). Everything else (photoUrl, hours) sits at
          // the top level of metadata so featurePhotoUrl +
          // featureContact in FeatureInfoSheet pick it up.
          const nextMeta: Record<string, unknown> = { ...initialMeta };
          if (photoUrl.trim()) nextMeta.photoUrl = photoUrl.trim();
          else delete nextMeta.photoUrl;
          if (hours.trim()) nextMeta.hours = hours.trim();
          else delete nextMeta.hours;
          const parsedFloorIds = floorIdsInput
            .split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
          if (parsedFloorIds.length > 0) nextMeta.floorIds = parsedFloorIds;
          else delete nextMeta.floorIds;
          patch.mutate({
            roomNumber,
            name: name || null,
            nameEn: nameEn || null,
            nameFi: nameFi || null,
            type,
            floor,
            capacity,
            department: department || null,
            teacher: teacher || null,
            description: description.trim() || null,
            // v3.29.0 — photoUrl + hours are now first-class Room
            // columns (see packages/shared types). Legacy metadata
            // keys are still cleared on save so a room migrated
            // from the old scheme doesn't carry duplicates.
            photoUrl: photoUrl.trim() || null,
            hours: hours.trim() || null,
            // v3.31.1 — schedule link columns.
            scheduleUrl: scheduleUrl.trim() || null,
            scheduleLabel: scheduleLabel.trim() || null,
            tags: tagsInput
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            metadata: nextMeta as never,
          } as never);
        }}
      />
    </div>
  );
}

function CorridorProps({ room, onHistoryRecord }: { room: Room; onHistoryRecord?: HistoryRecord }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState(room.name ?? "");
  const [label, setLabel] = useState(room.roomNumber ?? "");
  const [floor, setFloor] = useState<number>(room.floor ?? 1);
  const [description, setDescription] = useState(room.description ?? "");
  const initialMeta = (room.metadata as Record<string, unknown> | null | undefined) ?? {};
  const initialStyle = (initialMeta.style as Record<string, unknown> | undefined) ?? {};
  const [widthM, setWidthM] = useState<number>((initialStyle.widthMeters as number | undefined) ?? 2);
  const [fillOpacityPct, setFillOpacityPct] = useState(
    Math.round(((initialStyle.fillOpacity as number | undefined) ?? 0.45) * 100),
  );
  const [accessible, setAccessible] = useState<boolean>(
    (initialStyle.accessible as boolean | undefined) ?? true,
  );

  const { graph, addNode } = useNavGraph();

  // Nearby nav nodes — any node within the corridor's bounding box
  // (slightly expanded by ~15 m so "near the entrance" nodes also show).
  const nearbyNodes = useMemo(() => {
    const pts = room.points ?? [];
    if (pts.length < 3) return [];
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    const PAD = 0.00015; // ~15 m
    const minLat = Math.min(...lats) - PAD;
    const maxLat = Math.max(...lats) + PAD;
    const minLng = Math.min(...lngs) - PAD;
    const maxLng = Math.max(...lngs) + PAD;
    return graph.nodes.filter(
      (n) => n.lat >= minLat && n.lat <= maxLat && n.lng >= minLng && n.lng <= maxLng,
    );
  }, [room.points, graph.nodes]);

  // Centroid for "add nav node" button.
  const centroid = useMemo(() => {
    const pts = room.points ?? [];
    if (!pts.length) return null;
    return {
      lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
      lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
    };
  }, [room.points]);

  // Count edges touching each nearby node.
  const edgeCountById = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of nearbyNodes) m.set(n.id, 0);
    for (const e of graph.edges) {
      if (m.has(e.fromNodeId)) m.set(e.fromNodeId, (m.get(e.fromNodeId) ?? 0) + 1);
      if (m.has(e.toNodeId)) m.set(e.toNodeId, (m.get(e.toNodeId) ?? 0) + 1);
    }
    return m;
  }, [nearbyNodes, graph.edges]);

  const patch = useMutation({
    mutationFn: async (body: Partial<Room>) => {
      const res = await apiRequest("PATCH", `/api/rooms/${room.id}`, body);
      return { result: await res.json(), body };
    },
    onSuccess: ({ body }) => {
      qc.invalidateQueries({ queryKey: ["/api/rooms"] });
      const oldBody = { name: room.name ?? null, roomNumber: room.roomNumber, floor: room.floor ?? 1, metadata: room.metadata ?? null };
      onHistoryRecord?.current?.(makeUpdateInverse("corridor edit", `/api/rooms/${room.id}`, oldBody, body, qc, ["/api/rooms"]));
    },
    onError: (err: any) => toast({
      title: "Save failed",
      description: err?.message ?? "Could not save corridor. Are you logged in?",
      variant: "destructive",
    }),
  });

  const dirty =
    name !== (room.name ?? "") ||
    label !== (room.roomNumber ?? "") ||
    floor !== (room.floor ?? 1) ||
    description !== (room.description ?? "") ||
    widthM !== ((initialStyle.widthMeters as number | undefined) ?? 2) ||
    fillOpacityPct !== Math.round(((initialStyle.fillOpacity as number | undefined) ?? 0.45) * 100) ||
    accessible !== ((initialStyle.accessible as boolean | undefined) ?? true);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 dark:text-slate-400 mb-0.5">
          Corridor — walkable area
        </p>
        <p className="text-[11px] text-muted-foreground">
          Filled polygon in the Structure tab. Nav nodes drive routing.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TextField label="Label / ID" value={label} onChange={setLabel} placeholder="Corridor A" />
        <TextField label="Name" value={name} onChange={setName} placeholder="Main corridor" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Floor" value={floor} onChange={setFloor} min={-5} max={30} />
        <NumberField label="Width (m)" value={widthM} onChange={setWidthM} min={0.5} max={20} step={0.5} />
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Fill opacity ({fillOpacityPct}%)
        </label>
        <input
          type="range" min={10} max={90} step={5}
          value={fillOpacityPct}
          onChange={(e) => setFillOpacityPct(Number(e.target.value))}
          className="w-full accent-slate-600"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={accessible}
          onChange={(e) => setAccessible(e.target.checked)}
          className="h-4 w-4 accent-emerald-600"
        />
        Wheelchair accessible
      </label>

      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g. Main east-west corridor, floor 1"
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
        />
      </div>

      <DirtySaveButton
        isDirty={dirty}
        isPending={patch.isPending}
        onSave={() => {
          const nextStyle = {
            ...initialStyle,
            widthMeters: widthM,
            fillOpacity: fillOpacityPct / 100,
            accessible,
          };
          patch.mutate({
            roomNumber: label || undefined,
            name: name || null,
            floor,
            description: description.trim() || null,
            metadata: { ...initialMeta, style: nextStyle } as never,
          } as never);
        }}
      />

      {/* Nav nodes section */}
      <div className="pt-2 mt-1 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Navigation className="h-3 w-3" />
            Nav nodes nearby ({nearbyNodes.length})
          </p>
          {centroid && (
            <button
              type="button"
              onClick={() => {
                addNode({ lat: centroid.lat, lng: centroid.lng, floor: floor, kind: "junction" });
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-violet-700 dark:text-violet-300 hover:underline"
              title="Drop a junction nav node at this corridor's centroid"
            >
              <Plus className="h-3 w-3" />
              Add at centroid
            </button>
          )}
        </div>
        {nearbyNodes.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">
            No nav nodes within ~15 m of this corridor. Use the Nav node tool or click "Add at centroid" above.
          </p>
        ) : (
          <ul className="space-y-1">
            {nearbyNodes.map((n) => {
              const edges = edgeCountById.get(n.id) ?? 0;
              const kindLabel = n.kind === "junction" ? "Junction"
                : n.kind === "stairs" ? "Stairs"
                : n.kind === "elevator" ? "Elevator"
                : n.kind === "entrance" ? "Entrance"
                : n.kind === "room" ? "Room"
                : "Node";
              return (
                <li
                  key={n.id}
                  className="rounded-lg bg-violet-50 dark:bg-violet-950/30 px-2.5 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />
                    <span className="font-semibold text-violet-800 dark:text-violet-200">{n.label || kindLabel}</span>
                    <span className="text-muted-foreground ml-auto tabular-nums">{edges} edge{edges !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-muted-foreground mt-0.5 pl-3.5">
                    Floor {n.floor} · {n.lat.toFixed(5)}, {n.lng.toFixed(5)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function HallwayProps({ hallway, onHistoryRecord }: { hallway: Hallway; onHistoryRecord?: HistoryRecord }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [width, setWidth] = useState(hallway.width ?? 2);
  const initialSurface = (hallway.surface ?? "concrete") as string;
  const [surface, setSurface] = useState(initialSurface);
  const [directions, setDirections] = useState(hallway.directions ?? "both");
  const [accessible, setAccessible] = useState(hallway.accessible ?? true);
  const [floor, setFloor] = useState<number>(hallway.floor ?? 1);

  const isBarrier = surface === "wall" || surface === "inner-wall";

  const patch = useMutation({
    mutationFn: async (body: Partial<Hallway>) => {
      const res = await apiRequest("PATCH", `/api/hallways/${hallway.id}`, body);
      return { result: await res.json(), body };
    },
    onSuccess: ({ body }) => {
      qc.invalidateQueries({ queryKey: ["/api/hallways"] });
      const oldBody = { width: hallway.width ?? 2, surface: hallway.surface, directions: hallway.directions };
      onHistoryRecord?.current?.(makeUpdateInverse("wall/hallway edit", `/api/hallways/${hallway.id}`, oldBody, body, qc, ["/api/hallways"]));
    },
    onError: (err: any) => toast({
      title: "Save failed",
      description: err?.message ?? "Could not save hallway. Are you logged in?",
      variant: "destructive",
    }),
  });

  const dirty =
    width !== (hallway.width ?? 2) ||
    surface !== initialSurface ||
    directions !== (hallway.directions ?? "both") ||
    accessible !== (hallway.accessible ?? true) ||
    (surface === "inner-wall" && floor !== (hallway.floor ?? 1));

  return (
    <div className="space-y-3">
      {/* Kind badge */}
      <div className={cn(
        "rounded-lg px-3 py-2 text-[11px] font-semibold",
        isBarrier
          ? "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200",
      )}>
        {surface === "wall" ? "Exterior wall — structural barrier" :
         surface === "inner-wall" ? "Interior wall — partition / divider" :
         "Path — walkable hallway segment"}
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Surface / type</label>
        <select
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <optgroup label="Wall types">
            <option value="wall">Exterior wall (thick, dark)</option>
            <option value="inner-wall">Interior wall (thin, lighter)</option>
          </optgroup>
          <optgroup label="Walkable surfaces">
            <option value="concrete">Concrete</option>
            <option value="carpet">Carpet</option>
            <option value="tile">Tile</option>
            <option value="gravel">Gravel</option>
            <option value="asphalt">Asphalt</option>
          </optgroup>
        </select>
      </div>

      {/* Floor selector — only for inner walls (they're floor-specific) */}
      {surface === "inner-wall" && (
        <NumberField label="Floor" value={floor} onChange={setFloor} min={-5} max={30} step={1} />
      )}

      {/* Width only makes sense for walkable paths; walls use render-time width */}
      {!isBarrier && (
        <NumberField label="Width (m)" value={width} onChange={setWidth} min={0.5} max={20} step={0.1} />
      )}

      {/* Traversal + accessibility only apply to walkable paths */}
      {!isBarrier && (
        <>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Traversal direction</label>
            <select
              value={directions}
              onChange={(e) => setDirections(e.target.value as NonNullable<Hallway["directions"]>)}
              className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            >
              <option value="both">Both directions</option>
              <option value="start_to_end">Start → End only</option>
              <option value="end_to_start">End → Start only</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={accessible}
              onChange={(e) => setAccessible(e.target.checked)}
              className="h-4 w-4 rounded accent-emerald-600"
            />
            Wheelchair accessible
          </label>
        </>
      )}

      <div className="pt-1 border-t border-border text-[11px] text-muted-foreground space-y-0.5">
        <p>ID: <span className="font-mono">{hallway.id.slice(0, 12)}…</span></p>
        <p>Points: {((hallway as unknown as { points?: unknown[] }).points ?? []).length || "2 (legacy)"}</p>
      </div>

      <DirtySaveButton
        isDirty={dirty}
        isPending={patch.isPending}
        onSave={() => patch.mutate({ width, surface: surface as Hallway["surface"], directions, accessible, ...(surface === "inner-wall" ? { floor } : {}) })}
      />
    </div>
  );
}

// ── Style tab (colour) ─────────────────────────────────────────────

function StyleTab({ entity }: { entity: SelectedEntity }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  // v3.28.1 — point-POI kinds have no per-feature style knobs yet; if
  // one somehow reaches this tab (should be blocked by the tab
  // visibility filter), render a placeholder instead of crashing.
  if (entity.kind === "door" || entity.kind === "stair"
      || entity.kind === "elevator" || entity.kind === "poi") {
    return <p className="text-xs text-muted-foreground p-4">Point POIs use their kind's default style. Edit position + floor in the Properties tab.</p>;
  }
  const currentColor =
    entity.kind === "building" ? (entity.data.colorCode ?? "#2563eb") :
    entity.kind === "room"     ? (entity.data.colorCode ?? "#059669") :
    entity.kind === "corridor" ? (entity.data.colorCode ?? "#94a3b8") :
                                 "#f59e0b";
  // Style knobs live in `metadata.style` so we don't need a DB
  // migration per option. Renderers respect them by reading properties
  // off the GeoJSON feature.
  const metaStyle =
    entity.kind !== "hallway"
      ? (entity.data.metadata as { style?: Record<string, unknown> } | null | undefined)?.style
      : undefined;
  // Rooms default to no outline (cleaner MazeMap look); buildings + corridors default to showing one.
  const initialShowOutline = (metaStyle?.showOutline as boolean | undefined) ?? (entity.kind === "room" ? false : true);
  const initialFillOpacity = Math.round(((metaStyle?.fillOpacity as number | undefined) ?? (entity.kind === "corridor" ? 0.45 : 0.6)) * 100);
  const initialShowLabel = (metaStyle?.showLabel as boolean | undefined) ?? true;
  // 3D height knobs — buildings and rooms both accept a per-instance
  // override. Values are in metres. 0 (or unset) falls back to the
  // campus-wide default in CampusOverlay.
  const defaultHeightPerFloor = entity.kind === "building" ? 3.0 : 0;
  const defaultSlabHeight     = entity.kind === "room"     ? 0.35 : 0;
  const initialHeightPerFloor = Math.round(((metaStyle?.heightPerFloor as number | undefined) ?? defaultHeightPerFloor) * 10) / 10;
  const initialTotalHeight    = Math.round(((metaStyle?.totalHeight as number | undefined) ?? 0) * 10) / 10;
  const initialWallThickness  = Math.round(((metaStyle?.wallThickness as number | undefined) ?? 0.7) * 100) / 100;
  const initialSlabHeight     = Math.round(((metaStyle?.slabHeight as number | undefined) ?? defaultSlabHeight) * 100) / 100;

  const [color, setColor] = useState(currentColor);
  const [showOutline, setShowOutline] = useState(initialShowOutline);
  const [fillOpacityPct, setFillOpacityPct] = useState(initialFillOpacity);
  const [showLabel, setShowLabel] = useState(initialShowLabel);
  const [heightPerFloor, setHeightPerFloor] = useState(initialHeightPerFloor);
  const [totalHeight, setTotalHeight] = useState(initialTotalHeight);
  const [wallThickness, setWallThickness] = useState(initialWallThickness);
  const [slabHeight, setSlabHeight] = useState(initialSlabHeight);

  const patch = useMutation({
    mutationFn: async () => {
      const path =
        entity.kind === "building" ? `/api/buildings/${entity.data.id}` :
        entity.kind === "room" || entity.kind === "corridor" ? `/api/rooms/${entity.data.id}` :
                                     `/api/hallways/${entity.data.id}`;
      const body: Record<string, unknown> = { colorCode: color };
      if (entity.kind !== "hallway") {
        // Merge into existing metadata so we don't clobber unrelated
        // custom fields the user set on the Custom tab.
        const prevMeta = (entity.data.metadata as Record<string, unknown> | null | undefined) ?? {};
        body.metadata = {
          ...prevMeta,
          style: {
            ...(prevMeta.style as object | undefined),
            showOutline,
            fillOpacity: fillOpacityPct / 100,
            showLabel,
            ...(entity.kind === "building" ? {
              heightPerFloor: heightPerFloor || undefined,
              totalHeight: totalHeight || undefined,
              wallThickness: wallThickness || undefined,
            } : {}),
            ...(entity.kind === "room" ? {
              slabHeight: slabHeight || undefined,
            } : {}),
          },
        };
      }
      const res = await apiRequest("PATCH", path, body);
      return res.json();
    },
    onSuccess: () => {
      const qk = entity.kind === "building" ? "/api/buildings"
        : (entity.kind === "room" || entity.kind === "corridor") ? "/api/rooms"
        : "/api/hallways";
      qc.invalidateQueries({ queryKey: [qk] });
    },
    onError: (err: any) => toast({
      title: "Save failed",
      description: err?.message ?? "Could not save style. Are you logged in?",
      variant: "destructive",
    }),
  });

  const dirty =
    color !== currentColor
    || (entity.kind !== "hallway" && (
      showOutline !== initialShowOutline
      || fillOpacityPct !== initialFillOpacity
      || showLabel !== initialShowLabel
      || heightPerFloor !== initialHeightPerFloor
      || totalHeight !== initialTotalHeight
      || wallThickness !== initialWallThickness
      || slabHeight !== initialSlabHeight
    ));

  const runEyedropper = async () => {
    const picked = await pickColor();
    if (picked) setColor(picked.hex);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Colour swatch</label>
        <ColorSwatchGrid value={color} onChange={setColor} />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hex</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <button
            type="button"
            onClick={runEyedropper}
            title="Pick a color from the map"
            aria-label="Pick a color from the map"
            className="h-9 px-3 rounded-lg border border-border hover:bg-muted flex items-center gap-1.5 text-xs font-semibold"
          >
            <Pipette className="h-4 w-4" />
            Pick
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Click any spot on the map to sample its colour.
        </p>
      </div>

      {/* Style knobs — only meaningful on polygon entities. Hallways
       *  render as lines so they inherit the color only. */}
      {entity.kind !== "hallway" && (
        <div className="space-y-3 pt-1 border-t border-border">
          <ToggleField
            label="Show outline"
            value={showOutline}
            onChange={setShowOutline}
            hint="Turn off for a fill-only look."
          />
          <SliderField
            label="Fill opacity"
            value={fillOpacityPct}
            onChange={setFillOpacityPct}
            min={0}
            max={100}
            step={5}
            suffix="%"
          />
          <ToggleField
            label="Show label"
            value={showLabel}
            onChange={setShowLabel}
            hint="Hide the name text without deleting it."
          />
        </div>
      )}

      {/* 3D height controls — visible only on buildings + rooms since
       *  hallways don't extrude. Each slider persists into
       *  metadata.style so admins can tune each entity independently. */}
      {entity.kind === "building" && (
        <details className="rounded-xl border border-border overflow-hidden group" open>
          <summary className="cursor-pointer select-none px-3 py-2 bg-muted/40 text-xs font-semibold flex items-center justify-between">
            <span>3D height</span>
            <span className="text-[10px] text-muted-foreground">metres</span>
          </summary>
          <div className="p-3 space-y-3">
            <SliderField
              label="Per-floor height"
              value={heightPerFloor}
              onChange={setHeightPerFloor}
              min={1}
              max={8}
              step={0.1}
              suffix=" m"
            />
            <SliderField
              label="Total height override"
              value={totalHeight}
              onChange={setTotalHeight}
              min={0}
              max={60}
              step={0.5}
              suffix=" m"
            />
            <p className="text-[10px] text-muted-foreground">
              Total height 0 = use per-floor × floors. Set explicitly to force a specific building height.
            </p>
            <SliderField
              label="Wall thickness"
              value={wallThickness}
              onChange={setWallThickness}
              min={0.2}
              max={2.5}
              step={0.05}
              suffix=" m"
            />
          </div>
        </details>
      )}
      {entity.kind === "room" && (
        <details className="rounded-xl border border-border overflow-hidden" open>
          <summary className="cursor-pointer select-none px-3 py-2 bg-muted/40 text-xs font-semibold flex items-center justify-between">
            <span>3D height</span>
            <span className="text-[10px] text-muted-foreground">metres</span>
          </summary>
          <div className="p-3 space-y-3">
            <SliderField
              label="Slab height"
              value={slabHeight}
              onChange={setSlabHeight}
              min={0.05}
              max={2.5}
              step={0.05}
              suffix=" m"
            />
            <p className="text-[10px] text-muted-foreground">
              How tall the room slab appears above its floor plate in 3D view.
              MazeMap default is ~0.35 m — bump to 1–2 m for room-as-column visuals.
            </p>
          </div>
        </details>
      )}

      <DirtySaveButton
        isDirty={dirty}
        isPending={patch.isPending}
        onSave={() => patch.mutate()}
      />
    </div>
  );
}

function ToggleField({
  label, value, onChange, hint,
}: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <div>
      <label className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          className={cn(
            "relative w-9 h-5 rounded-full transition-colors shrink-0",
            value ? "bg-blue-600" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
              value ? "translate-x-4" : "translate-x-0.5",
            )}
          />
        </button>
      </label>
    </div>
  );
}

function SliderField({
  label, value, onChange, min, max, step, suffix,
}: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix?: string }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-xs font-mono tabular-nums">{value}{suffix ?? ""}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}

// ── Transform tab (position, rotation, size) ──────────────────────

function TransformTab({ entity, activeFloor, onAddFloorShape }: {
  entity: SelectedEntity;
  activeFloor?: number | null;
  onAddFloorShape?: (floorNum: number) => void;
}) {
  if (entity.kind === "door" || entity.kind === "stair"
      || entity.kind === "elevator" || entity.kind === "poi") {
    return <p className="text-xs text-muted-foreground p-4">Point POIs move by dragging on the map. Coordinates shown in the Properties tab.</p>;
  }
  if (entity.kind === "hallway") {
    return (
      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="rounded-lg border border-border p-2 bg-muted/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider">Start</p>
          <p className="font-mono">{(entity.data.startY ?? 0).toFixed(6)}, {(entity.data.startX ?? 0).toFixed(6)}</p>
        </div>
        <div className="rounded-lg border border-border p-2 bg-muted/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider">End</p>
          <p className="font-mono">{(entity.data.endY ?? 0).toFixed(6)}, {(entity.data.endX ?? 0).toFixed(6)}</p>
        </div>
        <p className="pt-2">Drag the endpoints on the canvas to move them.</p>
      </div>
    );
  }
  return <PolygonTransformForm entity={entity} activeFloor={activeFloor} onAddFloorShape={onAddFloorShape} />;
}

function PolygonTransformForm({ entity, activeFloor, onAddFloorShape }: {
  entity: Exclude<SelectedEntity, { kind: "door" | "stair" | "elevator" | "poi" | "hallway" }>;
  activeFloor?: number | null;
  onAddFloorShape?: (floorNum: number) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const pts = (entity.data.points ?? []) as Array<{ lat: number; lng: number }>;
  const mPerLat = 111320;

  const centroid = useMemo(() => {
    if (!pts.length) return { lat: 0, lng: 0 };
    return {
      lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
      lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length,
    };
  }, [pts]);

  const mPerLng = useMemo(() => 111320 * Math.cos((centroid.lat * Math.PI) / 180), [centroid.lat]);

  const { widthM, heightM } = useMemo(() => {
    if (pts.length < 2) return { widthM: 0, heightM: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) {
      const x = (p.lng - centroid.lng) * mPerLng;
      const y = (p.lat - centroid.lat) * mPerLat;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    return {
      widthM: Math.round((maxX - minX) * 100) / 100,
      heightM: Math.round((maxY - minY) * 100) / 100,
    };
  }, [pts, centroid, mPerLng]);

  const initRot = Math.round(((entity.data as { rotationDeg?: number | null }).rotationDeg ?? 0) * 10) / 10;

  const [cLat, setCLat] = useState(() => Math.round(centroid.lat * 1e6) / 1e6);
  const [cLng, setCLng] = useState(() => Math.round(centroid.lng * 1e6) / 1e6);
  const [width, setWidth] = useState(() => widthM);
  const [height, setHeight] = useState(() => heightM);
  const [rotation, setRotation] = useState(() => initRot);

  // Reset when entity switches.
  const entityId = entity.data.id;
  useEffect(() => {
    setCLat(Math.round(centroid.lat * 1e6) / 1e6);
    setCLng(Math.round(centroid.lng * 1e6) / 1e6);
    setWidth(widthM);
    setHeight(heightM);
    setRotation(initRot);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  const patch = useMutation({
    mutationFn: async () => {
      const dLat = cLat - centroid.lat;
      const dLng = cLng - centroid.lng;
      const scaleX = widthM > 0.01 ? width / widthM : 1;
      const scaleY = heightM > 0.01 ? height / heightM : 1;
      const rotDelta = ((rotation - initRot) * Math.PI) / 180;
      const cosR = Math.cos(rotDelta);
      const sinR = Math.sin(rotDelta);

      const newPoints = pts.map((p) => {
        let x = (p.lng - centroid.lng) * mPerLng * scaleX;
        let y = (p.lat - centroid.lat) * mPerLat * scaleY;
        const rx = x * cosR - y * sinR;
        const ry = x * sinR + y * cosR;
        return {
          lng: centroid.lng + rx / mPerLng + dLng,
          lat: centroid.lat + ry / mPerLat + dLat,
        };
      });

      const path = entity.kind === "building"
        ? `/api/buildings/${entity.data.id}`
        : `/api/rooms/${entity.data.id}`;
      const body: Record<string, unknown> = { points: newPoints };
      if (entity.kind === "building") body.rotationDeg = rotation;
      const res = await apiRequest("PATCH", path, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity.kind === "building" ? "/api/buildings" : "/api/rooms"] });
    },
    onError: (err: any) => toast({
      title: "Save failed",
      description: err?.message ?? "Could not save transform. Are you logged in?",
      variant: "destructive",
    }),
  });

  const dirty =
    Math.abs(cLat - Math.round(centroid.lat * 1e6) / 1e6) > 1e-7 ||
    Math.abs(cLng - Math.round(centroid.lng * 1e6) / 1e6) > 1e-7 ||
    Math.abs(width - widthM) > 0.005 ||
    Math.abs(height - heightM) > 0.005 ||
    (entity.kind === "building" && Math.abs(rotation - initRot) > 0.01);

  if (!pts.length) {
    return <p className="text-xs text-muted-foreground">No polygon yet — draw the shape on the map first.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Position */}
      <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">Center position</p>
        <div className="grid grid-cols-2 gap-2">
          {(["Lat", "Lng"] as const).map((ax) => (
            <div key={ax} className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{ax}</label>
              <input
                type="number"
                value={ax === "Lat" ? cLat : cLng}
                step={0.000001}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) ax === "Lat" ? setCLat(v) : setCLng(v);
                }}
                className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
          Dimensions <span className="normal-case font-normal">(metres)</span>
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Width E–W</label>
            <input type="number" value={width} step={0.1} min={0.1}
              onChange={(e) => { const v = parseFloat(e.target.value); if (v > 0) setWidth(v); }}
              className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Height N–S</label>
            <input type="number" value={height} step={0.1} min={0.1}
              onChange={(e) => { const v = parseFloat(e.target.value); if (v > 0) setHeight(v); }}
              className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
        </div>
      </div>

      {/* Rotation — buildings only */}
      {entity.kind === "building" && (
        <div className="space-y-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rotation (°)</label>
          <input type="number" value={rotation} step={0.5} min={-180} max={180}
            onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) setRotation(v); }}
            className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        {pts.length} vertices · {widthM.toFixed(2)} × {heightM.toFixed(2)} m current
      </p>

      <DirtySaveButton isDirty={dirty} isPending={patch.isPending} onSave={() => patch.mutate()} />

      {/* Floor shapes — per-floor polygon overrides */}
      {(entity.kind === "room" || entity.kind === "corridor" || entity.kind === "building") && (
        <FloorShapesSection entity={entity} activeFloor={activeFloor ?? 1} onAddFloorShape={onAddFloorShape} />
      )}
    </div>
  );
}

type FloorShapeEntry = { floor: number; coordinates: [number, number][] };

function FloorShapesSection({
  entity,
  activeFloor,
  onAddFloorShape,
}: {
  entity: Exclude<SelectedEntity, { kind: "door" | "stair" | "elevator" | "poi" | "hallway" }>;
  activeFloor: number;
  onAddFloorShape?: (floorNum: number) => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const meta = (entity.data.metadata ?? {}) as Record<string, unknown>;
  const floorShapes: FloorShapeEntry[] = Array.isArray(meta.floorShapes)
    ? (meta.floorShapes as FloorShapeEntry[])
    : [];

  const deleteShape = useMutation({
    mutationFn: async (floor: number) => {
      const updated = floorShapes.filter((fs) => fs.floor !== floor);
      const path = entity.kind === "building"
        ? `/api/buildings/${entity.data.id}`
        : `/api/rooms/${entity.data.id}`;
      const res = await apiRequest("PATCH", path, { metadata: { ...meta, floorShapes: updated } });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity.kind === "building" ? "/api/buildings" : "/api/rooms"] });
    },
    onError: (err: any) => toast({ title: "Delete failed", description: err?.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30 mt-1">
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">Floor Shapes</p>
      {floorShapes.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">No floor-specific shapes. Default shape used on all floors.</p>
      ) : (
        <div className="space-y-1">
          {floorShapes.map((fs) => (
            <div key={fs.floor} className="flex items-center justify-between text-[11px] rounded-md px-2 py-1 bg-background border border-border">
              <span className="font-medium">Floor {fs.floor}</span>
              <span className="text-muted-foreground mr-auto ml-2">{fs.coordinates.length} pts</span>
              <button
                type="button"
                onClick={() => deleteShape.mutate(fs.floor)}
                className="text-red-500 hover:text-red-700 px-1 rounded"
                aria-label={`Delete floor ${fs.floor} shape`}
              >✕</button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => onAddFloorShape?.(activeFloor)}
        className="w-full h-8 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-blue-400 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 font-medium transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add shape for floor {activeFloor}
      </button>
    </div>
  );
}

// ── Custom-fields tab (metadata JSON) ─────────────────────────────

function CustomTab({ entity }: { entity: SelectedEntity }) {
  const qc = useQueryClient();
  if (entity.kind === "door" || entity.kind === "stair"
      || entity.kind === "elevator" || entity.kind === "poi") {
    return <p className="text-xs text-muted-foreground p-4">Custom metadata for point POIs isn't editable via a JSON blob yet — use the Properties tab.</p>;
  }
  const initial = useMemo(() => {
    const m = entity.kind === "hallway" ? undefined : (entity.data.metadata ?? null);
    return m ? JSON.stringify(m, null, 2) : "{}";
  }, [entity]);
  const [text, setText] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const patch = useMutation({
    mutationFn: async () => {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        throw new Error(`Invalid JSON: ${(e as Error).message}`);
      }
      const path =
        entity.kind === "building" ? `/api/buildings/${entity.data.id}` :
        (entity.kind === "room" || entity.kind === "corridor") ? `/api/rooms/${entity.data.id}` :
                                     `/api/hallways/${entity.data.id}`;
      const res = await apiRequest("PATCH", path, { metadata: parsed });
      return res.json();
    },
    onSuccess: () => {
      const qk = entity.kind === "building" ? "/api/buildings"
        : (entity.kind === "room" || entity.kind === "corridor") ? "/api/rooms"
        : "/api/hallways";
      qc.invalidateQueries({ queryKey: [qk] });
      setError(null);
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Metadata (JSON)</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          spellCheck={false}
          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        />
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <DirtySaveButton
        isDirty={text !== initial}
        isPending={patch.isPending}
        onSave={() => patch.mutate()}
      />
    </div>
  );
}
