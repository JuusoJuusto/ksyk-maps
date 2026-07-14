/**
 * KSYK Maps Builder — right-side property panel.
 *
 * Renders when the map has a selection. Tabbed layout matches the app's
 * editorial style: Identity / Position / Style. Big 44px inputs, KSYK blue
 * primary CTA, active:scale-[0.98] on all buttons.
 *
 * The panel is stateless w.r.t. persistence — it holds a local edit buffer
 * and calls back on Save. That keeps the map's React Query cache honest.
 */
import { useEffect, useMemo, useState } from "react";
import { Building2, DoorOpen, Palette, MapPin, Type, X, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Building, Room } from "@shared/schema";

export type Selection =
  | { kind: "building"; value: Building }
  | { kind: "room"; value: Room }
  | null;

export interface BuildingEdits {
  name: string;
  nameEn: string;
  nameFi: string;
  floors: number;
  colorCode: string;
  mapPositionX: number;
  mapPositionY: number;
}
export interface RoomEdits {
  roomNumber: string;
  name: string;
  nameEn: string;
  nameFi: string;
  floor: number;
  type: string;
  colorCode: string;
  mapPositionX: number;
  mapPositionY: number;
  width: number;
  height: number;
}

interface BuilderPropertyPanelProps {
  selection: Selection;
  onClose: () => void;
  onSaveBuilding: (patch: Partial<BuildingEdits>) => Promise<void>;
  onSaveRoom: (patch: Partial<RoomEdits>) => Promise<void>;
  saving: boolean;
}

const KSYK_COLORS = [
  "#2563eb", "#4f46e5", "#7c3aed", "#0891b2",
  "#0d9488", "#16a34a", "#eab308", "#f97316",
  "#dc2626", "#e11d48", "#64748b", "#111827",
];

const ROOM_TYPES = [
  "classroom", "lab", "office", "toilet", "storage",
  "cafeteria", "library_room", "music_room", "gym",
  "emergency_exit", "hallway",
];

export default function BuilderPropertyPanel({
  selection,
  onClose,
  onSaveBuilding,
  onSaveRoom,
  saving,
}: BuilderPropertyPanelProps) {
  if (!selection) return null;
  if (selection.kind === "building") {
    return (
      <BuildingEditor
        building={selection.value}
        onClose={onClose}
        onSave={onSaveBuilding}
        saving={saving}
      />
    );
  }
  return (
    <RoomEditor
      room={selection.value}
      onClose={onClose}
      onSave={onSaveRoom}
      saving={saving}
    />
  );
}

// ─── Building editor ────────────────────────────────────────────────────────
function BuildingEditor({
  building,
  onClose,
  onSave,
  saving,
}: {
  building: Building;
  onClose: () => void;
  onSave: (patch: Partial<BuildingEdits>) => Promise<void>;
  saving: boolean;
}) {
  const initial = useMemo<BuildingEdits>(
    () => ({
      name: building.name || "",
      nameEn: building.nameEn || "",
      nameFi: building.nameFi || "",
      floors: building.floors ?? 1,
      colorCode: building.colorCode || "#2563eb",
      mapPositionX: building.mapPositionX ?? 0,
      mapPositionY: building.mapPositionY ?? 0,
    }),
    [building.id]
  );
  const [edits, setEdits] = useState<BuildingEdits>(initial);
  const [tab, setTab] = useState<"identity" | "position" | "style">("identity");
  useEffect(() => setEdits(initial), [initial]);

  const isDirty = JSON.stringify(edits) !== JSON.stringify(initial);

  const patch = <K extends keyof BuildingEdits>(k: K, v: BuildingEdits[K]) =>
    setEdits((e) => ({ ...e, [k]: v }));

  return (
    <PanelShell
      Icon={Building2}
      title={edits.nameEn || edits.name || "Untitled building"}
      subtitle="Building"
      accent={edits.colorCode}
      tab={tab}
      onTabChange={setTab}
      onClose={onClose}
      onSave={() => onSave(edits)}
      saving={saving}
      canSave={isDirty}
    >
      {tab === "identity" && (
        <div className="space-y-4">
          <Field label="Name (default)">
            <TextInput value={edits.name} onChange={(v) => patch("name", v)} placeholder="Main building" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (EN)">
              <TextInput value={edits.nameEn} onChange={(v) => patch("nameEn", v)} placeholder="Main building" />
            </Field>
            <Field label="Name (FI)">
              <TextInput value={edits.nameFi} onChange={(v) => patch("nameFi", v)} placeholder="Päärakennus" />
            </Field>
          </div>
          <Field label="Floors" hint="Number of storeys (1–8)">
            <NumberInput
              value={edits.floors}
              onChange={(v) => patch("floors", Math.max(1, Math.min(8, v)))}
              min={1}
              max={8}
            />
          </Field>
        </div>
      )}

      {tab === "position" && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Position is stored in SVG-space coordinates and projected onto the
            live map. Drag the building on the canvas to fine-tune.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Map X">
              <NumberInput
                value={edits.mapPositionX}
                onChange={(v) => patch("mapPositionX", v)}
              />
            </Field>
            <Field label="Map Y">
              <NumberInput
                value={edits.mapPositionY}
                onChange={(v) => patch("mapPositionY", v)}
              />
            </Field>
          </div>
          <ReadOnlyPair
            left={{ label: "Building ID", value: building.id.slice(0, 8) + "…" }}
            right={{ label: "Rooms count", value: "—" }}
          />
        </div>
      )}

      {tab === "style" && (
        <div className="space-y-4">
          <Field label="Color" hint="Used for the footprint fill and directory chip.">
            <ColorSwatchGrid value={edits.colorCode} onChange={(v) => patch("colorCode", v)} />
          </Field>
        </div>
      )}
    </PanelShell>
  );
}

