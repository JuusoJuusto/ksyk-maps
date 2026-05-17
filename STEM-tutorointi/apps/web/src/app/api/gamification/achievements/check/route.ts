// ============================================
// STEM Genius - Check Achievements API
// Check and unlock achievements based on user progress
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const checkAchievementsSchema = z.object({
  userId: z.string().uuid(),
  category: z.enum(['TASKS_COMPLETED', 'STREAK', 'MASTERY', 'SPEED', 'ACCURACY', 'SOCIAL', 'SPECIAL']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, category } = checkAchievementsSchema.parse(body);

    // Get user data
    const [user, xp, streak, taskCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      prisma.userXP.findUnique({ where: { userId } }),
      prisma.userStreak.findUnique({ where: { userId } }),
      prisma.userTask.count({ where: { userId, isCorrect: true } }),
    ]);

    if (!user || !xp || !streak) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    // Get all achievements (or filtered by category)
    const achievements = await prisma.achievement.findMany({
      where: category ? { category } : undefined,
    });

    // Get already unlocked achievements
    const unlockedAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    });

    const unlockedIds = new Set(unlockedAchievements.map(a => a.achievementId));

    // Check each achievement
    const newlyUnlocked: any[] = [];

    for (const achievement of achievements) {
      if (unlockedIds.has(achievement.id)) continue;

      const criteria = achievement.criteria as any;
      let shouldUnlock = false;

      // Check criteria based on category
      switch (achievement.category) {
        case 'TASKS_COMPLETED':
          shouldUnlock = taskCount >= (criteria.count || 0);
          break;

        case 'STREAK':
          shouldUnlock = streak.currentStreak >= (criteria.streak || 0) ||
                        streak.longestStreak >= (criteria.longestStreak || 0);
          break;

        case 'MASTERY':
          shouldUnlock = xp.level >= (criteria.level || 0) ||
                        xp.totalXP >= (criteria.totalXP || 0);
          break;

        case 'SPEED':
          // Check average completion time
          const avgTime = await prisma.userTask.aggregate({
            where: { userId, isCorrect: true },
            _avg: { timeSpent: true },
          });
          shouldUnlock = (avgTime._avg.timeSpent || 0) <= (criteria.maxAvgTime || Infinity);
          break;

        case 'ACCURACY':
          // Check accuracy rate
          const totalTasks = await prisma.userTask.count({ where: { userId } });
          const accuracy = totalTasks > 0 ? taskCount / totalTasks : 0;
          shouldUnlock = accuracy >= (criteria.minAccuracy || 0);
          break;

        case 'SOCIAL':
          // Social achievements (placeholder for future features)
          shouldUnlock = false;
          break;

        case 'SPECIAL':
          // Special achievements (manually awarded)
          shouldUnlock = false;
          break;
      }

      if (shouldUnlock) {
        // Unlock achievement
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
          },
        });

        // Award XP
        if (achievement.xpReward > 0) {
          await prisma.userXP.update({
            where: { userId },
            data: {
              totalXP: { increment: achievement.xpReward },
            },
          });
        }

        // Create event
        await prisma.event.create({
          data: {
            userId,
            eventType: 'ACHIEVEMENT_UNLOCKED',
            eventData: {
              achievementId: achievement.id,
              achievementName: achievement.name,
              xpReward: achievement.xpReward,
            },
          },
        });

        newlyUnlocked.push({
          id: achievement.id,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          rarity: achievement.rarity,
          xpReward: achievement.xpReward,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        newlyUnlocked,
        totalUnlocked: unlockedAchievements.length + newlyUnlocked.length,
        totalAvailable: achievements.length,
      },
    });
  } catch (error: any) {
    console.error('Check achievements error:', error);

    return NextResponse.json(
      { error: 'Failed to check achievements', details: error.message },
      { status: 500 }
    );
  }
}
