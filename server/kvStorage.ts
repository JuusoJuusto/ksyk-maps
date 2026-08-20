/**
 * Key-value and campus-POI helpers that replace Firestore in routes.
 *
 * kvGet / kvSet / kvMerge  →  kv_settings table (single-row JSON docs)
 * createPoi / getPoisByKind / getAllPois / deletePoi  →  campus_pois table
 * Beacon survey helpers  →  beacon_surveys table
 * incrementEggCounter / appendEggRecent  →  kv_settings, atomic JSONB SQL
 */
import { db } from "./db.js";
import { campusPois, kvSettings, beaconSurveys } from "../shared/schema.js";
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
