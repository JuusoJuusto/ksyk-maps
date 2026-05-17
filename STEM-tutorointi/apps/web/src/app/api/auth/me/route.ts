import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value
      || request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const user = await AuthService.getUserFromToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
        avatar: user.avatar,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
}
