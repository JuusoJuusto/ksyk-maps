import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOpenAI } from '@/lib/openai';
import { taskGenerationSchema } from '@/lib/validators';
import { requireAuth } from '@/lib/auth/server';
import { rateLimit, rateLimitConfigs, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const rateLimitResult = rateLimit(getIdentifier(request, auth.user!.id), rateLimitConfigs.taskGeneration);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many task generation requests. Please wait a moment.' },
        { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
      );
    }

    const body = await request.json();
    const { subject, topic, difficulty, type, count } = taskGenerationSchema.parse(body);

    const prompt = `Generate ${count || 1} ${type} ${subject} exercise(s) on "${topic}" at difficulty ${difficulty}/10.

Return JSON with this structure:
{
  "tasks": [
    {
      "question": {"text": "question text"},
      "answer": {"correct": "correct answer", "explanation": "why"},
      "solution": {"steps": [{"step": 1, "description": "step"}]},
      "hints": [{"level": 1, "text": "hint"}],
      "topic": "specific topic",
      "difficulty": 5,
      "estimatedTime": 120,
      "tags": ["tag1"]
    }
  ]
}`;

    const completion = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an expert STEM educator creating high-quality exercises. Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 3000,
    });

    const response = JSON.parse(completion.choices[0].message.content || '{"tasks":[]}');
    const tasks = response.tasks || [];

    const createdTasks = await Promise.all(
      (Array.isArray(tasks) ? tasks : [tasks]).map((task: Record<string, unknown>) =>
        prisma.task.create({
          data: {
            subject,
            topic: (task.topic as string) || topic,
            subtopic: task.subtopic as string | undefined,
            difficulty: (task.difficulty as number) || difficulty,
            type,
            level: difficulty <= 3 ? 'BEGINNER' : difficulty <= 6 ? 'INTERMEDIATE' : difficulty <= 8 ? 'ADVANCED' : 'EXPERT',
            question: task.question as object,
            answer: task.answer as object,
            solution: task.solution as object,
            hints: (task.hints as object[]) || [],
            estimatedTime: (task.estimatedTime as number) || 120,
            xpReward: Math.floor(difficulty * 10),
            tags: (task.tags as string[]) || [subject, topic],
            generatedBy: 'gpt-4o-mini',
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        tasks: createdTasks.map((t) => ({
          id: t.id,
          subject: t.subject,
          topic: t.topic,
          difficulty: t.difficulty,
          type: t.type,
          xpReward: t.xpReward,
        })),
        count: createdTasks.length,
      },
    }, { headers: getRateLimitHeaders(rateLimitResult) });
  } catch (error: unknown) {
    console.error('Task generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate tasks' },
      { status: 500 }
    );
  }
}
