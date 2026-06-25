import { useEffect, useState, useMemo } from "react";
import { evaluateAccess, type AccessDecision, type AuthedUser } from "@/lib/accessControl";
import { useSecuritySettings } from "./useSecuritySettings";

/** Pull the current user from localStorage (set by AdminLogin or MS sign-in). */
function readStoredUser(): AuthedUser | null {
  try {
    const raw = localStorage.getItem("ksyk_user");
    if (raw) return JSON.parse(raw);
    const adminRaw = localStorage.getItem("ksyk_admin_user");
    if (adminRaw) {
      const u = JSON.parse(adminRaw);
      return { ...u, role: u.role || "admin" };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Best-effort IP detection — calls the server which sees req.ip. */
async function fetchClientIp(): Promise<string | null> {
  try {
    const r = await fetch("/api/client-info", { credentials: "include" });
    if (!r.ok) return null;
    const j = await r.json();
    return typeof j?.ip === "string" ? j.ip : null;
  } catch {
    return null;
  }
}

export function useAccessDecision(): AccessDecision {
  const { settings } = useSecuritySettings();
  const [user, setUser] = useState<AuthedUser | null>(() => readStoredUser());
  const [ip, setIp] = useState<string | null>(null);
  // Re-evaluate every minute so the time-window gate flips at the boundary
  // without a page reload.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    fetchClientIp().then((v) => mounted && setIp(v));
    const onStorage = () => setUser(readStoredUser());
    window.addEventListener("storage", onStorage);
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => {
      mounted = false;
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  return useMemo(
    () => evaluateAccess({ settings, user, ip, now: new Date() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, user, ip, tick],
  );
}
