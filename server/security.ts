/**
 * Security utilities for API endpoints
 * Includes rate limiting, input sanitization, and CSRF protection
 */

// Simple in-memory rate limiter (for serverless, consider using Vercel KV or Upstash Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting middleware
 * Limits requests per IP address
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `ratelimit:${ip}`;
  
  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);
  
  // Reset if window expired
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 0,
      resetTime: now + windowMs
    };
    rateLimitStore.set(key, entry);
  }
  
  // Increment counter
  entry.count++;
  
  // Check if limit exceeded
  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);
  
  // Cleanup old entries periodically (every 100 requests)
  if (Math.random() < 0.01) {
    cleanupRateLimitStore();
  }
  
  return {
    allowed,
    remaining,
    resetTime: entry.resetTime
  };
}

/**
 * Cleanup expired rate limit entries
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => rateLimitStore.delete(key));
}

/**
 * Get real IP address from request headers
 */
export function getRealIP(headers: any): string {
  return (
    headers['cf-connecting-ip'] ||
    headers['x-real-ip'] ||
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    'unknown'
  );
}

/**
 * Sanitize string input to prevent XSS
 * Removes HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic check)
 */
export function isValidPhone(phone: string): boolean {
  // Remove spaces, dashes, parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  // Check if it's 8-15 digits (international format)
  return /^\+?[0-9]{8,15}$/.test(cleaned);
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Validate CSRF token
 * In production, store tokens in session or database
 */
export function validateCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken;
}

/**
 * Check if request is from allowed origin
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  const allowedOrigins = [
    'https://ksykmaps.fi',
    'http://localhost:5000',
    'http://localhost:3000'
  ];
  
  return origin ? allowedOrigins.includes(origin) : false;
}

/**
 * SQL injection prevention (for text inputs)
 * Note: Firestore is NoSQL and uses parameterized queries, so this is extra protection
 */
export function preventSQLInjection(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove common SQL injection patterns
  return input
    .replace(/['";]/g, '') // Remove quotes and semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove block comment start
    .replace(/\*\//g, '') // Remove block comment end
    .replace(/\bOR\b/gi, '') // Remove OR keyword
    .replace(/\bAND\b/gi, '') // Remove AND keyword
    .replace(/\bDROP\b/gi, '') // Remove DROP keyword
    .replace(/\bDELETE\b/gi, '') // Remove DELETE keyword
    .replace(/\bUPDATE\b/gi, '') // Remove UPDATE keyword
    .trim();
}
