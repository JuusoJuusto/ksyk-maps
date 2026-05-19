import { NextResponse, NextRequest } from 'next/server';
import { verifyAccessToken } from './security';
import prisma from './prismaClient';

const PROTECTED_PATHS = ['/dashboard', '/app', '/onboarding', '/analytics', '/subscriptions', '/classrooms', '/ai', '/admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Public
  if (pathname === '/' || pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/public') || pathname.startsWith('/api/auth')) return NextResponse.next();

  for (const p of PROTECTED_PATHS) {
    if (pathname.startsWith(p)) {
      const access = req.cookies.get('access-token')?.value || null;
      const refreshToken = req.cookies.get('auth-token')?.value || null;
      
      // Verify JWT token
      const tokenData: any = access ? verifyAccessToken(access) : null;
      if (!tokenData || !tokenData.userId) {
        const url = req.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(url);
      }

      // CRITICAL: Verify session exists in database and is not expired
      if (refreshToken) {
        try {
          const session = await prisma.session.findUnique({ 
            where: { token: refreshToken },
            include: { user: true }
          });
          
          // Session must exist, not be expired, and user must be active
          if (!session || new Date(session.expiresAt) < new Date() || !session.user.isActive) {
            // Invalid session - clear cookies and redirect to login
            const url = req.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('redirectTo', pathname);
            url.searchParams.set('session', 'expired');
            const response = NextResponse.redirect(url);
            response.cookies.set('auth-token', '', { path: '/', maxAge: 0 });
            response.cookies.set('access-token', '', { path: '/', maxAge: 0 });
            response.cookies.set('csrf-token', '', { path: '/', maxAge: 0 });
            return response;
          }
          
          // Verify JWT userId matches session userId
          if (tokenData.userId !== session.userId) {
            const url = req.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('redirectTo', pathname);
            url.searchParams.set('error', 'invalid-session');
            const response = NextResponse.redirect(url);
            response.cookies.set('auth-token', '', { path: '/', maxAge: 0 });
            response.cookies.set('access-token', '', { path: '/', maxAge: 0 });
            response.cookies.set('csrf-token', '', { path: '/', maxAge: 0 });
            return response;
          }
        } catch (error) {
          console.error('Session validation error:', error);
          // On database error, fail closed - redirect to login
          const url = req.nextUrl.clone();
          url.pathname = '/login';
          url.searchParams.set('redirectTo', pathname);
          return NextResponse.redirect(url);
        }
      }
      
      const res = NextResponse.next();
      res.headers.set('x-user-id', tokenData.userId);
      return res;
    }
  }

  // set strict security headers for all responses
  const res = NextResponse.next();
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'no-referrer');
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=()');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Strict CSP - no unsafe-inline or unsafe-eval in production
  if (process.env.NODE_ENV === 'production') {
    res.headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self'; " +
      "style-src 'self' 'unsafe-inline'; " + // Allow inline styles for Tailwind
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
    // HSTS header for HTTPS enforcement
    res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  } else {
    // Development CSP - more permissive for hot reload
    res.headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' ws: wss:;"
    );
  }

  return res;
}

export const config = { matcher: ['/:path*'] };
