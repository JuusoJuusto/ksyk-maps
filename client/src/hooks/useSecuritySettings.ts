import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  loadSecuritySettings,
  saveSecuritySettings,
  SecuritySettings,
  DEFAULT_SECURITY_SETTINGS,
} from "@/lib/securitySettings";
import { getAdminHeaders } from "@/lib/adminAuth";

let snapshot: SecuritySettings = loadSecuritySettings();
const listeners = new Set<() => void>();

function setSnapshot(next: SecuritySettings) {
  snapshot = next;
  saveSecuritySettings(next);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key === "ksyk_security_settings_v1") {
      snapshot = loadSecuritySettings();
      listeners.forEach((l) => l());
    }
  });
}

/** Load admin-set security from server. Falls back silently if offline.
 *  Server is authoritative — local edits that haven't been saved get
 *  overwritten on the next pull. This is intentional: it's how admin
 *  changes propagate to every device. */
export async function loadSecurityFromServer(): Promise<void> {
  try {
    const r = await fetch("/api/security-settings", { credentials: "include" });
    if (!r.ok) return;
    const data = await r.json();
    if (data && typeof data === "object") {
      // Server doc wins. Defaults fill in any new keys the server doc
      // doesn't know about yet (forward-compat with schema growth).
      setSnapshot({ ...DEFAULT_SECURITY_SETTINGS, ...data });
    }
  } catch {
    /* silent */
  }
}

export async function saveSecurityToServer(s: SecuritySettings): Promise<void> {
  const r = await fetch("/api/security-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAdminHeaders() },
    credentials: "include",
    body: JSON.stringify(s),
  });
  if (!r.ok) throw new Error("Failed to save security settings");
}

export function useSecuritySettings() {
  const settings = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );

  // Pull on mount + every 60 s so admin-saved changes propagate without a
  // hard refresh on every device. Errors stay silent (offline-friendly).
  useEffect(() => {
    loadSecurityFromServer();
    const id = setInterval(loadSecurityFromServer, 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") loadSecurityFromServer();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const update = useCallback(
    <K extends keyof SecuritySettings>(key: K, value: SecuritySettings[K]) => {
      setSnapshot({ ...snapshot, [key]: value });
    },
    [],
  );

  const setAll = useCallback((next: SecuritySettings) => setSnapshot(next), []);
  const reset = useCallback(
    () => setSnapshot({ ...DEFAULT_SECURITY_SETTINGS }),
    [],
  );

  return { settings, update, setAll, reset };
}
