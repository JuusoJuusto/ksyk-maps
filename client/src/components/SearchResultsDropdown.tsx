/**
 * SearchResultsDropdown — live-search overlay under the Header.
 *
 * Consumes `@ksyk/shared`'s `buildRoomSearchIndex` so it inherits the
 * fuzzy/prefix/typo-tolerant ranking the whole app has agreed on.
 * Purely presentational — the actual search index is built here from
 * the `/api/rooms` + `/api/buildings` snapshots via React Query.
 *
 * Renders under the header's Search input; matches the input's
 * `aria-controls="search-results-listbox"` so screen readers announce
 * results as the user types.
 *
 * Clicking a result flies the map to the room and (optionally) calls
 * `onSelect(room)` — the parent can update its selection state, open
 * a room info sheet, etc.
 */
import { useEffect, useMemo, useState } from "react";
import { buildRoomSearchIndex } from "@ksyk/shared";
import type { Room, Building, SearchHit } from "@ksyk/shared";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";
import { useCampusData } from "@/hooks/useCampusData";

/** What was clicked in the dropdown — either a room or a building. */
export type SearchPick =
  | { kind: "room"; room: Room; building: Building | null }
  | { kind: "building"; building: Building };

export interface SearchResultsDropdownProps {
  query: string;
  /** Called when the user clicks a result. Receives either a room hit
   *  or a building hit — the map focuses the polygon centroid for both. */
  onSelect: (pick: SearchPick) => void;
  /** Max visible results. Default 8. */
  limit?: number;
  /** Optional custom Y offset (px) from the top of the viewport. Falls
   *  back to the same offset the header search row sits at. */
  offsetTop?: number;
}

