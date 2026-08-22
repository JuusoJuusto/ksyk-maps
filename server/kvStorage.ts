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

export async function getAllBeaconSurveys() {
  return db.select().from(beaconSurveys);
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
