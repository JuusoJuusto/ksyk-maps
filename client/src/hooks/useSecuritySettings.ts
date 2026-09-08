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
 *  changes propagate to every device.
 *
 *  Skips the request entirely when the browser reports offline so we
 *  don't flood the console with ERR_NAME_NOT_RESOLVED / ERR_NETWORK_IO_
 *  SUSPENDED failures on unstable connections. */
export async function loadSecurityFromServer(): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  try {
    const r = await fetch("/api/security-settings", { credentials: "include" });
    if (!r.ok) return;
    const data = await r.json();
    if (data && typeof data === "object") {
      setSnapshot({ ...DEFAULT_SECURITY_SETTINGS, ...data });
    }
  } catch {
    /* silent — DNS failure, connection reset, timeout, all no-op */
  }
}

export async function saveSecurityToServer(s: SecuritySettings): Promise<void> {
  const r = await fetch("/api/security-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...getAdminHeaders() },
    credentials: "include",
    body: JSON.stringify(s),
  });
  if (!r.ok) {
    const err = new Error("Failed to save security settings") as Error & { status: number };
    err.status = r.status;
    throw err;
  }
}

export function useSecuritySettings() {
  const settings = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  );

  // Pull on mount, on tab-visible, and on network-reconnect. The old
  // 60-second interval flooded the console with retries on offline/DNS
  // errors; visibility + online events cover the "admin just changed
  // settings on another tab" use case without the polling noise.
  useEffect(() => {
    loadSecurityFromServer();
    const onVis = () => {
      if (document.visibilityState === "visible") loadSecurityFromServer();
    };
    const onOnline = () => loadSecurityFromServer();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
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
