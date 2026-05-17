// ============================================
// STEM Genius - AI Explanation API
// Generate detailed step-by-step explanations
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOpenAI } from '@/lib/openai';
import { z } from 'zod';

const explainSchema = z.object({
  userId: z.string().uuid(),
  taskId: z.string().uuid(),
  userAnswer: z.any().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, taskId, userAnswer } = explainSchema.parse(body);

    // Get task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get user profile
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    const questionData = task.question as any;
    const answerData = task.answer as any;
    const solutionData = task.solution as any;

    // Generate personalized explanation
    const prompt = `Provide a detailed, step-by-step explanation for this ${task.subject} problem:

Question: ${questionData.text}
Correct Answer: ${answerData.correct}
${userAnswer ? `Student's Answer: ${userAnswer}` : ''}

Student Profile:
- Grade Level: ${profile?.gradeLevel || 'Unknown'}
- Learning Style: ${profile?.learningStyle || 'adaptive'}
- Difficulty Level: ${profile?.difficultyLevel || 5}/10

Requirements:
1. Break down the solution into clear steps
2. Explain the reasoning behind each step
3. Use appropriate mathematical notation (LaTeX)
4. Include helpful tips or common mistakes to avoid
5. If student answer is wrong, explain why and guide to correct approach
6. Adapt explanation to student's level
7. Use analogies if helpful

Return JSON format:
{
  "steps": [
    {
      "number": 1,
      "title": "step title",
      "explanation": "detailed explanation",
      "formula": "LaTeX formula if applicable"
    }
  ],
  "keyInsights": ["insight1", "insight2"],
  "commonMistakes": ["mistake1", "mistake2"],
  "practiceAdvice": "advice for mastering this concept"
}`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are an expert STEM educator providing clear, detailed explanations. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const explanation = JSON.parse(completion.choices[0].message.content || '{}');

    return NextResponse.json({
      success: true,
      data: {
        explanation,
        task: {
          id: task.id,
          subject: task.subject,
          topic: task.topic,
          difficulty: task.difficulty,
        },
      },
    });
  } catch (error: any) {
    console.error('Explanation generation error:', error);

    return NextResponse.json(
      { error: 'Failed to generate explanation', details: error.message },
      { status: 500 }
    );
  }
}
