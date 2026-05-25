/** Aalto Space–style campus map constants (KSYK Maps) */

export type RoomStatus = "free" | "occupied" | "reserved" | "maintenance" | "unknown";

export const ROOM_STATUS_COLORS: Record<RoomStatus, string> = {
  free: "#10B981",
  occupied: "#EF4444",
  reserved: "#F59E0B",
  maintenance: "#8B5CF6",
  unknown: "#6B7280",
};

export function getRoomStatusColor(status?: string | null): string {
  const key = (status || "unknown") as RoomStatus;
  return ROOM_STATUS_COLORS[key] ?? ROOM_STATUS_COLORS.unknown;
}

export function roomStatusLabel(status: string | undefined, isFi: boolean): string {
  const map: Record<string, { en: string; fi: string }> = {
    free: { en: "Free", fi: "Vapaa" },
    occupied: { en: "Occupied", fi: "Varattu" },
    reserved: { en: "Reserved", fi: "Varattu pian" },
    maintenance: { en: "Maintenance", fi: "Huolto" },
    unknown: { en: "Unknown", fi: "Tuntematon" },
  };
  const e = map[status || "unknown"] ?? map.unknown;
  return isFi ? e.fi : e.en;
}

export const ROOM_TYPE_COLORS: Record<string, string> = {
  classroom: "#3B82F6",
  lab: "#8B5CF6",
  office: "#6366F1",
  library: "#0EA5E9",
  gymnasium: "#F59E0B",
  cafeteria: "#F97316",
  auditorium: "#DC2626",
  hallway: "#94A3B8",
  toilet: "#64748B",
  storage: "#78716C",
};

export function getRoomFillColor(type?: string, status?: string): string {
  if (status && status !== "unknown" && status !== "free") {
    return getRoomStatusColor(status);
  }
  if (type && ROOM_TYPE_COLORS[type]) return ROOM_TYPE_COLORS[type];
  return "#3B82F6";
}
