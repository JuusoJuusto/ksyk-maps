import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth/server';
import { GamificationService } from '@/services/gamification.service';
import { AIService } from '@/services/ai.service';
import { taskSubmissionSchema } from '@/lib/validators';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const parsed = taskSubmissionSchema.safeParse({ ...body, taskId: params.id });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { answer, timeSpent, hintsUsed, confidence } = parsed.data;
    const taskId = params.id;
    const userId = auth.user!.id;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const existingAttempt = await prisma.userTask.findFirst({
      where: { userId, taskId },
    });

    const attempts = existingAttempt ? existingAttempt.attempts + 1 : 1;

    const taskQuestion = task.question as Record<string, unknown>;
    const taskAnswer = task.answer as Record<string, unknown>;

    const analysis = await AIService.analyzeAnswer(
      (taskQuestion.text || taskQuestion.fi || '') as string,
      (taskAnswer.correct || '') as string,
      typeof answer === 'string' ? answer : JSON.stringify(answer)
    );

    const xpEarned = GamificationService.calculateTaskXP({
      baseXP: task.xpReward,
      difficulty: task.difficulty,
      isCorrect: analysis.isCorrect,
      timeSpent: timeSpent || 180,
      estimatedTime: task.estimatedTime,
      hintsUsed: hintsUsed || 0,
      attempts,
    });

    const userTaskData = {
      userId,
      taskId,
      answerSubmitted: answer,
      isCorrect: analysis.isCorrect,
      timeSpent: timeSpent || 180,
      hintsUsed: hintsUsed || 0,
      attempts,
      confidence: confidence || null,
      xpEarned,
    };

    if (existingAttempt) {
      await prisma.userTask.update({
        where: { id: existingAttempt.id },
        data: userTaskData,
      });
    } else {
      await prisma.userTask.create({ data: userTaskData });
    }

    const xpResult = await GamificationService.awardXP(
      userId,
      xpEarned,
      'task_completion',
      task.subject
    );

    await GamificationService.updateStreak(userId);
    await GamificationService.checkAchievements(userId);

    return NextResponse.json({
      success: true,
      data: {
        isCorrect: analysis.isCorrect,
        xpEarned,
        feedback: analysis.feedback,
        partialCredit: analysis.partialCredit,
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newLevel,
      },
    });
  } catch (error) {
    console.error('Task submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
