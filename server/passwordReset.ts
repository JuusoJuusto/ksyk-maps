/**
 * Password Reset Token Management with Expiration
 * Tokens expire after 24 hours and can only be used once
 */

import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

const db = getFirestore();

interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

/**
 * Create a password reset token for a user
 * @param userId User ID
 * @param email User email
 * @returns Token string
 */
export async function createPasswordResetToken(userId: string, email: string): Promise<string> {
  try {
    // Generate secure random token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    const tokenData: PasswordResetToken = {
      token,
      userId,
      email,
      expiresAt,
      used: false,
      createdAt: new Date()
    };
    
    // Store in Firebase
    await db.collection('passwordResetTokens').doc(token).set(tokenData);
    
    console.log(`🔑 Password reset token created for ${email}, expires at ${expiresAt.toISOString()}`);
    
    return token;
  } catch (error) {
    console.error('❌ Error creating password reset token:', error);
    throw error;
  }
}

/**
 * Validate a password reset token
 * @param token Token string
 * @returns User ID if valid, null if invalid/expired/used
 */
export async function validatePasswordResetToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    const doc = await db.collection('passwordResetTokens').doc(token).get();
    
    if (!doc.exists) {
      console.log('❌ Token not found');
      return null;
    }
    
    const data = doc.data() as PasswordResetToken;
    
    // Check if already used
    if (data.used) {
      console.log('❌ Token already used');
      return null;
    }
    
    // Check if expired
    const now = new Date();
    const expiresAt = data.expiresAt instanceof Date ? data.expiresAt : data.expiresAt.toDate();
    
    if (now > expiresAt) {
      console.log('❌ Token expired');
      // Clean up expired token
      await doc.ref.delete();
      return null;
    }
    
    console.log(`✅ Token valid for user ${data.userId}`);
    return { userId: data.userId, email: data.email };
  } catch (error) {
    console.error('❌ Error validating password reset token:', error);
    return null;
  }
}

/**
 * Mark a password reset token as used
 * @param token Token string
 */
export async function markTokenAsUsed(token: string): Promise<void> {
  try {
    await db.collection('passwordResetTokens').doc(token).update({
      used: true,
      usedAt: new Date()
    });
    console.log(`✅ Token marked as used: ${token}`);
  } catch (error) {
    console.error('❌ Error marking token as used:', error);
    throw error;
  }
}

/**
 * Clean up expired tokens (run periodically)
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    const now = new Date();
    const snapshot = await db.collection('passwordResetTokens')
      .where('expiresAt', '<', now)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`🧹 Cleaned up ${snapshot.size} expired password reset tokens`);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error cleaning up expired tokens:', error);
    return 0;
  }
}

/**
 * Revoke all password reset tokens for a user
 * @param userId User ID
 */
export async function revokeUserTokens(userId: string): Promise<void> {
  try {
    const snapshot = await db.collection('passwordResetTokens')
      .where('userId', '==', userId)
      .where('used', '==', false)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { used: true, revokedAt: new Date() });
    });
    
    await batch.commit();
    
    console.log(`🔒 Revoked ${snapshot.size} password reset tokens for user ${userId}`);
  } catch (error) {
    console.error('❌ Error revoking user tokens:', error);
    throw error;
  }
}
