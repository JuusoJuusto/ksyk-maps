import prisma from './prismaClient';
import { hashPassword, verifyPassword, generateRefreshToken, generateAccessToken, REFRESH_TOKEN_EXP_SEC } from './security';
import { randomUUID } from 'crypto';

export const AuthService = {
  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new Error('Invalid credentials');
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new Error('Invalid credentials');
    const refreshToken = generateRefreshToken();
    await prisma.session.create({ data: { id: randomUUID(), userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXP_SEC * 1000) } });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    return { user, refreshToken, accessToken };
  },

  async register(email: string, password: string, name?: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('Email already in use');
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { id: randomUUID(), email, passwordHash, name: name || '', emailVerified: false } });
    const refreshToken = generateRefreshToken();
    await prisma.session.create({ data: { id: randomUUID(), userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXP_SEC * 1000) } });
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    return { user, refreshToken, accessToken };
  },

  async refresh(refreshToken: string) {
    const session = await prisma.session.findUnique({ where: { token: refreshToken } });
    if (!session) throw new Error('Invalid refresh token');
    if (new Date(session.expiresAt) < new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      throw new Error('Refresh token expired');
    }
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || !user.isActive) throw new Error('Invalid session user');
    // rotate
    const newToken = generateRefreshToken();
    await prisma.session.update({ where: { id: session.id }, data: { token: newToken, expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXP_SEC * 1000) } });
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    return { user, refreshToken: newToken, accessToken };
  },

  async logout(token: string) {
    await prisma.session.deleteMany({ where: { token } });
  }
};
