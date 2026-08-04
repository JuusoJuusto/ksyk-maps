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
import { useState, useRef } from "react";
import { X, MapPin, Compass, Users, User, Layers as LayersIcon, Info, Navigation2, Clock, Phone, Mail, ExternalLink } from "lucide-react";
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

  // v3.27.5 — mobile drag-to-resize state. Three snap points:
  //   • "peek"  — small, just title + a couple rows (35dvh)
  //   • "half"  — default height (60dvh)
  //   • "full"  — nearly full-screen (85dvh)
  // The drag handle at the top lets the user swipe between them
  // without dismissing the sheet. Desktop always uses "full".
  const [mobileSnap, setMobileSnap] = useState<"peek" | "half" | "full">("half");
  const dragStartYRef = useRef<number | null>(null);
  const dragStartSnapRef = useRef<typeof mobileSnap>("half");
  const cycleSnap = () => {
    setMobileSnap((s) => (s === "peek" ? "half" : s === "half" ? "full" : "peek"));
  };
  const onHandlePointerDown = (e: React.PointerEvent) => {
    dragStartYRef.current = e.clientY;
    dragStartSnapRef.current = mobileSnap;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    const startY = dragStartYRef.current;
    if (startY === null) return;
    const dy = e.clientY - startY;
    // Drag up (dy < 0) → bigger; drag down (dy > 0) → smaller.
    if (Math.abs(dy) < 40) return;
    if (dy < 0) {
      setMobileSnap(dragStartSnapRef.current === "peek" ? "half" : "full");
    } else {
      setMobileSnap(dragStartSnapRef.current === "full" ? "half" : "peek");
    }
    dragStartYRef.current = null;
  };
  const onHandlePointerUp = () => {
    dragStartYRef.current = null;
  };
  const mobileMaxHeight =
    mobileSnap === "peek" ? "35dvh" :
    mobileSnap === "half" ? "60dvh" :
                            "85dvh";

  return (
    <div
      role="dialog"
      aria-label={`${feature.kind} info`}
      className={cn(
        "fixed z-40 rounded-2xl border border-border bg-card shadow-xl overflow-hidden flex flex-col",
        // v3.27.4 — mobile: full-width bottom sheet, safe-area
        // padded, with a fixed max-height so it never clips at the
        // top when a photo band is present. Desktop (sm+): floating
        // right-side card, top-24 to clear the sticky header.
        "left-2 right-2 sm:left-auto sm:right-3 sm:w-[min(92vw,26rem)] lg:w-[min(92vw,30rem)]",
        "bottom-2 sm:bottom-auto sm:top-24",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        // v3.27.5 — dynamic mobile max-height based on the current
        // drag-snap point (peek / half / full). Desktop unchanged
        // — always uses the 48rem cap.
        maxHeight: `min(48rem, ${mobileMaxHeight}, calc(100dvh - 7rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))`,
        transition: "max-height 220ms cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      {/* v3.27.5 — big mobile drag handle. Tap cycles peek → half →
       *  full → peek. Drag up/down snaps to the next size. Desktop
       *  hidden — no need for the resize affordance on a floating
       *  card. The touch-none prevents the browser from scrolling
       *  the map while the user is dragging the sheet. */}
      <div
        className="sm:hidden flex justify-center py-2 cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onClick={cycleSnap}
        role="button"
        aria-label={`Resize (currently ${mobileSnap})`}
        title="Drag to resize"
      >
        <span className="h-1.5 w-12 rounded-full bg-slate-400 dark:bg-slate-500" />
      </div>

      {/* v3.27.2 — Photo band OR gradient hero, depending on whether
       *  the entity has a photo in its metadata. Photo overrides
       *  gradient; falls back to the coloured hero on room/building
       *  types that have no image. Photo is `metadata.photoUrl` (any
       *  string HTTPS URL — we don't self-host yet).
       *  Close button floats top-right over both. */}
      {(() => {
        const photoUrl = featurePhotoUrl(feature);
        if (photoUrl) {
          return (
            <div className="relative h-28 sm:h-40 md:h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <img
                src={photoUrl}
                alt={title}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Bad URL / 404 — fall back to gradient by hiding img.
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Gradient scrim so the kind label + close button read
                * over any photo. */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)`,
                }}
              />
              <button
                type="button"
                onClick={onClose}
                className="absolute top-2 right-2 h-7 w-7 rounded-lg flex items-center justify-center text-white bg-black/40 hover:bg-black/60 transition-colors backdrop-blur-sm"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute top-2 left-3 text-[10px] font-bold tracking-[0.22em] uppercase text-white/95 drop-shadow">
                {featureKindLabel(feature)}
              </div>
            </div>
          );
        }
        return (
          <div
            className="relative h-14 flex items-end"
            style={{
              background: `linear-gradient(135deg, ${color} 0%, ${color}dd 50%, ${color}88 100%)`,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-2 right-2 h-7 w-7 rounded-lg flex items-center justify-center text-white/90 hover:text-white hover:bg-black/20 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="px-4 py-2 text-[10px] font-bold tracking-[0.22em] uppercase text-white/90">
              {featureKindLabel(feature)}
            </div>
          </div>
        );
      })()}

      <header className="flex items-start gap-3 px-4 pt-3 pb-3 border-b border-border">
        <span
          className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{ background: color + "22", color }}
        >
          <KindIcon feature={feature} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-foreground leading-tight truncate">{title}</p>
          {subtitle && (
            <p className="text-[11.5px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
      </header>

      <div className="px-4 py-3 overflow-y-auto flex-1 space-y-3 text-[13px]">
        <MetadataRows feature={feature} />
      </div>

      <div className="px-3 pb-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => onRouteTo(feature)}
          className="w-full h-11 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-600/25 active:scale-[0.98] flex items-center justify-center gap-2 text-sm transition-all"
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

/**
 * v3.27.2 — Pull the photo URL out of the entity's free-form
 * metadata. Supports `metadata.photoUrl`, `metadata.imageUrl`, or a
 * top-level `photoUrl`/`imageUrl` for future schema additions.
 * Returns null when nothing usable is set.
 */
function featurePhotoUrl(f: ClickedFeature): string | null {
  if (f.kind === "hallway") return null;
  const md = (f.entity.metadata ?? {}) as Record<string, unknown>;
  const candidates: unknown[] = [
    md.photoUrl, md.imageUrl, md.image, md.photo,
    (f.entity as unknown as { photoUrl?: unknown }).photoUrl,
    (f.entity as unknown as { imageUrl?: unknown }).imageUrl,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0 && (c.startsWith("http") || c.startsWith("data:"))) {
      return c;
    }
  }
  return null;
}

/**
 * v3.27.2 — Free-form metadata extractor for optional fields that
 * we surface as their own rows: opening hours, phone, email, website.
 * All optional; only rendered when a string value is present.
 */
function featureContact(f: ClickedFeature): { hours?: string; phone?: string; email?: string; website?: string } {
  if (f.kind === "hallway") return {};
  const md = (f.entity.metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim().length > 0 ? v : undefined;
  return {
    hours: str(md.hours) ?? str(md.openingHours) ?? str(md.opening_hours),
    phone: str(md.phone) ?? str(md.tel) ?? str(md.contactPhone),
    email: str(md.email) ?? str(md.contactEmail),
    website: str(md.website) ?? str(md.url),
  };
}

function KindIcon({ feature }: { feature: ClickedFeature }) {
  if (feature.kind === "building") return <MapPin className="h-4 w-4" />;
  if (feature.kind === "hallway") return <Compass className="h-4 w-4" />;
  return <Info className="h-4 w-4" />;
}

function MetadataRows({ feature }: { feature: ClickedFeature }) {
  const contact = featureContact(feature);
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
        <ContactRows contact={contact} />
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
        <ContactRows contact={contact} />
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

/** v3.27.2 — hours / phone / email / website rows from the entity's
 *  free-form metadata. Rendered as clickable tel:/mailto:/https:
 *  links for the contact fields, so tapping "Call" or "Email" opens
 *  the OS handler. */
function ContactRows({ contact }: { contact: { hours?: string; phone?: string; email?: string; website?: string } }) {
  const { hours, phone, email, website } = contact;
  if (!hours && !phone && !email && !website) return null;
  return (
    <>
      {hours && (
        <Row label="Hours" icon={Clock}>
          <span className="whitespace-pre-line">{hours}</span>
        </Row>
      )}
      {phone && (
        <Row label="Phone" icon={Phone}>
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className="text-blue-600 dark:text-blue-400 hover:underline">
            {phone}
          </a>
        </Row>
      )}
      {email && (
        <Row label="Email" icon={Mail}>
          <a href={`mailto:${email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
            {email}
          </a>
        </Row>
      )}
      {website && (
        <Row label="Website" icon={ExternalLink}>
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all"
          >
            {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </a>
        </Row>
      )}
    </>
  );
}