// ─── Room editor ────────────────────────────────────────────────────────────
function RoomEditor({
  room,
  onClose,
  onSave,
  saving,
}: {
  room: Room;
  onClose: () => void;
  onSave: (patch: Partial<RoomEdits>) => Promise<void>;
  saving: boolean;
}) {
  const initial = useMemo<RoomEdits>(
    () => ({
      roomNumber: room.roomNumber || "",
      name: room.name || "",
      nameEn: room.nameEn || "",
      nameFi: room.nameFi || "",
      floor: room.floor ?? 1,
      type: room.type || "classroom",
      colorCode: room.colorCode || "#6b7280",
      mapPositionX: room.mapPositionX ?? 0,
      mapPositionY: room.mapPositionY ?? 0,
      width: room.width ?? 60,
      height: room.height ?? 40,
    }),
    [room.id]
  );
  const [edits, setEdits] = useState<RoomEdits>(initial);
  const [tab, setTab] = useState<"identity" | "position" | "style">("identity");
  useEffect(() => setEdits(initial), [initial]);
  const isDirty = JSON.stringify(edits) !== JSON.stringify(initial);
  const patch = <K extends keyof RoomEdits>(k: K, v: RoomEdits[K]) =>
    setEdits((e) => ({ ...e, [k]: v }));

  return (
    <PanelShell
      Icon={DoorOpen}
      title={edits.roomNumber || "Untitled room"}
      subtitle={edits.nameEn || edits.name || "Room"}
      accent={edits.colorCode}
      tab={tab}
      onTabChange={setTab}
      onClose={onClose}
      onSave={() => onSave(edits)}
      saving={saving}
      canSave={isDirty}
    >
      {tab === "identity" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Room number" hint="Short code (e.g. A101)">
              <TextInput value={edits.roomNumber} onChange={(v) => patch("roomNumber", v)} placeholder="A101" />
            </Field>
            <Field label="Floor">
              <NumberInput
                value={edits.floor}
                onChange={(v) => patch("floor", Math.max(-2, Math.min(8, v)))}
                min={-2}
                max={8}
              />
            </Field>
          </div>
          <Field label="Name (default)">
            <TextInput value={edits.name} onChange={(v) => patch("name", v)} placeholder="Chemistry lab" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name (EN)">
              <TextInput value={edits.nameEn} onChange={(v) => patch("nameEn", v)} placeholder="Chemistry lab" />
            </Field>
            <Field label="Name (FI)">
              <TextInput value={edits.nameFi} onChange={(v) => patch("nameFi", v)} placeholder="Kemian labra" />
            </Field>
          </div>
          <Field label="Type">
            <div className="grid grid-cols-3 gap-1.5">
              {ROOM_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => patch("type", t)}
                  className={cn(
                    "h-9 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.98] ring-1",
                    edits.type === t
                      ? "bg-blue-600 text-white ring-blue-600"
                      : "bg-card text-foreground ring-border hover:bg-muted"
                  )}
                >
                  {t.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {tab === "position" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Map X">
              <NumberInput value={edits.mapPositionX} onChange={(v) => patch("mapPositionX", v)} />
            </Field>
            <Field label="Map Y">
              <NumberInput value={edits.mapPositionY} onChange={(v) => patch("mapPositionY", v)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Width">
              <NumberInput value={edits.width} onChange={(v) => patch("width", Math.max(5, v))} min={5} />
            </Field>
            <Field label="Height">
              <NumberInput value={edits.height} onChange={(v) => patch("height", Math.max(5, v))} min={5} />
            </Field>
          </div>
        </div>
      )}

      {tab === "style" && (
        <div className="space-y-4">
          <Field label="Color">
            <ColorSwatchGrid value={edits.colorCode} onChange={(v) => patch("colorCode", v)} />
          </Field>
        </div>
      )}
    </PanelShell>
  );
}

// ─── Shell ──────────────────────────────────────────────────────────────────
function PanelShell({
  Icon,
  title,
  subtitle,
  accent,
  tab,
  onTabChange,
  onClose,
  onSave,
  saving,
  canSave,
  children,
}: {
  Icon: typeof Building2;
  title: string;
  subtitle: string;
  accent: string;
  tab: "identity" | "position" | "style";
  onTabChange: (t: "identity" | "position" | "style") => void;
  onClose: () => void;
  onSave: () => Promise<void>;
  saving: boolean;
  canSave: boolean;
  children: React.ReactNode;
}) {
  return (
    <aside
      className="w-[320px] shrink-0 h-full bg-card border-l border-border flex flex-col shadow-sm"
      role="complementary"
      aria-label="Property panel"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-border flex items-start gap-2.5">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ring-1 ring-black/10 dark:ring-white/10"
          style={{ backgroundColor: accent }}
          aria-hidden
        >
          <Icon className="h-5 w-5 text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
            {subtitle}
          </div>
          <div className="text-sm font-bold tracking-tight text-foreground truncate">
            {title}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Close property panel"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-3">
        <div className="inline-flex w-full gap-0.5 rounded-full bg-muted p-0.5 ring-1 ring-black/5 dark:ring-white/5">
          {([
            ["identity", "Identity", Type],
            ["position", "Position", MapPin],
            ["style", "Style", Palette],
          ] as const).map(([id, label, TabIcon]) => (
            <button
              key={id}
              type="button"
              onClick={() => onTabChange(id)}
              aria-pressed={tab === id}
              className={cn(
                "flex-1 h-9 rounded-full text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all",
                tab === id
                  ? "bg-card shadow-sm text-blue-600 dark:text-blue-300 ring-1 ring-black/5 dark:ring-white/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3.5">{children}</div>

      {/* Save bar */}
      <div className="p-3 border-t border-border bg-card">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!canSave || saving}
          className={cn(
            "w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm",
            canSave && !saving
              ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25"
              : "bg-muted text-muted-foreground shadow-none cursor-not-allowed"
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={2.2} />}
          {saving ? "Saving…" : canSave ? "Save changes" : "No changes"}
        </button>
      </div>
    </aside>
  );
}

// ─── Small form primitives ──────────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground mb-1.5 block">
        {label}
      </label>
      {children}
      {hint && (
        <p className="text-[10px] text-muted-foreground/80 mt-1 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 w-full px-3 rounded-xl bg-card border border-border text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-colors placeholder:text-muted-foreground/70"
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = parseFloat(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      className="h-11 w-full px-3 rounded-xl bg-card border border-border text-sm font-mono tabular-nums focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-colors"
    />
  );
}

function ColorSwatchGrid({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5">
        {KSYK_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Set colour ${c}`}
            aria-pressed={value.toLowerCase() === c.toLowerCase()}
            className={cn(
              "aspect-square rounded-lg ring-1 ring-black/10 dark:ring-white/10 transition-all active:scale-[0.98]",
              value.toLowerCase() === c.toLowerCase()
                ? "ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-950 shadow-md"
                : "hover:scale-105"
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-14 rounded-xl border border-border cursor-pointer"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 flex-1 px-3 rounded-xl bg-card border border-border text-xs font-mono tabular-nums focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
          placeholder="#2563eb"
        />
      </div>
    </div>
  );
}

function ReadOnlyPair({
  left,
  right,
}: {
  left: { label: string; value: string };
  right: { label: string; value: string };
}) {
  return (
    <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/50 ring-1 ring-border">
      {[left, right].map((it, i) => (
        <div key={i}>
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
            {it.label}
          </div>
          <div className="text-xs font-mono font-semibold text-foreground truncate">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
