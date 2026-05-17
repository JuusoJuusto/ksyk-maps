import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { taskSubmissionSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/server';
import { GamificationService } from '@/services/gamification.service';
import { AIService } from '@/services/ai.service';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { taskId, answer, timeSpent, hintsUsed, confidence } = taskSubmissionSchema.parse(body);
    const userId = auth.user!.id;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const taskQuestion = task.question as Record<string, unknown>;
    const taskAnswer = task.answer as Record<string, unknown>;

    const analysis = await AIService.analyzeAnswer(
      (taskQuestion.text || taskQuestion.fi || '') as string,
      (taskAnswer.correct || '') as string,
      typeof answer === 'string' ? answer : JSON.stringify(answer)
    );

    const existingAttempt = await prisma.userTask.findFirst({
      where: { userId, taskId },
    });

    const attempts = existingAttempt ? existingAttempt.attempts + 1 : 1;

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

    let submission;
    if (existingAttempt) {
      submission = await prisma.userTask.update({
        where: { id: existingAttempt.id },
        data: userTaskData,
      });
    } else {
      submission = await prisma.userTask.create({ data: userTaskData });
    }

    if (analysis.isCorrect && xpEarned > 0) {
      await GamificationService.awardXP(userId, xpEarned, 'task_completion', task.subject);
      await GamificationService.updateStreak(userId);
      await GamificationService.checkAchievements(userId);
    }

    await prisma.event.create({
      data: {
        userId,
        eventType: analysis.isCorrect ? 'TASK_COMPLETED' : 'TASK_ABANDONED',
        eventData: { taskId, isCorrect: analysis.isCorrect, timeSpent, hintsUsed, xpEarned },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        submission: {
          id: submission.id,
          isCorrect: analysis.isCorrect,
          xpEarned,
          timeSpent,
          hintsUsed,
        },
        feedback: analysis.feedback,
        partialCredit: analysis.partialCredit,
      },
    });
  } catch (error: unknown) {
    console.error('Task submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit task' },
      { status: 500 }
    );
  }
}
