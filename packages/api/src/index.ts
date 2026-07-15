/**
 * @ksyk/api — typed HTTP client for the KSYK Maps + Builder backend.
 *
 * One method per resource. Same base transport (fetch + credentials +
 * bearer token) for everything. Response bodies are `.json()`'d and
 * typed against `@ksyk/shared`; runtime validation with `@ksyk/shared`
 * zod schemas is opt-in via `parse: true` on individual calls (default
 * on for creates/updates where the server round-trip should be trusted
 * less than the domain schema).
 */
import type {
  Building, Room, Hallway, Door, Stair, Elevator, Floor, Window,
  OutdoorArea, MapLayer, MapDefaults, MapPackage, MapVersion,
  NavGraphNode, NavGraphEdge, LatLng,
} from "@ksyk/shared";

// ── Config ─────────────────────────────────────────────────────────

let BASE_URL = "";
export function setApiBaseUrl(url: string) {
  BASE_URL = url.replace(/\/$/, "");
}

let BEARER: string | null = null;
export function setBearerToken(token: string | null) { BEARER = token; }

let REFRESH_HOOK: (() => Promise<string | null>) | null = null;
/** Called with the current bearer when a request returns 401. If it
 *  returns a new bearer, the request is retried once. Returning null
 *  logs the user out. */
export function setRefreshHook(fn: (() => Promise<string | null>) | null) {
  REFRESH_HOOK = fn;
}

