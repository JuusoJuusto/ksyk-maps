// ============================================
// STEM Genius - Task List API
// Get personalized task recommendations
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const listTasksSchema = z.object({
  userId: z.string().uuid(),
  subject: z.enum(['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY']).optional(),
  difficulty: z.number().min(1).max(10).optional(),
  limit: z.number().min(1).max(50).default(20),
  excludeCompleted: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = listTasksSchema.parse({
      userId: searchParams.get('userId'),
      subject: searchParams.get('subject') || undefined,
      difficulty: searchParams.get('difficulty') ? parseFloat(searchParams.get('difficulty')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      excludeCompleted: searchParams.get('excludeCompleted') !== 'false',
    });

    // Get user profile for personalization
    const profile = await prisma.userProfile.findUnique({
      where: { userId: params.userId },
    });

    // Get completed task IDs
    let excludeIds: string[] = [];
    if (params.excludeCompleted) {
      const completed = await prisma.userTask.findMany({
        where: {
          userId: params.userId,
          isCorrect: true,
        },
        select: { taskId: true },
      });
      excludeIds = completed.map(t => t.taskId);
    }

    // Build query
    const where: any = {
      id: { notIn: excludeIds },
    };

    if (params.subject) {
      where.subject = params.subject;
    }

    // Use user's difficulty level if not specified
    const targetDifficulty = params.difficulty || profile?.difficultyLevel || 5;
    where.difficulty = {
      gte: Math.max(1, targetDifficulty - 2),
      lte: Math.min(10, targetDifficulty + 2),
    };

    // Prioritize weak topics
    if (profile?.weakTopics && (profile.weakTopics as string[]).length > 0) {
      where.topic = {
        in: profile.weakTopics as string[],
      };
    }

    // Get tasks
    const tasks = await prisma.task.findMany({
      where,
      take: params.limit,
      orderBy: [
        { difficulty: 'asc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        subject: true,
        topic: true,
        subtopic: true,
        difficulty: true,
        type: true,
        level: true,
        question: true,
        estimatedTime: true,
        xpReward: true,
        tags: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        count: tasks.length,
        personalization: {
          targetDifficulty,
          weakTopics: profile?.weakTopics || [],
          strongTopics: profile?.strongTopics || [],
        },
      },
    });
  } catch (error: any) {
    console.error('List tasks error:', error);

    return NextResponse.json(
      { error: 'Failed to list tasks', details: error.message },
      { status: 500 }
    );
  }
}
