/**
 * Key-value and campus-POI helpers that replace Firestore in routes.
 *
 * kvGet / kvSet / kvMerge  →  kv_settings table (single-row JSON docs)
 * createPoi / getPoisByKind / getAllPois / deletePoi  →  campus_pois table
 * Beacon survey helpers  →  beacon_surveys table
 * incrementEggCounter / appendEggRecent  →  kv_settings, atomic JSONB SQL
 */
import { db } from "./db.js";
import { campusPois, kvSettings, beaconSurveys, rooms } from "../shared/schema.js";
import { eq, and, gte, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

// ── Key-value helpers ─────────────────────────────────────────────────────

export async function kvGet(key: string): Promise<any> {
  const rows = await db
    .select({ value: kvSettings.value })
    .from(kvSettings)
    .where(eq(kvSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await db
    .insert(kvSettings)
    .values({ key, value: value as any, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: kvSettings.key,
      set: { value: value as any, updatedAt: new Date() },
    });
}

export async function kvMerge(key: string, partial: Record<string, unknown>): Promise<void> {
  // Use PostgreSQL JSONB concatenation for an atomic partial update.
  await db.execute(
    sql`INSERT INTO kv_settings (key, value, updated_at)
        VALUES (${key}, ${JSON.stringify(partial)}::jsonb, NOW())
        ON CONFLICT (key) DO UPDATE
        SET value      = kv_settings.value || ${JSON.stringify(partial)}::jsonb,
            updated_at = NOW()`
  );
}

// ── Easter-egg counters ───────────────────────────────────────────────────
// Atomic JSONB increment so concurrent egg discoveries don't collide.
export async function incrementEggCounter(egg: string): Promise<void> {
  await db.execute(
    sql`INSERT INTO kv_settings (key, value, updated_at)
        VALUES ('easterEggCounters',
                jsonb_build_object(${egg}::text, 1, ${egg + 'LastAt'}::text, NOW()::text),
                NOW())
        ON CONFLICT (key) DO UPDATE
        SET value = kv_settings.value
              || jsonb_build_object(
                   ${egg}::text,
                   COALESCE((kv_settings.value->>${egg})::int, 0) + 1,
                   ${egg + 'LastAt'}::text,
                   NOW()::text
                 ),
            updated_at = NOW()`
  );
}

export async function appendEggRecent(
  entry: { egg: string; userId: string; at: string }
): Promise<void> {
  const current = (await kvGet("easterEggRecent")) as { entries?: unknown[] } | null;
  const entries = Array.isArray(current?.entries) ? current.entries : [];
  const updated = [entry, ...entries].slice(0, 50);
  await kvSet("easterEggRecent", { entries: updated });
}

// ── Campus POIs ───────────────────────────────────────────────────────────

export async function getPoisByKind(kind: string) {
  return db.select().from(campusPois).where(eq(campusPois.kind, kind));
}

export async function getAllPois() {
  return db.select().from(campusPois);
}

export async function createPoi(data: Record<string, unknown>) {
  const lat =
    typeof (data.position as any)?.lat === "number"
      ? (data.position as any).lat
      : typeof data.mapPositionY === "number"
      ? (data.mapPositionY as number)
      : null;
  const lng =
    typeof (data.position as any)?.lng === "number"
      ? (data.position as any).lng
      : typeof data.mapPositionX === "number"
      ? (data.mapPositionX as number)
      : null;

  const row = {
    kind: String(data.kind ?? "unknown"),
    floor: typeof data.floor === "number" ? data.floor : 1,
    mapPositionX: lng,
    mapPositionY: lat,
    position: lat !== null && lng !== null ? { lat, lng } : null,
    label: typeof data.label === "string" ? data.label : null,
    metadata: data.metadata ?? null,
  } as const;

  const inserted = await db.insert(campusPois).values(row as any).returning();
  return inserted[0];
}

export async function deletePoi(id: string) {
  await db.delete(campusPois).where(eq(campusPois.id, id));
}

/**
 * v4.7.3 — partial update. Only touches fields the caller sends.
 * Used by the 360° panorama-spot editor (label / URL / position swaps).
 */
export async function updatePoi(id: string, patch: Record<string, unknown>) {
  const upd: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof patch.label === "string") upd.label = patch.label;
  if (typeof patch.floor === "number") upd.floor = patch.floor;
  if (patch.metadata !== undefined) upd.metadata = patch.metadata;
  const pos = patch.position as { lat?: number; lng?: number } | undefined;
  const lat = typeof pos?.lat === "number" ? pos.lat
            : typeof patch.mapPositionY === "number" ? (patch.mapPositionY as number) : null;
  const lng = typeof pos?.lng === "number" ? pos.lng
            : typeof patch.mapPositionX === "number" ? (patch.mapPositionX as number) : null;
  if (lat !== null && lng !== null) {
    upd.mapPositionX = lng;
    upd.mapPositionY = lat;
    upd.position = { lat, lng };
  }
  const rows = await db.update(campusPois).set(upd as any).where(eq(campusPois.id, id)).returning();
  return rows[0] ?? null;
}

// ── Beacon surveys ────────────────────────────────────────────────────────

export async function getBeaconPositions(roomId: string) {
  return db
    .select()
    .from(beaconSurveys)
    .where(eq(beaconSurveys.roomId, roomId))
    .orderBy(desc(beaconSurveys.createdAt));
}

export async function addBeaconPosition(
  roomId: string,
  data: {
    positionLabel: string;
    capturedAt?: string;
    readings: unknown[];
    lat?: number;
    lng?: number;
    accuracyM?: number;
  }
) {
  const inserted = await db
    .insert(beaconSurveys)
    .values({
      roomId,
      positionLabel: String(data.positionLabel).slice(0, 60),
      capturedAt: data.capturedAt ? new Date(data.capturedAt) : new Date(),
      readings: data.readings as any,
      lat: typeof data.lat === "number" ? data.lat : null,
      lng: typeof data.lng === "number" ? data.lng : null,
      accuracyM: typeof data.accuracyM === "number" ? data.accuracyM : null,
    })
    .returning();
  return inserted[0];
}

export async function deleteBeaconPosition(id: string) {
  await db.delete(beaconSurveys).where(eq(beaconSurveys.id, id));
}

// ── Wi-Fi fingerprint positioning ─────────────────────────────────────────

export interface WifiReading {
  bssid: string;
  rssi: number;
  ssid?: string;
}

export interface PositionEstimate {
  roomId: string;
  positionLabel: string;
  lat: number | null;
  lng: number | null;
  floor: number | null;
  confidence: "high" | "medium" | "low";
  confidenceScore: number; // 0–100
  sharedApCount: number;
  distance: number;
  topMatches: Array<{
    roomId: string;
    positionLabel: string;
    lat: number | null;
    lng: number | null;
    distance: number;
    sharedApCount: number;
  }>;
}

/** Quality score for a Wi-Fi fingerprint (0–100). */
export function computeFingerprintQuality(readings: WifiReading[]): {
  score: number;
  label: 'excellent' | 'good' | 'fair' | 'poor';
} {
  if (!readings || readings.length === 0) return { score: 0, label: 'poor' };

  const apCount = readings.length;
  const sorted = [...readings].sort((a, b) => b.rssi - a.rssi);
  const top5 = sorted.slice(0, Math.min(5, sorted.length));
  const avgTopRssi = top5.reduce((s, r) => s + r.rssi, 0) / top5.length;

  // apScore: 10+ APs → 100, linear below
  const apScore = Math.min(100, (apCount / 10) * 100);
  // strengthScore: -30 dBm → 100, -90 dBm → 0
  const strengthScore = Math.max(0, Math.min(100, ((avgTopRssi + 90) / 60) * 100));

  const score = Math.round(apScore * 0.5 + strengthScore * 0.5);
  const label: 'excellent' | 'good' | 'fair' | 'poor' =
    score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'fair' : 'poor';
  return { score, label };
}

export async function getAllBeaconSurveys() {
  return db.select().from(beaconSurveys);
}

export async function getAllFingerprintsWithFloor(): Promise<Array<{
  id: string;
  roomId: string;
  positionLabel: string;
  lat: number | null;
  lng: number | null;
  floor: number | null;
  readings: WifiReading[];
}>> {
  const rows = await db.execute(sql`
    SELECT s.id, s.room_id, s.position_label, s.lat, s.lng, s.readings,
           r.floor
    FROM   beacon_surveys s
    LEFT   JOIN rooms r ON r.id = s.room_id
    ORDER  BY s.created_at
  `);
  return (rows as any[]).map((r: any) => ({
    id: String(r.id),
    roomId: String(r.room_id),
    positionLabel: String(r.position_label ?? ''),
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    floor: r.floor != null ? Number(r.floor) : null,
    readings: (r.readings ?? []) as WifiReading[],
  }));
}

export async function getBeaconCoverage(): Promise<Array<{
  roomId: string;
  positionCount: number;
  apCount: number;
}>> {
  const result = await db.execute(sql`
    SELECT room_id,
           COUNT(*)::int                                 AS position_count,
           COALESCE(SUM(jsonb_array_length(readings)), 0)::int AS ap_count
    FROM   beacon_surveys
    GROUP  BY room_id
    ORDER  BY position_count DESC
  `);
  return (result as any[]).map((r: any) => ({
    roomId: r.room_id,
    positionCount: Number(r.position_count),
    apCount: Number(r.ap_count ?? 0),
  }));
}

export async function getBeaconCoverageWithQuality(): Promise<Array<{
  roomId: string;
  roomNumber: string | null;
  floor: number | null;
  positionCount: number;
  avgQuality: number;
  qualityLabel: 'excellent' | 'good' | 'fair' | 'poor' | 'none';
}>> {
  // Anchor on rooms so uncalibrated rooms appear with positionCount=0 /
  // qualityLabel='none', giving the UI accurate floor totals.
  const rows = await db.execute(sql`
    SELECT r.id                                                       AS room_id,
           r.room_number,
           r.floor,
           COUNT(s.id)::int                                           AS position_count,
           jsonb_agg(s.readings) FILTER (WHERE s.readings IS NOT NULL) AS all_readings
    FROM   rooms r
    LEFT   JOIN beacon_surveys s ON s.room_id = r.id
    GROUP  BY r.id, r.room_number, r.floor
    ORDER  BY r.floor NULLS LAST, r.room_number
  `);

  return (rows as any[]).map((row: any) => {
    const posCount = Number(row.position_count);
    const allReadings = (row.all_readings ?? []) as (WifiReading[] | null)[];
    let total = 0;
    let count = 0;
    for (const readings of allReadings) {
      if (!readings) continue;
      total += computeFingerprintQuality(readings).score;
      count++;
    }
    const avgQuality = count > 0 ? Math.round(total / count) : 0;
    const qualityLabel: 'excellent' | 'good' | 'fair' | 'poor' | 'none' =
      posCount === 0 ? 'none'
      : avgQuality >= 80 ? 'excellent'
      : avgQuality >= 60 ? 'good'
      : avgQuality >= 40 ? 'fair'
      : 'poor';
    return {
      roomId:       String(row.room_id),
      roomNumber:   row.room_number ?? null,
      floor:        row.floor != null ? Number(row.floor) : null,
      positionCount: posCount,
      avgQuality,
      qualityLabel,
    };
  });
}

function computeRssiDistance(
  current: WifiReading[],
  fingerprint: WifiReading[]
): { distance: number; sharedCount: number } {
  const MISSING_RSSI = -92; // assumed RSSI when AP not visible

  const curMap = new Map<string, number>();
  for (const r of current) curMap.set(r.bssid.toLowerCase(), r.rssi);

  const fpMap = new Map<string, number>();
  for (const r of fingerprint) fpMap.set(r.bssid.toLowerCase(), r.rssi);

  let sumSq = 0;
  let count = 0;
  let sharedCount = 0;

  for (const [bssid, fpRssi] of fpMap) {
    const curRssi = curMap.get(bssid) ?? MISSING_RSSI;
    const diff = fpRssi - curRssi;
    sumSq += diff * diff;
    count++;
    if (curMap.has(bssid)) sharedCount++;
  }

  for (const [bssid, curRssi] of curMap) {
    if (!fpMap.has(bssid)) {
      // AP visible now but not in fingerprint — mild penalty
      const diff = curRssi - MISSING_RSSI;
      sumSq += diff * diff * 0.3;
      count++;
    }
  }

  const distance = count > 0 ? Math.sqrt(sumSq / count) : 9999;
  return { distance, sharedCount };
}

export async function wifiLocate(
  currentReadings: WifiReading[]
): Promise<PositionEstimate | null> {
  if (currentReadings.length === 0) return null;

  const surveys = await getAllBeaconSurveys();
  if (surveys.length === 0) return null;

  const scored = surveys.map((s) => {
    const fpReadings = (s.readings as WifiReading[] | null) ?? [];
    const { distance, sharedCount } = computeRssiDistance(
      currentReadings,
      fpReadings
    );
    return { s, distance, sharedCount };
  });

  scored.sort((a, b) => a.distance - b.distance);

  const TOP_K = 3;
  const topK = scored.slice(0, TOP_K);
  const best = topK[0];

  if (!best || best.distance > 250) return null; // no meaningful match

  const { distance, sharedCount } = best;
  let confidence: "high" | "medium" | "low";
  let confidenceScore: number;

  if (sharedCount >= 5 && distance < 18) {
    confidence = "high";
    confidenceScore = Math.round(Math.max(80, Math.min(99, 99 - distance)));
  } else if (sharedCount >= 3 && distance < 40) {
    confidence = "medium";
    confidenceScore = Math.round(Math.max(45, Math.min(79, 79 - distance * 0.85)));
  } else {
    confidence = "low";
    confidenceScore = Math.round(Math.max(10, Math.min(44, 44 - distance * 0.3)));
  }

  // Resolve floor from the rooms table for the best-matched room.
  let floor: number | null = null;
  try {
    const roomRows = await db
      .select({ floor: rooms.floor, roomNumber: rooms.roomNumber, name: rooms.name })
      .from(rooms)
      .where(eq(rooms.id, best.s.roomId))
      .limit(1);
    floor = roomRows[0]?.floor ?? null;
  } catch { /* non-critical — floor stays null */ }

  return {
    roomId: best.s.roomId,
    positionLabel: best.s.positionLabel,
    lat: best.s.lat ?? null,
    lng: best.s.lng ?? null,
    floor,
    confidence,
    confidenceScore,
    sharedApCount: sharedCount,
    distance: Math.round(distance * 10) / 10,
    topMatches: topK.map((m) => ({
      roomId: m.s.roomId,
      positionLabel: m.s.positionLabel,
      lat: m.s.lat ?? null,
      lng: m.s.lng ?? null,
      distance: Math.round(m.distance * 10) / 10,
      sharedApCount: m.sharedCount,
    })),
  };
}
