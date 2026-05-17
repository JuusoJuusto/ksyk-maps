import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    await prisma.event.create({
      data: {
        userId: auth.user!.id,
        eventType: 'USER_LOGIN',
        eventData: {
          event: 'ONBOARDING_COMPLETED',
          completedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Onboarding completed successfully' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
