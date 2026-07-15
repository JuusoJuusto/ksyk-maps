/**
 * useAutosave — periodic + change-driven autosave for the Builder.
 *
 * Behaviour:
 *   1. Every ~30 s (configurable) the current campus snapshot is
 *      serialised and written to localStorage under a namespaced key.
 *      This gives crash recovery even when the network is down.
 *   2. If a `remoteSaver` is supplied, that same snapshot is POSTed to
 *      the server every save cycle. Failures are silent — the local
 *      copy is authoritative until the network recovers.
 *   3. On mount, if a local draft exists that's newer than what the
 *      server returned, the caller gets it via `restoreDraft()` and
 *      can prompt the user "Restore your unsaved changes?".
 *   4. Autosave is paused when the document is hidden (`visibilitychange`)
 *      so background tabs don't waste writes.
 *
 * The hook is dumb about *what* it serialises — it receives a `snapshot`
 * function so the caller controls scope (whole MapPackage vs just
 * buildings + rooms).
 */
import { useEffect, useRef, useState, useCallback } from "react";

const DEFAULT_INTERVAL_MS = 30_000;
const LOCAL_STORAGE_PREFIX = "ksyk:builder:autosave:";

export type AutosaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "restored";

export interface AutosaveDraft<T> {
  savedAt: string;   // ISO
  snapshot: T;
  /** True when this draft came from localStorage rather than the server. */
  local: boolean;
}

export interface UseAutosaveOptions<T> {
  /** Namespace key — every builder page uses its own. */
  key: string;
  /** Called every cycle to get the current snapshot. */
  snapshot: () => T;
  /** Optional server persister. Should throw on failure. */
  remoteSaver?: (snapshot: T) => Promise<void>;
  /** Milliseconds between saves. Default 30 000. */
  intervalMs?: number;
  /** When true, autosave is paused (useful during initial load). */
  paused?: boolean;
}

export interface UseAutosaveResult<T> {
  status: AutosaveStatus;
  lastSavedAt: string | null;
  /** Any local draft newer than the last successful save. Null if none. */
  pendingDraft: AutosaveDraft<T> | null;
  /** Discard a pending local draft. */
  discardDraft: () => void;
  /** Force an immediate save cycle. Returns when the save completes. */
  forceSave: () => Promise<void>;
}

export function useAutosave<T>(opts: UseAutosaveOptions<T>): UseAutosaveResult<T> {
  const { key, snapshot, remoteSaver, intervalMs = DEFAULT_INTERVAL_MS, paused = false } = opts;
  const storageKey = LOCAL_STORAGE_PREFIX + key;

  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<AutosaveDraft<T> | null>(null);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const remoteRef = useRef(remoteSaver);
  remoteRef.current = remoteSaver;

  // ── Recover local draft on mount ─────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as AutosaveDraft<T>;
      if (!parsed || typeof parsed !== "object") return;
      setPendingDraft({ ...parsed, local: true });
    } catch {
      // Corrupt storage — ignore. Next save cycle will overwrite.
    }
  }, [storageKey]);

  // ── Save loop ────────────────────────────────────────────
  const doSave = useCallback(async () => {
    setStatus("saving");
    let snap: T;
    try {
      snap = snapshotRef.current();
    } catch {
      setStatus("error");
      return;
    }
    const draft: AutosaveDraft<T> = {
      savedAt: new Date().toISOString(),
      snapshot: snap,
      local: true,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // Storage quota or private mode — still try the remote.
    }
    if (remoteRef.current) {
      try {
        await remoteRef.current(snap);
      } catch {
        setStatus("error");
        setLastSavedAt(draft.savedAt);
        return;
      }
    }
    setStatus("saved");
    setLastSavedAt(draft.savedAt);
    // Once we've successfully remote-saved, there's no unsaved draft.
    setPendingDraft(null);
  }, [storageKey]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      // Skip when tab hidden to avoid burning quota on background tabs.
      if (document.visibilityState === "hidden") return;
      void doSave();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [doSave, intervalMs, paused]);

  // ── Save on tab hide ─────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "hidden") void doSave();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [doSave]);

  const discardDraft = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    setPendingDraft(null);
  }, [storageKey]);

  const forceSave = useCallback(async () => {
    await doSave();
  }, [doSave]);

  return { status, lastSavedAt, pendingDraft, discardDraft, forceSave };
}
