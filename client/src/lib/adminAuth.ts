/**
 * Admin session helpers.
 *
 * The server issues 30-day admin tokens and renews them through
 * POST /api/auth/admin-refresh (sliding session). The dashboard renews while
 * it is open, so a session ends after a stretch of inactivity, not a fixed
 * time after sign-in.
 */

const TOKEN_KEY = 'ksyk_admin_token';
// Despite the name this is "last time the server confirmed the session":
// sign-in or the latest successful refresh. The idle cut-off reads it.
const ACTIVE_AT_KEY = 'ksyk_admin_login_at';
const REFRESHED_AT_KEY = 'ksyk_admin_refreshed_at';
const EXPIRED_NOTICE_KEY = 'ksyk_admin_expired_notice';

/** Renew at most this often (the server TTL is 30 days). */
export const ADMIN_REFRESH_MIN_INTERVAL_MS = 20 * 60 * 1000;
/** Signed-in tabs idle longer than this are signed out. */
export const ADMIN_IDLE_LIMIT_MS = 12 * 60 * 60 * 1000;
/** Right after a refresh, another 401 isn't about token age (e.g. a route's own rule). */
const RECENT_REFRESH_MS = 30 * 1000;

export type RefreshOutcome = 'refreshed' | 'expired' | 'skipped';

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function clearAdminSession(): void {
  localStorage.removeItem('ksyk_admin_logged_in');
  localStorage.removeItem('ksyk_admin_user');
  localStorage.removeItem(ACTIVE_AT_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESHED_AT_KEY);
}

function readNumber(key: string): number {
  try { return Number(localStorage.getItem(key) || 0) || 0; } catch { return 0; }
}

/** True when the session was last confirmed longer ago than the idle limit. */
export function isAdminSessionIdle(): boolean {
  const at = readNumber(ACTIVE_AT_KEY);
  return at > 0 && Date.now() - at > ADMIN_IDLE_LIMIT_MS;
}

let inFlight: Promise<RefreshOutcome> | null = null;

/**
 * Trade the stored token for a fresh one.
 *  - 'refreshed': new token stored.
 *  - 'expired':   the server definitively rejected the token (401).
 *  - 'skipped':   nothing to do, too soon, or the server/network couldn't
 *                 answer. Never treated as a sign-out: an older server without
 *                 the endpoint (404), a 5xx or being offline must not end a session.
 */
export function refreshAdminSession(opts: { force?: boolean } = {}): Promise<RefreshOutcome> {
  const token = getAdminToken();
  if (!token || localStorage.getItem('ksyk_admin_logged_in') !== 'true') {
    return Promise.resolve('skipped');
  }
  if (!opts.force && Date.now() - readNumber(REFRESHED_AT_KEY) < ADMIN_REFRESH_MIN_INTERVAL_MS) {
    return Promise.resolve('skipped');
  }
  if (inFlight) return inFlight;

  const run = (async (): Promise<RefreshOutcome> => {
    try {
      const res = await fetch('/api/auth/admin-refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) return 'expired';
      if (!res.ok) return 'skipped';
      const data = await res.json().catch(() => null);
      if (typeof data?.adminToken !== 'string' || !data.adminToken) return 'skipped';
      const now = String(Date.now());
      localStorage.setItem(TOKEN_KEY, data.adminToken);
      localStorage.setItem(REFRESHED_AT_KEY, now);
      localStorage.setItem(ACTIVE_AT_KEY, now);
      // Pick up role changes (a demoted admin loses access on next load).
      if (data.user && typeof data.user.role === 'string') {
        localStorage.setItem('ksyk_admin_user', JSON.stringify(data.user));
      }
      return 'refreshed';
    } catch {
      return 'skipped';
    }
  })();
  inFlight = run;
  void run.finally(() => { if (inFlight === run) inFlight = null; });
  return run;
}

export function markExpiredNotice(): void {
  try { sessionStorage.setItem(EXPIRED_NOTICE_KEY, '1'); } catch { /* private mode */ }
}

// Memoised so React's double-invoked state initialisers (StrictMode) agree.
let noticeSeen: boolean | null = null;

/** True if the user was just sent back to sign-in because the session ended. */
export function consumeExpiredNotice(): boolean {
  if (noticeSeen !== null) return noticeSeen;
  try {
    noticeSeen = sessionStorage.getItem(EXPIRED_NOTICE_KEY) === '1';
    sessionStorage.removeItem(EXPIRED_NOTICE_KEY);
  } catch {
    noticeSeen = false;
  }
  return noticeSeen;
}

/**
 * The server rejected the token for good. Clear it; on admin pages also go
 * back to sign-in with a notice. Elsewhere (the public map on a shared
 * computer that once signed in) only the stale token is dropped.
 */
export function expireAdminSession(): void {
  clearAdminSession();
  const onAdminPage = /^\/(admin|admin-login|admin-ksyk-management-portal|builder)(\/|$)/.test(window.location.pathname);
  if (!onAdminPage) return;
  markExpiredNotice();
  window.location.replace('/admin');
}

/**
 * A request that carried the admin token got a 401. Returns true when the
 * token was renewed and the request is worth retrying once.
 */
export async function recoverFromUnauthorized(): Promise<boolean> {
  if (!getAdminToken()) return false;
  if (Date.now() - readNumber(REFRESHED_AT_KEY) < RECENT_REFRESH_MS) return false;
  const outcome = await refreshAdminSession({ force: true });
  if (outcome === 'expired') {
    expireAdminSession();
    return false;
  }
  return outcome === 'refreshed';
}
