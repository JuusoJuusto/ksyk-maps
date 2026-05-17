import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthService } from '@/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
      || request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const user = await AuthService.getUserFromToken(token);

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401 }
      );
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.id },
    });

    const xp = await prisma.userXP.findUnique({
      where: { userId: user.id },
    });

    const streaks = await prisma.userStreak.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        subscriptionTier: user.subscriptionTier,
        lastLoginAt: user.lastLoginAt?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        profile: profile ? {
          gradeLevel: profile.gradeLevel,
          school: profile.school,
          country: profile.country,
          language: profile.language,
          darkMode: profile.darkMode,
          notifications: profile.notifications,
          soundEffects: profile.soundEffects,
        } : null,
        xp: xp ? {
          totalXP: xp.totalXP,
          level: xp.level,
          mathXP: xp.mathXP,
          physicsXP: xp.physicsXP,
          chemistryXP: xp.chemistryXP,
          astronomyXP: xp.astronomyXP,
        } : null,
        streak: streaks ? {
          currentStreak: streaks.currentStreak,
          longestStreak: streaks.longestStreak,
          freezesAvailable: streaks.freezesAvailable,
        } : null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }
}
