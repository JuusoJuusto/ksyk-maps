import { NextRequest } from 'next/server';
import prisma from './prismaClient';

export async function getSessionFromRequest(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value || null;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return null;
  if (new Date(session.expiresAt) < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) return null;
  return { session, user };
}

export async function invalidateSession(token: string) {
  await prisma.session.deleteMany({ where: { token } });
}
