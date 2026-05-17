import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/services/auth.service';
import { z } from 'zod';
import { rateLimit, rateLimitConfigs, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  gradeLevel: z.number().int().min(1).max(12).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict for registration to prevent abuse
    const identifier = getIdentifier(request);
    const rateLimitResult = rateLimit(identifier, rateLimitConfigs.auth);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { 
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult),
        }
      );
    }

    const body = await request.json();
    const { name, email, password, gradeLevel } = registerSchema.parse(body);

    const { user, token } = await AuthService.register({
      name,
      email,
      password,
      gradeLevel,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          emailVerified: user.emailVerified,
          isActive: user.isActive,
          subscriptionTier: user.subscriptionTier,
          lastLoginAt: user.lastLoginAt?.toISOString(),
          createdAt: user.createdAt.toISOString(),
        },
        token,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    // Add rate limit headers
    const headers = getRateLimitHeaders(rateLimitResult);
    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
