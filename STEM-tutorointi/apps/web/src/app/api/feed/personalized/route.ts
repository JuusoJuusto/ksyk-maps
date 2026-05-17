import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/server';

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.user!.id },
      include: {
        profile: true,
        xp: true,
        streaks: true,
        tasks: {
          take: 10,
          orderBy: { completedAt: 'desc' },
          include: { task: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const items: Array<Record<string, unknown>> = [];

    if (user.profile?.weakTopics) {
      const weakTopics = user.profile.weakTopics as string[];
      if (weakTopics.length > 0) {
        items.push({
          id: 'rec-weak-topic',
          type: 'recommendation',
          title: `Practice ${weakTopics[0]}`,
          description: "You've struggled with this topic. Let's strengthen it!",
          action: {
            label: 'Start Practice',
            href: `/practice?topic=${weakTopics[0]}`,
          },
          metadata: {
            subject: 'MATHEMATICS',
            difficulty: user.profile.difficultyLevel,
          },
        });
      }
    }

    const streak = user.streaks;
    if (streak) {
      const lastActivity = new Date(streak.lastActivityDate);
      const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);

      if (hoursSinceActivity > 20 && hoursSinceActivity < 24) {
        items.push({
          id: 'alert-streak',
          type: 'alert',
          title: 'Don\'t Break Your Streak!',
          description: `You have ${Math.floor(24 - hoursSinceActivity)} hours left to maintain your ${streak.currentStreak}-day streak`,
          action: {
            label: 'Complete a Task',
            href: '/tasks',
          },
        });
      }
    }

    items.push({
      id: 'challenge-daily',
      type: 'challenge',
      title: 'Daily Challenge',
      description: 'Complete 3 advanced physics problems',
      action: {
        label: 'Accept Challenge',
        href: '/challenges/daily',
      },
      metadata: {
        xpReward: 300,
        timeLimit: '24h',
      },
    });

    const recentAchievement = await prisma.userAchievement.findFirst({
      where: { userId: user.id },
      orderBy: { unlockedAt: 'desc' },
      include: { achievement: true },
    });

    if (recentAchievement) {
      items.push({
        id: `achievement-${recentAchievement.id}`,
        type: 'achievement',
        title: 'Achievement Unlocked!',
        description: recentAchievement.achievement.name,
        metadata: {
          icon: recentAchievement.achievement.icon,
          rarity: recentAchievement.achievement.rarity,
        },
      });
    }

    const completedTasks = user.tasks.filter((t) => t.isCorrect).length;
    const totalTasks = user.tasks.length;
    const accuracy = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    items.push({
      id: 'insight-accuracy',
      type: 'insight',
      title: 'Your Progress',
      description: `You're maintaining ${accuracy.toFixed(0)}% accuracy. ${accuracy > 80 ? 'Excellent work!' : 'Keep practicing to improve!'}`,
    });

    items.push({
      id: 'coach-tip',
      type: 'coach-tip',
      title: 'Study Tip',
      description: 'Break complex problems into smaller steps. Master each step before moving forward.',
    });

    return NextResponse.json({ success: true, data: { items, recommendations: items } });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    );
  }
}
