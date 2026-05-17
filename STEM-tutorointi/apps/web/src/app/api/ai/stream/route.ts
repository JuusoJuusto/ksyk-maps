// ============================================
// STEM Genius - AI Streaming Chat API
// Real-time streaming responses from OpenAI
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { conversationId, message, subject, topic, userId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json(
        { error: 'Message and userId are required' },
        { status: 400 }
      );
    }

    // Get conversation history
    let conversation;
    let messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Last 20 messages for context
          },
        },
      });

      if (conversation) {
        messages = conversation.messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
      }
    }

    // Build system prompt
    const systemPrompt = buildSystemPrompt(subject, topic);

    // Add new user message
    messages.push({ role: 'user', content: message });

    // Create streaming response
    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    // Create a TransformStream to handle the streaming
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullResponse += content;
              // Send chunk to client
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }

          // Save conversation to database
          if (!conversationId) {
            // Create new conversation
            conversation = await prisma.conversation.create({
              data: {
                userId,
                subject: subject || null,
                topic: topic || null,
                title: message.substring(0, 100),
              },
            });
          }

          // Save messages
          await prisma.message.createMany({
            data: [
              {
                conversationId: conversation!.id,
                role: 'USER',
                content: message,
              },
              {
                conversationId: conversation!.id,
                role: 'ASSISTANT',
                content: fullResponse,
              },
            ],
          });

          // Send completion event
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                done: true,
                conversationId: conversation!.id,
              })}\n\n`
            )
          );

          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('AI Stream API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to stream AI response' },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(subject?: string, topic?: string): string {
  let prompt = `You are an expert STEM tutor for STEM Genius, an AI-powered learning platform. Your role is to:

1. **Explain concepts clearly** - Use simple language, analogies, and examples
2. **Be encouraging** - Motivate students and celebrate their progress
3. **Ask guiding questions** - Help students discover answers themselves
4. **Provide step-by-step solutions** - Break down complex problems
5. **Adapt to student level** - Match explanations to their understanding
6. **Use proper formatting** - Use markdown, LaTeX for math (wrap in $ or $$)
7. **Be concise** - Keep responses focused and digestible

**Teaching Style:**
- Start with the big picture, then dive into details
- Use real-world examples and applications
- Encourage critical thinking
- Point out common mistakes
- Provide practice suggestions

**Formatting:**
- Use **bold** for key terms
- Use \`code\` for formulas
- Use LaTeX for complex math: $E = mc^2$ or $$\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$
- Use bullet points for lists
- Use numbered lists for steps`;

  if (subject) {
    prompt += `\n\n**Current Subject:** ${subject}`;
  }

  if (topic) {
    prompt += `\n**Current Topic:** ${topic}`;
  }

  prompt += `\n\n**Remember:** You're not just answering questions - you're building understanding and confidence!`;

  return prompt;
}
