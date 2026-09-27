import { useCallback, useEffect, useState } from "react";
import { getAdminHeaders } from "@/lib/adminAuth";

export interface CampusMap {
  id: string;
  name: string;
  description?: string;
  color?: string;
  centerLat: number;
  centerLng: number;
  defaultZoom: number;
  bearing?: number;
  pitch?: number;
  createdAt?: string;
  updatedAt?: string;
}

const ACTIVE_MAP_KEY = "ksyk_active_map_id";

export function getActiveMapId(): string | null {
  try { return localStorage.getItem(ACTIVE_MAP_KEY); } catch { return null; }
}
export function setActiveMapId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_MAP_KEY, id);
    else localStorage.removeItem(ACTIVE_MAP_KEY);
  } catch { /* private mode */ }
}

export function useMaps() {
  const [maps, setMaps] = useState<CampusMap[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/maps");
      if (res.ok) setMaps(await res.json());
    } catch { /* offline */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createMap = useCallback(async (data: Omit<CampusMap, "id" | "createdAt" | "updatedAt">) => {
    const res = await fetch("/api/maps", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const created: CampusMap = await res.json();
    setMaps((prev) => [...prev, created]);
    return created;
  }, []);

  const updateMap = useCallback(async (id: string, data: Partial<Omit<CampusMap, "id">>) => {
    const res = await fetch(`/api/maps/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getAdminHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const updated: CampusMap = await res.json();
    setMaps((prev) => prev.map((m) => (m.id === id ? updated : m)));
    return updated;
  }, []);

  const deleteMap = useCallback(async (id: string) => {
    const res = await fetch(`/api/maps/${id}`, {
      method: "DELETE",
      headers: { ...getAdminHeaders() },
    });
    if (!res.ok) throw new Error(await res.text());
    setMaps((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { maps, loading, reload: load, createMap, updateMap, deleteMap };
}
