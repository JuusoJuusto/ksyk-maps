import { NextRequest, NextResponse } from 'next/server';
import { handleRefresh } from '../apiHandlers';

export async function POST(req: NextRequest) {
  return handleRefresh(req);
}
