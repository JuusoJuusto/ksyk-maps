/**
 * FeatureInfoSheet — click-to-inspect panel for a room / building / hallway.
 *
 * Layout (MazeMap-compact style):
 *   Mobile: swipeable bottom sheet, 3 snap points (peek 38dvh / half 62dvh / full 88dvh).
 *   Desktop (sm+): centered floating card bottom-6, 30rem wide.
 *
 * Critical fix: "Get directions" button is placed ABOVE the scrollable
 * metadata area so it remains visible even at the peek snap point.
 */
import { useState, useRef, useEffect } from "react";
import {
  X, MapPin, Compass, Users, User, Layers as LayersIcon, Info,
  Navigation2, Clock, Phone, Mail, ExternalLink, Building2, DoorOpen,
  BookOpen, Dumbbell, Trees, Warehouse, Coffee,
  ChevronRight, Minus, Utensils, Lock, ArrowUpDown, Mic2, FlipVertical2,
  LayoutDashboard, Wrench, Droplets,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Building, Room, Hallway } from "@ksyk/shared";
import { cn } from "@/lib/utils";
import { useAccessDecision } from "@/hooks/useAccessDecision";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { isFeatureAllowed } from "@/lib/accessControl";
import { recordPick } from "@/lib/recentSearches";

export type ClickedFeature =
  | { kind: "building"; entity: Building }
  | { kind: "room"; entity: Room }
  | { kind: "hallway"; entity: Hallway };

interface FeatureInfoSheetProps {
  feature: ClickedFeature;
  onClose: () => void;
  onRouteTo: (feature: ClickedFeature) => void;
}

