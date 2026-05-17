// ============================================
// STEM Genius - Performance Monitoring
// Track and optimize performance metrics
// ============================================

import { logger } from './logger';

/**
 * Measure execution time of a function
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logger.performanceMetric(name, duration, 'ms');
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.performanceMetric(`${name} (failed)`, duration, 'ms');
    throw error;
  }
}

/**
 * Measure execution time of a synchronous function
 */
export function measure<T>(name: string, fn: () => T): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    logger.performanceMetric(name, duration, 'ms');
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.performanceMetric(`${name} (failed)`, duration, 'ms');
    throw error;
  }
}

/**
 * Performance timer class for manual timing
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  end() {
    const duration = performance.now() - this.startTime;
    logger.performanceMetric(this.name, duration, 'ms');
    return duration;
  }

  lap(label: string) {
    const duration = performance.now() - this.startTime;
    logger.performanceMetric(`${this.name} - ${label}`, duration, 'ms');
    return duration;
  }
}

/**
 * Track Web Vitals (Core Web Vitals)
 */
export function trackWebVitals() {
  if (typeof window === 'undefined') return;

  // Largest Contentful Paint (LCP)
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    logger.performanceMetric('LCP', lastEntry.startTime, 'ms');
  });
  lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay (FID)
  const fidObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      logger.performanceMetric('FID', entry.processingStart - entry.startTime, 'ms');
    });
  });
  fidObserver.observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift (CLS)
  let clsScore = 0;
  const clsObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      if (!entry.hadRecentInput) {
        clsScore += entry.value;
      }
    });
    logger.performanceMetric('CLS', clsScore, '');
  });
  clsObserver.observe({ entryTypes: ['layout-shift'] });

  // Time to First Byte (TTFB)
  const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navigationEntry) {
    const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
    logger.performanceMetric('TTFB', ttfb, 'ms');
  }
}

/**
 * Monitor memory usage (if available)
 */
export function trackMemoryUsage() {
  if (typeof window === 'undefined') return;
  
  const memory = (performance as any).memory;
  if (memory) {
    logger.performanceMetric('Memory Used', memory.usedJSHeapSize / 1048576, 'MB');
    logger.performanceMetric('Memory Total', memory.totalJSHeapSize / 1048576, 'MB');
    logger.performanceMetric('Memory Limit', memory.jsHeapSizeLimit / 1048576, 'MB');
  }
}

/**
 * Track API call performance
 */
export async function trackAPICall<T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = new PerformanceTimer(`API ${method} ${endpoint}`);
  try {
    const result = await fn();
    timer.end();
    return result;
  } catch (error) {
    timer.end();
    throw error;
  }
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Lazy load images for better performance
 */
export function lazyLoadImage(img: HTMLImageElement) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLImageElement;
        target.src = target.dataset.src || '';
        observer.unobserve(target);
      }
    });
  });
  
  observer.observe(img);
}

/**
 * Preload critical resources
 */
export function preloadResource(href: string, as: string) {
  if (typeof document === 'undefined') return;
  
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
}
