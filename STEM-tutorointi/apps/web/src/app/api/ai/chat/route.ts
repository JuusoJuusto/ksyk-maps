import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOpenAI } from '@/lib/openai';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/server';
import { rateLimit, rateLimitConfigs, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit';

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(5000),
  subject: z.enum(['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'ASTRONOMY']).optional(),
  topic: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth.response) return auth.response;

    const identifier = getIdentifier(request, auth.user!.id);
    const rateLimitResult = rateLimit(identifier, rateLimitConfigs.ai);

    if (!rateLimitResult.success) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...getRateLimitHeaders(rateLimitResult),
          },
        }
      );
    }

    const body = await request.json();
    const { conversationId, message, subject, topic } = chatSchema.parse(body);
    const userId = auth.user!.id;

    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20,
          },
        },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          title: topic || message.slice(0, 50),
          subject: subject || null,
          topic: topic || null,
          messageCount: 0,
        },
        include: { messages: true },
      });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    const conversationHistory = conversation.messages.map((msg) => ({
      role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));

    const systemPrompt = `You are STEM Genius, an expert AI tutor for ${subject || 'STEM subjects'}.

Student Profile:
- Grade Level: ${profile?.gradeLevel || 'Unknown'}
- Learning Style: ${profile?.learningStyle || 'adaptive'}
- Difficulty Level: ${profile?.difficultyLevel || 5}/10

Teaching Guidelines:
1. Be encouraging and supportive
2. Use Socratic method - guide with questions, don't just give answers
3. Provide step-by-step explanations
4. Use analogies and real-world examples
5. Check understanding frequently
6. Adapt difficulty based on student responses
7. Celebrate progress and effort
8. If student is frustrated, simplify and encourage
9. Use LaTeX for mathematical expressions: $inline$ or $$display$$
10. Break complex problems into manageable steps
11. Respond in the same language the student uses (Finnish or English)

Current Topic: ${topic || 'General'}

Remember: Guide, don't solve. Help them learn, not just get the answer.`;

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
      },
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const completion = await getOpenAI().chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              ...conversationHistory,
              { role: 'user', content: message },
            ],
            temperature: 0.7,
            max_tokens: 1500,
            stream: true,
          });

          let fullResponse = '';

          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }

          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: 'ASSISTANT',
              content: fullResponse,
              model: 'gpt-4o-mini',
            },
          });

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              messageCount: { increment: 2 },
              updatedAt: new Date(),
            },
          });

          await prisma.event.create({
            data: {
              userId,
              eventType: 'TUTOR_MESSAGE_SENT',
              eventData: {
                conversationId: conversation.id,
                messageLength: message.length,
                responseLength: fullResponse.length,
              },
            },
          });

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true, conversationId: conversation.id })}\n\n`)
          );
          controller.close();
        } catch (error: unknown) {
          console.error('Streaming error:', error);
          const msg = error instanceof Error ? error.message : 'Streaming error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        ...getRateLimitHeaders(rateLimitResult),
      },
    });
  } catch (error: unknown) {
    console.error('Chat API error:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Failed to process chat message' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
