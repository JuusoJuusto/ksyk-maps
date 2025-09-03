// Comprehensive health check and monitoring system for KSYK Navigator

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  details?: any;
}

export interface SystemHealth {
  overall: 'healthy' | 'warning' | 'error';
  api: HealthCheckResult;
  database: HealthCheckResult;
  features: HealthCheckResult;
  performance: HealthCheckResult;
  memory: HealthCheckResult;
  network: HealthCheckResult;
}

class HealthMonitor {
  private static instance: HealthMonitor;
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(health: SystemHealth) => void> = [];

  static getInstance(): HealthMonitor {
    if (!HealthMonitor.instance) {
      HealthMonitor.instance = new HealthMonitor();
    }
    return HealthMonitor.instance;
  }

  async performFullHealthCheck(): Promise<SystemHealth> {
    const [api, database, features, performance, memory, network] = await Promise.all([
      this.checkAPI(),
      this.checkDatabase(),
      this.checkFeatures(),
      this.checkPerformance(),
      this.checkMemory(),
      this.checkNetwork()
    ]);

    const results = [api, database, features, performance, memory, network];
    const hasError = results.some(r => r.status === 'error');
    const hasWarning = results.some(r => r.status === 'warning');

    const overall = hasError ? 'error' : hasWarning ? 'warning' : 'healthy';

    const health: SystemHealth = {
      overall,
      api,
      database,
      features,
      performance,
      memory,
      network
    };

    // Notify listeners
    this.listeners.forEach(listener => listener(health));

    return health;
  }

