import { cookies } from 'next/headers';
import prisma from '../prismaClient';

export async function getServerUser() {
  const cookieJar = cookies();
  const cookie = cookieJar.get('auth-token')?.value || null;
  if (!cookie) return null;
  try {
    const session = await prisma.session.findUnique({ where: { token: cookie } });
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(()=>{});
      return null;
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.isActive) return null;
    return user;
  } catch (e) {
    return null;
  }
}
