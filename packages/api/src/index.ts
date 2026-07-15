/**
 * @ksyk/api — typed HTTP client.
 *
 * Thin wrapper around fetch — one method per resource path. Same
 * behaviour as `apiRequest()` in the app today, just typed at the
 * resource level. Refresh-token handling lands in M6.2.
 */
import type { Building, Room, Hallway, MapDefaults } from "@ksyk/shared";

interface FetchOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

/** Base URL — defaults to the same origin. Override for dev tools that
 *  proxy to a remote server. */
let BASE_URL = "";
export function setApiBaseUrl(url: string) {
  BASE_URL = url.replace(/\/$/, "");
}

/** Bearer token to inject. Set once at login (M6.2). */
let BEARER: string | null = null;
export function setBearerToken(token: string | null) {
  BEARER = token;
}

async function req<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: FetchOptions,
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

  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      if (j?.message) msg = j.message;
    } catch { /* body not JSON */ }
    throw new Error(msg);
  }

  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const api = {
  buildings: {
    list: (opts?: FetchOptions) => req<Building[]>("GET", "/api/buildings", undefined, opts),
    get: (id: string, opts?: FetchOptions) =>
      req<Building>("GET", `/api/buildings/${id}`, undefined, opts),
    create: (b: Omit<Building, "id">, opts?: FetchOptions) =>
      req<Building>("POST", "/api/buildings", b, opts),
    update: (id: string, patch: Partial<Building>, opts?: FetchOptions) =>
      req<Building>("PATCH", `/api/buildings/${id}`, patch, opts),
    delete: (id: string, opts?: FetchOptions) =>
      req<void>("DELETE", `/api/buildings/${id}`, undefined, opts),
  },
  rooms: {
    list: (opts?: FetchOptions) => req<Room[]>("GET", "/api/rooms", undefined, opts),
    create: (r: Omit<Room, "id">, opts?: FetchOptions) =>
      req<Room>("POST", "/api/rooms", r, opts),
    update: (id: string, patch: Partial<Room>, opts?: FetchOptions) =>
      req<Room>("PATCH", `/api/rooms/${id}`, patch, opts),
    delete: (id: string, opts?: FetchOptions) =>
      req<void>("DELETE", `/api/rooms/${id}`, undefined, opts),
  },
  hallways: {
    list: (opts?: FetchOptions) => req<Hallway[]>("GET", "/api/hallways", undefined, opts),
    create: (h: Omit<Hallway, "id">, opts?: FetchOptions) =>
      req<Hallway>("POST", "/api/hallways", h, opts),
    delete: (id: string, opts?: FetchOptions) =>
      req<void>("DELETE", `/api/hallways/${id}`, undefined, opts),
  },
  mapDefaults: {
    get: (opts?: FetchOptions) => req<MapDefaults>("GET", "/api/map-defaults", undefined, opts),
    publish: (d: MapDefaults, opts?: FetchOptions) =>
      req<MapDefaults>("PUT", "/api/map-defaults", d, opts),
  },
};
