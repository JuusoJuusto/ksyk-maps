import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { getOpenAI } from '@/lib/openai';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const assessmentSchema = z.object({
  subjects: z.array(z.string()).min(1),
  grade: z.string(),
});

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
    const { subjects, grade } = assessmentSchema.parse(body);

    const mappedSubjects = subjects.map((s: string) => SUBJECT_MAP[s] || s);

    const prompt = `Generate a quick 5-question STEM assessment for a student in grade ${grade}.
Subjects: ${mappedSubjects.join(', ')}

Generate exactly 5 questions covering different subjects and difficulty levels.
Each question should have multiple choice answers (A, B, C, D) with one correct answer.

Return JSON with this exact structure:
{
  "assessmentId": "unique-id",
  "questions": [
    {
      "id": "q1",
      "subject": "MATHEMATICS",
      "question": "Question text here",
      "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
      "correctAnswer": "A) option1",
      "difficulty": 5
    }
  ]
}`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert STEM educator creating placement assessments.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const assessment = JSON.parse(content);
    assessment.assessmentId = randomUUID();

    return NextResponse.json({
      success: true,
      data: assessment,
    });
  } catch (error: unknown) {
    console.error('Assessment generation error:', error);

    const fallbackAssessment = {
      assessmentId: randomUUID(),
      questions: [
        {
          id: 'q1',
          subject: 'MATHEMATICS',
          question: 'What is the value of x in the equation 2x + 6 = 14?',
          options: ['A) 2', 'B) 4', 'C) 6', 'D) 8'],
          correctAnswer: 'B) 4',
          difficulty: 4,
        },
        {
          id: 'q2',
          subject: 'PHYSICS',
          question: 'What is the SI unit of force?',
          options: ['A) Watt', 'B) Joule', 'C) Newton', 'D) Pascal'],
          correctAnswer: 'C) Newton',
          difficulty: 3,
        },
        {
          id: 'q3',
          subject: 'CHEMISTRY',
          question: 'What is the chemical symbol for gold?',
          options: ['A) Go', 'B) Gd', 'C) Au', 'D) Ag'],
          correctAnswer: 'C) Au',
          difficulty: 3,
        },
        {
          id: 'q4',
          subject: 'MATHEMATICS',
          question: 'What is the derivative of x²?',
          options: ['A) x', 'B) 2x', 'C) 2x²', 'D) x³'],
          correctAnswer: 'B) 2x',
          difficulty: 6,
        },
        {
          id: 'q5',
          subject: 'ASTRONOMY',
          question: 'Which planet is closest to the Sun?',
          options: ['A) Venus', 'B) Earth', 'C) Mercury', 'D) Mars'],
          correctAnswer: 'C) Mercury',
          difficulty: 2,
        },
      ],
    };

    return NextResponse.json({
      success: true,
      data: fallbackAssessment,
    });
  }
}
