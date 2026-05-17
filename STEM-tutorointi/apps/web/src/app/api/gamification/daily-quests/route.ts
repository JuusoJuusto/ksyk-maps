// ============================================
// STEM Genius - Daily Quests API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface DailyQuest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  xpReward: number;
  completed: boolean;
}

// GET /api/gamification/daily-quests
export async function GET(request: NextRequest) {
  try {
    // TODO: Get userId from session/auth
    const user = await prisma.user.findFirst({
      where: { email: 'student@stemgenius.com' },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get today's progress
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysTasks = await prisma.userTask.findMany({
      where: {
        userId: user.id,
        completedAt: { gte: today },
      },
      include: { task: true },
    });

    const tasksCompleted = todaysTasks.length;
    const correctTasks = todaysTasks.filter((t) => t.isCorrect).length;
    const xpEarned = todaysTasks.reduce((sum, t) => sum + t.xpEarned, 0);
    const totalTime = todaysTasks.reduce((sum, t) => sum + t.timeSpent, 0);

    // Generate daily quests
    const quests: DailyQuest[] = [
      {
        id: 'daily-tasks',
        title: 'Complete 5 Tasks',
        description: 'Finish 5 learning tasks today',
        progress: tasksCompleted,
        target: 5,
        xpReward: 100,
        completed: tasksCompleted >= 5,
      },
      {
        id: 'daily-xp',
        title: 'Earn 500 XP',
        description: 'Collect 500 XP from tasks',
        progress: xpEarned,
        target: 500,
        xpReward: 150,
        completed: xpEarned >= 500,
      },
      {
        id: 'perfect-score',
        title: 'Perfect Score',
        description: 'Get 3 tasks correct on first try',
        progress: correctTasks,
        target: 3,
        xpReward: 200,
        completed: correctTasks >= 3,
      },
      {
        id: 'study-time',
        title: 'Study 30 Minutes',
        description: 'Spend 30 minutes learning',
        progress: Math.floor(totalTime / 60),
        target: 30,
        xpReward: 100,
        completed: totalTime >= 1800,
      },
    ];

    return NextResponse.json({ quests });
  } catch (error) {
    console.error('Daily quests fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily quests' },
      { status: 500 }
    );
  }
}
