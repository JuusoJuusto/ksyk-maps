/**
 * FeatureInfoSheet — click-to-inspect panel for a room / building /
 * hallway on the public map.
 *
 * Fed by CampusOverlay's `onFeatureClick`. Renders the entity's most
 * useful metadata and a "Get directions here" action that dispatches
 * `ksyk:route-to` — NavigationPanel listens for that event, opens
 * itself if closed, and pre-fills the To field.
 *
 * Mobile: bottom sheet, safe-area padded.
 * Desktop (sm+): floating card on the right side, sitting above the
 * bottom-right control rail but below the header.
 */
import { X, MapPin, Compass, Users, User, Layers as LayersIcon, Info, Navigation2 } from "lucide-react";
import type { Building, Room, Hallway } from "@ksyk/shared";
import { cn } from "@/lib/utils";

export type ClickedFeature =
  | { kind: "building"; entity: Building }
  | { kind: "room"; entity: Room }
  | { kind: "hallway"; entity: Hallway };

interface FeatureInfoSheetProps {
  feature: ClickedFeature;
  onClose: () => void;
  /** Called when the user hits "Directions here". Parent decides how
   *  to hand off to the NavigationPanel — usually just opens it and
   *  pre-fills the To field. */
  onRouteTo: (feature: ClickedFeature) => void;
}

export default function FeatureInfoSheet({ feature, onClose, onRouteTo }: FeatureInfoSheetProps) {
  const title = featureTitle(feature);
  const subtitle = featureSubtitle(feature);
  const color = featureColor(feature);

  return (
    <div
      role="dialog"
      aria-label={`${feature.kind} info`}
      className={cn(
        "fixed z-40 rounded-2xl border border-border bg-card shadow-xl overflow-hidden",
        // Mobile: bottom sheet. Desktop: right-side floating card
        // anchored under the header (top-24 clears the search row).
        "left-2 right-2 sm:left-auto sm:right-3 sm:w-[min(92vw,22rem)]",
        "bottom-2 sm:bottom-auto sm:top-24",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        maxHeight: "min(70dvh, 32rem)",
      }}
    >
      {/* Grab handle on mobile — signals the panel is dismissible. */}
      <div className="sm:hidden flex justify-center pt-1.5">
        <span className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
      </div>

      <header className="flex items-start gap-3 px-4 pt-3 pb-2 border-b border-border">
        <span
          className="mt-1 h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: color + "22", color }}
        >
          <KindIcon feature={feature} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
            {featureKindLabel(feature)}
          </p>
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="px-4 py-3 overflow-y-auto space-y-3 text-[13px]">
        <MetadataRows feature={feature} />
      </div>

      <div className="px-3 pb-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => onRouteTo(feature)}
          className="w-full h-10 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
        >
          <Navigation2 className="h-4 w-4" />
          Directions here
        </button>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function featureTitle(f: ClickedFeature): string {
  if (f.kind === "building") return f.entity.name || "(unnamed building)";
  if (f.kind === "room") {
    return [f.entity.roomNumber, f.entity.name].filter(Boolean).join(" · ") || "(unnamed room)";
  }
  return `Hallway ${f.entity.id.slice(0, 8)}`;
}

function featureSubtitle(f: ClickedFeature): string | null {
  if (f.kind === "building") {
    return [
      f.entity.address,
      typeof f.entity.floors === "number" ? `${f.entity.floors} floor${f.entity.floors === 1 ? "" : "s"}` : null,
    ].filter(Boolean).join(" · ") || null;
  }
  if (f.kind === "room") {
    return [
      f.entity.type,
      typeof f.entity.floor === "number" ? `Floor ${f.entity.floor}` : null,
    ].filter(Boolean).join(" · ") || null;
  }
  return f.entity.surface ?? null;
}

function featureKindLabel(f: ClickedFeature): string {
  if (f.kind === "building") return "Building";
  if (f.kind === "room") return f.entity.type ?? "Room";
  return "Hallway";
}

function featureColor(f: ClickedFeature): string {
  if (f.kind === "building") return f.entity.colorCode ?? "#2563eb";
  if (f.kind === "room") return f.entity.colorCode ?? "#059669";
  return "#f59e0b";
}

function KindIcon({ feature }: { feature: ClickedFeature }) {
  if (feature.kind === "building") return <MapPin className="h-4 w-4" />;
  if (feature.kind === "hallway") return <Compass className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

function MetadataRows({ feature }: { feature: ClickedFeature }) {
  if (feature.kind === "building") {
    const b = feature.entity;
    return (
      <>
        {b.description && <Row label="About">{b.description}</Row>}
        {b.address && <Row label="Address" icon={MapPin}>{b.address}</Row>}
        {typeof b.floors === "number" && (
          <Row label="Floors" icon={LayersIcon}>
            {(b.floorMin ?? 1) === 1 && (b.floorMax ?? b.floors) === b.floors
              ? `${b.floors}`
              : `${b.floorMin ?? 1} → ${b.floorMax ?? b.floors}`}
          </Row>
        )}
      </>
    );
  }
  if (feature.kind === "room") {
    const r = feature.entity;
    return (
      <>
        {r.description && <Row label="About">{r.description}</Row>}
        {r.department && <Row label="Department">{r.department}</Row>}
        {r.teacher && <Row label="Teacher" icon={User}>{r.teacher}</Row>}
        {typeof r.capacity === "number" && r.capacity > 0 && (
          <Row label="Capacity" icon={Users}>{r.capacity}</Row>
        )}
        {typeof r.floor === "number" && (
          <Row label="Floor" icon={LayersIcon}>{r.floor}</Row>
        )}
        {r.tags && r.tags.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Tags</p>
            <div className="flex flex-wrap gap-1">
              {r.tags.map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-foreground">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }
  const h = feature.entity;
  return (
    <>
      {h.width != null && <Row label="Width">{h.width} m</Row>}
      {h.surface && <Row label="Surface">{h.surface}</Row>}
      {h.floor != null && <Row label="Floor" icon={LayersIcon}>{h.floor}</Row>}
      {h.accessible != null && (
        <Row label="Accessible">{h.accessible ? "Yes" : "No"}</Row>
      )}
    </>
  );
}

function Row({
  label, icon: Icon, children,
}: {
  label: string;
  icon?: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-[13px] text-foreground break-words">{children}</p>
      </div>
    </div>
  );
}
