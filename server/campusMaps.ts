/**
 * Multiple campus maps.
 *
 * Design rule: the existing data IS the "default" map and nothing about it
 * changes. A second map is just a set of entity ids assigned to it in
 * `campus_map_items`; any entity without a row belongs to the default map.
 * That keeps core tables untouched (no migration to race), makes the whole
 * feature a no-op until a map is created, and lets every list endpoint stay
 * fail-open: if anything here throws, the endpoint returns the unscoped list
 * exactly as before.
 *
 *  - Visitors and the apps always see the PUBLISHED map.
 *  - An admin sending `X-Ksyk-Map: <id>` (the builder does) sees and edits that
 *    map instead, so a new map can be built without touching what students see.
 *  - Publishing is switching the published pointer; the previous map stays
 *    intact and can be published again.
 */
import { db } from "./db.js";
import { sql } from "drizzle-orm";
import { kvGet, kvSet } from "./kvStorage.js";

export const DEFAULT_MAP_ID = "default";
export const MAP_ID_RE = /^[a-z0-9][a-z0-9-]{0,40}$/;
const KEY = "campus_maps";

export interface MapMeta {
  id: string;
  name: string;
  createdAt: string;
  publishedAt?: string | null;
}
export interface MapsState {
  published: string;
  maps: MapMeta[];
}
/** What a request sees. */
export interface MapScope {
  mapId: string;
  published: string;
  /** entity id -> map id, for entities NOT in the default map. */
  assignments: Map<string, string>;
  /** true when an admin is viewing a map other than the published one. */
  draft: boolean;
}

export const DEFAULT_STATE: MapsState = {
  published: DEFAULT_MAP_ID,
  maps: [{ id: DEFAULT_MAP_ID, name: "Main campus", createdAt: "2026-01-01T00:00:00.000Z", publishedAt: null }],
};

// ── pure helpers (unit-tested) ──────────────────────────────────────────────

const cleanName = (v: unknown): string => String(v ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 60);

/** Sanitise whatever is stored: always contains the default map, `published` always exists. */
export function normalizeState(raw: unknown): MapsState {
  const r = (raw && typeof raw === "object" ? raw : {}) as { published?: unknown; maps?: unknown };
  const seen = new Set<string>();
  const maps: MapMeta[] = [];
  for (const m of Array.isArray(r.maps) ? r.maps : []) {
    const id = typeof m?.id === "string" ? m.id : "";
    const name = cleanName(m?.name);
    if (!MAP_ID_RE.test(id) || !name || seen.has(id)) continue;
    seen.add(id);
    maps.push({
      id,
      name,
      createdAt: typeof m.createdAt === "string" ? m.createdAt : DEFAULT_STATE.maps[0].createdAt,
      publishedAt: typeof m.publishedAt === "string" ? m.publishedAt : null,
    });
  }
  if (!seen.has(DEFAULT_MAP_ID)) maps.unshift({ ...DEFAULT_STATE.maps[0] });
  const published = typeof r.published === "string" && maps.some((m) => m.id === r.published) ? r.published : DEFAULT_MAP_ID;
  return { published, maps };
}

