import { NextRequest, NextResponse } from 'next/server';
import { handleLogin } from '../apiHandlers';

export async function POST(req: NextRequest) {
  return handleLogin(req);
}
