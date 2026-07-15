/**
 * Rate Limiting for Login Attempts
 * Prevents brute force attacks by limiting failed login attempts
 */

import { getFirestore } from 'firebase-admin/firestore';

// Lazy-load Firestore to avoid initialization issues
let db: ReturnType<typeof getFirestore> | null = null;

function getDb() {
  if (!db) {
    db = getFirestore();
  }
  return db;
}

// Firestore returns Timestamps (with a toDate() method), not JS Dates.
// Local instances that were just written back can be Dates. Runtime does
// `instanceof Date ? … : .toDate()` so the type has to allow both shapes.
interface FirestoreTimestamp {
  toDate: () => Date;
}

interface LoginAttempt {
  email: string;
  attempts: number;
  lastAttempt: Date | FirestoreTimestamp;
  lockedUntil?: Date | FirestoreTimestamp;
  ipAddress?: string;
}

const MAX_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes
const RESET_WINDOW = 60 * 60 * 1000; // 1 hour

/**
 * Check if a login attempt is allowed
 * @param email User email
 * @param ipAddress Optional IP address for additional tracking
 * @returns Object with allowed status and additional info
 */
export async function checkRateLimit(
  email: string, 
  ipAddress?: string
): Promise<{ 
  allowed: boolean; 
  remainingAttempts?: number; 
  lockedUntil?: Date;
  message?: string;
}> {
  try {
    const db = getDb();
    const docRef = db.collection('loginAttempts').doc(email.toLowerCase());
    const doc = await docRef.get();
    
    if (!doc.exists) {
      // First attempt
      return { 
        allowed: true, 
        remainingAttempts: MAX_ATTEMPTS 
      };
    }
    
    const data = doc.data() as LoginAttempt;
    const now = new Date();
    
    // Check if account is locked
    if (data.lockedUntil) {
      const lockedUntil = data.lockedUntil instanceof Date ? data.lockedUntil : data.lockedUntil.toDate();
      
      if (now < lockedUntil) {
        const minutesLeft = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000);
        console.log(`🔒 Account locked for ${email}, ${minutesLeft} minutes remaining`);
        return { 
          allowed: false, 
          lockedUntil,
          message: `Tili on lukittu. Yritä uudelleen ${minutesLeft} minuutin kuluttua.`
        };
      } else {
        // Lock expired, reset attempts
        await docRef.update({ 
          attempts: 0, 
          lockedUntil: null 
        });
        return { 
          allowed: true, 
          remainingAttempts: MAX_ATTEMPTS 
        };
      }
    }
    
    // Check if we should reset attempts (last attempt was > 1 hour ago)
    const lastAttempt = data.lastAttempt instanceof Date ? data.lastAttempt : data.lastAttempt.toDate();
    const timeSinceLastAttempt = now.getTime() - lastAttempt.getTime();
    
    if (timeSinceLastAttempt > RESET_WINDOW) {
      await docRef.update({ attempts: 0 });
      return { 
        allowed: true, 
        remainingAttempts: MAX_ATTEMPTS 
      };
    }
    
    // Check if max attempts reached
    if (data.attempts >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(now.getTime() + LOCK_DURATION);
      await docRef.update({ lockedUntil });
      console.log(`🔒 Account locked for ${email} due to ${data.attempts} failed attempts`);
      return { 
        allowed: false, 
        lockedUntil,
        message: `Liian monta epäonnistunutta kirjautumisyritystä. Tili lukittu 15 minuutiksi.`
      };
    }
    
    const remaining = MAX_ATTEMPTS - data.attempts;
    return { 
      allowed: true, 
      remainingAttempts: remaining,
      message: remaining <= 2 ? `Varoitus: ${remaining} yritystä jäljellä ennen tilin lukitsemista` : undefined
    };
  } catch (error) {
    console.error('❌ Error checking rate limit:', error);
    // On error, allow the attempt (fail open)
    return { allowed: true };
  }
}

/**
 * Record a login attempt
 * @param email User email
 * @param success Whether the login was successful
 * @param ipAddress Optional IP address
 */