export default function SearchResultsDropdown({
  query,
  onSelect,
  limit = 8,
  offsetTop,
}: SearchResultsDropdownProps) {
  const { darkMode } = useDarkMode();

  // Measure the header dynamically instead of assuming 128px — on
  // mobile the announcement banner + safe-area inset + stacked search
  // row push the search input down further, and a hardcoded offset
  // meant the dropdown overlapped the search input on tall layouts.
  const [autoOffset, setAutoOffset] = useState<number>(() => offsetTop ?? 128);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const measure = () => {
      // Header is a sticky div that wraps the whole announcement + top
      // bar + search row. Grab the LAST search input on the page since
      // there might be nested search inputs in nav panel etc.
      const header = document.querySelector<HTMLElement>('header');
      if (!header) return;
      const rect = header.getBoundingClientRect();
      // 6px breathing gap between the input and the dropdown.
      setAutoOffset(Math.max(0, rect.bottom + 6));
    };
    measure();
    // Recompute on every resize / orientation change so mobile browsers
    // that grow the viewport when the keyboard closes stay in sync.
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    // Also observe header size — some CSS transitions animate the
    // announcement banner in/out.
    const header = document.querySelector<HTMLElement>('header');
    let ro: ResizeObserver | null = null;
    if (header && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(header);
    }
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      ro?.disconnect();
    };
  }, []);
  const effectiveOffset = offsetTop ?? autoOffset;

  const { rooms, buildings } = useCampusData();
  const index = useMemo(() => buildRoomSearchIndex(rooms, buildings), [rooms, buildings]);
  const trimmed = query.trim();

  // Filter chips let users narrow to just rooms / buildings / specific
  // room types. "All" keeps the raw ranked list.
  const [activeFilter, setActiveFilter] = useState<string>("all");
  useEffect(() => {
    // Reset filter when the query changes so the user isn't confused
    // by an old filter narrowing a new query.
    setActiveFilter("all");
  }, [trimmed]);

  // Precompute a raw hit set (up to a higher limit) so filters can
  // narrow client-side without a re-search per chip.
  const rawHits: Array<SearchHit<{ room: Room | null; building: Building | null }>> = useMemo(() => {
    if (!trimmed) return [];
    return index.search(trimmed, { limit: Math.max(limit * 4, 40) });
  }, [index, trimmed, limit]);

  const hits = useMemo(() => {
    const filtered = rawHits.filter((h) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "buildings") return !h.doc.data?.room;
      if (activeFilter === "rooms") return !!h.doc.data?.room;
      // Room-type filter — string equals on Room.type.
      const type = h.doc.data?.room?.type;
      return type === activeFilter;
    });
    return filtered.slice(0, limit);
  }, [rawHits, activeFilter, limit]);

  // Available filter chips depend on what actually appears in the
  // raw results — no point offering "Labs" when the query has no lab
  // hits. Always include All / Rooms / Buildings when both kinds are
  // represented.
  const filterChips = useMemo(() => {
    const chips: Array<{ id: string; label: string; count: number }> = [
      { id: "all", label: "All", count: rawHits.length },
    ];
    const roomsCount = rawHits.filter((h) => h.doc.data?.room).length;
    const buildingsCount = rawHits.filter((h) => !h.doc.data?.room).length;
    if (roomsCount > 0 && buildingsCount > 0) {
      chips.push({ id: "rooms", label: "Rooms", count: roomsCount });
      chips.push({ id: "buildings", label: "Buildings", count: buildingsCount });
    }
    // Common room-type chips — only surface when there's at least one hit.
    const typesToOffer: Array<[string, string]> = [
      ["classroom", "Classrooms"],
      ["lab", "Labs"],
      ["bathroom", "Bathrooms"],
      ["cafeteria", "Cafés"],
      ["gym", "Gyms"],
      ["office", "Offices"],
      ["elevator", "Elevators"],
      ["stairs", "Stairs"],
      ["entrance", "Entrances"],
    ];
    for (const [id, label] of typesToOffer) {
      const c = rawHits.filter((h) => h.doc.data?.room?.type === id).length;
      if (c > 0) chips.push({ id, label, count: c });
    }
    return chips;
  }, [rawHits]);

  if (!trimmed) return null;

  return (
    <div
      id="search-results-listbox"
      role="listbox"
      aria-label={`${hits.length} search results`}
      className={cn(
        // Full-width on mobile with side gutters, capped at 42rem on
        // larger viewports. Stretches to available viewport height so
        // long result lists scroll INSIDE the panel instead of pushing
        // off-screen.
        "fixed left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 sm:w-[min(92vw,42rem)] rounded-2xl border shadow-lg overflow-hidden",
        darkMode
          ? "bg-gray-900/95 border-gray-800 text-gray-100 backdrop-blur"
          : "bg-white border-gray-200 text-gray-900",
      )}
      style={{
        top: effectiveOffset,
        // Never taller than the space between the header and the
        // bottom of the viewport (minus safe-area).
        maxHeight: `calc(100dvh - ${effectiveOffset}px - env(safe-area-inset-bottom, 0px) - 12px)`,
      }}
    >
      {/* Filter chips — hidden when only "All" would show, since a
       *  single chip is just noise. */}
      {filterChips.length > 1 && (
        <div className={cn("flex gap-1.5 overflow-x-auto px-3 py-2 border-b", darkMode ? "border-gray-800 bg-gray-900/70" : "border-gray-100 bg-slate-50/60")}>
          {filterChips.map((chip) => {
            const active = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setActiveFilter(chip.id)}
                className={cn(
                  "shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors flex items-center gap-1.5",
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : darkMode
                      ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      : "bg-white text-gray-700 hover:bg-gray-100 ring-1 ring-gray-200",
                )}
              >
                {chip.label}
                <span className={cn(
                  "text-[10px] tabular-nums opacity-70",
                  active ? "text-white" : darkMode ? "text-gray-500" : "text-gray-500",
                )}>{chip.count}</span>
              </button>
            );
          })}
        </div>
      )}
      {hits.length === 0 ? (
        <div
          className={cn(
            "px-4 py-3 text-sm",
            darkMode ? "text-gray-400" : "text-gray-500",
          )}
        >
          No matches for &quot;{trimmed}&quot;.
        </div>
      ) : (
        <ul className="overflow-y-auto divide-y divide-inherit" style={{ maxHeight: `calc(100dvh - ${effectiveOffset}px - env(safe-area-inset-bottom, 0px) - 12px)` }}>
          {hits.map((hit) => {
            const room = hit.doc.data!.room;
            const building = hit.doc.data!.building;
            const pick: SearchPick = room
              ? { kind: "room", room, building }
              : { kind: "building", building: building! };
            return (
              <li
                key={hit.id}
                role="option"
                aria-selected="false"
                onClick={() => onSelect(pick)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                  darkMode
                    ? "hover:bg-blue-500/10 hover:text-blue-200"
                    : "hover:bg-blue-50 hover:text-blue-800",
                )}
              >
                <TypeChip pick={pick} darkMode={darkMode} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    <HighlightedText text={hit.doc.title} highlights={hit.highlights.filter((h) => h.field === "title")} />
                  </div>
                  {hit.doc.subtitle && (
                    <div className={cn("text-xs truncate", darkMode ? "text-gray-400" : "text-gray-500")}>
                      <HighlightedText text={hit.doc.subtitle} highlights={hit.highlights.filter((h) => h.field === "subtitle")} />
                    </div>
                  )}
                </div>
                <div className={cn("text-[10px] uppercase tracking-wider tabular-nums", darkMode ? "text-gray-500" : "text-gray-400")}>
                  {(hit.score * 100).toFixed(0)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Render `text` with highlight ranges wrapped in <mark> for the
 *  user's query hits. Non-highlighted spans render as plain text. */
function HighlightedText({
  text,
  highlights,
}: {
  text: string;
  highlights: Array<{ start: number; end: number }>;
}) {
  if (!highlights.length) return <>{text}</>;
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  const parts: Array<{ text: string; hit: boolean }> = [];
  let cursor = 0;
  for (const h of sorted) {
    if (h.start > cursor) parts.push({ text: text.slice(cursor, h.start), hit: false });
    parts.push({ text: text.slice(h.start, h.end), hit: true });
    cursor = h.end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark
            key={i}
            className="bg-yellow-200/70 dark:bg-yellow-500/25 text-inherit rounded-sm px-0.5"
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/** Tiny circular icon chip identifying the pick's kind. Uses the same
 *  semantic colours as the POI icons on the map so users get a
 *  consistent visual language across search + map. */
function TypeChip({ pick, darkMode }: { pick: SearchPick; darkMode: boolean }) {
  const cfg = pickChip(pick);
  return (
    <span
      className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] shrink-0"
      style={{
        background: darkMode ? `${cfg.bg}55` : cfg.bg,
        color: cfg.fg,
        outline: `1px solid ${cfg.fg}55`,
      }}
      aria-hidden="true"
    >
      {cfg.glyph}
    </span>
  );
}

function pickChip(pick: SearchPick): { bg: string; fg: string; glyph: string } {
  if (pick.kind === "building") return { bg: "#dbeafe", fg: "#1e40af", glyph: "▣" };
  const type = pick.room.type;
  switch (type) {
    case "classroom": return { bg: "#e0f2fe", fg: "#0369a1", glyph: "🅒" };
    case "lab":       return { bg: "#ede9fe", fg: "#6d28d9", glyph: "⚗" };
    case "bathroom":  return { bg: "#fce7f3", fg: "#be185d", glyph: "⚑" };
    case "cafeteria": return { bg: "#fef3c7", fg: "#b45309", glyph: "☕" };
    case "gym":       return { bg: "#dcfce7", fg: "#15803d", glyph: "⚙" };
    case "office":    return { bg: "#f3f4f6", fg: "#4b5563", glyph: "🅞" };
    case "elevator":  return { bg: "#dbeafe", fg: "#1d4ed8", glyph: "⇵" };
    case "stairs":    return { bg: "#fef3c7", fg: "#b45309", glyph: "⇅" };
    case "entrance":  return { bg: "#dcfce7", fg: "#15803d", glyph: "➜" };
    case "exit":      return { bg: "#fee2e2", fg: "#b91c1c", glyph: "⤴" };
    case "library":   return { bg: "#fef3c7", fg: "#b45309", glyph: "📚" };
    case "auditorium":return { bg: "#f5f3ff", fg: "#6d28d9", glyph: "🎤" };
    default:          return { bg: "#e0f2fe", fg: "#0f766e", glyph: "•" };
  }
}
