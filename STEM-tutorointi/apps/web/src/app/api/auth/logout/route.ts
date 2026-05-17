import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (token) {
      await AuthService.logout(token);
    }

    const response = NextResponse.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}
