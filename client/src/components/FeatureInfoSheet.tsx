/**
 * FeatureInfoSheet — click-to-inspect panel for a room / building /
 * hallway on the public map. Premium MazeMap + Apple-style design.
 *
 * Mobile: swipeable bottom sheet with three snap points.
 * Desktop (sm+): floating card anchored to bottom-center.
 */
import { useState, useRef, useEffect } from "react";
import {
  X, MapPin, Compass, Users, User, Layers as LayersIcon, Info,
  Navigation2, Clock, Phone, Mail, ExternalLink, Building2, DoorOpen,
  BookOpen, Dumbbell, ShoppingCart, Trees, Warehouse, Coffee,
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
  const title = featureTitle(feature, lang);
  const subtitle = featureSubtitle(feature, lang);
  const color = featureColor(feature);
  const accessDecision = useAccessDecision();
  const { settings: secSettings } = useSecuritySettings();
  const canUseSchedules = isFeatureAllowed("schedules", accessDecision, secSettings);
  const canUseRouting = isFeatureAllowed("routing", accessDecision, secSettings);

  // Record this view in the recent-searches store so it appears in the
  // search dropdown's "Recent" section the next time the user searches.
  useEffect(() => {
    if (feature.kind === "room") {
      recordPick({ kind: "room", room: feature.entity as never, building: null });
    } else if (feature.kind === "building") {
      recordPick({ kind: "building", building: feature.entity as never });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feature.kind, (feature.entity as { id: string }).id]);
  const photoUrl = featurePhotoUrl(feature);

  const [mobileSnap, setMobileSnap] = useState<"peek" | "half" | "full">("half");
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

  const isWall = feature.kind === "hallway" && feature.entity.surface === "wall";

  return (
    <div
      role="dialog"
      aria-label={`${feature.kind} info`}
      className={cn(
        "fixed z-40 overflow-hidden flex flex-col",
        // Mobile: full-width bottom sheet
        "left-0 right-0 bottom-0 rounded-t-3xl shadow-[0_-4px_32px_rgba(0,0,0,0.18)]",
        // Desktop: centered card — MazeMap style (bottom-center, not left rail)
        "sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:bottom-6 sm:rounded-3xl sm:shadow-2xl sm:w-[min(90vw,30rem)]",
      )}
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        maxHeight: typeof window !== "undefined" && window.innerWidth >= 640
          ? "min(52rem, 80dvh)"
          : `min(52rem, ${mobileMaxH}, calc(100dvh - 5rem - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)))`,
        transition: "max-height 260ms cubic-bezier(0.32, 0.72, 0, 1)",
        background: "transparent",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      {photoUrl ? (
        /* Photo header */
        <div className="relative shrink-0 h-44 overflow-hidden rounded-t-3xl sm:rounded-t-3xl bg-slate-100 dark:bg-slate-800">
          {/* Mobile drag handle */}
          <div
            className="sm:hidden absolute top-0 left-1/2 -translate-x-1/2 z-10 flex justify-center pt-3 pb-6 cursor-grab active:cursor-grabbing touch-none select-none w-28"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerCancel}
            onClick={cycleSnap}
            role="button"
            aria-label={`Sheet size: ${mobileSnap}. Tap to resize.`}
          >
            <span className="h-[5px] w-10 rounded-full bg-white/50 shadow-sm" />
          </div>
          <img
            src={photoUrl}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(180deg,rgba(0,0,0,.4) 0%,rgba(0,0,0,0) 35%,rgba(0,0,0,0) 50%,rgba(0,0,0,.7) 100%)" }}
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full flex items-center justify-center text-white bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all shadow"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-3 left-4 right-12">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase mb-1.5"
              style={{ background: color + "dd", color: "#fff" }}
            >
              <KindIcon feature={feature} size={10} />
              {featureKindLabel(feature, lang)}
            </span>
            <h2 className="text-[17px] font-bold text-white leading-tight drop-shadow-md line-clamp-2">{title}</h2>
            {subtitle && <p className="text-[11px] text-white/80 mt-0.5 drop-shadow">{subtitle}</p>}
          </div>
        </div>
      ) : (
        /* Color gradient header — fills the empty space with the room/building accent color */
        <div
          className="relative shrink-0 overflow-hidden rounded-t-3xl sm:rounded-t-3xl"
          style={{
            background: `linear-gradient(145deg, ${color} 0%, ${color}bb 50%, ${color}88 100%)`,
            paddingBottom: "3rem",
          }}
        >
          {/* Mobile drag handle — pill area only so it doesn't block the close button */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div
              className="px-8 py-1.5 cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              onPointerCancel={onHandlePointerCancel}
              onClick={cycleSnap}
              role="button"
              aria-label={`Sheet size: ${mobileSnap}. Tap to resize.`}
            >
              <span className="block h-[5px] w-10 rounded-full bg-white/35 shadow-sm" />
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 z-10 h-8 w-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/20 transition-all"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="px-5 pt-3 sm:pt-5 pb-1">
            <div className="flex items-center gap-2 flex-wrap mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] uppercase px-2.5 py-1 rounded-full bg-white/20 text-white">
                <KindIcon feature={feature} size={11} />
                {featureKindLabel(feature, lang)}
              </span>
              {feature.kind === "room" && typeof feature.entity.floor === "number" && (
                <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/15 text-white/85">
                  {i18n.language === "fi" ? `Kerros ${feature.entity.floor}` : `Floor ${feature.entity.floor}`}
                </span>
              )}
            </div>
            <h2 className="text-[22px] sm:text-[24px] font-bold text-white leading-tight line-clamp-2 drop-shadow-sm">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[13px] text-white/75 mt-1.5 leading-snug">{subtitle}</p>
            )}
          </div>
        </div>
      )}

      {/* ── White body card — lifts over gradient ─────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-gray-950 rounded-t-3xl -mt-5 overflow-hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4">
          <MetadataRows feature={feature} />
        </div>

        {/* Action buttons */}
        {(feature.kind !== "hallway" || isWall) ? (
          feature.kind !== "hallway" ? (
            <div className="shrink-0 px-4 pb-4 pt-3 space-y-2 border-t border-black/8 dark:border-white/10">
              {/* Schedule button — rooms only, hidden when schedules restricted */}
              {canUseSchedules && feature.kind === "room" && (() => {
                const sched = feature.entity as unknown as { scheduleUrl?: string | null; scheduleLabel?: string | null };
                if (!sched.scheduleUrl?.trim()) return null;
                const label = sched.scheduleLabel?.trim() || (i18n.language === "fi" ? "Avaa lukujärjestys" : "Open schedule");
                return (
                  <a
                    href={sched.scheduleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-[46px] rounded-2xl font-semibold bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white shadow-sm shadow-emerald-500/30 flex items-center justify-center gap-2 text-[14px] transition-all"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    {label}
                  </a>
                );
              })()}
              {canUseRouting && (
              <button
                type="button"
                onClick={() => onRouteTo(feature)}
                className="w-full h-[46px] rounded-2xl font-semibold bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-sm shadow-blue-600/30 flex items-center justify-center gap-2 text-[14px] transition-all"
              >
                <Navigation2 className="h-4 w-4 shrink-0" />
                {i18n.language === "fi" ? "Reittiohjeet" : "Get directions"}
              </button>
              )}
            </div>
          ) : null
        ) : null}
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
  // Hallway / wall
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
      wall:       { fi: "Ulkoseinä",    en: "Exterior wall" },
      "inner-wall": { fi: "Väliseinä",  en: "Inner wall" },
      concrete:   { fi: "Betoni",       en: "Concrete" },
      carpet:     { fi: "Matto",        en: "Carpet" },
      tile:       { fi: "Laatta",       en: "Tile" },
      gravel:     { fi: "Sora",         en: "Gravel" },
      asphalt:    { fi: "Asfaltti",     en: "Asphalt" },
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

// Unused but kept for type-checking — ShoppingCart imported for potential future use
const _unused = ShoppingCart;
