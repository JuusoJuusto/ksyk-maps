import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/server';
import { Subject } from '@/lib/prisma-types';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject') as Subject | null;
    const limit = parseInt(searchParams.get('limit') || '10');

    const where: Record<string, unknown> = {};
    if (subject) where.subject = subject;

    const tasks = await prisma.task.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        topic: true,
        subtopic: true,
        difficulty: true,
        type: true,
        level: true,
        question: true,
        hints: true,
        estimatedTime: true,
        xpReward: true,
        tags: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: { tasks } });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
