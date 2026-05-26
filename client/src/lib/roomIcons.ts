/**
 * SVG path data for room-type pictograms, drawn inline inside each room rect.
 * Paths are designed for a 24x24 viewBox; rendered scaled to room size.
 */

export type RoomIconPath = { d: string; weight?: number };

export const ROOM_ICON_PATHS: Record<string, RoomIconPath> = {
  classroom: { d: "M3 4h18v3H3zM6 9v12h12V9z M9 13h6 M9 17h6" },
  classroom_science: { d: "M6 2v6l-4 12c0 1 1 2 2 2h16c1 0 2-1 2-2l-4-12V2 M6 2h12 M9 14h6" },
  classroom_language: { d: "M5 7h14 M5 12h14 M5 17h14 M9 4l-4 8 4 8 M15 4l4 8-4 8" },
  classroom_art: { d: "M12 2C6 2 2 6 2 12c0 4 3 7 6 7 1 0 2-1 2-2 0-1-1-2-1-3s1-2 2-2h3c4 0 7-3 7-7 0-3-3-3-9-3" },
  classroom_music: { d: "M9 18V5l12-2v13 M9 18a2 2 0 11-4 0 2 2 0 014 0 M21 16a2 2 0 11-4 0 2 2 0 014 0" },
  classroom_computer: { d: "M3 4h18v12H3z M8 20h8 M12 16v4" },
  lab: { d: "M9 2v8l-5 9c-1 2 0 3 2 3h12c2 0 3-1 2-3l-5-9V2 M9 2h6 M8 14h8" },
  office: { d: "M4 4h16v16H4z M9 9h6 M9 13h6 M9 17h6" },
  library: { d: "M4 4h6c1 0 2 1 2 2v14 M20 4h-6c-1 0-2 1-2 2v14 M4 4v16h16V4" },
  gymnasium: { d: "M6 6v12 M18 6v12 M3 9v6 M21 9v6 M6 12h12" },
  cafeteria: { d: "M5 3v8c0 2 1 3 3 3v7 M9 3v8 M14 3c3 0 5 3 5 6s-2 4-3 4v8" },
  lobby: { d: "M3 21V8l9-5 9 5v13 M9 21v-6h6v6" },
  toilet: { d: "M8 4v6h2v11h4V10h2V4 M8 4h8" },
  stairway: { d: "M3 21h4v-4h4v-4h4V9h4V5h2" },
  hallway: { d: "M3 12h18 M3 12v6 M21 12v6" },
  door: { d: "M6 21V3h12v18 M14 12h2" },
  storage: { d: "M4 7l8-4 8 4v13H4z M4 11h16 M4 15h16" },
  auditorium: { d: "M2 19c2-6 8-9 10-9s8 3 10 9 M2 19h20 M7 12V8h10v4" },
};

export function pathForRoomType(type?: string): string | null {
  if (!type) return null;
  return ROOM_ICON_PATHS[type]?.d ?? null;
}
