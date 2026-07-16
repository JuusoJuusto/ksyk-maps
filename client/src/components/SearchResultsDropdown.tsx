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
import { useQuery } from "@tanstack/react-query";
import { buildRoomSearchIndex } from "@ksyk/shared";
import type { Room, Building, SearchHit } from "@ksyk/shared";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";
import { fetchList } from "@/lib/fetchList";

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

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    queryFn: () => fetchList<Room>("/api/rooms"),
    // Stale-time: rooms don't change often; refetch only on window
    // focus so the search stays responsive without a network hit on
    // every keystroke.
    staleTime: 60_000,
  });
  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
    queryFn: () => fetchList<Building>("/api/buildings"),
    staleTime: 60_000,
  });

  const index = useMemo(() => buildRoomSearchIndex(rooms, buildings), [rooms, buildings]);
  const trimmed = query.trim();
  // Index emits both room and building hits — payload.room is nullable
  // for building hits. Downstream reduces it to a SearchPick union.
  const hits: Array<SearchHit<{ room: Room | null; building: Building | null }>> = useMemo(() => {
    if (!trimmed) return [];
    return index.search(trimmed, { limit });
  }, [index, trimmed, limit]);

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
