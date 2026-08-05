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
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Trash2, X, ClipboardList, Palette, Move3d, Puzzle, Pipette } from "lucide-react";
import type { Building, Room, Hallway, RoomType } from "@ksyk/shared";
import { pickColor } from "@/lib/colorEyedropper";

/** Selection dispatched to the panel. Union so the panel can render
 *  a different form per entity kind. v3.28.1 — added point-POI kinds
 *  so doors/stairs/elevators/generic POIs are editable in the
 *  builder. Data is loose `Record<string, unknown>` for those since
 *  we don't have first-class typed shared types for them yet. */
export type SelectedEntity =
  | { kind: "building"; data: Building }
  | { kind: "room"; data: Room }
  | { kind: "hallway"; data: Hallway }
  | { kind: "door"; data: PointPoi & { isEntrance?: boolean; isExit?: boolean } }
  | { kind: "stair"; data: PointPoi }
  | { kind: "elevator"; data: PointPoi }
  | { kind: "poi"; data: PointPoi & { kind?: string } };

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
}

/** Same eight-swatch palette the previous inline builder used. Extended
 *  slightly to give rooms + buildings the same swatch set. */
const COLORS = [
  "#2563eb", "#dc2626", "#7c3aed", "#059669",
  "#f59e0b", "#ec4899", "#06b6d4", "#6b7280",
];

const ROOM_TYPES: RoomType[] = [
  "classroom", "lab", "office", "auditorium", "gym", "storage",
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

export default function PropertyPanel({ entity, onDelete, onClose }: PropertyPanelProps) {
  const [tab, setTab] = useState<TabId>("props");
  const title = useMemo(() => entity.kind[0].toUpperCase() + entity.kind.slice(1), [entity.kind]);
  // v3.28.1 — point POI kinds (door/stair/elevator/poi) don't have
  // polygon-style, transform, or per-feature metadata knobs yet.
  // Style/Transform/Custom tabs would render blank forms or crash for
  // those, so we only surface the Properties tab. Building/room/
  // hallway still get all four.
  const isPointPoi = entity.kind === "door" || entity.kind === "stair" ||
                     entity.kind === "elevator" || entity.kind === "poi";
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
              onClick={() => setTab(t.id)}
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
        {tab === "props" && <PropsTab entity={entity} />}
        {tab === "style" && <StyleTab entity={entity} />}
        {tab === "transform" && <TransformTab entity={entity} />}
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
  // v3.28.1 — point-POI kinds get distinct colours matching the map
  // chips (green entrance, grey door, amber stair, blue elevator).
  let color: string;
  switch (entity.kind) {
    case "building": color = entity.data.colorCode ?? "#2563eb"; break;
    case "room":     color = entity.data.colorCode ?? "#059669"; break;
    case "hallway":  color = "#f59e0b"; break;
    case "door":     color = entity.data.isEntrance ? "#16a34a" : entity.data.isExit ? "#dc2626" : "#374151"; break;
    case "stair":    color = "#f59e0b"; break;
    case "elevator": color = "#2563eb"; break;
    case "poi":      color = "#8b5cf6"; break;
  }
  return <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: color }} />;
}

