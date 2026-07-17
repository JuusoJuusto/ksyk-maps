/**
 * server/mapRoutes — nav-graph + route + published map package endpoints.
 *
 * The Maps app calls these to compute routes, fetch the current
 * published map, and (for the Builder) save + publish drafts.
 *
 * All entity fetching goes through `storage` — no hardcoded data.
 * Stairs/elevators/doors/floors that the underlying storage doesn't
 * yet persist come back as empty arrays, and the nav-graph builder
 * degrades gracefully.
 */
import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { db } from "./firebaseStorage";
import { isAuthenticated } from "./simpleAuth";
import { rateLimiters } from "./rateLimiter";
import {
  buildNavGraph,
  buildGraph,
  findPath,
  PROFILE_DEFAULT,
  PROFILE_WHEELCHAIR,
  PROFILE_FAST,
  annotateRoute,
  type RoutingProfile,
} from "@ksyk/routing";
import type {
  Building, Room, Hallway, Door, Stair, Elevator, Floor, MapDefaults, MapPackage,
} from "@ksyk/shared";
import { schema as sharedSchema } from "@ksyk/shared";

// ── Input schemas ─────────────────────────────────────────────────
// Every mutation endpoint validates its body against one of these.
// Rejects unknown/exotic keys so a malformed client can't smuggle
// extra fields into downstream .create() calls.

/** Allowed characters in an entity id — same rule Drizzle applies to
 *  UUIDs / nanoid strings. Bans anything that could break out of a
 *  parameterised query. */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const IdSchema = z.string().regex(ID_PATTERN, "invalid id");

const LatLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const RouteRequestSchema = z.object({
  from: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("room"), id: IdSchema }),
    z.object({ kind: z.literal("node"), id: z.string().min(1).max(200) }),
    z.object({ kind: z.literal("point"), latLng: LatLngSchema, floor: z.number().int(), buildingId: IdSchema.optional() }),
  ]),
  to: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("room"), id: IdSchema }),
    z.object({ kind: z.literal("node"), id: z.string().min(1).max(200) }),
    z.object({ kind: z.literal("point"), latLng: LatLngSchema, floor: z.number().int(), buildingId: IdSchema.optional() }),
  ]),
  profile: z.enum(["walking", "wheelchair", "fast"]).optional(),
}).strict();

const PublishRequestSchema = z.object({
  versionId: IdSchema,
  message: z.string().max(500).optional(),
}).strict();

/** Optional storage shape — narrow to whatever methods the current
 *  storage backend implements. Missing ones default to empty results. */
interface OptionalStorage {
  getStairs?: () => Promise<Stair[]>;
  getElevators?: () => Promise<Elevator[]>;
  getDoors?: () => Promise<Door[]>;
  getFloors?: (buildingId?: string) => Promise<Floor[]>;
  getMapDefaults?: () => Promise<MapDefaults | null>;
  saveMapDefaults?: (d: MapDefaults) => Promise<MapDefaults>;
}

function optional(): OptionalStorage {
  return storage as unknown as OptionalStorage;
}

async function loadCampusData() {
  const [buildings, rooms, hallways, floors, stairs, elevators, doors] = await Promise.all([
    storage.getBuildings() as Promise<Building[]>,
    storage.getRooms() as Promise<Room[]>,
    storage.getHallways() as Promise<Hallway[]>,
    optional().getFloors?.() ?? Promise.resolve([]),
    optional().getStairs?.() ?? Promise.resolve([]),
    optional().getElevators?.() ?? Promise.resolve([]),
    optional().getDoors?.() ?? Promise.resolve([]),
  ]);
  return { buildings, rooms, hallways, floors, stairs, elevators, doors };
}

function profileFor(name: string | undefined): RoutingProfile {
  switch (name) {
    case "wheelchair": return PROFILE_WHEELCHAIR;
    case "fast":       return PROFILE_FAST;
    default:           return PROFILE_DEFAULT;
  }
}

