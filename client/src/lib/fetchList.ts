/**
 * fetchList — GET a JSON array, guaranteeing an array back.
 *
 * The Builder's `useQuery` calls all expect `T[]`. The server
 * *should* return `T[]` on every list endpoint, but in practice we
 * get non-arrays back in three situations:
 *   1. The endpoint 404s with `{"message":"…"}` (typical for stubs).
 *   2. The auth middleware returns a 302 to `/login` — `.json()` on
 *      an HTML redirect throws.
 *   3. A dev-time typo returns `{data:[…]}` instead of the array.
 *
 * If any of that happens and the array leaks into a `for-of` loop,
 * the whole page throws `TypeError: n is not iterable` and the
 * ErrorBoundary paints the crash screen. `fetchList` walls off that
 * class of bug at the network boundary — worst case you see an empty
 * list instead of a crash.
 *
 * Auth: /api/admin-*, /api/telemetry/*, /api/admin/activity require an
 * HMAC bearer token issued by /api/auth/admin-login. The token lives in
 * localStorage.ksyk_admin_token — attach it as Authorization: Bearer
 * on every request so admin panel queries stop 401ing.
 */
function authHeaders(): Record<string, string> {
  try {
    const t = typeof localStorage !== "undefined"
      ? localStorage.getItem("ksyk_admin_token")
      : null;
    return t ? { Authorization: `Bearer ${t}` } : {};
  } catch {
    return {};
  }
}

export async function fetchList<T = unknown>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: authHeaders(),
    });
    if (!res.ok) return [];
    const body = (await res.json().catch(() => null)) as unknown;
    if (Array.isArray(body)) return body as T[];
    // Common wrapper shapes.
    if (body && typeof body === "object" && Array.isArray((body as { data?: unknown }).data)) {
      return (body as { data: T[] }).data;
    }
    if (body && typeof body === "object" && Array.isArray((body as { rows?: unknown }).rows)) {
      return (body as { rows: T[] }).rows;
    }
    return [];
  } catch {
    return [];
  }
}

/** GET a JSON object, guaranteeing at least an object back. */
export async function fetchObject<T extends object = Record<string, unknown>>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    const body = (await res.json().catch(() => null)) as unknown;
    if (body && typeof body === "object" && !Array.isArray(body)) return body as T;
    return null;
  } catch {
    return null;
  }
}
