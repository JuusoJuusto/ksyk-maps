import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/server';
import { GamificationService } from '@/services/gamification.service';

export async function GET() {
  const auth = await requireAuth();
  if (auth.response) return auth.response;

  try {
    const progress = await GamificationService.getDailyProgress(auth.user!.id);
    return NextResponse.json({ success: true, data: progress });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch daily progress' },
      { status: 500 }
    );
  }
}
