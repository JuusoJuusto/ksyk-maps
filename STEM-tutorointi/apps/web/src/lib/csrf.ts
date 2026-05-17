// ============================================
// STEM Genius - CSRF Protection
// Cross-Site Request Forgery protection
// ============================================

import { NextRequest } from 'next/server';
import { randomBytes, createHmac } from 'crypto';

const CSRF_SECRET = process.env.CSRF_SECRET || 'your-csrf-secret-change-in-production';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CSRFToken {
  token: string;
  timestamp: number;
}

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  const token = randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const timestamp = Date.now();
  
  const payload = `${token}:${timestamp}`;
  const signature = createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');
  
  return `${payload}:${signature}`;
}

/**
 * Verify a CSRF token
 */
export function verifyCSRFToken(token: string): boolean {
  try {
    const parts = token.split(':');
    if (parts.length !== 3) {
      return false;
    }

    const [tokenValue, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    // Check expiry
    if (Date.now() - timestamp > CSRF_TOKEN_EXPIRY) {
      return false;
    }

    // Verify signature
    const payload = `${tokenValue}:${timestamp}`;
    const expectedSignature = createHmac('sha256', CSRF_SECRET)
      .update(payload)
      .digest('hex');

    return signature === expectedSignature;
  } catch (error) {
    return false;
  }
}

/**
 * Get CSRF token from request headers or cookies
 */
export function getCSRFTokenFromRequest(request: NextRequest): string | null {
  // Check header first (for AJAX requests)
  const headerToken = request.headers.get('x-csrf-token');
  if (headerToken) {
    return headerToken;
  }

  // Check cookie
  const cookieToken = request.cookies.get('csrf-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Validate CSRF token from request
 */
export function validateCSRFToken(request: NextRequest): boolean {
  // GET, HEAD, OPTIONS requests don't need CSRF protection
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }

  const token = getCSRFTokenFromRequest(request);
  if (!token) {
    return false;
  }

  return verifyCSRFToken(token);
}

/**
 * CSRF protection middleware helper
 */
export function requireCSRF(request: NextRequest): void {
  if (!validateCSRFToken(request)) {
    throw new Error('Invalid or missing CSRF token');
  }
}
