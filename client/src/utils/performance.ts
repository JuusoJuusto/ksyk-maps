// Performance optimization utilities for KSYK Navigator
import React, { ComponentType } from 'react';

// Debounce function for search inputs and API calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function for scroll events and animations
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memoization for expensive calculations
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// Lazy loading utility for components
export function createLazyComponent(importFn: () => Promise<{ default: ComponentType<any> }>) {
  return React.lazy(importFn);
}

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    };
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  getMetrics(name: string): {
    average: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    return {
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  getAllMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    Array.from(this.metrics.keys()).forEach(name => {
      result[name] = this.getMetrics(name);
    });
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Image optimization utilities
export function createOptimizedImageUrl(
  src: string, 
  width?: number, 
  height?: number, 
  quality: number = 80
): string {
  if (!src) return '';
  
  // For development, return original URL
  if (process.env.NODE_ENV === 'development') {
    return src;
  }
  
  // Add optimization parameters
  const url = new URL(src, window.location.origin);
  if (width) url.searchParams.set('w', width.toString());
  if (height) url.searchParams.set('h', height.toString());
  url.searchParams.set('q', quality.toString());
  
  return url.toString();
}

// Virtual scrolling for large lists
export function calculateVisibleItems(
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  totalItems: number,
  overscan: number = 5
): {
  startIndex: number;
  endIndex: number;
  offsetY: number;
} {
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + overscan * 2);
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY };
}

// Canvas optimization for 3D rendering
export function createOptimizedCanvas(
  width: number, 
  height: number, 
  devicePixelRatio: number = window.devicePixelRatio || 1
): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  scale: number;
} {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  
  // Set actual size in memory (scaled for high DPI)
  const scale = Math.min(devicePixelRatio, 2); // Cap at 2x for performance
  canvas.width = width * scale;
  canvas.height = height * scale;
  
  // Scale the drawing context
  context.scale(scale, scale);
  
  // Set display size (CSS)
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  return { canvas, context, scale };
}

// Memory cleanup utilities
export function cleanupEventListeners(element: Element | Window, events: string[]): void {
  events.forEach(event => {
    element.removeEventListener(event, () => {});
  });
}

export function cleanupCanvasResources(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext('2d');
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
  canvas.width = 0;
  canvas.height = 0;
}

// Bundle size optimization
export function loadFeatureModule(featureName: string): Promise<any> {
  switch (featureName) {
    case 'ar-finder':
      return import('@/components/ARRoomFinder');
    case '3d-visualization':
      return import('@/components/Room3DVisualization');
    case 'virtual-tours':
      return import('@/components/VirtualRoomTours');
    case 'environmental':
      return import('@/components/EnvironmentalMonitoring');
    default:
      throw new Error(`Unknown feature: ${featureName}`);
  }
}

// WebWorker utilities for heavy computations
export function createWorker(workerFunction: Function): Worker {
  const blob = new Blob([`(${workerFunction.toString()})()`], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

// Battery and network-aware optimizations
export function isLowPowerMode(): boolean {
  return 'getBattery' in navigator && (navigator as any).getBattery?.() !== undefined;
}

export function getConnectionSpeed(): 'slow' | 'medium' | 'fast' {
  const connection = (navigator as any).connection;
  if (!connection) return 'medium';
  
  const effectiveType = connection.effectiveType;
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return 'slow';
  if (effectiveType === '3g') return 'medium';
  return 'fast';
}

// Auto-optimization based on device capabilities
export function getOptimalSettings(): {
  enableAnimations: boolean;
  maxConcurrentRequests: number;
  cacheSize: number;
  renderQuality: 'low' | 'medium' | 'high';
} {
  const connection = getConnectionSpeed();
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory || 4;

  return {
    enableAnimations: connection !== 'slow' && memory >= 2,
    maxConcurrentRequests: Math.min(hardwareConcurrency * 2, 8),
    cacheSize: memory >= 8 ? 100 : memory >= 4 ? 50 : 25,
    renderQuality: memory >= 8 && connection === 'fast' ? 'high' : 
                   memory >= 4 && connection !== 'slow' ? 'medium' : 'low'
  };
}