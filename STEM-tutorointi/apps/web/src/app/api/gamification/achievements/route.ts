import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/server';

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const allAchievements = await prisma.achievement.findMany({
      orderBy: [{ rarity: 'desc' }, { category: 'asc' }],
    });

    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: auth.user!.id },
      include: { achievement: true },
    });

    const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId));

    const unlocked = allAchievements.filter((a) => unlockedIds.has(a.id));
    const locked = allAchievements.filter((a) => !unlockedIds.has(a.id));

    return NextResponse.json({
      success: true,
      data: {
        unlocked,
        locked,
        total: allAchievements.length,
        unlockedCount: unlocked.length,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}
