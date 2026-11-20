/**
 * Which campus map the builder is editing.
 *
 * Visitors and the apps always get the PUBLISHED map. The builder can pick
 * another map; it then sends `X-Ksyk-Map: <id>` and the server (admins only)
 * answers with, and writes into, that map. Only builder pages send the header,
 * so the public site and the admin dashboard are never affected.
 */
const KEY = "ksyk_builder_map";

export function onBuilderPage(): boolean {
  try {
    return typeof window !== "undefined" && /^\/builder(\/|$)/.test(window.location.pathname);
  } catch {
    return false;
  }
}

export function getBuilderMapId(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v && /^[a-z0-9][a-z0-9-]{0,40}$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function setBuilderMapId(id: string | null): void {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch { /* private mode */ }
}

/** Headers to merge into builder requests; empty everywhere else. */
export function mapScopeHeader(): Record<string, string> {
  if (!onBuilderPage()) return {};
  const id = getBuilderMapId();
  return id ? { "x-ksyk-map": id } : {};
}
