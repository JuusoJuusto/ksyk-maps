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

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Analytics tracking failed:', error);
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
      body: JSON.stringify(event),
    });

    // Also track in easter eggs endpoint
    await fetch('/api/easter-eggs/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eggType,
        userId: getUserId(),
      }),
    });
  } catch (error) {
    console.error('Easter egg tracking failed:', error);
  }
};

// Track feature usage
export const trackFeatureUse = async (feature: string) => {
  try {
    const event: AnalyticsEvent = {
      type: 'feature_use',
      feature,
      timestamp: new Date().toISOString(),
      userId: getUserId(),
      sessionId: getSessionId(),
    };

    await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Feature tracking failed:', error);
  }
};

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
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Search tracking failed:', error);
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
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error('Navigation tracking failed:', error);
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
    trackSearch,
    trackNavigation,
  };
};