  private async checkAPI(): Promise<HealthCheckResult> {
    try {
      const start = performance.now();
      const responses = await Promise.all([
        fetch('/api/buildings'),
        fetch('/api/rooms'),
        fetch('/api/auth/user')
      ]);

      const duration = performance.now() - start;
      const allOk = responses.every(r => r.ok || r.status === 401); // 401 is OK for auth endpoint

      if (!allOk) {
        return {
          status: 'error',
          message: 'API endpoints returning errors',
          timestamp: new Date(),
          details: { responses: responses.map(r => ({ status: r.status, ok: r.ok })) }
        };
      }

      if (duration > 2000) {
        return {
          status: 'warning',
          message: 'API response time is slow',
          timestamp: new Date(),
          details: { duration: Math.round(duration) }
        };
      }

      return {
        status: 'healthy',
        message: 'All API endpoints responding normally',
        timestamp: new Date(),
        details: { duration: Math.round(duration) }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'API endpoints unreachable',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    try {
      const start = performance.now();
      const response = await fetch('/api/buildings');
      const duration = performance.now() - start;

      if (!response.ok) {
        return {
          status: 'error',
          message: 'Database queries failing',
          timestamp: new Date(),
          details: { status: response.status }
        };
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        return {
          status: 'warning',
          message: 'Database contains no data',
          timestamp: new Date()
        };
      }

      return {
        status: 'healthy',
        message: 'Database responding with valid data',
        timestamp: new Date(),
        details: { recordCount: data.length, queryTime: Math.round(duration) }
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkFeatures(): Promise<HealthCheckResult> {
    const features = [
      'WebGL', 'WebRTC', 'ServiceWorker', 'IndexedDB', 
      'localStorage', 'sessionStorage', 'Geolocation'
    ];

    const supportedFeatures = features.filter(feature => {
      switch (feature) {
        case 'WebGL':
          const canvas = document.createElement('canvas');
          return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        case 'WebRTC':
          return !!(window.RTCPeerConnection || (window as any).mozRTCPeerConnection || (window as any).webkitRTCPeerConnection);
        case 'ServiceWorker':
          return 'serviceWorker' in navigator;
        case 'IndexedDB':
          return 'indexedDB' in window;
        case 'localStorage':
          return 'localStorage' in window;
        case 'sessionStorage':
          return 'sessionStorage' in window;
        case 'Geolocation':
          return 'geolocation' in navigator;
        default:
          return false;
      }
    });

    const supportedCount = supportedFeatures.length;
    const totalCount = features.length;
    const percentage = (supportedCount / totalCount) * 100;

    if (percentage < 50) {
      return {
        status: 'error',
        message: 'Many advanced features not supported',
        timestamp: new Date(),
        details: { supported: supportedFeatures, percentage: Math.round(percentage) }
      };
    }

    if (percentage < 80) {
      return {
        status: 'warning',
        message: 'Some features may not work optimally',
        timestamp: new Date(),
        details: { supported: supportedFeatures, percentage: Math.round(percentage) }
      };
    }

    return {
      status: 'healthy',
      message: 'All advanced features supported',
      timestamp: new Date(),
      details: { supported: supportedFeatures, percentage: Math.round(percentage) }
    };
  }

  private async checkPerformance(): Promise<HealthCheckResult> {
    const start = performance.now();
    
    // Simulate some work to measure performance
    for (let i = 0; i < 100000; i++) {
      Math.sqrt(i);
    }
    
    const duration = performance.now() - start;
    
    // Check FPS if available
    let fps = 60; // Default assumption
    if ('requestAnimationFrame' in window) {
      fps = await this.measureFPS();
    }

    if (duration > 100 || fps < 30) {
      return {
        status: 'warning',
        message: 'Performance may be degraded',
        timestamp: new Date(),
        details: { computeTime: Math.round(duration), fps }
      };
    }

    return {
      status: 'healthy',
      message: 'Performance is optimal',
      timestamp: new Date(),
      details: { computeTime: Math.round(duration), fps }
    };
  }

  private async checkMemory(): Promise<HealthCheckResult> {
    const memory = (performance as any).memory;
    
    if (!memory) {
      return {
        status: 'warning',
        message: 'Memory information not available',
        timestamp: new Date()
      };
    }

    const usedMB = memory.usedJSHeapSize / 1024 / 1024;
    const totalMB = memory.totalJSHeapSize / 1024 / 1024;
    const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
    
    const usage = (usedMB / limitMB) * 100;

    if (usage > 80) {
      return {
        status: 'error',
        message: 'High memory usage detected',
        timestamp: new Date(),
        details: { usedMB: Math.round(usedMB), totalMB: Math.round(totalMB), usage: Math.round(usage) }
      };
    }

    if (usage > 60) {
      return {
        status: 'warning',
        message: 'Moderate memory usage',
        timestamp: new Date(),
        details: { usedMB: Math.round(usedMB), totalMB: Math.round(totalMB), usage: Math.round(usage) }
      };
    }

    return {
      status: 'healthy',
      message: 'Memory usage is normal',
      timestamp: new Date(),
      details: { usedMB: Math.round(usedMB), totalMB: Math.round(totalMB), usage: Math.round(usage) }
    };
  }

  private async checkNetwork(): Promise<HealthCheckResult> {
    const connection = (navigator as any).connection;
    
    if (!connection) {
      return {
        status: 'warning',
        message: 'Network information not available',
        timestamp: new Date()
      };
    }

    const { effectiveType, downlink, rtt } = connection;

    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return {
        status: 'warning',
        message: 'Slow network connection detected',
        timestamp: new Date(),
        details: { effectiveType, downlink, rtt }
      };
    }

    if (rtt > 1000) {
      return {
        status: 'warning',
        message: 'High network latency',
        timestamp: new Date(),
        details: { effectiveType, downlink, rtt }
      };
    }

    return {
      status: 'healthy',
      message: 'Network connection is good',
      timestamp: new Date(),
      details: { effectiveType, downlink, rtt }
    };
  }

  private measureFPS(): Promise<number> {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      
      function count() {
        frames++;
        if (frames < 60) {
          requestAnimationFrame(count);
        } else {
          const duration = performance.now() - start;
          const fps = Math.round((frames * 1000) / duration);
          resolve(fps);
        }
      }
      
      requestAnimationFrame(count);
    });
  }

  startMonitoring(interval: number = 30000): void {
    this.stopMonitoring();
    this.checkInterval = setInterval(() => {
      this.performFullHealthCheck();
    }, interval);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  onHealthChange(listener: (health: SystemHealth) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
}

export const healthMonitor = HealthMonitor.getInstance();