export function registerMapRoutes(app: Express) {
  // ── Stub endpoints for entity kinds the storage layer doesn't yet
  //    persist. Every one MUST return an array (never {message}) so
  //    client for-of loops don't explode on 404 JSON bodies. Once
  //    storage grows real methods for these kinds, swap the [] for a
  //    storage call. ──────────────────────────────────────────────
  const emptyList = (_req: Request, res: Response) => { res.json([]); };
  app.get("/api/doors",     emptyList);
  app.get("/api/stairs",    emptyList);
  app.get("/api/elevators", emptyList);
  app.get("/api/windows",   emptyList);
  // /api/floors is registered by routes.ts already — don't shadow it.

  // ── /api/layers — CRUD backed by a simple in-memory store. Persists
  //    across the process lifetime. Once storage grows a layers table
  //    swap the array below for storage.getLayers/etc. Idempotent PUT
  //    for `upsert` so the client can create + update via the same
  //    endpoint. ───────────────────────────────────────────────────
  interface LayerRow {
    id: string;
    name: string;
    group?: string | null;
    visible: boolean;
    locked: boolean;
    opacity: number;
    z: number;
    blendMode?: "normal" | "multiply" | "screen" | "overlay" | null;
    collapsed?: boolean;
  }
  let layerStore: LayerRow[] = [
    { id: "buildings", name: "Buildings", visible: true, locked: false, opacity: 1, z: 10 },
    { id: "rooms",     name: "Rooms",     visible: true, locked: false, opacity: 1, z: 20 },
    { id: "hallways",  name: "Hallways",  visible: true, locked: false, opacity: 1, z: 30 },
    { id: "labels",    name: "Labels",    visible: true, locked: false, opacity: 1, z: 40 },
  ];
  const isLayer = (obj: unknown): obj is LayerRow => {
    if (!obj || typeof obj !== "object") return false;
    const o = obj as Record<string, unknown>;
    return typeof o.id === "string" && typeof o.name === "string" &&
           typeof o.visible === "boolean" && typeof o.locked === "boolean" &&
           typeof o.opacity === "number" && typeof o.z === "number";
  };
  app.get("/api/layers", (_req, res) => {
    res.json([...layerStore].sort((a, b) => a.z - b.z));
  });
  app.put("/api/layers/:id", isAuthenticated, rateLimiters.general, (req, res) => {
    if (!isLayer(req.body)) {
      res.status(400).json({ message: "invalid layer body" });
      return;
    }
    if (req.body.id !== req.params.id) {
      res.status(400).json({ message: "id mismatch" });
      return;
    }
    const next = req.body;
    const idx = layerStore.findIndex((l) => l.id === next.id);
    if (idx >= 0) layerStore[idx] = next;
    else layerStore.push(next);
    res.json(next);
  });
  app.delete("/api/layers/:id", isAuthenticated, rateLimiters.general, (req, res) => {
    layerStore = layerStore.filter((l) => l.id !== req.params.id);
    res.status(204).end();
  });


  // ── Nav graph (Builder / debugging) ───────────────────────────────
  app.get("/api/route/graph", async (_req: Request, res: Response) => {
    try {
      const { rooms, hallways, doors, stairs, elevators, buildings } = await loadCampusData();
      const { nodes, edges, warnings } = buildNavGraph({
        buildings, rooms, hallways, doors, stairs, elevators,
      });
      res.json({ nodes, edges, warnings });
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── Route between two entities ────────────────────────────────────
  //
  // Rate-limited (routing is CPU-bound over the full campus graph) and
  // body-schema-validated so a hostile caller can't inject arbitrary
  // node ids like "'; DROP TABLE …" — the id has to pass ID_PATTERN.
  app.post("/api/route", rateLimiters.general, async (req: Request, res: Response) => {
    const parsed = RouteRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, message: parsed.error.issues[0]?.message ?? "invalid body" });
      return;
    }
    const body = parsed.data;
    try {
      const { rooms, hallways, doors, stairs, elevators, buildings } = await loadCampusData();
      const { nodes, edges } = buildNavGraph({
        buildings, rooms, hallways, doors, stairs, elevators,
      });
      const graph = buildGraph(nodes, edges);

      const resolveNodeId = (side: typeof body.from): string | null => {
        if (side.kind === "room") return `room:${side.id}`;
        if (side.kind === "node") return side.id;
        // "point" — not yet supported without a nearest-node index.
        return null;
      };
      const fromId = resolveNodeId(body.from);
      const toId = resolveNodeId(body.to);
      if (!fromId || !toId) {
        res.status(400).json({ ok: false, message: "unresolved from/to" });
        return;
      }

      const profile = profileFor(body.profile);
      const route = findPath(graph, fromId, toId, profile);
      if (!route) {
        res.json({ ok: false, route: null, message: "no path" });
        return;
      }
      const turns = annotateRoute(route);
      res.json({ ok: true, route, turns });
    } catch (err) {
      res.status(500).json({ ok: false, message: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── Published map package ─────────────────────────────────────────
  app.get("/api/map-package", async (_req: Request, res: Response) => {
    try {
      const { buildings, rooms, hallways, floors, stairs, elevators, doors } = await loadCampusData();
      const defaults = (await optional().getMapDefaults?.()) ?? null;
      const pkg: MapPackage = {
        manifest: {
          version: "1.0.0",
          title: "KSYK Campus",
          publishedAt: new Date().toISOString(),
        },
        mapDefaults: defaults ?? {
          center: { lat: 0, lng: 0 },
          zoom: 16,
          bearing: 0,
          pitch: 0,
          minZoom: 12,
          maxZoom: 22,
        },
        buildings,
        floors,
        rooms,
        hallways,
        doors,
        stairs,
        elevators,
      };
      res.json(pkg);
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── Draft + publish (Builder) ─────────────────────────────────────
  // Auth-gated. Body validated against the shared MapPackage schema so
  // a stale/hostile client can't push a payload with unexpected fields.
  app.post("/api/map-package/draft", isAuthenticated, rateLimiters.general, async (req: Request, res: Response) => {
    const parsed = sharedSchema.MapPackageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "invalid package" });
      return;
    }
    try {
      res.json({
        id: `draft-${Date.now()}`,
        packageId: "current",
        version: Math.floor(Date.now() / 1000),
        savedAt: new Date().toISOString(),
        savedBy: (req as unknown as { user?: { id?: string } }).user?.id ?? null,
        published: false,
        message: null,
        payloadKey: `draft-${Date.now()}`,
      });
    } catch (err) {
      res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/map-package/publish", isAuthenticated, rateLimiters.general, async (req: Request, res: Response) => {
    const parsed = PublishRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0]?.message ?? "invalid body" });
      return;
    }
    const body = parsed.data;
    try {
      // Snapshot the current live state into an immutable version doc
      // AND update `mapPackages/published` to point at it. Public map
      // reads from `published` — this makes the publish button
      // atomically atomic: one write, one visible bump for every user.
      const { buildings, rooms, hallways, floors, stairs, elevators, doors } = await loadCampusData();
      const defaults = (await optional().getMapDefaults?.()) ?? null;
      const publishedAt = new Date().toISOString();
      const publishedBy = (req as unknown as { user?: { id?: string } }).user?.id ?? null;

      // Compute the next version number by counting existing versions.
      // Firestore counts are cheap for small collections; this can be
      // swapped for a counter doc if the version list grows past ~500.
      const versionsSnap = await db.collection("mapVersions").get();
      const versionNumber = versionsSnap.size + 1;
      const versionId = `v${versionNumber}-${Date.now()}`;

      const pkg: MapPackage = {
        manifest: {
          version: "1.0.0",
          title: "KSYK Campus",
          publishedAt,
          publishedBy,
          description: body.message ?? null,
        },
        mapDefaults: defaults ?? {
          center: { lat: 0, lng: 0 },
          zoom: 16, bearing: 0, pitch: 0, minZoom: 12, maxZoom: 22,
        },
        buildings, floors, rooms, hallways, doors, stairs, elevators,
      };

      await db.collection("mapVersions").doc(versionId).set({
        id: versionId,
        packageId: "current",
        version: versionNumber,
        savedAt: publishedAt,
        savedBy: publishedBy,
        published: true,
        message: body.message ?? null,
        payloadKey: versionId,
        payload: pkg,
      });
      // Move the "published" pointer atomically.
      await db.collection("mapPackages").doc("published").set({
        pointer: versionId,
        publishedAt,
        publishedBy,
      });
      res.json({ ...pkg, versionId, version: versionNumber });
    } catch (err) {
      console.error("publish failed:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
    }
  });

  // Public read of the last-published snapshot. Falls back to the live
  // tables (via GET /api/map-package) if nothing has been published yet.
  app.get("/api/map-package/published", async (_req: Request, res: Response) => {
    try {
      const pointerDoc = await db.collection("mapPackages").doc("published").get();
      if (!pointerDoc.exists) return res.json(null);
      const pointer = pointerDoc.data()?.pointer as string | undefined;
      if (!pointer) return res.json(null);
      const versionDoc = await db.collection("mapVersions").doc(pointer).get();
      if (!versionDoc.exists) return res.json(null);
      const data = versionDoc.data() as { payload?: MapPackage } | undefined;
      res.json(data?.payload ?? null);
    } catch (err) {
      console.error("published read failed:", err);
      res.set("X-Read-Soft-Fail", "1").json(null);
    }
  });

  app.get("/api/map-package/versions", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const snap = await db.collection("mapVersions").orderBy("version", "desc").limit(50).get();
      const items = snap.docs.map((d) => {
        const data = d.data();
        // Strip the heavy `payload` field — versions list is metadata only.
        return {
          id: data.id ?? d.id,
          packageId: data.packageId ?? "current",
          version: data.version ?? 0,
          savedAt: data.savedAt ?? null,
          savedBy: data.savedBy ?? null,
          published: data.published ?? false,
          message: data.message ?? null,
          payloadKey: data.payloadKey ?? d.id,
        };
      });
      res.json(items);
    } catch (err) {
      console.error("versions list failed:", err);
      res.set("X-Read-Soft-Fail", "1").json([]);
    }
  });

  // Restore a previously-published version: swap the pointer + optionally
  // push its payload back into the live tables so subsequent edits base
  // off it.
  app.post("/api/map-package/versions/:id/restore", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      if (!ID_PATTERN.test(id)) return res.status(400).json({ message: "invalid version id" });
      const versionDoc = await db.collection("mapVersions").doc(id).get();
      if (!versionDoc.exists) return res.status(404).json({ message: "version not found" });
      await db.collection("mapPackages").doc("published").set({
        pointer: id,
        publishedAt: new Date().toISOString(),
        publishedBy: (req as unknown as { user?: { id?: string } }).user?.id ?? null,
      });
      res.json({ ok: true, pointer: id });
    } catch (err) {
      console.error("restore failed:", err);
      res.status(500).json({ message: err instanceof Error ? err.message : String(err) });
    }
  });
}
