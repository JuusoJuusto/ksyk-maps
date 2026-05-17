// ============================================
// STEM Genius - Rate Limiting
// Production-grade rate limiting
// ============================================

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach((key) => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Rate limit a request based on identifier (IP, user ID, etc.)
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const key = identifier;

  // Initialize or get existing entry
  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 0,
      resetTime: now + config.interval,
    };
  }

  // Increment count
  store[key].count++;

  const remaining = Math.max(0, config.maxRequests - store[key].count);
  const success = store[key].count <= config.maxRequests;

  return {
    success,
    limit: config.maxRequests,
    remaining,
    reset: store[key].resetTime,
  };
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // Authentication endpoints - strict limits
  auth: {
    interval: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
  },

  // API endpoints - moderate limits
  api: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
  },

  // AI endpoints - conservative limits (expensive)
  ai: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute
  },

  // Task generation - conservative limits
  taskGeneration: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 generations per minute
  },

  // General endpoints - generous limits
  general: {
    interval: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
};

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

/**
 * Get identifier from request (IP address or user ID)
 */
export function getIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  return `ip:${ip}`;
}
