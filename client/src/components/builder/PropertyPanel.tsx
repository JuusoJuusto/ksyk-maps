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
 *  a different form per entity kind. */
export type SelectedEntity =
  | { kind: "building"; data: Building }
  | { kind: "room"; data: Room }
  | { kind: "hallway"; data: Hallway };

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
      <div className="grid grid-cols-4 border-b border-border bg-muted/40">
        {TABS.map((t) => {
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
  const color =
    entity.kind === "building" ? (entity.data.colorCode ?? "#2563eb") :
    entity.kind === "room"     ? (entity.data.colorCode ?? "#059669") :
                                 "#f59e0b";
  return <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: color }} />;
}

function titleFor(entity: SelectedEntity): string {
  if (entity.kind === "building") return entity.data.name ?? "(unnamed building)";
  if (entity.kind === "room") {
    return [entity.data.roomNumber, entity.data.name].filter(Boolean).join(" · ") || "(unnamed room)";
  }
  return `Hallway ${entity.data.id.slice(0, 8)}`;
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
  return <HallwayProps hallway={entity.data} />;
}

function BuildingProps({ building }: { building: Building }) {
  const qc = useQueryClient();
  const [name, setName] = useState(building.name);
  const [nameEn, setNameEn] = useState(building.nameEn ?? "");
  const [nameFi, setNameFi] = useState(building.nameFi ?? "");
  const [floors, setFloors] = useState(building.floors ?? 1);
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
    address !== (building.address ?? "");

  return (
    <div className="space-y-3">
      <TextField label="Name" value={name} onChange={setName} />
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Name (EN)" value={nameEn} onChange={setNameEn} />
        <TextField label="Name (FI)" value={nameFi} onChange={setNameFi} />
      </div>
      <TextField label="Address" value={address} onChange={setAddress} placeholder="Street 1" />
      <NumberField label="Floors" value={floors} onChange={setFloors} min={1} max={40} />
      <DirtySaveButton
        isDirty={dirty}
        isPending={patch.isPending}
        onSave={() => patch.mutate({ name, nameEn, nameFi, floors, address: address || null })}
      />
    </div>
  );
}

function RoomProps({ room }: { room: Room }) {
  const qc = useQueryClient();
  const [roomNumber, setRoomNumber] = useState(room.roomNumber);
  const [name, setName] = useState(room.name ?? "");
  const [type, setType] = useState<RoomType | null>(room.type ?? null);
  const [capacity, setCapacity] = useState(room.capacity ?? 0);
  const [department, setDepartment] = useState(room.department ?? "");
  const [teacher, setTeacher] = useState(room.teacher ?? "");
  const [tagsInput, setTagsInput] = useState((room.tags ?? []).join(", "));

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
    type !== (room.type ?? null) ||
    capacity !== (room.capacity ?? 0) ||
    department !== (room.department ?? "") ||
    teacher !== (room.teacher ?? "") ||
    tagsInput !== (room.tags ?? []).join(", ");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Number" value={roomNumber} onChange={setRoomNumber} />
        <TextField label="Name" value={name} onChange={setName} />
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
      <div className="grid grid-cols-2 gap-2">
        <NumberField label="Capacity" value={capacity} onChange={setCapacity} min={0} max={5000} />
        <TextField label="Department" value={department} onChange={setDepartment} />
      </div>
      <TextField label="Teacher" value={teacher} onChange={setTeacher} />
      <TextField label="Tags (comma-separated)" value={tagsInput} onChange={setTagsInput} />
      <DirtySaveButton
        isDirty={dirty}
        isPending={patch.isPending}
        onSave={() => patch.mutate({
          roomNumber,
          name: name || null,
          type,
          capacity,
          department: department || null,
          teacher: teacher || null,
          tags: tagsInput
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        })}
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
  const current =
    entity.kind === "building" ? (entity.data.colorCode ?? "#2563eb") :
    entity.kind === "room"     ? (entity.data.colorCode ?? "#059669") :
                                 "#f59e0b";
  const [color, setColor] = useState(current);

  const patch = useMutation({
    mutationFn: async () => {
      const path =
        entity.kind === "building" ? `/api/buildings/${entity.data.id}` :
        entity.kind === "room"     ? `/api/rooms/${entity.data.id}` :
                                     `/api/hallways/${entity.data.id}`;
      const res = await apiRequest("PATCH", path, { colorCode: color });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [entity.kind === "building" ? "/api/buildings" : entity.kind === "room" ? "/api/rooms" : "/api/hallways"] });
    },
  });

  const dirty = color !== current;

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
      <DirtySaveButton
        isDirty={dirty}
        isPending={patch.isPending}
        onSave={() => patch.mutate()}
      />
    </div>
  );
}

// ── Transform tab (position, rotation, size) ──────────────────────

function TransformTab({ entity }: { entity: SelectedEntity }) {
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
