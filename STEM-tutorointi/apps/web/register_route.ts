import { NextRequest, NextResponse } from 'next/server';
import { handleRegister } from '../apiHandlers';

export async function POST(req: NextRequest) {
  return handleRegister(req);
}