function titleFor(entity: SelectedEntity): string {
  if (entity.kind === "building") return entity.data.name ?? "(unnamed building)";
  if (entity.kind === "room") {
    return [entity.data.roomNumber, entity.data.name].filter(Boolean).join(" · ") || "(unnamed room)";
  }
  if (entity.kind === "hallway") return `Hallway ${entity.data.id.slice(0, 8)}`;
  if (entity.kind === "door") return entity.data.isEntrance ? "Entrance" : entity.data.isExit ? "Exit" : "Door";
  if (entity.kind === "stair") return "Stairs";
  if (entity.kind === "elevator") return "Elevator";
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

function PropsTab({ entity }: { entity: SelectedEntity }) {
  if (entity.kind === "building") return <BuildingProps building={entity.data} />;
  if (entity.kind === "room") return <RoomProps room={entity.data} />;
  if (entity.kind === "hallway") return <HallwayProps hallway={entity.data} />;
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

/** Point-POI editor — one form for door / stair / elevator / poi. */
function PointPoiProps({
  poi, kind, resource,
}: {
  poi: PointPoi & { isEntrance?: boolean; isExit?: boolean; kind?: string };
  kind: "door" | "stair" | "elevator" | "poi";
  resource: "doors" | "stairs" | "elevators" | "pois";
}) {
  const qc = useQueryClient();
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

function BuildingProps({ building }: { building: Building }) {
  const qc = useQueryClient();
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
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/buildings"] }),
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

function RoomProps({ room }: { room: Room }) {
  const qc = useQueryClient();
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
  // v3.31.1 — Wilma/external schedule link. scheduleLabel is the
  // button text (e.g. "Open in Wilma"); scheduleUrl is the target.
  const initialScheduleUrl = ((room as unknown as { scheduleUrl?: string | null }).scheduleUrl)
    ?? (initialMeta.scheduleUrl as string | undefined) ?? "";
  const initialScheduleLabel = ((room as unknown as { scheduleLabel?: string | null }).scheduleLabel)
    ?? (initialMeta.scheduleLabel as string | undefined) ?? "";
  const [scheduleUrl, setScheduleUrl] = useState(initialScheduleUrl);
  const [scheduleLabel, setScheduleLabel] = useState(initialScheduleLabel);

  const patch = useMutation({
    mutationFn: async (body: Partial<Room>) => {
      const res = await apiRequest("PATCH", `/api/rooms/${room.id}`, body);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/rooms"] }),
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
    description !== (room.description ?? "");

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
              Schedule link (Wilma / external)
            </p>
            <TextField
              label="Button label"
              value={scheduleLabel}
              onChange={setScheduleLabel}
              placeholder="e.g. Open in Wilma"
            />
            <TextField
              label="URL"
              value={scheduleUrl}
              onChange={setScheduleUrl}
              placeholder="https://wilma.school.fi/…"
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

function HallwayProps({ hallway }: { hallway: Hallway }) {
  const qc = useQueryClient();
  const [width, setWidth] = useState(hallway.width ?? 2);
  const [surface, setSurface] = useState(hallway.surface ?? "concrete");
  const [directions, setDirections] = useState(hallway.directions ?? "both");
  const [accessible, setAccessible] = useState(hallway.accessible ?? true);

  const patch = useMutation({
    mutationFn: async (body: Partial<Hallway>) => {
      const res = await apiRequest("PATCH", `/api/hallways/${hallway.id}`, body);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hallways"] }),
  });

  const dirty =
    width !== (hallway.width ?? 2) ||
    surface !== (hallway.surface ?? "concrete") ||
    directions !== (hallway.directions ?? "both") ||
    accessible !== (hallway.accessible ?? true);

  return (
    <div className="space-y-3">
      <NumberField label="Width (m)" value={width} onChange={setWidth} min={0.5} max={20} step={0.1} />
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Surface</label>
        <select
          value={surface}
          onChange={(e) => setSurface(e.target.value as NonNullable<Hallway["surface"]>)}
          className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          {(["concrete", "carpet", "tile", "gravel", "asphalt"] as const).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Traversal</label>
        <select
          value={directions}
          onChange={(e) => setDirections(e.target.value as NonNullable<Hallway["directions"]>)}
          className="mt-1 w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <option value="both">Both directions</option>
          <option value="start_to_end">Start → End</option>
          <option value="end_to_start">End → Start</option>
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={accessible}
          onChange={(e) => setAccessible(e.target.checked)}
          className="h-4 w-4 rounded"
        />
        Accessible
      </label>
      <DirtySaveButton
        isDirty={dirty}
        isPending={patch.isPending}
        onSave={() => patch.mutate({ width, surface, directions, accessible })}
      />
    </div>
  );
}

// ── Style tab (colour) ─────────────────────────────────────────────

function StyleTab({ entity }: { entity: SelectedEntity }) {
  const qc = useQueryClient();
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
                                 "#f59e0b";
  // Style knobs live in `metadata.style` so we don't need a DB
  // migration per option. Renderers respect them by reading properties
  // off the GeoJSON feature.
  const metaStyle =
    entity.kind !== "hallway"
      ? (entity.data.metadata as { style?: Record<string, unknown> } | null | undefined)?.style
      : undefined;
  const initialShowOutline = (metaStyle?.showOutline as boolean | undefined) ?? true;
  const initialFillOpacity = Math.round(((metaStyle?.fillOpacity as number | undefined) ?? 0.6) * 100);
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
        entity.kind === "room"     ? `/api/rooms/${entity.data.id}` :
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
            // 3D height knobs — persist as numbers. 0 collapses to
            // "no override" in the renderer.
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
      qc.invalidateQueries({ queryKey: [entity.kind === "building" ? "/api/buildings" : entity.kind === "room" ? "/api/rooms" : "/api/hallways"] });
    },
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

function TransformTab({ entity }: { entity: SelectedEntity }) {
  if (entity.kind === "door" || entity.kind === "stair"
      || entity.kind === "elevator" || entity.kind === "poi") {
    return <p className="text-xs text-muted-foreground p-4">Point POIs move by dragging on the map. Coordinates shown in the Properties tab.</p>;
  }
  // Building / Room store polygon corners — we surface the centroid +
  // rotation only, since editing individual corners belongs to the
  // canvas transform gizmo. Hallway shows start/end points.
  if (entity.kind === "hallway") {
    return (
      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="rounded-lg border border-border p-2 bg-muted/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider">Start</p>
          <p className="font-mono">{entity.data.startY.toFixed(6)}, {entity.data.startX.toFixed(6)}</p>
        </div>
        <div className="rounded-lg border border-border p-2 bg-muted/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider">End</p>
          <p className="font-mono">{entity.data.endY.toFixed(6)}, {entity.data.endX.toFixed(6)}</p>
        </div>
        <p className="pt-2">Drag the endpoints on the canvas to move them.</p>
      </div>
    );
  }

  const poly = entity.data.points;
  return (
    <div className="space-y-2 text-xs text-muted-foreground">
      <div className="rounded-lg border border-border p-2 bg-muted/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider">Vertices</p>
        <p className="font-mono">{poly?.length ?? 0}</p>
      </div>
      {entity.kind === "building" && (
        <div className="rounded-lg border border-border p-2 bg-muted/40">
          <p className="text-[10px] font-semibold uppercase tracking-wider">Rotation</p>
          <p className="font-mono">{(entity.data.rotationDeg ?? 0).toFixed(1)}°</p>
        </div>
      )}
      <p className="pt-2">
        Use the canvas rotate/move handles to edit position + rotation.
        Direct-input transforms land in M1.1.
      </p>
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
        entity.kind === "room"     ? `/api/rooms/${entity.data.id}` :
                                     `/api/hallways/${entity.data.id}`;
      const res = await apiRequest("PATCH", path, { metadata: parsed });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity.kind === "building" ? "/api/buildings" : entity.kind === "room" ? "/api/rooms" : "/api/hallways"] });
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
