import { NextRequest, NextResponse } from 'next/server';
import { handleVerifyEmail } from '../apiHandlers';

export async function POST(req: NextRequest) {
  return handleVerifyEmail(req);
}