interface FetchOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Raised when the server returns a non-2xx. Preserves the parsed
 *  JSON body under `.body` for callers that want to inspect it. */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: FetchOptions,
  _retry = false,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts?.headers ?? {}),
  };
  if (BEARER) headers["Authorization"] = `Bearer ${BEARER}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    signal: opts?.signal,
  });

  if (res.status === 401 && !_retry && REFRESH_HOOK) {
    const next = await REFRESH_HOOK();
    if (next) {
      BEARER = next;
      return req<T>(method, path, body, opts, true);
    }
  }

  if (!res.ok) {
    let parsed: unknown = null;
    let msg = `${res.status} ${res.statusText}`;
    try {
      parsed = await res.json();
      const p = parsed as { message?: string };
      if (p?.message) msg = p.message;
    } catch { /* body not JSON */ }
    throw new ApiError(res.status, msg, parsed);
  }

  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ── Public resources ───────────────────────────────────────────────

export const api = {
  buildings: {
    list: (o?: FetchOptions) => req<Building[]>("GET", "/api/buildings", undefined, o),
    get: (id: string, o?: FetchOptions) => req<Building>("GET", `/api/buildings/${id}`, undefined, o),
    create: (b: Omit<Building, "id">, o?: FetchOptions) => req<Building>("POST", "/api/buildings", b, o),
    update: (id: string, p: Partial<Building>, o?: FetchOptions) => req<Building>("PATCH", `/api/buildings/${id}`, p, o),
    delete: (id: string, o?: FetchOptions) => req<void>("DELETE", `/api/buildings/${id}`, undefined, o),
  },
  floors: {
    list: (o?: FetchOptions) => req<Floor[]>("GET", "/api/floors", undefined, o),
    listForBuilding: (buildingId: string, o?: FetchOptions) =>
      req<Floor[]>("GET", `/api/buildings/${buildingId}/floors`, undefined, o),
    create: (f: Omit<Floor, "id">, o?: FetchOptions) => req<Floor>("POST", "/api/floors", f, o),
    update: (id: string, p: Partial<Floor>, o?: FetchOptions) => req<Floor>("PATCH", `/api/floors/${id}`, p, o),
    delete: (id: string, o?: FetchOptions) => req<void>("DELETE", `/api/floors/${id}`, undefined, o),
  },
  rooms: {
    list: (o?: FetchOptions) => req<Room[]>("GET", "/api/rooms", undefined, o),
    get: (id: string, o?: FetchOptions) => req<Room>("GET", `/api/rooms/${id}`, undefined, o),
    listForBuilding: (buildingId: string, o?: FetchOptions) =>
      req<Room[]>("GET", `/api/buildings/${buildingId}/rooms`, undefined, o),
    create: (r: Omit<Room, "id">, o?: FetchOptions) => req<Room>("POST", "/api/rooms", r, o),
    update: (id: string, p: Partial<Room>, o?: FetchOptions) => req<Room>("PATCH", `/api/rooms/${id}`, p, o),
    delete: (id: string, o?: FetchOptions) => req<void>("DELETE", `/api/rooms/${id}`, undefined, o),
  },
  hallways: {
    list: (o?: FetchOptions) => req<Hallway[]>("GET", "/api/hallways", undefined, o),
    create: (h: Omit<Hallway, "id">, o?: FetchOptions) => req<Hallway>("POST", "/api/hallways", h, o),
    update: (id: string, p: Partial<Hallway>, o?: FetchOptions) => req<Hallway>("PATCH", `/api/hallways/${id}`, p, o),
    delete: (id: string, o?: FetchOptions) => req<void>("DELETE", `/api/hallways/${id}`, undefined, o),
  },
  doors: {
    list: (o?: FetchOptions) => req<Door[]>("GET", "/api/doors", undefined, o),
    create: (d: Omit<Door, "id">, o?: FetchOptions) => req<Door>("POST", "/api/doors", d, o),
    update: (id: string, p: Partial<Door>, o?: FetchOptions) => req<Door>("PATCH", `/api/doors/${id}`, p, o),
    delete: (id: string, o?: FetchOptions) => req<void>("DELETE", `/api/doors/${id}`, undefined, o),
  },
  windows: {
    list: (o?: FetchOptions) => req<Window[]>("GET", "/api/windows", undefined, o),
    create: (w: Omit<Window, "id">, o?: FetchOptions) => req<Window>("POST", "/api/windows", w, o),
    delete: (id: string, o?: FetchOptions) => req<void>("DELETE", `/api/windows/${id}`, undefined, o),
  },
  stairs: {
    list: (o?: FetchOptions) => req<Stair[]>("GET", "/api/stairs", undefined, o),
    create: (s: Omit<Stair, "id">, o?: FetchOptions) => req<Stair>("POST", "/api/stairs", s, o),
    update: (id: string, p: Partial<Stair>, o?: FetchOptions) => req<Stair>("PATCH", `/api/stairs/${id}`, p, o),
    delete: (id: string, o?: FetchOptions) => req<void>("DELETE", `/api/stairs/${id}`, undefined, o),
  },
  elevators: {
    list: (o?: FetchOptions) => req<Elevator[]>("GET", "/api/elevators", undefined, o),
    create: (e: Omit<Elevator, "id">, o?: FetchOptions) => req<Elevator>("POST", "/api/elevators", e, o),
    update: (id: string, p: Partial<Elevator>, o?: FetchOptions) => req<Elevator>("PATCH", `/api/elevators/${id}`, p, o),
    delete: (id: string, o?: FetchOptions) => req<void>("DELETE", `/api/elevators/${id}`, undefined, o),
  },
  outdoor: {
    list: (o?: FetchOptions) => req<OutdoorArea[]>("GET", "/api/outdoor", undefined, o),
    create: (a: Omit<OutdoorArea, "id">, o?: FetchOptions) => req<OutdoorArea>("POST", "/api/outdoor", a, o),
    delete: (id: string, o?: FetchOptions) => req<void>("DELETE", `/api/outdoor/${id}`, undefined, o),
  },
  layers: {
    list: (o?: FetchOptions) => req<MapLayer[]>("GET", "/api/layers", undefined, o),
    upsert: (l: MapLayer, o?: FetchOptions) => req<MapLayer>("PUT", `/api/layers/${l.id}`, l, o),
    delete: (id: string, o?: FetchOptions) => req<void>("DELETE", `/api/layers/${id}`, undefined, o),
  },
  mapDefaults: {
    get: (o?: FetchOptions) => req<MapDefaults>("GET", "/api/map-defaults", undefined, o),
    publish: (d: MapDefaults, o?: FetchOptions) => req<MapDefaults>("PUT", "/api/map-defaults", d, o),
  },
  mapPackage: {
    /** Full published snapshot the Maps app consumes. */
    getPublished: (o?: FetchOptions) => req<MapPackage>("GET", "/api/map-package", undefined, o),
    /** Save an autosave draft (Builder). */
    saveDraft: (pkg: MapPackage, o?: FetchOptions) =>
      req<MapVersion>("POST", "/api/map-package/draft", pkg, o),
    /** Promote a draft to published. */
    publish: (versionId: string, message?: string, o?: FetchOptions) =>
      req<MapPackage>("POST", `/api/map-package/publish`, { versionId, message }, o),
    /** Version history. */
    versions: (o?: FetchOptions) => req<MapVersion[]>("GET", "/api/map-package/versions", undefined, o),
    /** Restore a specific version to the draft slot. */
    restore: (versionId: string, o?: FetchOptions) =>
      req<MapVersion>("POST", `/api/map-package/versions/${versionId}/restore`, undefined, o),
  },
  route: {
    /** Compute a route between two entity ids (room or explicit graph
     *  node) with the given profile. Server rebuilds the nav graph on
     *  demand and A*'s. */
    find: (payload: RouteRequest, o?: FetchOptions) =>
      req<RouteResponse>("POST", "/api/route", payload, o),
    /** Get the raw nav graph — mostly for the Builder's graph editor. */
    graph: (o?: FetchOptions) =>
      req<{ nodes: NavGraphNode[]; edges: NavGraphEdge[] }>("GET", "/api/route/graph", undefined, o),
  },
};

export interface RouteRequest {
  from: { kind: "room"; id: string } | { kind: "node"; id: string } | { kind: "point"; latLng: LatLng; floor: number; buildingId?: string };
  to:   { kind: "room"; id: string } | { kind: "node"; id: string } | { kind: "point"; latLng: LatLng; floor: number; buildingId?: string };
  profile?: "walking" | "wheelchair" | "fast";
}

export interface RouteResponse {
  ok: boolean;
  route: {
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    path: NavGraphNode[];
    segments: Array<{ floor: number; buildingId: string | null; coords: LatLng[] }>;
  } | null;
  message?: string;
}
