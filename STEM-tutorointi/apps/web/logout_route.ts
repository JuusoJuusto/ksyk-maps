import { NextRequest, NextResponse } from 'next/server';
import { handleLogout } from '../apiHandlers';

export async function POST(req: NextRequest) {
  return handleLogout(req);
}
