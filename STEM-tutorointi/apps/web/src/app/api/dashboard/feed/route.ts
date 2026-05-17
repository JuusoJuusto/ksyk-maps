// ============================================
// STEM Genius - Personalized Feed API
// Generate AI-powered personalized dashboard feed
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOpenAI } from '@/lib/openai';
import { z } from 'zod';

const feedSchema = z.object({
  userId: z.string().uuid(),
  limit: z.number().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = feedSchema.parse({
      userId: searchParams.get('userId'),
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    });

    // Get user data
    const [user, xp, streak, recentTasks, profile] = await Promise.all([
      prisma.user.findUnique({ where: { id: params.userId } }),
      prisma.userXP.findUnique({ where: { userId: params.userId } }),
      prisma.userStreak.findUnique({ where: { userId: params.userId } }),
      prisma.userTask.findMany({
        where: { userId: params.userId },
        orderBy: { completedAt: 'desc' },
        take: 10,
        include: { task: true },
      }),
      prisma.userProfile.findUnique({ where: { userId: params.userId } }),
    ]);

    if (!user || !xp || !streak || !profile) {
      return NextResponse.json(
        { error: 'User data not found' },
        { status: 404 }
      );
    }

    // Calculate performance metrics
    const totalTasks = recentTasks.length;
    const correctTasks = recentTasks.filter(t => t.isCorrect).length;
    const accuracy = totalTasks > 0 ? correctTasks / totalTasks : 0;
    const avgTimeSpent = totalTasks > 0
      ? recentTasks.reduce((sum, t) => sum + t.timeSpent, 0) / totalTasks
      : 0;

    // Generate AI recommendations
    const recommendationsPrompt = `Generate personalized learning recommendations for this student:

Profile:
- Level: ${xp.level}
- Total XP: ${xp.totalXP}
- Current Streak: ${streak.currentStreak} days
- Recent Accuracy: ${(accuracy * 100).toFixed(1)}%
- Weak Topics: ${(profile.weakTopics as string[])?.join(', ') || 'None'}
- Strong Topics: ${(profile.strongTopics as string[])?.join(', ') || 'None'}
- Grade Level: ${profile.gradeLevel || 'Unknown'}

Generate 5-7 personalized feed items:
1. Continue learning recommendations
2. Weak topic alerts
3. Achievement progress
4. Study streak motivation
5. Daily goals
6. Exam preparation tips
7. Personalized insights

Return JSON:
{
  "items": [
    {
      "type": "recommendation" | "alert" | "achievement" | "streak" | "goal" | "insight",
      "title": "title",
      "description": "description",
      "action": "action text",
      "actionUrl": "url",
      "priority": 1-5,
      "icon": "emoji"
    }
  ]
}`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an AI learning coach generating personalized recommendations. Return only valid JSON.',
        },
        {
          role: 'user',
          content: recommendationsPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const recommendations = JSON.parse(completion.choices[0].message.content || '{"items":[]}');

    // Get recent achievements
    const recentAchievements = await prisma.userAchievement.findMany({
      where: { userId: params.userId },
      orderBy: { unlockedAt: 'desc' },
      take: 3,
      include: { achievement: true },
    });

    // Build feed
    const feed = {
      user: {
        name: user.name,
        avatar: user.avatar,
        level: xp.level,
        xp: xp.totalXP,
        streak: streak.currentStreak,
      },
      stats: {
        totalXP: xp.totalXP,
        level: xp.level,
        streak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        tasksCompleted: correctTasks,
        accuracy: accuracy * 100,
      },
      recommendations: recommendations.items || [],
      recentAchievements: recentAchievements.map(a => ({
        id: a.achievement.id,
        name: a.achievement.name,
        description: a.achievement.description,
        icon: a.achievement.icon,
        rarity: a.achievement.rarity,
        unlockedAt: a.unlockedAt,
      })),
      continuelearning: recentTasks.slice(0, 3).map(t => ({
        taskId: t.task.id,
        subject: t.task.subject,
        topic: t.task.topic,
        difficulty: t.task.difficulty,
        xpReward: t.task.xpReward,
      })),
    };

    return NextResponse.json({
      success: true,
      data: feed,
    });
  } catch (error: any) {
    console.error('Feed generation error:', error);

    return NextResponse.json(
      { error: 'Failed to generate feed', details: error.message },
      { status: 500 }
    );
  }
}
