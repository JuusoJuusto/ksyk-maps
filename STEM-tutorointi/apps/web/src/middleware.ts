// ============================================
// STEM Genius - Authentication Middleware
// Server-side route protection + Security Headers
// ============================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verify } from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production';

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/onboarding',
  '/tutor',
  '/practice',
  '/progress',
  '/achievements',
  '/leaderboard',
  '/settings',
  '/account',
  '/subscription',
];

// Public routes that don't require auth
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/about',
  '/pricing',
  '/features',
];

// API routes that require auth
const PROTECTED_API_ROUTES = [
  '/api/dashboard',
  '/api/tasks',
  '/api/ai',
  '/api/gamification',
  '/api/user',
  '/api/onboarding',
];

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com https://*.firebaseio.com https://*.googleapis.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Clickjacking protection
  response.headers.set('X-Frame-Options', 'DENY');

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  // HSTS (HTTP Strict Transport Security) - only in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isProtectedAPI = PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname === route);

  // Allow public routes
  if (isPublicRoute && !isProtectedRoute) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Get token from cookie or Authorization header
  const token = request.cookies.get('auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');

  // No token - redirect to login or return 401
  if (!token) {
    if (isProtectedAPI) {
      const response = NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    if (isProtectedRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const response = NextResponse.redirect(loginUrl);
      return addSecurityHeaders(response);
    }
  }

  // Verify token
  try {
    const decoded = verify(token!, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
      iat: number;
      exp: number;
    };

    // Token is valid - add user info to headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decoded.userId);
    requestHeaders.set('x-user-email', decoded.email);
    requestHeaders.set('x-user-role', decoded.role);

    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return addSecurityHeaders(response);
  } catch (error) {
    // Invalid token - clear cookie and redirect
    if (isProtectedAPI) {
      const response = NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
      return addSecurityHeaders(response);
    }

    if (isProtectedRoute) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return addSecurityHeaders(response);
    }
  }

  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
