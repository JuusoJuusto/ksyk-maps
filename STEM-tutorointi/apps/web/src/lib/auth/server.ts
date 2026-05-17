/**
 * Server-side authentication helpers
 * Extracts and validates user from middleware headers
 */

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string | null;
  emailVerified: boolean;
  isActive: boolean;
  subscriptionTier: string;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get the current user from middleware-injected headers
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<ServerUser | null> {
  const h = await headers();
  const userId = h.get('x-user-id');

  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.isActive) return null;

    return user as unknown as ServerUser;
  } catch {
    return null;
  }
}

/**
 * Require authentication - returns user or 401 response
 * Use in API route handlers
 */
export async function requireAuth(): Promise<
  | { user: ServerUser; response: null }
  | { user: null; response: NextResponse }
> {
  const user = await getCurrentUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }

  return { user, response: null };
}

/**
 * Require a specific role
 */
export async function requireRole(requiredRole: string): Promise<
  | { user: ServerUser; response: null }
  | { user: null; response: NextResponse }
> {
  const auth = await requireAuth();
  if (auth.response) return auth;

  const roleHierarchy: Record<string, number> = {
    STUDENT: 0,
    TEACHER: 1,
    ADMIN: 2,
    SUPER_ADMIN: 3,
  };

  if ((roleHierarchy[auth.user.role] ?? 0) < (roleHierarchy[requiredRole] ?? 0)) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Forbidden', code: 'INSUFFICIENT_ROLE' },
        { status: 403 }
      ),
    };
  }

  return auth;
}

/**
 * Require premium subscription
 */
export async function requirePremium(): Promise<
  | { user: ServerUser; response: null }
  | { user: null; response: NextResponse }
> {
  const auth = await requireAuth();
  if (auth.response) return auth;

  if (auth.user.subscriptionTier === 'FREE') {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Premium subscription required', code: 'PREMIUM_REQUIRED' },
        { status: 402 }
      ),
    };
  }

  return auth;
}