export default function FeatureInfoSheet({ feature, onClose, onRouteTo }: FeatureInfoSheetProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const fi = lang === "fi";
  const title = featureTitle(feature, lang);
  const subtitle = featureSubtitle(feature, lang);
  const color = featureColor(feature);
  const accessDecision = useAccessDecision();
  const { settings: secSettings } = useSecuritySettings();
  const canUseSchedules = isFeatureAllowed("schedules", accessDecision, secSettings);
  const canUseRouting = isFeatureAllowed("routing", accessDecision, secSettings);

  useEffect(() => {
    if (feature.kind === "room") {
      recordPick({ kind: "room", room: feature.entity as never, building: null });
    } else if (feature.kind === "building") {
      recordPick({ kind: "building", building: feature.entity as never });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature.kind, (feature.entity as { id: string }).id]);

  const photoUrl = featurePhotoUrl(feature);

  // ── Mobile snap / drag ───────────────────────────────────────────────
  const [mobileSnap, setMobileSnap] = useState<"peek" | "half" | "full">("peek");
  const dragStartYRef = useRef<number | null>(null);
  const dragStartSnapRef = useRef<typeof mobileSnap>("half");

  const onHandlePointerDown = (e: React.PointerEvent) => {
    dragStartYRef.current = e.clientY;
    dragStartSnapRef.current = mobileSnap;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onHandlePointerMove = (e: React.PointerEvent) => {
    const startY = dragStartYRef.current;
    if (startY === null) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) < 36) return;
    setMobileSnap(dy < 0
      ? (dragStartSnapRef.current === "peek" ? "half" : "full")
      : (dragStartSnapRef.current === "full" ? "half" : "peek"));
    dragStartYRef.current = null;
  };
  const onHandlePointerUp = () => { dragStartYRef.current = null; };
  const onHandlePointerCancel = () => { dragStartYRef.current = null; };
  const cycleSnap = () =>
    setMobileSnap((s) => s === "peek" ? "half" : s === "half" ? "full" : "peek");

  const mobileMaxH =
    mobileSnap === "peek" ? "38dvh" :
    mobileSnap === "half" ? "62dvh" : "88dvh";

  // ── Schedule action (rooms only) ─────────────────────────────────────
  const sched = feature.kind === "room"
    ? (feature.entity as unknown as { scheduleUrl?: string | null; scheduleLabel?: string | null })
    : null;
  const scheduleUrl = canUseSchedules ? sched?.scheduleUrl?.trim() || undefined : undefined;
  const scheduleLabel = sched?.scheduleLabel?.trim() || (fi ? "Avaa lukujärjestys" : "Open schedule");

  const floor = feature.kind === "room" ? (feature.entity as Room).floor : null;
  const showActions = feature.kind !== "hallway" && (canUseRouting || !!scheduleUrl);

  return (
    <div
      role="dialog"
      aria-label={`${feature.kind} info`}
      className={cn(
        "fixed z-40 flex flex-col overflow-hidden",
        "bg-white dark:bg-gray-900",
        // Mobile: bottom sheet
        "left-0 right-0 bottom-0 rounded-t-2xl shadow-[0_-2px_24px_rgba(0,0,0,0.12)]",
        // Desktop: compact centered card bottom-4
        "sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:bottom-4 sm:rounded-2xl sm:shadow-[0_8px_32px_rgba(0,0,0,0.18)] sm:w-[min(88vw,21rem)]",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        maxHeight: typeof window !== "undefined" && window.innerWidth >= 640
          ? "min(52rem, 80dvh)"
          : `min(52rem, ${mobileMaxH}, calc(100dvh - 5rem - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)))`,
        transition: "max-height 260ms cubic-bezier(0.32, 0.72, 0, 1)",
      }}
    >
      {/* ── Mobile drag handle ────────────────────────────────────────── */}
      <div
        className="sm:hidden flex justify-center pt-2.5 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={onHandlePointerCancel}
        onClick={cycleSnap}
        role="button"
        aria-label={`Sheet size: ${mobileSnap}. Tap to resize.`}
      >
        <span className="h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* ── Compact header ────────────────────────────────────────────── */}
      <div className="shrink-0 px-3.5 pt-2.5 sm:pt-3">
        <div className="flex items-center gap-2.5">
          {/* Colored icon chip — compact */}
          <div
            className="h-8 w-8 rounded-xl shrink-0 flex items-center justify-center"
            style={{ background: color + "18" }}
          >
            <span style={{ color }}>
              <KindIcon feature={feature} size={15} />
            </span>
          </div>

          {/* Name + type + floor */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <span
                className="text-[9px] font-bold tracking-[0.15em] uppercase leading-none"
                style={{ color }}
              >
                {featureKindLabel(feature, lang)}
              </span>
              {typeof floor === "number" && (
                <span className="text-[9px] font-semibold text-muted-foreground/70 leading-none">
                  · {fi ? `Kerros ${floor}` : `Floor ${floor}`}
                </span>
              )}
            </div>
            <h2 className="text-[14px] font-bold leading-tight text-foreground line-clamp-1">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 h-7 w-7 rounded-full bg-black/6 dark:bg-white/10 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────────────────────── */}
      <div className="shrink-0 mx-3.5 mt-2.5 h-px bg-black/6 dark:bg-white/8" />

      {/* ── Action buttons — above scroll so always visible at peek ─── */}
      {showActions && (
        <div className="shrink-0 px-3.5 py-2 flex gap-1.5">
          {canUseRouting && (
            <button
              type="button"
              onClick={() => onRouteTo(feature)}
              className="flex-1 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white flex items-center justify-center gap-1.5 text-[12px] font-semibold transition-all shadow-sm shadow-blue-600/25"
            >
              <Navigation2 className="h-3 w-3 shrink-0" />
              {fi ? "Reittiohjeet" : "Directions"}
            </button>
          )}
          {scheduleUrl && (
            <a
              href={scheduleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "h-8 rounded-xl flex items-center justify-center gap-1 text-[12px] font-semibold transition-all active:scale-[0.97]",
                canUseRouting
                  ? "px-3 bg-black/5 dark:bg-white/10 text-foreground hover:bg-black/10 dark:hover:bg-white/15"
                  : "flex-1 bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20",
              )}
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              {!canUseRouting && scheduleLabel}
            </a>
          )}
        </div>
      )}

      {/* ── Scrollable: optional photo + metadata ────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {photoUrl && (
          <div className="px-3.5 pt-1">
            <img
              src={photoUrl}
              alt={title}
              loading="lazy"
              className="w-full rounded-xl object-cover max-h-36"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
        <div className="px-3.5 pt-2 pb-3">
          <MetadataRows feature={feature} />
        </div>
      </div>
    </div>
  );
}


// ── Helpers ──────────────────────────────────────────────────────

const ROOM_TYPE_LABELS: Record<string, { fi: string; en: string }> = {
  classroom:    { fi: "Luokkahuone",    en: "Classroom" },
  lab:          { fi: "Laboratorio",    en: "Laboratory" },
  gym:          { fi: "Liikuntasali",   en: "Gymnasium" },
  cafeteria:    { fi: "Ruokala",        en: "Cafeteria" },
  library:      { fi: "Kirjasto",       en: "Library" },
  bathroom:     { fi: "WC",             en: "Bathroom" },
  locker_room:  { fi: "Pukuhuone",      en: "Locker Room" },
  storage:      { fi: "Varasto",        en: "Storage" },
  mechanical:   { fi: "Tekninen tila",  en: "Mechanical" },
  entrance:     { fi: "Sisäänkäynti",   en: "Entrance" },
  exit:         { fi: "Poistumistie",   en: "Exit" },
  outdoor:      { fi: "Ulkotila",       en: "Outdoor" },
  elevator:     { fi: "Hissi",          en: "Elevator" },
  stairs:       { fi: "Portaat",        en: "Stairs" },
  auditorium:   { fi: "Auditorio",      en: "Auditorium" },
  office:       { fi: "Toimisto",       en: "Office" },
  hallway:      { fi: "Käytävä",        en: "Hallway" },
  lobby:        { fi: "Aula",           en: "Lobby" },
  other:        { fi: "Muu",            en: "Other" },
};

function roomTypeLabel(type: string | null | undefined, lang: string): string {
  if (!type) return lang === "fi" ? "Huone" : "Room";
  const entry = ROOM_TYPE_LABELS[type];
  if (entry) return lang === "fi" ? entry.fi : entry.en;
  return capitalise(type.replace(/_/g, " "));
}

function featureTitle(f: ClickedFeature, lang: string): string {
  if (f.kind === "building") {
    const localName = lang === "fi" ? f.entity.nameFi : f.entity.nameEn;
    return localName || f.entity.name || (lang === "fi" ? "(nimetön rakennus)" : "(unnamed building)");
  }
  if (f.kind === "room") {
    const localName = lang === "fi" ? f.entity.nameFi : f.entity.nameEn;
    const name = localName || f.entity.name;
    const parts = [f.entity.roomNumber, name].filter(Boolean);
    return parts.join(" · ") || (lang === "fi" ? "(nimetön huone)" : "(unnamed room)");
  }
  if (f.entity.surface === "inner-wall") return lang === "fi" ? "Väliseinä" : "Inner Wall";
  if (f.entity.surface === "wall") return lang === "fi" ? "Ulkoseinä" : "Exterior Wall";
  return lang === "fi" ? "Käytävä" : "Corridor";
}

function featureSubtitle(f: ClickedFeature, lang: string): string | null {
  if (f.kind === "building") {
    const floors = typeof f.entity.floors === "number"
      ? lang === "fi"
        ? `${f.entity.floors} ${f.entity.floors === 1 ? "kerros" : "kerrosta"}`
        : `${f.entity.floors} floor${f.entity.floors === 1 ? "" : "s"}`
      : null;
    return [f.entity.address, floors].filter(Boolean).join(" · ") || null;
  }
  if (f.kind === "room") {
    const parts: string[] = [];
    if (f.entity.department) parts.push(f.entity.department);
    if (f.entity.type && f.entity.type !== "other") parts.push(roomTypeLabel(f.entity.type, lang));
    return parts.join(" · ") || null;
  }
  if (f.entity.surface === "inner-wall") return lang === "fi" ? "Sisäinen väliseinä" : "Interior partition";
  if (f.entity.surface === "wall") return lang === "fi" ? "Kantava rakenne" : "Load-bearing structure";
  return f.entity.surface ?? (lang === "fi" ? "Kulkuväylä" : "Walkway");
}

function featureKindLabel(f: ClickedFeature, lang: string): string {
  if (f.kind === "building") return lang === "fi" ? "Rakennus" : "Building";
  if (f.kind === "room") return roomTypeLabel(f.entity.type, lang);
  if (f.entity.surface === "inner-wall") return lang === "fi" ? "Väliseinä" : "Inner Wall";
  if (f.entity.surface === "wall") return lang === "fi" ? "Ulkoseinä" : "Wall";
  return lang === "fi" ? "Käytävä" : "Corridor";
}

function featureColor(f: ClickedFeature): string {
  if (f.kind === "building") return f.entity.colorCode ?? "#2563eb";
  if (f.kind === "room") {
    if (f.entity.colorCode) return f.entity.colorCode;
    const t = f.entity.type;
    if (t === "classroom" || t === "lab") return "#2563eb";
    if (t === "gym") return "#16a34a";
    if (t === "cafeteria" || t === "library") return "#7c3aed";
    if (t === "bathroom" || t === "locker_room") return "#64748b";
    if (t === "stairs" || t === "elevator") return "#0891b2";
    if (t === "hallway") return "#94a3b8";
    return "#059669";
  }
  if (f.entity.surface === "wall") return "#374151";
  if (f.entity.surface === "inner-wall") return "#6b7280";
  return "#d97706";
}

function featurePhotoUrl(f: ClickedFeature): string | null {
  if (f.kind === "hallway") return null;
  const top = f.entity as unknown as { photoUrl?: unknown; imageUrl?: unknown };
  const md = (f.entity.metadata ?? {}) as Record<string, unknown>;
  for (const c of [top.photoUrl, top.imageUrl, md.photoUrl, md.imageUrl, md.image, md.photo]) {
    if (typeof c === "string" && c.length > 0 && (c.startsWith("http") || c.startsWith("data:"))) return c;
  }
  return null;
}

function featureContact(f: ClickedFeature): { hours?: string; phone?: string; email?: string; website?: string } {
  if (f.kind === "hallway") return {};
  const top = f.entity as unknown as { hours?: unknown };
  const md = (f.entity.metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim().length > 0 ? v : undefined;
  return {
    hours: str(top.hours) ?? str(md.hours) ?? str(md.openingHours) ?? str(md.opening_hours),
    phone: str(md.phone) ?? str(md.tel) ?? str(md.contactPhone),
    email: str(md.email) ?? str(md.contactEmail),
    website: str(md.website) ?? str(md.url),
  };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function KindIcon({ feature, size = 16 }: { feature: ClickedFeature; size?: number }) {
  const cls = `shrink-0`;
  const style = { width: size, height: size };
  if (feature.kind === "building") return <Building2 className={cls} style={style} />;
  if (feature.kind === "hallway") {
    if (feature.entity.surface === "wall" || feature.entity.surface === "inner-wall") return <Minus className={cls} style={style} />;
    return <Compass className={cls} style={style} />;
  }
  const t = (feature.entity as Room).type;
  if (t === "classroom") return <BookOpen className={cls} style={style} />;
  if (t === "lab") return <FlipVertical2 className={cls} style={style} />;
  if (t === "gym") return <Dumbbell className={cls} style={style} />;
  if (t === "cafeteria") return <Utensils className={cls} style={style} />;
  if (t === "library") return <BookOpen className={cls} style={style} />;
  if (t === "bathroom") return <Droplets className={cls} style={style} />;
  if (t === "locker_room") return <Lock className={cls} style={style} />;
  if (t === "storage") return <Warehouse className={cls} style={style} />;
  if (t === "mechanical") return <Wrench className={cls} style={style} />;
  if (t === "entrance" || t === "lobby") return <LayoutDashboard className={cls} style={style} />;
  if (t === "exit") return <DoorOpen className={cls} style={style} />;
  if (t === "outdoor") return <Trees className={cls} style={style} />;
  if (t === "elevator") return <ArrowUpDown className={cls} style={style} />;
  if (t === "stairs") return <LayersIcon className={cls} style={style} />;
  if (t === "auditorium") return <Mic2 className={cls} style={style} />;
  if (t === "office") return <User className={cls} style={style} />;
  return <Info className={cls} style={style} />;
}

function MetadataRows({ feature }: { feature: ClickedFeature }) {
  const { i18n } = useTranslation();
  const fi = i18n.language === "fi";
  const contact = featureContact(feature);

  if (feature.kind === "building") {
    const b = feature.entity;
    return (
      <>
        {b.description && <InfoRow label={fi ? "Tietoja" : "About"}>{b.description}</InfoRow>}
        {b.address && <InfoRow label={fi ? "Osoite" : "Address"} icon={MapPin}>{b.address}</InfoRow>}
        {typeof b.floors === "number" && (
          <InfoRow label={fi ? "Kerrokset" : "Floors"} icon={LayersIcon}>
            {(b.floorMin ?? 1) === 1 && (b.floorMax ?? b.floors) === b.floors
              ? `${b.floors}`
              : `${b.floorMin ?? 1} – ${b.floorMax ?? b.floors}`}
          </InfoRow>
        )}
        <ContactRows contact={contact} />
      </>
    );
  }
  if (feature.kind === "room") {
    const r = feature.entity;
    return (
      <>
        {r.description && <InfoRow label={fi ? "Tietoja" : "About"}>{r.description}</InfoRow>}
        {r.roomNumber && <InfoRow label={fi ? "Huonenumero" : "Room number"}>{r.roomNumber}</InfoRow>}
        {r.teacher && <InfoRow label={fi ? "Opettaja" : "Teacher"} icon={User}>{r.teacher}</InfoRow>}
        {typeof r.capacity === "number" && r.capacity > 0 && (
          <InfoRow label={fi ? "Kapasiteetti" : "Capacity"} icon={Users}>
            {fi ? `${r.capacity} henkilöä` : `${r.capacity} people`}
          </InfoRow>
        )}
        {r.tags && r.tags.length > 0 && (
          <div className="py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {fi ? "Tunnisteet" : "Tags"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {r.tags.map((t) => (
                <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
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
  const surfaceLabel = (s: string) => {
    const map: Record<string, { fi: string; en: string }> = {
      wall:         { fi: "Ulkoseinä",    en: "Exterior wall" },
      "inner-wall": { fi: "Väliseinä",    en: "Inner wall" },
      concrete:     { fi: "Betoni",       en: "Concrete" },
      carpet:       { fi: "Matto",        en: "Carpet" },
      tile:         { fi: "Laatta",       en: "Tile" },
      gravel:       { fi: "Sora",         en: "Gravel" },
      asphalt:      { fi: "Asfaltti",     en: "Asphalt" },
    };
    const entry = map[s];
    return entry ? (fi ? entry.fi : entry.en) : capitalise(s);
  };
  return (
    <>
      {h.width != null && <InfoRow label={fi ? "Leveys" : "Width"}>{h.width} m</InfoRow>}
      {h.surface && <InfoRow label={fi ? "Tyyppi" : "Type"}>{surfaceLabel(h.surface)}</InfoRow>}
      {h.floor != null && <InfoRow label={fi ? "Kerros" : "Floor"} icon={LayersIcon}>{h.floor}</InfoRow>}
      {h.accessible != null && (
        <InfoRow label={fi ? "Esteetön" : "Accessible"}>
          {h.accessible ? (fi ? "Kyllä" : "Yes") : (fi ? "Ei" : "No")}
        </InfoRow>
      )}
    </>
  );
}

function InfoRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-black/5 dark:border-white/6 last:border-0">
      {Icon && (
        <span className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
        </span>
      )}
      {!Icon && <span className="w-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none mb-0.5">{label}</p>
        <p className="text-[13px] text-foreground leading-snug break-words">{children}</p>
      </div>
    </div>
  );
}

function ContactRows({ contact }: { contact: { hours?: string; phone?: string; email?: string; website?: string } }) {
  const { i18n } = useTranslation();
  const fi = i18n.language === "fi";
  const { hours, phone, email, website } = contact;
  if (!hours && !phone && !email && !website) return null;
  return (
    <>
      {hours && (
        <InfoRow label={fi ? "Aukioloajat" : "Hours"} icon={Clock}>
          <span className="whitespace-pre-line">{hours}</span>
        </InfoRow>
      )}
      {phone && (
        <InfoRow label={fi ? "Puhelin" : "Phone"} icon={Phone}>
          <a href={`tel:${phone.replace(/\s+/g, "")}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            {phone}
          </a>
        </InfoRow>
      )}
      {email && (
        <InfoRow label={fi ? "Sähköposti" : "Email"} icon={Mail}>
          <a href={`mailto:${email}`} className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            {email}
          </a>
        </InfoRow>
      )}
      {website && (
        <InfoRow label={fi ? "Verkkosivusto" : "Website"} icon={ExternalLink}>
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline break-all font-medium flex items-center gap-1"
          >
            {website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
          </a>
        </InfoRow>
      )}
    </>
  );
}

// Unused but kept for type-checking
const _Coffee = Coffee;
