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
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildRoomSearchIndex } from "@ksyk/shared";
import type { Room, Building, SearchHit } from "@ksyk/shared";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { cn } from "@/lib/utils";

export interface SearchResultsDropdownProps {
  query: string;
  /** Called when the user clicks a result. */
  onSelect: (room: Room, building: Building | null) => void;
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
  offsetTop = 128,
}: SearchResultsDropdownProps) {
  const { darkMode } = useDarkMode();

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ["/api/rooms"],
    queryFn: async () => {
      const r = await fetch("/api/rooms");
      if (!r.ok) return [];
      return r.json();
    },
    // Stale-time: rooms don't change often; refetch only on window
    // focus so the search stays responsive without a network hit on
    // every keystroke.
    staleTime: 60_000,
  });
  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["/api/buildings"],
    queryFn: async () => {
      const r = await fetch("/api/buildings");
      if (!r.ok) return [];
      return r.json();
    },
    staleTime: 60_000,
  });

  const index = useMemo(() => buildRoomSearchIndex(rooms, buildings), [rooms, buildings]);
  const trimmed = query.trim();
  const hits: Array<SearchHit<{ room: Room; building: Building | null }>> = useMemo(() => {
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
        "fixed left-1/2 -translate-x-1/2 z-40 w-[min(92vw,42rem)] rounded-2xl border shadow-lg overflow-hidden",
        darkMode
          ? "bg-gray-900/95 border-gray-800 text-gray-100 backdrop-blur"
          : "bg-white border-gray-200 text-gray-900",
      )}
      style={{ top: offsetTop }}
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
        <ul className="max-h-[60vh] overflow-y-auto divide-y divide-inherit">
          {hits.map((hit) => {
            const room = hit.doc.data!.room;
            const building = hit.doc.data!.building;
            return (
              <li
                key={hit.id}
                role="option"
                aria-selected="false"
                onClick={() => onSelect(room, building)}
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
