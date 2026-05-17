import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: auth.user!.id },
    });

    if (profile) {
      return NextResponse.json({
        success: true,
        data: { alreadyStarted: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Onboarding session started' },
    });
  } catch {
    return NextResponse.json(
      { error: 'Failed to start onboarding' },
      { status: 500 }
    );
  }
}
