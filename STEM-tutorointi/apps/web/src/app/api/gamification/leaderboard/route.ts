// ============================================
// STEM Genius - Leaderboard API
// Get leaderboard rankings
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const leaderboardSchema = z.object({
  type: z.enum(['global', 'weekly', 'monthly', 'subject']).default('global'),
  subject: z.enum(['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY']).optional(),
  limit: z.number().min(1).max(100).default(50),
  userId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = leaderboardSchema.parse({
      type: searchParams.get('type') || 'global',
      subject: searchParams.get('subject') || undefined,
      limit: parseInt(searchParams.get('limit') || '50'),
      userId: searchParams.get('userId') || undefined,
    });

    let orderBy: any = { totalXP: 'desc' };
    let where: any = {};

    // Subject-specific leaderboard
    if (params.type === 'subject' && params.subject) {
      const subjectXPField = `${params.subject.toLowerCase()}XP`;
      orderBy = { [subjectXPField]: 'desc' };
    }

    // Get top users
    const topUsers = await prisma.userXP.findMany({
      where,
      orderBy,
      take: params.limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            profile: {
              select: {
                gradeLevel: true,
                school: true,
              },
            },
          },
        },
      },
    });

    // Format leaderboard
    const leaderboard = topUsers.map((entry, index) => ({
      rank: index + 1,
      userId: entry.user.id,
      name: entry.user.name,
      avatar: entry.user.avatar,
      gradeLevel: entry.user.profile?.gradeLevel,
      school: entry.user.profile?.school,
      xp: params.type === 'subject' && params.subject
        ? entry[`${params.subject.toLowerCase()}XP` as keyof typeof entry]
        : entry.totalXP,
      level: entry.level,
    }));

    // Get current user's rank if userId provided
    let userRank = null;
    if (params.userId) {
      const userXP = await prisma.userXP.findUnique({
        where: { userId: params.userId },
      });

      if (userXP) {
        const xpValue = params.type === 'subject' && params.subject
          ? userXP[`${params.subject.toLowerCase()}XP` as keyof typeof userXP]
          : userXP.totalXP;

        const rank = await prisma.userXP.count({
          where: {
            [params.type === 'subject' && params.subject
              ? `${params.subject.toLowerCase()}XP`
              : 'totalXP']: {
              gt: xpValue,
            },
          },
        });

        userRank = {
          rank: rank + 1,
          xp: xpValue,
          level: userXP.level,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        leaderboard,
        userRank,
        type: params.type,
        subject: params.subject,
        totalEntries: leaderboard.length,
      },
    });
  } catch (error: any) {
    console.error('Leaderboard error:', error);

    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', details: error.message },
      { status: 500 }
    );
  }
}
