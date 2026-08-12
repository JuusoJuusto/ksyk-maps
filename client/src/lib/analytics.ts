/**
 * Client-side telemetry — adblock-resistant.
 *
 * Every send goes through `sendTelemetry(path, payload)` which picks
 * the best available transport in this order:
 *
 *   1. `/api/telemetry/*` via `navigator.sendBeacon` when available.
 *      SendBeacon runs after the page starts unloading and is treated
 *      as a passive UA hint by most filter lists — much rarer to be
 *      blocked than a JS `fetch` to a URL containing "analytics".
 *   2. `/api/telemetry/*` via plain fetch — same fresh URL, no
 *      "analytics" substring in the pathname.
 *   3. `/api/t/p` (single-letter, image-loaded pixel) — image beacons
 *      are almost never blocked, and the URL is short + generic. Data
 *      goes over the query string.
 *
 * The old `/api/analytics/*` paths remain as server aliases so any
 * cached client build continues to work.
 */

interface AnalyticsEvent {
  type: 'page_view' | 'easter_egg' | 'feature_use' | 'search' | 'navigation';
  page?: string;
  eggType?: string;
  feature?: string;
  query?: string;
  timestamp: string;
  userId?: string;
  sessionId: string;
}

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('ksyk_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('ksyk_session_id', sessionId);
  }
  return sessionId;
};

const getUserId = (): string => {
  let userId = localStorage.getItem('ksyk_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('ksyk_user_id', userId);
  }
  return userId;
};

// ── Consent gate ─────────────────────────────────────────────────

function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem('cookie_consent');
    if (!raw) return false;
    return JSON.parse(raw)?.analytics === true;
  } catch { return false; }
}

// ── Transport ────────────────────────────────────────────────────

/** Send a payload to a telemetry endpoint. Never throws. Never awaits
 *  a response body (the server returns 204). */
function sendTelemetry(path: string, payload: unknown): void {
  const body = JSON.stringify(payload);

  // 1. sendBeacon — fires even on page-unload and passes past most
  //    filter lists because the request isn't seen as a "tracking"
  //    XHR by the network inspector.
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(path, blob)) return;
    }
  } catch { /* ignore */ }

  // 2. Plain fetch.
  try {
    void fetch(path, {
      method: 'POST',
      keepalive: true,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {
      // 3. Image beacon fallback. The pathname isn't "analytics" or
      //    "track" (both blocked); it's "/api/t/p", short and generic.
      pixelBeacon(payload);
    });
  } catch {
    pixelBeacon(payload);
  }
}

/** Last-resort transport: encode the payload in the query string of an
 *  Image() src. Only fires when both sendBeacon and fetch have failed. */
function pixelBeacon(payload: unknown): void {
  try {
    const q = encodeURIComponent(btoa(JSON.stringify(payload)).slice(0, 1500));
    const url = `/api/t/p?d=${q}&_=${Date.now()}`;
    const img = new Image();
    img.src = url;
  } catch { /* really nothing else we can do */ }
}

// ── Public API — call sites don't change ─────────────────────────

export const trackPageView = async (page: string) => {
  if (!hasAnalyticsConsent()) return;
  const event: AnalyticsEvent = {
    type: 'page_view',
    page,
    timestamp: new Date().toISOString(),
    userId: getUserId(),
    sessionId: getSessionId(),
  };
  sendTelemetry('/api/telemetry/pageview', {
    page,
    timestamp: event.timestamp,
    sessionId: event.sessionId,
    userId: event.userId,
    referrer: typeof document !== 'undefined' ? document.referrer || null : null,
  });
  sendTelemetry('/api/telemetry/track', {
    events: [event],
    sessionInfo: { sessionId: event.sessionId, userId: event.userId },
  });
};

export const trackEasterEgg = async (eggType: string) => {
  const event: AnalyticsEvent = {
    type: 'easter_egg',
    eggType,
    timestamp: new Date().toISOString(),
    userId: getUserId(),
    sessionId: getSessionId(),
  };
  sendTelemetry('/api/telemetry/track', {
    events: [event],
    sessionInfo: { sessionId: event.sessionId, userId: event.userId },
  });
  sendTelemetry('/api/easter-eggs/track', { eggId: eggType, eggName: eggType });
};

export const trackFeatureUse = async (feature: string, meta?: Record<string, unknown>) => {
  if (!hasAnalyticsConsent()) return;
  const event: AnalyticsEvent = {
    type: 'feature_use',
    feature,
    timestamp: new Date().toISOString(),
    userId: getUserId(),
    sessionId: getSessionId(),
  };
  sendTelemetry('/api/telemetry/track', {
    events: [event],
    sessionInfo: { sessionId: event.sessionId, userId: event.userId },
  });
  sendTelemetry('/api/telemetry/feature', {
    name: feature,
    meta: meta ?? null,
    sessionId: event.sessionId,
    userId: event.userId,
    timestamp: event.timestamp,
  });
};

/** Convenience alias — call sites should use trackFeature() for clarity. */
export const trackFeature = (name: string, meta?: Record<string, unknown>) =>
  trackFeatureUse(name, meta);

export const trackSearch = async (query: string) => {
  if (!hasAnalyticsConsent()) return;
  const event: AnalyticsEvent = {
    type: 'search',
    query,
    timestamp: new Date().toISOString(),
    userId: getUserId(),
    sessionId: getSessionId(),
  };
  sendTelemetry('/api/telemetry/track', {
    events: [event],
    sessionInfo: { sessionId: event.sessionId, userId: event.userId },
  });
  sendTelemetry('/api/telemetry/search', {
    query,
    sessionId: event.sessionId,
    userId: event.userId,
    timestamp: event.timestamp,
  });
};

export const trackNavigation = async (from: string, to: string) => {
  if (!hasAnalyticsConsent()) return;
  const event: AnalyticsEvent = {
    type: 'navigation',
    page: `${from} -> ${to}`,
    timestamp: new Date().toISOString(),
    userId: getUserId(),
    sessionId: getSessionId(),
  };
  sendTelemetry('/api/telemetry/track', {
    events: [event],
    sessionInfo: { sessionId: event.sessionId, userId: event.userId },
  });
};

let _analyticsRunning = false;

function _startPolling() {
  if (_analyticsRunning) return;
  _analyticsRunning = true;
  trackPageView(window.location.pathname);
  let lastPath = window.location.pathname;
  setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      trackPageView(currentPath);
      lastPath = currentPath;
    }
  }, 1000);
}

/** Kick off client-side telemetry. Fires the initial pageview and
 *  polls for pathname changes so SPA route swaps still count.
 *  No-ops silently when consent has not been granted — starts
 *  automatically once the user accepts (via ksyk:analytics-consent). */
export const initAnalytics = () => {
  if (hasAnalyticsConsent()) {
    _startPolling();
  } else {
    window.addEventListener('ksyk:analytics-consent', () => {
      if (hasAnalyticsConsent()) _startPolling();
    }, { once: true });
  }
};

export const useAnalytics = () => ({
  trackPageView,
  trackEasterEgg,
  trackFeatureUse,
  trackFeature,
  trackSearch,
  trackNavigation,
});
