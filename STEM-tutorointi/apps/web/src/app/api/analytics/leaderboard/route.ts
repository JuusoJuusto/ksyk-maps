import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsService } from '@/services/analytics.service';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') as 'global' | 'friends' | 'school' | 'class' || 'global';
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' | 'all-time' || 'weekly';
    const subject = searchParams.get('subject');
    const userId = auth.user!.id;

    let leaderboardType: 'global' | 'weekly' | 'monthly' = 'global';
    if (period === 'weekly' || period === 'daily') leaderboardType = 'weekly';
    else if (period === 'monthly') leaderboardType = 'monthly';

    const entries = await AnalyticsService.getLeaderboard(leaderboardType, 50);

    const userRank = entries.findIndex((e) => e.userId === userId) + 1;

    let actualUserRank = userRank;
    if (userRank === 0) {
      const userXP = await prisma.userXP.findUnique({
        where: { userId },
      });

      if (userXP) {
        const higherRanked = await prisma.userXP.count({
          where: { totalXP: { gt: userXP.totalXP } },
        });
        actualUserRank = higherRanked + 1;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        entries,
        userRank: actualUserRank || undefined,
        scope,
        period,
        subject,
      },
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