export async function recordLoginAttempt(
  email: string, 
  success: boolean, 
  ipAddress?: string
): Promise<void> {
  try {
    const db = getDb();
    const docRef = db.collection('loginAttempts').doc(email.toLowerCase());
    const doc = await docRef.get();
    
    if (success) {
      // Reset on successful login
      await docRef.set({
        email: email.toLowerCase(),
        attempts: 0,
        lastAttempt: new Date(),
        ipAddress,
        lastSuccessfulLogin: new Date()
      });
      console.log(`✅ Login attempt recorded for ${email}: SUCCESS`);
    } else {
      if (doc.exists) {
        const data = doc.data() as LoginAttempt;
        await docRef.update({
          attempts: (data.attempts || 0) + 1,
          lastAttempt: new Date(),
          ipAddress
        });
        console.log(`❌ Login attempt recorded for ${email}: FAILED (${(data.attempts || 0) + 1}/${MAX_ATTEMPTS})`);
      } else {
        await docRef.set({
          email: email.toLowerCase(),
          attempts: 1,
          lastAttempt: new Date(),
          ipAddress
        });
        console.log(`❌ Login attempt recorded for ${email}: FAILED (1/${MAX_ATTEMPTS})`);
      }
    }
  } catch (error) {
    console.error('❌ Error recording login attempt:', error);
  }
}

/**
 * Manually unlock an account (admin function)
 * @param email User email
 */
export async function unlockAccount(email: string): Promise<void> {
  try {
    const db = getDb();
    const docRef = db.collection('loginAttempts').doc(email.toLowerCase());
    await docRef.update({
      attempts: 0,
      lockedUntil: null,
      unlockedAt: new Date(),
      unlockedBy: 'admin'
    });
    console.log(`🔓 Account unlocked for ${email}`);
  } catch (error) {
    console.error('❌ Error unlocking account:', error);
    throw error;
  }
}

/**
 * Get login attempt statistics for an email
 * @param email User email
 */
export async function getLoginAttemptStats(email: string): Promise<LoginAttempt | null> {
  try {
    const db = getDb();
    const doc = await db.collection('loginAttempts').doc(email.toLowerCase()).get();
    if (!doc.exists) return null;
    return doc.data() as LoginAttempt;
  } catch (error) {
    console.error('❌ Error getting login attempt stats:', error);
    return null;
  }
}

/**
 * Clean up old login attempt records (run periodically)
 * Removes records older than 30 days
 */
export async function cleanupOldLoginAttempts(): Promise<number> {
  try {
    const db = getDb();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const snapshot = await db.collection('loginAttempts')
      .where('lastAttempt', '<', thirtyDaysAgo)
      .get();
    
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`🧹 Cleaned up ${snapshot.size} old login attempt records`);
    return snapshot.size;
  } catch (error) {
    console.error('❌ Error cleaning up old login attempts:', error);
    return 0;
  }
}

/**
 * Express-level rate limiters via `express-rate-limit`.
 *
 * Endpoint-level auth throttling is still done in the login handlers
 * via `checkRateLimit()` (Firestore-backed, per-account). These
 * limiters are the per-IP first line of defence: they stop credential
 * spraying, script-driven abuse, and CPU-heavy calls (routing) from
 * eating the server.
 *
 * Tunables live at the top of each factory. Defaults chosen to be
 * comfortable for normal users on flaky mobile networks (bursts of
 * ~30 requests / 10 s should never trigger anything below).
 */
import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";

const makeLimiter = (windowMs: number, max: number, message: string): RateLimitRequestHandler =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    // Skip trusted upstream health checks so k8s / uptime probes
    // don't get 429'd.
    skip: (req) => req.get("User-Agent")?.includes("HealthCheck") === true,
  });

export const rateLimiters = {
  /** 20 login attempts / 15 min / IP. Pairs with the Firestore per-
   *  account counter for defence-in-depth. */
  auth: makeLimiter(15 * 60 * 1000, 20, "Too many auth attempts. Try again later."),
  /** 6 password-reset requests / hour / IP. */
  passwordReset: makeLimiter(60 * 60 * 1000, 6, "Too many password reset attempts."),
  /** 120 general API calls / min / IP. Meant for anything the app
   *  fires in bulk (search-as-you-type triggers 5-10 hits easily). */
  general: makeLimiter(60 * 1000, 120, "Rate limit exceeded — slow down."),
  /** 30 writes / min / IP. Applied to POST/PATCH/DELETE. */
  mutation: makeLimiter(60 * 1000, 30, "Too many write requests."),
};
