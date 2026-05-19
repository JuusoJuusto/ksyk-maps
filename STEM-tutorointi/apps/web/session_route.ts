import { NextRequest, NextResponse } from 'next/server';
import { handleListSessions, handleRevokeSession } from '../apiHandlers';

export async function GET(req: NextRequest) {
  return handleListSessions(req);
}

export async function POST(req: NextRequest) {
  return handleRevokeSession(req);
}
