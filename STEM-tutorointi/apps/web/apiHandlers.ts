import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './authService';
import prisma from './prismaClient';
import { isRateLimited } from './rateLimiter';
import { generateCsrfToken, verifyCsrf } from './csrf';

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  } as any;
}

export async function handleLogin(req: NextRequest) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(`login:${ip}`, 10, 60_000)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  try {
    const body = await req.json();
    const { email, password } = body;
    const { user, refreshToken, accessToken } = await AuthService.login(email, password);
    const res = NextResponse.json({ success: true, data: { user } });
    res.cookies.set('auth-token', refreshToken, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 30 });
    res.cookies.set('access-token', accessToken, { ...cookieOptions(), maxAge: 60 * 15 });
    // set csrf token for double-submit
    const csrf = generateCsrfToken();
    res.cookies.set('csrf-token', csrf, { path: '/', sameSite: 'lax' });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Login failed' }, { status: 401 });
  }
}

export async function handleRegister(req: NextRequest) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(`register:${ip}`, 5, 60_000)) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  
  try {
    const body = await req.json();
    const { email, password, name } = body;
    const { user, refreshToken, accessToken } = await AuthService.register(email, password, name);
    const res = NextResponse.json({ success: true, data: { user } });
    res.cookies.set('auth-token', refreshToken, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 30 });
    res.cookies.set('access-token', accessToken, { ...cookieOptions(), maxAge: 60 * 15 });
    const csrf = generateCsrfToken();
    res.cookies.set('csrf-token', csrf, { path: '/', sameSite: 'lax' });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 400 });
  }
}

export async function handleRefresh(req: NextRequest) {
  // CSRF protection for state-changing operation
  const headerToken = req.headers.get('x-csrf-token') || req.headers.get('x-xsrf-token');
  const cookieToken = req.cookies.get('csrf-token')?.value || null;
  if (!verifyCsrf(headerToken, cookieToken)) {
    return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 });
  }
  
  try {
    const refresh = req.cookies.get('auth-token')?.value;
    if (!refresh) return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    const { user, refreshToken, accessToken } = await AuthService.refresh(refresh);
    const res = NextResponse.json({ success: true, data: { user } });
    res.cookies.set('auth-token', refreshToken, { ...cookieOptions(), maxAge: 60 * 60 * 24 * 30 });
    res.cookies.set('access-token', accessToken, { ...cookieOptions(), maxAge: 60 * 15 });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Refresh failed' }, { status: 401 });
  }
}

export async function handleSession(req: NextRequest) {
  const refresh = req.cookies.get('auth-token')?.value;
  if (!refresh) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const session = await prisma.session.findUnique({ where: { token: refresh } });
    if (!session) return NextResponse.json({ success: false }, { status: 401 });
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ success: false }, { status: 401 });
    return NextResponse.json({ success: true, data: { user: { id: user.id, email: user.email, name: user.name } } });
  } catch (err: any) {
    return NextResponse.json({ error: 'Session lookup failed' }, { status: 500 });
  }
}

export async function handleLogout(req: NextRequest) {
  try {
    const headerToken = req.headers.get('x-csrf-token') || req.headers.get('x-xsrf-token');
    const cookieToken = req.cookies.get('csrf-token')?.value || null;
    if (!verifyCsrf(headerToken, cookieToken)) return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 });
    const token = req.cookies.get('auth-token')?.value;
    if (token) await AuthService.logout(token);
    const res = NextResponse.json({ success: true });
    res.cookies.set('auth-token', '', { path: '/', maxAge: 0 });
    res.cookies.set('access-token', '', { path: '/', maxAge: 0 });
    res.cookies.set('csrf-token', '', { path: '/', maxAge: 0 });
    return res;
  } catch (err: any) {
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}

import { generateSignedToken, verifySignedToken } from './security';

export async function handleSendVerifyEmail(req: NextRequest) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(`verify-email:${ip}`, 3, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }
  
  // CSRF protection for state-changing operation
  const headerToken = req.headers.get('x-csrf-token') || req.headers.get('x-xsrf-token');
  const cookieToken = req.cookies.get('csrf-token')?.value || null;
  if (!verifyCsrf(headerToken, cookieToken)) {
    return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 });
  }
  
  try {
    const body = await req.json();
    const email = body.email;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ success: true }); // don't reveal
    const token = generateSignedToken({ userId: user.id, type: 'verify-email' }, '24h');
    const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/verify?token=${token}`;
    // TODO: integrate real mailer. For now, log the link.
    console.log('Email verification link:', link);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to send verification' }, { status: 500 });
  }
}

export async function handleVerifyEmail(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token') || (await req.json()).token;
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    const payload: any = verifySignedToken(token);
    if (!payload || payload.type !== 'verify-email' || !payload.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    await prisma.user.update({ where: { id: payload.userId }, data: { emailVerified: true } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
  }
}

export async function handleRequestPasswordReset(req: NextRequest) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(`password-reset:${ip}`, 3, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }
  
  // CSRF protection for state-changing operation
  const headerToken = req.headers.get('x-csrf-token') || req.headers.get('x-xsrf-token');
  const cookieToken = req.cookies.get('csrf-token')?.value || null;
  if (!verifyCsrf(headerToken, cookieToken)) {
    return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 });
  }
  
  try {
    const body = await req.json();
    const email = body.email;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ success: true });
    const token = generateSignedToken({ userId: user.id, type: 'password-reset' }, '1h');
    const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    console.log('Password reset link:', link);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to request password reset' }, { status: 500 });
  }
}

export async function handleConfirmPasswordReset(req: NextRequest) {
  const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown';
  if (isRateLimited(`confirm-reset:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  }
  
  // CSRF protection for state-changing operation
  const headerToken = req.headers.get('x-csrf-token') || req.headers.get('x-xsrf-token');
  const cookieToken = req.cookies.get('csrf-token')?.value || null;
  if (!verifyCsrf(headerToken, cookieToken)) {
    return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 });
  }
  
  try {
    const body = await req.json();
    const { token, newPassword } = body;
    const payload: any = verifySignedToken(token);
    if (!payload || payload.type !== 'password-reset' || !payload.userId) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    const passwordHash = await (await import('./security')).hashPassword(newPassword);
    await prisma.user.update({ where: { id: payload.userId }, data: { passwordHash } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}

// Additional admin/session endpoints
export async function handleListSessions(req: NextRequest) {
  try {
    const userId = req.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const sessions = await prisma.session.findMany({ where: { userId } });
    return NextResponse.json({ success: true, data: { sessions } });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}

export async function handleRevokeSession(req: NextRequest) {
  try {
    const headerToken = req.headers.get('x-csrf-token') || req.headers.get('x-xsrf-token');
    const cookieToken = req.cookies.get('csrf-token')?.value || null;
    if (!verifyCsrf(headerToken, cookieToken)) return NextResponse.json({ error: 'CSRF verification failed' }, { status: 403 });
    const body = await req.json();
    const { token } = body;
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    await prisma.session.deleteMany({ where: { token } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}
