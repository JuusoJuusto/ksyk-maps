import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './security';

export function requireAuth(req: NextRequest, roles?: string[]) {
  const access = req.cookies.get('access-token')?.value || null;
  const data: any = access ? verifyAccessToken(access) : null;
  if (!data || !data.userId) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (roles && roles.length > 0 && !roles.includes(data.role)) {
    throw NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return data;
}

export function requireCsrf(req: NextRequest) {
  const headerToken = req.headers.get('x-csrf-token') || req.headers.get('x-xsrf-token');
  const cookieToken = req.cookies.get('csrf-token')?.value || null;
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    throw NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 });
  }
}
