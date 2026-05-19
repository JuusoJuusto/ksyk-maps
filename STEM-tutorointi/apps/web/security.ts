import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    console.warn('⚠️  WARNING: Using default JWT_SECRET in development. Set JWT_SECRET environment variable for production.');
    return 'dev-secret-change-me-INSECURE';
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }
  return secret;
})();

export const ACCESS_TOKEN_EXPIRES = '15m';
export const REFRESH_TOKEN_EXP_SEC = 60 * 60 * 24 * 30; // 30 days in seconds

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function generateRefreshToken() {
  return randomUUID();
}

export function generateAccessToken(payload: object, expiresIn = ACCESS_TOKEN_EXPIRES) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export function generateSignedToken(payload: object, expiresIn = '1h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifySignedToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

export function generateCsrfToken() {
  return randomUUID();
}