/** A readable, unique, URL-safe id for a new map. */
export function newMapId(name: string, existing: string[], rand: () => number = Math.random): string {
  const base = cleanName(name).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "map";
  for (let i = 0; i < 20; i++) {
    const id = `${base}-${Math.floor(rand() * 36 ** 4).toString(36).padStart(4, "0")}`;
    if (!existing.includes(id) && id !== DEFAULT_MAP_ID) return id;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Which map a request sees. The header is honoured only for admins and only for a
 * map that exists; everyone else gets the published map.
 */
export function pickMapId(header: unknown, isAdmin: boolean, state: MapsState): string {
  const wanted = typeof header === "string" ? header.trim() : "";
  if (isAdmin && wanted && state.maps.some((m) => m.id === wanted)) return wanted;
  return state.published;
}

/**
 * Keep the rows that belong to `scope.mapId`. A row's map is its own assignment,
 * else its parent's (floors follow their building), else the default map.
 */
export function scopeRows<T>(
  rows: T[],
  scope: Pick<MapScope, "mapId" | "assignments">,
  idOf: (row: T) => string | undefined = (r: any) => r?.id,
  parentIdOf?: (row: T) => string | undefined,
): T[] {
  return rows.filter((row) => {
    const own = idOf(row);
    const parent = parentIdOf?.(row);
    const map = (own && scope.assignments.get(own)) || (parent && scope.assignments.get(parent)) || DEFAULT_MAP_ID;
    return map === scope.mapId;
  });
}

// ── storage ─────────────────────────────────────────────────────────────────

export async function getState(): Promise<MapsState> {
  try {
    return normalizeState(await kvGet(KEY));
  } catch {
    return DEFAULT_STATE;
  }
}

async function saveState(state: MapsState): Promise<MapsState> {
  const clean = normalizeState(state);
  await kvSet(KEY, clean);
  return clean;
}

export async function createMap(name: string): Promise<MapMeta> {
  const clean = cleanName(name);
  if (!clean) throw new Error("A map needs a name");
  const state = await getState();
  if (state.maps.length >= 20) throw new Error("At most 20 maps");
  if (state.maps.some((m) => m.name.toLowerCase() === clean.toLowerCase())) throw new Error("A map with that name already exists");
  const meta: MapMeta = { id: newMapId(clean, state.maps.map((m) => m.id)), name: clean, createdAt: new Date().toISOString(), publishedAt: null };
  await saveState({ ...state, maps: [...state.maps, meta] });
  return meta;
}

export async function renameMap(id: string, name: string): Promise<MapMeta> {
  const clean = cleanName(name);
  if (!clean) throw new Error("A map needs a name");
  const state = await getState();
  const target = state.maps.find((m) => m.id === id);
  if (!target) throw new Error("Map not found");
  if (state.maps.some((m) => m.id !== id && m.name.toLowerCase() === clean.toLowerCase())) throw new Error("A map with that name already exists");
  const updated = { ...target, name: clean };
  await saveState({ ...state, maps: state.maps.map((m) => (m.id === id ? updated : m)) });
  return updated;
}

/** Makes `id` the map visitors and apps see. The previous map is kept as is. */
export async function publishMap(id: string): Promise<MapsState> {
  const state = await getState();
  if (!state.maps.some((m) => m.id === id)) throw new Error("Map not found");
  const now = new Date().toISOString();
  return saveState({ published: id, maps: state.maps.map((m) => (m.id === id ? { ...m, publishedAt: now } : m)) });
}

let tableReady: Promise<void> | null = null;
function ensureItemsTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await db.execute(sql`CREATE TABLE IF NOT EXISTS campus_map_items (
        entity_id text PRIMARY KEY, map_id text NOT NULL, kind text, created_at timestamptz DEFAULT now())`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_campus_map_items_map ON campus_map_items (map_id)`);
    })().catch((e) => { tableReady = null; throw e; });
  }
  return tableReady;
}

export async function getAssignments(): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  try {
    await ensureItemsTable();
    const res: any = await db.execute(sql`SELECT entity_id, map_id FROM campus_map_items`);
    for (const row of Array.isArray(res) ? res : res?.rows ?? []) out.set(String(row.entity_id), String(row.map_id));
  } catch {
    /* fail open: no assignments = everything is the default map */
  }
  return out;
}

/** Record that a newly created entity belongs to `mapId` (the default map needs no row). */
export async function assignEntity(entityId: string | undefined, mapId: string, kind: string): Promise<void> {
  if (!entityId || mapId === DEFAULT_MAP_ID) return;
  await ensureItemsTable();
  await db.execute(sql`INSERT INTO campus_map_items (entity_id, map_id, kind) VALUES (${entityId}, ${mapId}, ${kind})
    ON CONFLICT (entity_id) DO UPDATE SET map_id = EXCLUDED.map_id`);
}

/**
 * Call before creating an entity in a non-default map: throws if the assignment
 * table isn't usable, so a draft entity is never created that could then leak into
 * the published map.
 */
export async function ensureReady(): Promise<void> {
  await ensureItemsTable();
}

/** Everything a list endpoint needs; never throws. */
export async function scopeForRequest(header: unknown, isAdmin: boolean): Promise<MapScope> {
  const state = await getState();
  const mapId = pickMapId(header, isAdmin, state);
  const assignments = await getAssignments();
  return { mapId, published: state.published, assignments, draft: mapId !== state.published };
}

/** The map a NEW entity from this request belongs to (admin requests only reach this). */
export async function mapForWrite(header: unknown): Promise<string> {
  try {
    return pickMapId(header, true, await getState());
  } catch {
    return DEFAULT_MAP_ID;
  }
}

/** Cache policy: the published map may be CDN-cached briefly; an admin's draft view never. */
export const scopedCacheControl = (scope: Pick<MapScope, "draft">) =>
  scope.draft ? "no-store" : "public, s-maxage=60, stale-while-revalidate=300";
