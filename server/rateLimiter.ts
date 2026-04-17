import { Request, Response, NextFunction } from 'express';

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
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => req.ip || 'unknown'
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      return next();
    }
    
    store[key].count++;
    
    if (store[key].count > max) {
      return res.status(429).json({
        error: message,
        retryAfter: Math.ceil((store[key].resetTime - now) / 1000)
      });
    }
    
    next();
  };
}

// Predefined rate limiters for common use cases
export const rateLimiters = {
  // Strict rate limit for authentication endpoints
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }),
  
  // Moderate rate limit for API endpoints
  api: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
    message: 'Too many API requests. Please slow down.'
  }),
  
  // Lenient rate limit for general routes
  general: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests. Please try again shortly.'
  }),
  
  // Very strict for password reset
  passwordReset: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: 'Too many password reset attempts. Please try again in 1 hour.'
  }),
  
  // External service rate limit (HSL, lunch menu, etc.)
  externalService: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many requests to external service. Please wait a moment.'
  })
};
