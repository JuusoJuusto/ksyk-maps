import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const goalsSchema = z.object({
  subjects: z.array(z.string()).min(1),
  grade: z.string(),
  goals: z.array(z.string()).min(1),
});

const GRADE_MAP: Record<string, number> = {
  '7': 7,
  '8': 8,
  '9': 9,
  'Lukio 1': 10,
  'Lukio 2': 11,
  'Lukio 3': 12,
};

const SUBJECT_MAP: Record<string, string> = {
  MATH: 'MATHEMATICS',
  PHYSICS: 'PHYSICS',
  CHEMISTRY: 'CHEMISTRY',
  ASTRONOMY: 'ASTRONOMY',
};

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { subjects, grade, goals } = goalsSchema.parse(body);

    const mappedSubjects = subjects
      .map((s: string) => SUBJECT_MAP[s] || s)
      .filter((s: string) => ['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY'].includes(s));

    const gradeLevel = GRADE_MAP[grade] || 9;

    await prisma.userProfile.update({
      where: { userId: auth.user!.id },
      data: {
        gradeLevel,
        studyGoals: goals,
        weakTopics: [],
        strongTopics: [],
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        subjects: mappedSubjects,
        gradeLevel,
        goals,
      },
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save goals' },
      { status: 500 }
    );
  }
}
