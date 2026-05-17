import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const submitSchema = z.object({
  assessmentId: z.string(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
  })),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { answers } = submitSchema.parse(body);

    const correctCount = answers.filter((a) => {
      const question = getDefaultQuestions().find((q) => q.id === a.questionId);
      return question && a.answer === question.correctAnswer;
    }).length;

    const totalQuestions = answers.length;
    const accuracy = totalQuestions > 0 ? correctCount / totalQuestions : 0;

    let level: number;
    if (accuracy >= 0.8) level = 7;
    else if (accuracy >= 0.6) level = 5;
    else if (accuracy >= 0.4) level = 4;
    else level = 3;

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    const subjectResults: Record<string, { correct: number; total: number }> = {};
    answers.forEach((a) => {
      const question = getDefaultQuestions().find((q) => q.id === a.questionId);
      if (!question) return;

      if (!subjectResults[question.subject]) {
        subjectResults[question.subject] = { correct: 0, total: 0 };
      }
      subjectResults[question.subject].total++;

      if (a.answer === question.correctAnswer) {
        subjectResults[question.subject].correct++;
      }
    });

    Object.entries(subjectResults).forEach(([subject, data]) => {
      const subjectAccuracy = data.correct / data.total;
      if (subjectAccuracy >= 0.75) {
        strengths.push(`${subject} fundamentals`);
      } else if (subjectAccuracy < 0.5) {
        weaknesses.push(`${subject} concepts`);
      }
    });

    if (strengths.length === 0) strengths.push('Willingness to learn');
    if (weaknesses.length === 0) weaknesses.push('Advanced problem solving');

    await prisma.userProfile.update({
      where: { userId: auth.user!.id },
      data: {
        difficultyLevel: level,
        confidenceLevel: accuracy,
        weakTopics: weaknesses,
        strongTopics: strengths,
      },
    });

    await prisma.event.create({
      data: {
        userId: auth.user!.id,
        eventType: 'USER_REGISTERED',
        eventData: {
          assessmentAccuracy: accuracy,
          assessedLevel: level,
          strengths,
          weaknesses,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        analysis: {
          accuracy: Math.round(accuracy * 100),
          level,
          strengths,
          weaknesses,
          correctCount,
          totalQuestions,
        },
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Assessment submit error:', error);
    return NextResponse.json(
      { error: 'Failed to submit assessment' },
      { status: 500 }
    );
  }
}

function getDefaultQuestions() {
  return [
    { id: 'q1', subject: 'MATHEMATICS', question: '', correctAnswer: 'B) 4' },
    { id: 'q2', subject: 'PHYSICS', question: '', correctAnswer: 'C) Newton' },
    { id: 'q3', subject: 'CHEMISTRY', question: '', correctAnswer: 'C) Au' },
    { id: 'q4', subject: 'MATHEMATICS', question: '', correctAnswer: 'B) 2x' },
    { id: 'q5', subject: 'ASTRONOMY', question: '', correctAnswer: 'C) Mercury' },
  ];
}
