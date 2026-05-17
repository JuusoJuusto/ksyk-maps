// ============================================
// STEM Genius - Get Task API
// Get specific task details
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = params.id;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
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
        // Don't include answer or solution until submission
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { task },
    });
  } catch (error: any) {
    console.error('Get task error:', error);

    return NextResponse.json(
      { error: 'Failed to get task', details: error.message },
      { status: 500 }
    );
  }
}
