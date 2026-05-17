import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/server';
import { profileUpdateSchema } from '@/lib/validators';
import { rateLimit, rateLimitConfigs, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  // Rate limiting
  const rateLimitResult = rateLimit(getIdentifier(request, auth.user!.id), rateLimitConfigs.api);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user!.id },
      include: {
        profile: true,
        xp: true,
        streaks: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt.toISOString(),
        },
        profile: user.profile,
        xp: user.xp,
        streak: user.streaks,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { name, avatar, gradeLevel, school, language, timezone, darkMode, notifications, soundEffects } = parsed.data;

    await prisma.$transaction(async (tx) => {
      if (name || avatar) {
        await tx.user.update({
          where: { id: auth.user!.id },
          data: { name, avatar },
        });
      }

      const profileData: Record<string, unknown> = {};
      if (gradeLevel !== undefined) profileData.gradeLevel = gradeLevel;
      if (school !== undefined) profileData.school = school;
      if (language) profileData.language = language;
      if (timezone) profileData.timezone = timezone;
      if (darkMode !== undefined) profileData.darkMode = darkMode;
      if (notifications !== undefined) profileData.notifications = notifications;
      if (soundEffects !== undefined) profileData.soundEffects = soundEffects;

      if (Object.keys(profileData).length > 0) {
        await tx.userProfile.update({
          where: { userId: auth.user!.id },
          data: profileData,
        });
      }
    });

    return NextResponse.json({ success: true, data: { message: 'Profile updated' } });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}
