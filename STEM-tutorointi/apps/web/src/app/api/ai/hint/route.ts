// ============================================
// STEM Genius - AI Hint Generation API
// Generate progressive hints for tasks
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOpenAI } from '@/lib/openai';
import { z } from 'zod';

const hintSchema = z.object({
  userId: z.string().uuid(),
  taskId: z.string().uuid(),
  hintLevel: z.number().min(1).max(3),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, taskId, hintLevel } = hintSchema.parse(body);

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

    // Generate hint based on level
    const hintPrompts = {
      1: 'Provide a gentle nudge in the right direction without giving away the answer.',
      2: 'Provide a more specific hint that guides toward the solution method.',
      3: 'Provide a detailed hint that shows the approach but still requires the student to complete it.',
    };

    const prompt = `Generate a hint for this ${task.subject} problem:

Question: ${JSON.stringify((task.question as any).text)}
Difficulty: ${task.difficulty}/10
Student Level: ${profile?.difficultyLevel || 5}/10

Hint Level ${hintLevel}/3: ${hintPrompts[hintLevel as keyof typeof hintPrompts]}

Return JSON format:
{
  "hint": "the hint text",
  "encouragement": "encouraging message"
}`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a supportive STEM tutor providing helpful hints. Return only valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const hintData = JSON.parse(completion.choices[0].message.content || '{}');

    // Create event
    await prisma.event.create({
      data: {
        userId,
        eventType: 'TUTOR_HINT_REQUESTED',
        eventData: {
          taskId,
          hintLevel,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        hint: hintData.hint,
        encouragement: hintData.encouragement,
        hintLevel,
        maxHints: 3,
      },
    });
  } catch (error: any) {
    console.error('Hint generation error:', error);

    return NextResponse.json(
      { error: 'Failed to generate hint', details: error.message },
      { status: 500 }
    );
  }
}
