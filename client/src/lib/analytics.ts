// Real Analytics System for KSYK Maps
// Tracks page views, user interactions, and easter egg discoveries

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

// Generate or get session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('ksyk_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('ksyk_session_id', sessionId);
  }
  return sessionId;
};

// Get or create user ID
const getUserId = (): string => {
  let userId = localStorage.getItem('ksyk_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('ksyk_user_id', userId);
  }
  return userId;
};

// Track page view
export const trackPageView = async (page: string) => {
  try {
    const event: AnalyticsEvent = {
      type: 'page_view',
      page,
      timestamp: new Date().toISOString(),
      userId: getUserId(),
      sessionId: getSessionId(),
    };

    // Both endpoints — /track is the batched sink read by AppLogsManager;
    // /pageview is the dedicated counter the Overview panel reads for its
    // "pageviews today" card. Both are fire-and-forget and never throw.
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [event],
        sessionInfo: {
          sessionId: getSessionId(),
          userId: getUserId(),
        }
      }),
    }).catch(() => { /* Silently fail - analytics shouldn't break the app */ });

    await fetch('/api/analytics/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page,
        timestamp: event.timestamp,
        sessionId: getSessionId(),
        userId: getUserId(),
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      }),
    }).catch(() => { /* Silently fail */ });
  } catch (error) {
    // Silently fail - analytics shouldn't break the app
  }
};

// Track easter egg discovery
export const trackEasterEgg = async (eggType: string) => {
  try {
    const event: AnalyticsEvent = {
      type: 'easter_egg',
      eggType,
      timestamp: new Date().toISOString(),
      userId: getUserId(),
      sessionId: getSessionId(),
    };

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [event],
        sessionInfo: {
          sessionId: getSessionId(),
          userId: getUserId(),
        }
      }),
    }).catch(() => {});

    // Also track in easter eggs endpoint
    await fetch('/api/easter-eggs/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eggId: eggType,
        eggName: eggType,
      }),
    }).catch(() => {});
  } catch (error) {
    // Silently fail
  }
};

// Track feature usage
export const trackFeatureUse = async (feature: string, meta?: Record<string, unknown>) => {
  try {
    const event: AnalyticsEvent = {
      type: 'feature_use',
      feature,
      timestamp: new Date().toISOString(),
      userId: getUserId(),
      sessionId: getSessionId(),
    };

    // Fire-and-forget writes to both endpoints — the /track path is the
    // legacy sink (goes through Firestore's analyticsEvents), and /feature
    // is a lightweight named-counter sink used by the Overview panel to
    // build "top features today" without scanning the raw events blob.
    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [event],
        sessionInfo: {
          sessionId: getSessionId(),
          userId: getUserId(),
        }
      }),
    }).catch(() => {});

    await fetch('/api/analytics/feature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: feature,
        meta: meta || null,
        sessionId: getSessionId(),
        userId: getUserId(),
        timestamp: event.timestamp,
      }),
    }).catch(() => {});
  } catch (error) {
    // Silently fail
  }
};

// Convenience alias — new call sites should use trackFeature() to keep
// the intent obvious (mirrors the same shape as trackSearch/trackEasterEgg).
export const trackFeature = (name: string, meta?: Record<string, unknown>) =>
  trackFeatureUse(name, meta);

// Track search
export const trackSearch = async (query: string) => {
  try {
    const event: AnalyticsEvent = {
      type: 'search',
      query,
      timestamp: new Date().toISOString(),
      userId: getUserId(),
      sessionId: getSessionId(),
    };

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [event],
        sessionInfo: {
          sessionId: getSessionId(),
          userId: getUserId(),
        }
      }),
    }).catch(() => {});
  } catch (error) {
    // Silently fail
  }
};

// Track navigation
export const trackNavigation = async (from: string, to: string) => {
  try {
    const event: AnalyticsEvent = {
      type: 'navigation',
      page: `${from} -> ${to}`,
      timestamp: new Date().toISOString(),
      userId: getUserId(),
      sessionId: getSessionId(),
    };

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events: [event],
        sessionInfo: {
          sessionId: getSessionId(),
          userId: getUserId(),
        }
      }),
    }).catch(() => {});
  } catch (error) {
    // Silently fail
  }
};

// Auto-track page views on route changes
export const initAnalytics = () => {
  // Track initial page view
  trackPageView(window.location.pathname);

  // Track page views on navigation
  let lastPath = window.location.pathname;
  setInterval(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      trackPageView(currentPath);
      lastPath = currentPath;
    }
  }, 1000);
};


// React hook for analytics
export const useAnalytics = () => {
  return {
    trackPageView,
    trackEasterEgg,
    trackFeatureUse,
    trackFeature,
    trackSearch,
    trackNavigation,
  };
};
