// Real Analytics Tracking System
class AnalyticsTracker {
  private sessionId: string;
  private userId?: string;
  private startTime: number;
  private lastActivity: number;
  private pageStartTime: number;
  private currentPage: string;
  private events: any[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.lastActivity = Date.now();
    this.pageStartTime = Date.now();
    this.currentPage = window.location.pathname;
    
    this.initializeTracking();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeTracking() {
    // Track page views
    this.trackPageView();
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('page_hidden', { duration: Date.now() - this.pageStartTime });
      } else {
        this.pageStartTime = Date.now();
        this.trackEvent('page_visible');
      }
    });

    // Track clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      this.trackClick(target);
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target as HTMLFormElement;
      this.trackFormSubmission(form);
    });

    // Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', () => {
      const scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        if (maxScroll % 25 === 0) { // Track at 25%, 50%, 75%, 100%
          this.trackEvent('scroll_depth', { percent: maxScroll });
        }
      }
    });

    // Track time on page before unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('page_unload', { 
        duration: Date.now() - this.pageStartTime,
        totalSessionTime: Date.now() - this.startTime
      });
      this.sendEvents();
    });

    // Send events periodically
    setInterval(() => {
      this.sendEvents();
    }, 30000); // Send every 30 seconds

    // Track errors
    window.addEventListener('error', (e) => {
      this.trackError(e.error, e.filename, e.lineno);
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (e) => {
      this.trackError(e.reason, 'Promise rejection');
    });
  }

  trackPageView(page?: string) {
    const currentPage = page || window.location.pathname;
    
    // Track previous page duration if switching pages
    if (this.currentPage !== currentPage && this.currentPage) {
      this.trackEvent('page_duration', {
        page: this.currentPage,
        duration: Date.now() - this.pageStartTime
      });
    }

    this.currentPage = currentPage;
    this.pageStartTime = Date.now();

    this.trackEvent('page_view', {
      page: currentPage,
      referrer: document.referrer,
      title: document.title
    });
  }

  trackSearch(query: string, results?: number, filters?: any) {
    this.trackEvent('search', {
      query: query.toLowerCase().trim(),
      results,
      filters,
      timestamp: Date.now()
    });
  }

  trackRoomView(roomId: string, roomName?: string, buildingId?: string) {
    this.trackEvent('room_view', {
      roomId,
      roomName,
      buildingId,
      timestamp: Date.now()
    });
  }

  trackBuildingView(buildingId: string, buildingName?: string) {
    this.trackEvent('building_view', {
      buildingId,
      buildingName,
      timestamp: Date.now()
    });
  }

  trackNavigation(from: string, to: string, method: 'click' | 'search' | 'direct' = 'click') {
    this.trackEvent('navigation', {
      from,
      to,
      method,
      timestamp: Date.now()
    });
  }

  trackFeatureUse(feature: string, details?: any) {
    this.trackEvent('feature_use', {
      feature,
      details,
      timestamp: Date.now()
    });
  }

  trackError(error: any, source?: string, line?: number) {
    this.trackEvent('error', {
      error: error.toString(),
      source,
      line,
      stack: error.stack,
      timestamp: Date.now()
    });
  }

  trackPerformance(metric: string, value: number, details?: any) {
    this.trackEvent('performance', {
      metric,
      value,
      details,
      timestamp: Date.now()
    });
  }

  private trackClick(element: HTMLElement) {
    const tagName = element.tagName.toLowerCase();
    const className = element.className;
    const id = element.id;
    const text = element.textContent?.slice(0, 100);
    
    // Track specific click types
    if (tagName === 'a') {
      const href = (element as HTMLAnchorElement).href;
      this.trackEvent('link_click', { href, text, className, id });
    } else if (tagName === 'button') {
      this.trackEvent('button_click', { text, className, id });
    } else if (element.closest('[data-track]')) {
      const trackData = element.closest('[data-track]')?.getAttribute('data-track');
      this.trackEvent('tracked_click', { element: trackData, text, className, id });
    }
  }

  private trackFormSubmission(form: HTMLFormElement) {
    const formData = new FormData(form);
    const fields = Array.from(formData.keys());
    
    this.trackEvent('form_submit', {
      formId: form.id,
      formClass: form.className,
      fields: fields,
      action: form.action
    });
  }

  private trackEvent(type: string, data: any = {}) {
    const event = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: new Date().toISOString(),
      page: this.currentPage,
      userAgent: navigator.userAgent,
      device: this.getDeviceInfo(),
      browser: this.getBrowserInfo(),
      os: this.getOSInfo(),
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      ...data
    };

    this.events.push(event);
    this.lastActivity = Date.now();

    // Send immediately for critical events
    if (['error', 'form_submit'].includes(type)) {
      this.sendEvents();
    }
  }

  private getDeviceInfo(): string {
    const ua = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    if (ua.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private getOSInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private async sendEvents() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: eventsToSend,
          sessionInfo: {
            sessionId: this.sessionId,
            userId: this.userId,
            startTime: this.startTime,
            lastActivity: this.lastActivity
          }
        }),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to send analytics events:', error);
      // Put events back if sending failed
      this.events.unshift(...eventsToSend);
    }
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  // Public methods for manual tracking
  public track = {
    pageView: (page?: string) => this.trackPageView(page),
    search: (query: string, results?: number, filters?: any) => this.trackSearch(query, results, filters),
    roomView: (roomId: string, roomName?: string, buildingId?: string) => this.trackRoomView(roomId, roomName, buildingId),
    buildingView: (buildingId: string, buildingName?: string) => this.trackBuildingView(buildingId, buildingName),
    navigation: (from: string, to: string, method?: 'click' | 'search' | 'direct') => this.trackNavigation(from, to, method),
    featureUse: (feature: string, details?: any) => this.trackFeatureUse(feature, details),
    error: (error: any, source?: string, line?: number) => this.trackError(error, source, line),
    performance: (metric: string, value: number, details?: any) => this.trackPerformance(metric, value, details)
  };
}

// Create global analytics instance
const analytics = new AnalyticsTracker();

// Export for use in components
export default analytics;

// Helper hook for React components
export const useAnalytics = () => {
  return analytics.track;
};