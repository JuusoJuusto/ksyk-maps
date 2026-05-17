// ============================================
// STEM Genius - Authentication Service
// ============================================

import { prisma } from '@/lib/prisma';
import { hash, compare } from 'bcryptjs';
import { sign, verify } from 'jsonwebtoken';
import { User, UserRole, SubscriptionTier } from '@/lib/prisma-types';
import { ERROR_CODES } from '@/config/constants';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

// ============================================
// TYPES
// ============================================

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  gradeLevel?: number;
}

export interface LoginData {
  email: string;
  password: string;
}

// ============================================
// AUTHENTICATION SERVICE
// ============================================

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<{ user: User; token: string }> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error(ERROR_CODES.AUTH_EMAIL_IN_USE);
    }

    // Validate password strength
    if (data.password.length < 8) {
      throw new Error(ERROR_CODES.AUTH_WEAK_PASSWORD);
    }

    // Hash password
    const passwordHash = await hash(data.password, 12);

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: UserRole.STUDENT,
        subscriptionTier: SubscriptionTier.FREE,
        profile: {
          create: {
            gradeLevel: data.gradeLevel,
            country: 'FI',
            language: 'fi',
            timezone: 'Europe/Helsinki',
            difficultyLevel: 5.0,
            learningSpeed: 1.0,
            confidenceLevel: 0.5,
            burnoutRisk: 0.0,
            darkMode: true,
            notifications: true,
            soundEffects: true,
          },
        },
        xp: {
          create: {
            totalXP: 0,
            level: 1,
            mathXP: 0,
            physicsXP: 0,
            chemistryXP: 0,
            astronomyXP: 0,
            xpMultiplier: 1.0,
          },
        },
        streaks: {
          create: {
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: new Date(),
            freezesAvailable: 0,
            freezesUsed: 0,
          },
        },
      },
    });

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { user, token };
  }

  /**
   * Login user
   */
  static async login(data: LoginData): Promise<{ user: User; token: string }> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new Error(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    // Verify password
    const isValidPassword = await compare(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error(ERROR_CODES.AUTH_UNAUTHORIZED);
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return { user, token };
  }

  /**
   * Logout user
   */
  static async logout(token: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): AuthTokenPayload {
    try {
      const payload = verify(token, JWT_SECRET) as AuthTokenPayload;
      return payload;
    } catch (error) {
      throw new Error(ERROR_CODES.AUTH_UNAUTHORIZED);
    }
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload: AuthTokenPayload): string {
    return sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  /**
   * Get user from token
   */
  static async getUserFromToken(token: string): Promise<User | null> {
    try {
      const payload = this.verifyToken(token);

      // Check if session exists
      const session = await prisma.session.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        return null;
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new Error(ERROR_CODES.AUTH_USER_NOT_FOUND);
    }

    // Verify current password
    const isValidPassword = await compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw new Error(ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new Error(ERROR_CODES.AUTH_WEAK_PASSWORD);
    }

    // Hash new password
    const passwordHash = await hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId },
    });
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // Don't reveal if user exists
      return 'reset-token-placeholder';
    }

    // Generate reset token
    const resetToken = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // In production, send email with reset link
    // await EmailService.sendPasswordReset(user.email, resetToken);

    return resetToken;
  }

  /**
   * Reset password with token
   */
  static async resetPassword(token: string, newPassword: string): Promise<void> {
    const payload = this.verifyToken(token);

    // Validate new password
    if (newPassword.length < 8) {
      throw new Error(ERROR_CODES.AUTH_WEAK_PASSWORD);
    }

    // Hash new password
    const passwordHash = await hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId: payload.userId },
    });
  }

  /**
   * Verify email
   */
  static async verifyEmail(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  /**
   * Check if user has permission
   */
  static hasPermission(user: User, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.STUDENT]: 0,
      [UserRole.TEACHER]: 1,
      [UserRole.ADMIN]: 2,
      [UserRole.SUPER_ADMIN]: 3,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Check subscription status
   */
  static hasActiveSubscription(user: User, requiredTier: SubscriptionTier): boolean {
    const tierHierarchy = {
      [SubscriptionTier.FREE]: 0,
      [SubscriptionTier.PREMIUM]: 1,
      [SubscriptionTier.SCHOOL]: 2,
    };

    // Check if subscription is active
    if (user.subscriptionEndsAt && user.subscriptionEndsAt < new Date()) {
      return false;
    }

    return tierHierarchy[user.subscriptionTier] >= tierHierarchy[requiredTier];
  }
}
