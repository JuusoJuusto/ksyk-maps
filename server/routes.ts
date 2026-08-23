import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, signChallenge, verifyChallenge } from "./simpleAuth";
import { insertBuildingSchema, insertFloorSchema, insertHallwaySchema, insertRoomSchema, insertStaffSchema, insertEventSchema, insertAnnouncementSchema } from "../shared/schema.js";
import { sendPasswordSetupEmail, sendTicketEmail, generateTempPassword } from "./emailService";
import { rateLimiters } from "./rateLimiter";
import {
  kvGet, kvSet, kvMerge,
  createPoi, getPoisByKind, getAllPois, deletePoi,
  incrementEggCounter, appendEggRecent,
  getBeaconPositions, addBeaconPosition, deleteBeaconPosition,
  getAllBeaconSurveys, getBeaconCoverage, getBeaconCoverageWithQuality, wifiLocate,
  getAllFingerprintsWithFloor, computeFingerprintQuality,
  type WifiReading,
} from "./kvStorage";
import { db as pgDb } from "./db";
import { pageViews, searchAnalytics, appLogs } from "../shared/schema.js";
import { and, eq, gte, count as pgCount } from "drizzle-orm";

import { registerCampusRoutes } from "./campusRoutes";
import { registerMapRoutes } from "./mapRoutes";
import { registerEasterEggRoutes } from "./easterEggRoutes";
import { registerTelemetryRoutes } from "./telemetryRoutes";
import bcrypt from "bcrypt";

const BCRYPT_ROUNDS = 12;

/** Compare a plaintext password against a stored value.
 *  Supports both bcrypt hashes ($2b$…) and legacy plaintext.
 *  On a successful plaintext match the hash is written back to DB automatically. */
async function verifyPassword(
  plain: string,
  stored: string,
  userId: string
): Promise<boolean> {
  if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
    return bcrypt.compare(plain, stored);
  }
  // Legacy plaintext — compare directly, then silently migrate to bcrypt
  if (plain !== stored) return false;
  const hashed = await bcrypt.hash(plain, BCRYPT_ROUNDS);
  await storage.updateUser(userId, { password: hashed }).catch(() => {});
  return true;
}

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

// Owner identity — read from env so the email never appears in source.
// Set OWNER_EMAIL in Vercel environment variables.
const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? '').toLowerCase().trim();

// Simple email format guard (rejects obvious garbage before DB round-trip).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validate geographic coordinates before persisting.
function validLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" && isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === "number" && isFinite(lng) && lng >= -180 && lng <= 180
  );
}

// Session timeout - COMPLETELY DISABLED
// No session timeout checks at all
function sessionTimeoutMiddleware(req: any, res: any, next: any) {
  // Always skip - session timeout completely disabled
  return next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Request ID middleware — every request gets a unique KSYK-XXXXXXXX correlation
  // ID attached to res.locals and echoed back as X-Request-ID. Include this ID
  // when filing bug reports so we can find the exact request in the log viewer.
  app.use((req: any, res: any, next: any) => {
    const id = req.headers['x-request-id'] as string ||
      'KSYK-' + Math.random().toString(36).slice(2, 10).toUpperCase();
    res.locals.requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
  });

  // Error logging helper
  const logError = async (error: any, source: string, details?: any) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[${source}] Error:`, errorMessage);
    if (errorStack) console.error('Stack:', errorStack);
    if (details) console.error('Details:', details);
    
    try {
      await storage.createAppLog({
        type: 'error',
        message: `[${source}] ${errorMessage}`,
        details: JSON.stringify({
          stack: errorStack,
          ...details
        }),
        timestamp: new Date()
      });
    } catch (logErr) {
      console.error('Failed to log error to database:', logErr);
    }
  };

  // Health check — used by uptime monitors and Vercel health checks.
  // Returns DB reachability + version without exposing internals.
  app.get('/api/health', async (_req, res) => {
    try {
      await storage.getBuildings(); // lightweight probe
      res.json({
        status: 'ok',
        version: process.env.npm_package_version ?? 'unknown',
        db: 'connected',
        wilma: process.env.WILMA_BASE_URL ? 'configured' : 'not-configured',
        ts: new Date().toISOString(),
      });
    } catch (err) {
      res.status(503).json({
        status: 'degraded',
        db: 'unreachable',
        error: (err as Error).message,
        ts: new Date().toISOString(),
      });
    }
  });

  // Logs API endpoint - for frontend error logging (rate-limited)
  app.post('/api/logs', rateLimiters.general, async (req, res) => {
    try {
      const { 
        level, 
        message, 
        errorReferenceId, 
        errorStack, 
        errorInfo, 
        userAgent, 
        url,
        userId,
        ipAddress 
      } = req.body;
      
      await storage.createAppLog({
        level: level || 'info',
        message: message || 'No message provided',
        errorReferenceId: errorReferenceId || null,
        errorStack: errorStack || null,
        errorInfo: errorInfo || null,
        userAgent: userAgent || req.get('user-agent') || null,
        url: url || null,
        userId: userId || null,
        ipAddress: ipAddress || req.ip || null,
      });
      
      console.log(`[${level?.toUpperCase() || 'INFO'}] ${message}${errorReferenceId ? ` [Ref: ${errorReferenceId}]` : ''}`);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to create log:', error);
      res.status(500).json({ message: 'Failed to create log' });
    }
  });

  // Get app logs (admin only)
  app.get('/api/logs', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'owner' && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const logs = await storage.getAppLogs(limit);
      res.json(logs);
    } catch (error) {
      await logError(error, 'GET /api/logs');
      res.status(500).json({ message: 'Failed to fetch logs' });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Apply session timeout to all routes
  app.use(sessionTimeoutMiddleware);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      await logError(error, 'GET /api/auth/user', { userId: req.user?.claims?.sub });
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin login endpoint  
  app.post('/api/auth/admin-login', rateLimiters.auth, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Normalize email to lowercase and trim
      const normalizedEmail = email?.toLowerCase().trim();
      const trimmedPassword = password?.trim();
      
      console.log('\n🔐 ========== LOGIN ATTEMPT ==========');
      console.log('Email:', normalizedEmail);
      console.log('Timestamp:', new Date().toISOString());
      
      if (!normalizedEmail || !trimmedPassword) {
        console.log('❌ Missing credentials');
        return res.status(400).json({ message: "Email and password required" });
      }
      
      // SECURE OWNER CHECK - Database lookup only
      if (OWNER_EMAIL && normalizedEmail === OWNER_EMAIL) {
        console.log('🔍 Checking owner credentials in database...');
        
        let ownerUser = await storage.getUserByEmail(normalizedEmail);
        
        if (!ownerUser) {
          console.log('❌ Owner user not found in database');
          return res.status(401).json({ message: "Invalid credentials" });
        }

        // Check password against database (bcrypt-aware)
        const ownerPwOk = ownerUser.password
          ? await verifyPassword(trimmedPassword, ownerUser.password, ownerUser.id)
          : false;
        if (!ownerPwOk) {
          console.log('❌ Invalid owner password');
          return res.status(401).json({ message: "Invalid credentials" });
        }

        console.log('✅ OWNER LOGIN SUCCESS');

        // 2FA check for owner
        if (ownerUser.twoFactorEnabled) {
          console.log('🔐 Owner has 2FA — deferring session until code verified');
          return res.json({ requiresTwoFactor: true, userId: ownerUser.id });
        }

        // Log successful login
        await storage.createAdminLoginLog({
          userId: ownerUser.id,
          email: normalizedEmail,
          userName: `${ownerUser.firstName} ${ownerUser.lastName}`,
          ipAddress: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.headers['user-agent'] || null,
          loginStatus: 'success',
          sessionId: null
        });

        req.login({
          claims: {
            sub: ownerUser.id,
            email: ownerUser.email,
            first_name: ownerUser.firstName,
            last_name: ownerUser.lastName,
            profile_image_url: ownerUser.profileImageUrl
          }
        }, (err) => {
          if (err) {
            console.error("❌ Session error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          console.log('✅ Owner logged in');
          console.log('=====================================\n');
          return res.json({ success: true, user: ownerUser, requirePasswordChange: false });
        });
        return;
      }
      
      // Check database for other users
      const user = await storage.getUserByEmail(normalizedEmail);
      
      if (!user) {
        console.log('❌ User not found');
        
        // Log failed login attempt
        await storage.createAdminLoginLog({
          userId: null,
          email: normalizedEmail,
          userName: null,
          ipAddress: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.headers['user-agent'] || null,
          loginStatus: 'failed',
          failureReason: 'User not found'
        });
        
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Check if user has permission to login to KSYK Maps
      if (user.canLoginToKsykMaps === false) {
        console.log('❌ User does not have permission to login to KSYK Maps');
        return res.status(403).json({ message: "You do not have permission to access KSYK Maps. Please contact support." });
      }
      
      if (!user.password) {
        console.log('❌ No password set');
        return res.status(401).json({ message: "Password not set. Please check your email for password setup link." });
      }
      
      const pwOk = await verifyPassword(trimmedPassword, user.password, user.id);
      if (!pwOk) {
        console.log('❌ Password mismatch');

        await storage.createAdminLoginLog({
          userId: user.id,
          email: normalizedEmail,
          userName: `${user.firstName} ${user.lastName}`,
          ipAddress: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.headers['user-agent'] || null,
          loginStatus: 'failed',
          failureReason: 'Invalid password'
        });

        return res.status(401).json({ message: "Invalid credentials" });
      }

      // 2FA check — defer session creation until code is verified
      if (user.twoFactorEnabled) {
        console.log('🔐 User has 2FA — deferring session');
        return res.json({ requiresTwoFactor: true, userId: user.id });
      }

      // Valid user login
      req.login({
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl
        }
      }, async (err) => {
        if (err) {
          console.error("❌ Session error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        // Log successful login
        await storage.createAdminLoginLog({
          userId: user.id,
          email: normalizedEmail,
          userName: `${user.firstName} ${user.lastName}`,
          ipAddress: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.headers['user-agent'] || null,
          loginStatus: 'success',
          sessionId: null
        });
        
        console.log('✅ User logged in');
        console.log('=====================================\n');
        return res.json({ 
          success: true, 
          user: user,
          requirePasswordChange: user.isTemporaryPassword || false
        });
      });
      
    } catch (error) {
      await logError(error, 'POST /api/auth/admin-login', { email: req.body?.email });
      res.status(500).json({ message: "Authentication error" });
    }
  });

  // 2FA Routes
  // Generate 2FA secret
  app.post('/api/auth/2fa/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      const userName = `${req.user.claims.first_name} ${req.user.claims.last_name}`;

      const { TwoFactorAuthService } = await import('./twoFactorAuth');
      const setup = TwoFactorAuthService.generateSecret(userEmail, userName);

      // Return the secret to the client — it must send it back on /enable
      res.json({
        secret: setup.secret,
        otpauthUrl: setup.otpauthUrl,
      });
    } catch (error) {
      console.error('Error generating 2FA secret:', error);
      res.status(500).json({ message: 'Failed to generate 2FA secret' });
    }
  });

  // Enable 2FA
  app.post('/api/auth/2fa/enable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Client must echo back the secret it received from /generate
      const { code, secret } = req.body;

      if (!secret) {
        return res.status(400).json({ message: 'No 2FA setup in progress. Call /generate first.' });
      }

      if (!code || code.length !== 6) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      const { TwoFactorAuthService } = await import('./twoFactorAuth');
      const result = await TwoFactorAuthService.enableTwoFactor(userId, secret, code);

      if (result.success) {
        
        // Generate backup codes
        const backupCodes = TwoFactorAuthService.generateBackupCodes();
        
        // Store backup codes in database
        await storage.updateUser(userId, {
          twoFactorBackupCodes: JSON.stringify(backupCodes),
        });

        res.json({
          success: true,
          message: result.message,
          backupCodes,
        });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      res.status(500).json({ message: 'Failed to enable 2FA' });
    }
  });

  // Disable 2FA
  app.post('/api/auth/2fa/disable', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { code } = req.body;

      if (!code || code.length !== 6) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      const { TwoFactorAuthService } = await import('./twoFactorAuth');
      const result = await TwoFactorAuthService.disableTwoFactor(userId, code);

      res.json(result);
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      res.status(500).json({ message: 'Failed to disable 2FA' });
    }
  });

  // Check 2FA status
  app.get('/api/auth/2fa/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        enabled: user.twoFactorEnabled || false,
        secret: (!user.twoFactorEnabled && user.twoFactorSecret) ? user.twoFactorSecret : null,
      });
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      res.status(500).json({ message: 'Failed to check 2FA status' });
    }
  });

  // Verify 2FA code during login
  app.post('/api/auth/2fa/verify', rateLimiters.auth, async (req, res) => {
    try {
      const { userId, code } = req.body;

      if (!userId || !code) {
        return res.status(400).json({ message: 'User ID and code required' });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.twoFactorSecret) {
        return res.status(400).json({ message: '2FA not enabled for this user' });
      }

      const { TwoFactorAuthService } = await import('./twoFactorAuth');
      const isValid = TwoFactorAuthService.verifyToken(user.twoFactorSecret, code);

      if (isValid) {
        res.json({ success: true });
      } else {
        // Try backup code
        const isBackupValid = await TwoFactorAuthService.verifyBackupCode(userId, code);
        if (isBackupValid) {
          res.json({ success: true, usedBackupCode: true });
        } else {
          res.status(401).json({ success: false, message: 'Invalid code' });
        }
      }
    } catch (error) {
      console.error('Error verifying 2FA code:', error);
      res.status(500).json({ message: 'Failed to verify code' });
    }
  });

  // Complete login with 2FA — verify code and create session
  app.post('/api/auth/2fa/complete-login', rateLimiters.auth, async (req: any, res) => {
    try {
      const { userId, code } = req.body;
      if (!userId || !code) {
        return res.status(400).json({ message: 'User ID and code required' });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        return res.status(400).json({ message: '2FA not enabled for this user' });
      }

      const { TwoFactorAuthService } = await import('./twoFactorAuth');
      const isValid = TwoFactorAuthService.verifyToken(user.twoFactorSecret, code);
      const isBackup = !isValid && await TwoFactorAuthService.verifyBackupCode(userId, code);

      if (!isValid && !isBackup) {
        return res.status(401).json({ success: false, message: 'Invalid 2FA code' });
      }

      req.login({
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl,
        }
      }, async (err: any) => {
        if (err) return res.status(500).json({ message: 'Login failed' });
        await storage.createAdminLoginLog({
          userId: user.id,
          email: user.email ?? '',
          userName: `${user.firstName} ${user.lastName}`,
          ipAddress: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.headers['user-agent'] || null,
          loginStatus: 'success',
          sessionId: null
        });
        res.json({ success: true, user, usedBackupCode: isBackup });
      });
    } catch (error) {
      console.error('Error completing 2FA login:', error);
      res.status(500).json({ message: 'Failed to complete login' });
    }
  });

  // Send email verification code for 2FA
  app.post('/api/auth/2fa/send-email-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email;
      
      const { TwoFactorAuthService } = await import('./twoFactorAuth');
      const result = await TwoFactorAuthService.sendEmailCode(userEmail);
      
      if (result.success && result.code) {
        // Sign the code into a short-lived JWT challenge — no session needed
        const challengeToken = signChallenge({ userId, code: result.code }, "10m");
        res.json({ success: true, message: 'Verification code sent to your email', challengeToken });
      } else {
        res.status(500).json({ success: false, message: 'Failed to send email' });
      }
    } catch (error) {
      console.error('Error sending email code:', error);
      res.status(500).json({ message: 'Failed to send verification code' });
    }
  });

  // Verify email code for 2FA
  app.post('/api/auth/2fa/verify-email-code', isAuthenticated, async (req: any, res) => {
    try {
      const { code, challengeToken } = req.body;

      if (!challengeToken) {
        return res.status(400).json({ success: false, message: 'No verification code sent' });
      }
      const challenge = verifyChallenge(challengeToken);
      if (!challenge) {
        return res.status(400).json({ success: false, message: 'Verification code expired' });
      }
      if (code === challenge.code) {
        res.json({ success: true });
      } else {
        res.status(401).json({ success: false, message: 'Invalid verification code' });
      }
    } catch (error) {
      console.error('Error verifying email code:', error);
      res.status(500).json({ message: 'Failed to verify code' });
    }
  });

  // Easter Egg Stats
  app.get('/api/easter-eggs/stats', isAuthenticated, async (req, res) => {
    try {
      const { kvGet } = await import('./kvStorage.js');
      const data = ((await kvGet('easterEggCounters')) as Record<string, number>) || {};
      const total = Object.values(data).reduce((s: number, n) => s + (n as number), 0);
      res.json({ ...data, total });
    } catch (error) {
      console.error('Error fetching easter egg stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Adblock-safe alias for egg tracking — short neutral URL passes most filter lists.
  // Registered here (early) so it is guaranteed before any catch-all middleware.
  app.post('/api/t/egg', rateLimiters.general, async (req: any, res) => {
    try {
      const { eggId } = req.body ?? {};
      if (typeof eggId !== "string" || !/^[a-z0-9-]{1,64}$/.test(eggId)) {
        return res.status(204).end();
      }
      const userId = (req.user?.claims?.sub || 'anonymous').toString().slice(0, 60);
      await incrementEggCounter(eggId);
      await appendEggRecent({ egg: eggId, userId, at: new Date().toISOString() });
      res.status(204).end();
    } catch { res.status(204).end(); }
  });

  // Track Easter Egg Discovery
  app.post('/api/easter-eggs/track', rateLimiters.general, async (req: any, res) => {
    try {
      const { eggId } = req.body;
      if (typeof eggId !== "string" || !/^[a-z0-9-]{1,64}$/.test(eggId)) {
        return res.status(400).json({ message: "Invalid egg id" });
      }
      const userId = (req.user?.claims?.sub || 'anonymous').toString().slice(0, 60);
      await incrementEggCounter(eggId);
      await appendEggRecent({ egg: eggId, userId, at: new Date().toISOString() });
      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking easter egg:', error);
      res.status(500).json({ message: 'Failed to track discovery' });
    }
  });

  // Change password endpoint
  app.post('/api/auth/change-password', rateLimiters.passwordReset, isAuthenticated, async (req: any, res) => {
    try {
      const { newPassword } = req.body;
      const userId = req.user.claims.sub;
      
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      // Hash before storing
      const hashed = await hashPassword(newPassword);
      await storage.upsertUser({
        id: userId,
        password: hashed,
        isTemporaryPassword: false
      });
      
      console.log('Password changed for user:', userId);
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      await logError(error, 'POST /api/auth/change-password', { userId: req.user?.claims?.sub });
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Password reset request endpoint
  app.post('/api/auth/forgot-password', rateLimiters.passwordReset, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check if user exists
      const user = await storage.getUserByEmail(email.toLowerCase().trim());
      
      // Always return success to prevent email enumeration
      if (!user) {
        console.log('Password reset requested for non-existent email:', email);
        return res.json({ success: true, message: "If the email exists, a reset link has been sent" });
      }
      
      // Generate cryptographically-secure reset token (valid for 1 hour)
      const { randomBytes } = await import('crypto');
      const resetToken = randomBytes(32).toString('hex');
      const resetExpiry = Date.now() + 3600000; // 1 hour
      
      // Store reset token in database
      await storage.upsertUser({
        id: user.id,
        passwordResetToken: resetToken,
        passwordResetExpiry: new Date(resetExpiry)
      });
      
      // Send reset email
      const resetUrl = `${process.env.APP_URL || 'https://ksykmaps.fi'}/reset-password?token=${resetToken}`;
      
      try {
        const emailService = await import('./emailService');
        await emailService.sendEmail({
          to: email,
          subject: 'Password Reset Request - KSYK Maps',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #003d82 0%, #0052a3 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Salasanan palautus</h1>
              </div>
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #333;">Hei ${user.firstName},</p>
                <p style="font-size: 16px; color: #333;">Olet pyytänyt salasanan palautusta KSYK Maps -tilillesi.</p>
                <p style="font-size: 16px; color: #333;">Klikkaa alla olevaa painiketta palauttaaksesi salasanasi:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="background: linear-gradient(135deg, #003d82 0%, #0052a3 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
                    Palauta salasana
                  </a>
                </div>
                <p style="font-size: 14px; color: #666;">Tai kopioi ja liitä tämä linkki selaimeesi:</p>
                <p style="font-size: 12px; color: #999; word-break: break-all; background: white; padding: 10px; border-radius: 5px;">${resetUrl}</p>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <p style="font-size: 14px; color: #666;">⏰ Tämä linkki on voimassa 1 tunnin ajan.</p>
                  <p style="font-size: 14px; color: #666;">⚠️ Jos et pyytänyt salasanan palautusta, voit jättää tämän viestin huomiotta.</p>
                </div>
              </div>
              <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                <p>© 2026 KSYK Maps • Kaikki oikeudet pidätetään</p>
              </div>
            </div>
          `
        });
        console.log('✅ Password reset email sent to:', email);
      } catch (emailError) {
        console.error('❌ Failed to send password reset email:', emailError);
        return res.status(500).json({ message: "Failed to send reset email" });
      }
      
      res.json({ success: true, message: "If the email exists, a reset link has been sent" });
    } catch (error) {
      await logError(error, 'POST /api/auth/forgot-password', { email: req.body?.email });
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Password reset verification and update endpoint
  app.post('/api/auth/reset-password', rateLimiters.passwordReset, async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }
      
      // Find user by reset token
      const users = await storage.getAllUsers();
      const user = users.find((u: any) => u.passwordResetToken === token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      // Check if token is expired
      if (user.passwordResetExpiry && new Date(user.passwordResetExpiry) < new Date()) {
        return res.status(400).json({ message: "Reset token has expired" });
      }
      
      // Hash and store the new password, clear reset token
      const hashedNew = await hashPassword(newPassword);
      await storage.upsertUser({
        id: user.id,
        password: hashedNew,
        passwordResetToken: null,
        passwordResetExpiry: null,
        isTemporaryPassword: false
      });
      
      console.log('✅ Password reset successful for user:', user.email);
      res.json({ success: true, message: "Password has been reset successfully" });
    } catch (error) {
      await logError(error, 'POST /api/auth/reset-password');
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Logout endpoint — clears the JWT auth cookie
  app.post('/api/auth/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) console.error("Logout error:", err);
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  // (duplicate unauthenticated /api/test-email removed — see protected version below)

  // Development login bypass (for testing only) - REMOVED FOR SECURITY

  // Building routes
  //
  // NOTE: soft-fail on read. If the storage layer bursts (Firestore
  // rate limit, network blip, transient config error) we still want the
  // public map to boot with an empty campus rather than blank-page-500.
  // The real error is captured via logError so admins can debug from
  // the Logs panel. Mutating routes (POST/PATCH/DELETE) still 500 —
  // there we WANT the client to know its write failed.
  app.get('/api/buildings', async (req, res) => {
    try {
      const buildings = await storage.getBuildings();
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      res.json(Array.isArray(buildings) ? buildings : []);
    } catch (error) {
      await logError(error, 'GET /api/buildings');
      res.set('X-Read-Soft-Fail', '1').json([]);
    }
  });

  app.get('/api/buildings/:id', async (req, res) => {
    try {
      const building = await storage.getBuilding(req.params.id);
      if (!building) {
        return res.status(404).json({ message: "Building not found" });
      }
      res.json(building);
    } catch (error) {
      await logError(error, 'GET /api/buildings/:id', { buildingId: req.params.id });
      res.status(500).json({ message: "Failed to fetch building" });
    }
  });

  app.post('/api/buildings', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertBuildingSchema.parse(req.body);
      const building = await storage.createBuilding(validatedData);
      res.status(201).json(building);
    } catch (error) {
      await logError(error, 'POST /api/buildings', { buildingData: req.body });
      res.status(500).json({ message: "Failed to create building" });
    }
  });

  app.put('/api/buildings/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertBuildingSchema.partial().parse(req.body);
      const building = await storage.updateBuilding(req.params.id, validatedData);
      res.json(building);
    } catch (error) {
      await logError(error, 'PUT /api/buildings/:id', { buildingId: req.params.id });
      res.status(500).json({ message: "Failed to update building" });
    }
  });

  // PATCH mirrors PUT — the Builder's PropertyPanel sends partial
  // updates via PATCH which is the semantically correct method for a
  // partial edit. Kept alongside PUT so nothing else breaks.
  app.patch('/api/buildings/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const validatedData = insertBuildingSchema.partial().parse(req.body);
      const building = await storage.updateBuilding(req.params.id, validatedData);
      res.json(building);
    } catch (error) {
      await logError(error, 'PATCH /api/buildings/:id', { buildingId: req.params.id });
      res.status(500).json({ message: "Failed to update building" });
    }
  });

  app.delete('/api/buildings/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteBuilding(req.params.id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/buildings/:id', { buildingId: req.params.id });
      res.status(500).json({ message: "Failed to delete building" });
    }
  });

  // Floor routes
  app.get('/api/floors', async (req, res) => {
    try {
      const buildingId = req.query.buildingId as string;
      const floors = await storage.getFloors(buildingId);
      res.json(Array.isArray(floors) ? floors : []);
    } catch (error) {
      await logError(error, 'GET /api/floors', { buildingId: req.query.buildingId });
      res.set('X-Read-Soft-Fail', '1').json([]);
    }
  });

  app.get('/api/floors/:id', async (req, res) => {
    try {
      const floor = await storage.getFloor(req.params.id);
      if (!floor) {
        return res.status(404).json({ message: "Floor not found" });
      }
      res.json(floor);
    } catch (error) {
      await logError(error, 'GET /api/floors/:id', { floorId: req.params.id });
      res.status(500).json({ message: "Failed to fetch floor" });
    }
  });

  app.post('/api/floors', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertFloorSchema.parse(req.body);
      const floor = await storage.createFloor(validatedData);
      res.status(201).json(floor);
    } catch (error) {
      await logError(error, 'POST /api/floors', { floorData: req.body });
      res.status(500).json({ message: "Failed to create floor" });
    }
  });

  app.put('/api/floors/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertFloorSchema.partial().parse(req.body);
      const floor = await storage.updateFloor(req.params.id, validatedData);
      res.json(floor);
    } catch (error) {
      await logError(error, 'PUT /api/floors/:id', { floorId: req.params.id });
      res.status(500).json({ message: "Failed to update floor" });
    }
  });

  app.delete('/api/floors/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteFloor(req.params.id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/floors/:id', { floorId: req.params.id });
      res.status(500).json({ message: "Failed to delete floor" });
    }
  });



  // Room routes
  app.get('/api/rooms', async (req, res) => {
    try {
      const buildingId = req.query.buildingId as string;
      const rooms = await storage.getRooms(buildingId);
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
      res.json(Array.isArray(rooms) ? rooms : []);
    } catch (error) {
      await logError(error, 'GET /api/rooms', { buildingId: req.query.buildingId });
      res.set('X-Read-Soft-Fail', '1').json([]);
    }
  });

  app.get('/api/rooms/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query required" });
      }
      const rooms = await storage.searchRooms(query);
      res.json(rooms);
    } catch (error) {
      await logError(error, 'GET /api/rooms/search', { query: req.query.q });
      res.status(500).json({ message: "Failed to search rooms" });
    }
  });

  app.get('/api/rooms/:id', async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }
      res.json(room);
    } catch (error) {
      await logError(error, 'GET /api/rooms/:id', { roomId: req.params.id });
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  app.post('/api/rooms', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub ?? '');
      if (!user || !['admin', 'owner', 'editor'].includes(user.role ?? '')) {
        return res.status(403).json({ message: "Admin, owner, or editor access required" });
      }

      const validatedData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(validatedData);
      res.status(201).json(room);
    } catch (error) {
      await logError(error, 'POST /api/rooms', { roomData: req.body });
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.put('/api/rooms/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['admin', 'owner', 'editor'].includes(user.role ?? '')) {
        return res.status(403).json({ message: "Admin, owner, or editor access required" });
      }

      const validatedData = insertRoomSchema.partial().parse(req.body);
      const room = await storage.updateRoom(req.params.id, validatedData);
      res.json(room);
    } catch (error) {
      await logError(error, 'PUT /api/rooms/:id', { roomId: req.params.id });
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  // PATCH mirror — same reason as buildings.
  app.patch('/api/rooms/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['admin', 'owner', 'editor'].includes(user.role ?? '')) {
        return res.status(403).json({ message: "Admin, owner, or editor access required" });
      }
      const validatedData = insertRoomSchema.partial().parse(req.body);
      const room = await storage.updateRoom(req.params.id, validatedData);
      res.json(room);
    } catch (error) {
      await logError(error, 'PATCH /api/rooms/:id', { roomId: req.params.id });
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete('/api/rooms/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['admin', 'owner', 'editor'].includes(user.role ?? '')) {
        return res.status(403).json({ message: "Admin, owner, or editor access required" });
      }

      await storage.deleteRoom(req.params.id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/rooms/:id', { roomId: req.params.id });
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  // Room schedule endpoint — returns today's timetable for a room.
  //
  // Source selection (checked in order):
  //   1. Live Wilma proxy  — when WILMA_BASE_URL + WILMA_SESSION env vars are set.
  //      Set WILMA_BASE_URL to the school's Wilma instance (e.g. https://ksyk.inschool.fi)
  //      and WILMA_SESSION to a valid Wilma2SID cookie value.
  //   2. Static DB fallback — wilma_schedules table seeded via admin import.
  //   3. Empty schedule     — neither configured.
  app.get('/api/rooms/:id/schedule', async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) return res.status(404).json({ message: 'Room not found' });

      const now = new Date();
      const jsDay = now.getDay();
      const wilmaDay = jsDay === 0 || jsDay === 6 ? null : jsDay;

      interface WilmaScheduleRow {
        id: string;
        dayOfWeek: number;
        timeSlot: string;
        subject: string;
        room: string;
        teacherName: string;
        teacherId: string | null;
        isActive: boolean;
      }

      let schedule: WilmaScheduleRow[] = [];
      let source: 'wilma-live' | 'wilma-db' | 'none' = 'none';

      if (wilmaDay !== null) {
        const wilmaBaseUrl = process.env.WILMA_BASE_URL;
        const wilmaSession = process.env.WILMA_SESSION;

        if (wilmaBaseUrl && wilmaSession && room.roomNumber) {
          // Live Wilma proxy — requests the schedule page for this room.
          // Wilma returns HTML; we extract JSON from the embedded data script.
          try {
            const resp = await fetch(
              `${wilmaBaseUrl}/wilma2/schedule/room/${encodeURIComponent(room.roomNumber)}?format=json`,
              {
                headers: {
                  Cookie: `Wilma2SID=${wilmaSession}`,
                  'User-Agent': 'KSYK-Maps/1.0',
                },
                signal: AbortSignal.timeout(5000),
              }
            );
            if (resp.ok) {
              const data = await resp.json() as any;
              // Wilma schedule JSON: { schedule: [{ period, subject, teacher, startLesson, endLesson }] }
              const today = now.toISOString().slice(0, 10);
              const items: any[] = Array.isArray(data?.schedule) ? data.schedule : [];
              schedule = items
                .filter((e: any) => e.date === today || !e.date)
                .map((e: any, i: number) => ({
                  id: `live-${i}`,
                  dayOfWeek: wilmaDay,
                  timeSlot: `${e.startLesson ?? ''}${e.endLesson ? `-${e.endLesson}` : ''}`,
                  subject: e.subject ?? '',
                  room: room.roomNumber ?? '',
                  teacherName: e.teacher ?? '',
                  teacherId: null,
                  isActive: true,
                }));
              source = 'wilma-live';
            } else {
              console.warn(`[schedule] Wilma proxy returned ${resp.status} for room ${room.roomNumber}`);
            }
          } catch (proxyErr) {
            console.warn('[schedule] Wilma proxy failed, falling back to DB:', (proxyErr as Error).message);
          }
        }

        if (source === 'none') {
          // DB fallback
          try {
            const all: WilmaScheduleRow[] = await (storage as any).getWilmaSchedulesAll?.() ?? [];
            schedule = all.filter(
              (s) => s.isActive && s.dayOfWeek === wilmaDay &&
                s.room?.toUpperCase() === room.roomNumber?.toUpperCase()
            );
            if (schedule.length > 0) source = 'wilma-db';
          } catch { /* wilma_schedules not seeded — leave empty */ }
        }
      }

      const nowMins = now.getHours() * 60 + now.getMinutes();
      const parseSlot = (slot: string) => {
        const [start, end] = slot.split('-');
        const [sh, sm] = (start || '').split(':').map(Number);
        const [eh, em] = (end || '').split(':').map(Number);
        return { startMins: (sh || 0) * 60 + (sm || 0), endMins: (eh || 0) * 60 + (em || 0) };
      };

      const entries = schedule
        .sort((a, b) => parseSlot(a.timeSlot).startMins - parseSlot(b.timeSlot).startMins)
        .map((s) => {
          const { startMins, endMins } = parseSlot(s.timeSlot);
          const [startTime, endTime] = s.timeSlot.split('-');
          return {
            id: s.id,
            startTime: startTime?.trim() ?? '',
            endTime: endTime?.trim() ?? '',
            subject: s.subject,
            teacher: s.teacherName,
            group: null as string | null,
            isCurrent: nowMins >= startMins && nowMins < endMins,
            isNext: nowMins < startMins &&
              !schedule.some((x) => { const p = parseSlot(x.timeSlot); return nowMins >= p.startMins && nowMins < p.endMins; }) &&
              startMins === Math.min(
                ...schedule.filter((x) => parseSlot(x.timeSlot).startMins > nowMins).map((x) => parseSlot(x.timeSlot).startMins)
              ),
          };
        });

      res.json({
        roomId: req.params.id,
        roomNumber: room.roomNumber,
        date: now.toISOString().slice(0, 10),
        dayOfWeek: wilmaDay,
        schedule: entries,
        source,
        wilmaConfigured: !!process.env.WILMA_BASE_URL,
        lastUpdated: entries.length > 0 ? now.toISOString() : null,
      });
    } catch (error) {
      await logError(error, 'GET /api/rooms/:id/schedule', { roomId: req.params.id });
      res.status(500).json({ message: 'Failed to fetch room schedule' });
    }
  });

  // Hallway routes
  app.get('/api/hallways', async (req, res) => {
    try {
      const buildingId = req.query.buildingId as string | undefined;
      const hallways = await storage.getHallways(buildingId);
      res.json(Array.isArray(hallways) ? hallways : []);
    } catch (error) {
      await logError(error, 'GET /api/hallways', { buildingId: req.query.buildingId });
      res.set('X-Read-Soft-Fail', '1').json([]);
    }
  });

  app.post('/api/hallways', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['admin', 'owner', 'editor'].includes(user.role ?? '')) {
        return res.status(403).json({ message: "Admin, owner, or editor access required" });
      }

      const hallwayData = insertHallwaySchema.parse(req.body);
      const hallway = await storage.createHallway(hallwayData);
      res.json(hallway);
    } catch (error) {
      await logError(error, 'POST /api/hallways', { hallwayData: req.body });
      res.status(500).json({ message: "Failed to create hallway" });
    }
  });

  app.delete('/api/hallways/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['admin', 'owner', 'editor'].includes(user.role ?? '')) {
        return res.status(403).json({ message: "Admin, owner, or editor access required" });
      }

      await storage.deleteHallway(req.params.id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/hallways/:id', { hallwayId: req.params.id });
      res.status(500).json({ message: "Failed to delete hallway" });
    }
  });

  // PATCH mirror for the PropertyPanel.
  app.patch('/api/hallways/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !['admin', 'owner', 'editor'].includes(user.role ?? '')) return res.status(403).json({ message: "Admin, owner, or editor access required" });
      const data = insertHallwaySchema.partial().parse(req.body);
      const hallway = await (storage as any).updateHallway?.(req.params.id, data);
      if (!hallway) return res.status(404).json({ message: "Not found" });
      res.json(hallway);
    } catch (error) {
      await logError(error, 'PATCH /api/hallways/:id', { hallwayId: req.params.id });
      res.status(500).json({ message: "Failed to update hallway" });
    }
  });

  // ── POI routes: stairs, elevators, doors + generic POIs ──────────
  // All backed by the campus_pois Supabase table. `kind` is the
  // discriminator (stairs | elevators | doors | wc | info | …).
  const registerPoiRoutes = (kind: "stairs" | "elevators" | "doors") => {
    app.get(`/api/${kind}`, async (_req, res) => {
      try {
        const items = await getPoisByKind(kind);
        res.json(items);
      } catch (error) {
        console.error(`GET /api/${kind} soft-failed:`, error);
        res.set('X-Read-Soft-Fail', '1').json([]);
      }
    });

    app.post(`/api/${kind}`, isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
        const body = req.body ?? {};
        const lat = typeof body.position?.lat === "number" ? body.position.lat
                  : typeof body.mapPositionY === "number" ? body.mapPositionY
                  : null;
        const lng = typeof body.position?.lng === "number" ? body.position.lng
                  : typeof body.mapPositionX === "number" ? body.mapPositionX
                  : null;
        if (lat === null || lng === null) return res.status(400).json({ message: "Missing position" });
        if (!validLatLng(lat, lng)) return res.status(400).json({ message: "Invalid coordinates" });
        const record = await createPoi({ ...body, kind, position: { lat, lng } });
        res.status(201).json(record);
      } catch (error) {
        console.error(`POST /api/${kind} failed:`, error);
        res.status(500).json({ message: `Failed to create ${kind}` });
      }
    });

    app.delete(`/api/${kind}/:id`, isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
      try {
        const user = await storage.getUser(req.user.claims.sub);
        if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
        await deletePoi(req.params.id);
        res.status(204).send();
      } catch (error) {
        console.error(`DELETE /api/${kind} failed:`, error);
        res.status(500).json({ message: `Failed to delete ${kind}` });
      }
    });
  };
  registerPoiRoutes("stairs");
  registerPoiRoutes("elevators");
  registerPoiRoutes("doors");

  // Generic POIs — free-form `kind` string (wc, info, bike, café…)
  app.get('/api/pois', async (_req, res) => {
    try {
      const items = await getAllPois();
      res.json(items);
    } catch (error) {
      console.error('GET /api/pois soft-failed:', error);
      res.set('X-Read-Soft-Fail', '1').json([]);
    }
  });

  app.post('/api/pois', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
      const body = req.body ?? {};
      if (typeof body.kind !== 'string' || !body.kind) return res.status(400).json({ message: 'Missing kind' });
      const lat = typeof body.position?.lat === 'number' ? body.position.lat
                : typeof body.mapPositionY === 'number' ? body.mapPositionY
                : null;
      const lng = typeof body.position?.lng === 'number' ? body.position.lng
                : typeof body.mapPositionX === 'number' ? body.mapPositionX
                : null;
      if (lat === null || lng === null) return res.status(400).json({ message: 'Missing position' });
      if (!validLatLng(lat, lng)) return res.status(400).json({ message: 'Invalid coordinates' });
      const record = await createPoi({ ...body, position: { lat, lng } });
      res.status(201).json(record);
    } catch (error) {
      console.error('POST /api/pois failed:', error);
      res.status(500).json({ message: 'Failed to create POI' });
    }
  });

  app.delete('/api/pois/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') return res.status(403).json({ message: "Admin access required" });
      await deletePoi(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error('DELETE /api/pois failed:', error);
      res.status(500).json({ message: 'Failed to delete POI' });
    }
  });

  // User routes (admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const limit  = Math.min(Math.max(parseInt((req.query.limit  as string) || "200", 10), 1), 500);
      const offset = Math.max(parseInt((req.query.offset as string) || "0",   10), 0);
      res.json(await storage.getAllUsers(limit, offset));
    } catch (error) {
      await logError(error, 'GET /api/users', { isAuthenticated: req.isAuthenticated() });
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, firstName, lastName, role, password, passwordOption } = req.body;

      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, first name, and last name are required" });
      }
      if (!EMAIL_RE.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      if (role === 'owner') {
        return res.status(403).json({ message: "Cannot assign owner role" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Generate temp password if email option
      let finalPassword = password;
      let isTemp = false;
      if (passwordOption === 'email') {
        finalPassword = generateTempPassword();
        isTemp = true;
      }

      // Hash the password before storing
      const hashedFinal = await hashPassword(finalPassword);
      const newUser = await storage.upsertUser({
        email,
        firstName,
        lastName,
        role: role || 'admin',
        password: hashedFinal,
        isTemporaryPassword: isTemp,
        profileImageUrl: null
      });

      // If email option, send invitation email with password
      if (passwordOption === 'email') {
        console.log(`\n📧 ========== EMAIL INVITATION ==========`);
        console.log(`Target: ${email}`);
        console.log(`Name: ${firstName} ${lastName}`);

        try {
          const emailResult = await sendPasswordSetupEmail(email, firstName, finalPassword);

          console.log(`\n📧 EMAIL RESULT:`);
          console.log(`   Success: ${emailResult.success}`);
          console.log(`   Mode: ${emailResult.mode}`);

          if (emailResult.success) {
            console.log(`✅ EMAIL SENT to ${email}`);
          } else {
            console.log(`⚠️ EMAIL NOT SENT`);
          }
        } catch (error: any) {
          console.error('❌ EMAIL ERROR:', error.message);
        }
        
        console.log(`==========================================\n`);
      }

      const { password: _pw, ...safeUser } = newUser as any;
      res.status(201).json(safeUser);
    } catch (error) {
      await logError(error, 'POST /api/users', { email: req.body?.email });
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { email, firstName, lastName, role, newPassword } = req.body;

      if (id === 'owner-admin-user') {
        return res.status(403).json({ message: "Cannot edit owner account" });
      }
      if (role === 'owner') {
        return res.status(403).json({ message: "Cannot assign owner role" });
      }
      // Prevent editing accounts with the owner role (regardless of DB id)
      const targetUser = await storage.getUser(id);
      if (targetUser?.role === 'owner') {
        return res.status(403).json({ message: "Cannot edit owner account" });
      }
      if (OWNER_EMAIL && targetUser?.email?.toLowerCase() === OWNER_EMAIL) {
        return res.status(403).json({ message: "Cannot edit owner account" });
      }
      if (email && !EMAIL_RE.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      const updateData: any = {
        id,
        email,
        firstName,
        lastName,
        role
      };

      if (newPassword) {
        updateData.password = await hashPassword(newPassword);
      }

      const updatedUser = await storage.upsertUser(updateData);
      res.json(updatedUser);
    } catch (error) {
      await logError(error, 'PUT /api/users/:id', { userId: req.params.id });
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;

      // Don't allow deleting owner account by ID
      if (id === 'owner-admin-user') {
        return res.status(403).json({ message: "Cannot delete owner account" });
      }
      
      // Don't allow deleting by owner email
      const userToDelete = await storage.getUser(id);
      if (userToDelete && OWNER_EMAIL && userToDelete.email?.toLowerCase() === OWNER_EMAIL) {
        return res.status(403).json({ message: "Cannot delete owner account" });
      }

      await storage.deleteUser(id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/users/:id', { userId: req.params.id });
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin Login Logs routes
  app.get('/api/admin-login-logs', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAdminLoginLogs(limit);
      res.json(logs);
    } catch (error) {
      await logError(error, 'GET /api/admin/login-logs', { limit: req.query.limit });
      res.status(500).json({ message: "Failed to fetch login logs" });
    }
  });

  // Staff routes
  app.get('/api/staff', async (req, res) => {
    try {
      const limit  = Math.min(Math.max(parseInt((req.query.limit  as string) || "200", 10), 1), 500);
      const offset = Math.max(parseInt((req.query.offset as string) || "0",   10), 0);
      res.json(await storage.getStaff(limit, offset));
    } catch (error) {
      await logError(error, 'GET /api/staff');
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.get('/api/staff/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      const department = req.query.department as string;
      if (!query) {
        return res.status(400).json({ message: "Search query required" });
      }
      const staff = await storage.searchStaff(query, department);
      res.json(staff);
    } catch (error) {
      await logError(error, 'GET /api/staff/search', { query: req.query.q, department: req.query.department });
      res.status(500).json({ message: "Failed to search staff" });
    }
  });

  app.post('/api/staff', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertStaffSchema.parse(req.body);
      const staffMember = await storage.createStaffMember(validatedData);
      res.status(201).json(staffMember);
    } catch (error) {
      await logError(error, 'POST /api/staff', { staffData: req.body });
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  app.put('/api/staff/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertStaffSchema.partial().parse(req.body);
      const staffMember = await storage.updateStaffMember(req.params.id, validatedData);
      res.json(staffMember);
    } catch (error) {
      await logError(error, 'PUT /api/staff/:id', { staffId: req.params.id });
      res.status(500).json({ message: "Failed to update staff member" });
    }
  });

  app.delete('/api/staff/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteStaffMember(req.params.id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/staff/:id', { staffId: req.params.id });
      res.status(500).json({ message: "Failed to delete staff member" });
    }
  });

  app.post('/api/test-email', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📧 Test email requested');
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { to } = req.body;
      if (!to) {
        return res.status(400).json({ message: "Email address required" });
      }

      const emailService = await import('./emailService');
      const result = await emailService.sendEmail({
        to,
        subject: 'Test Email from KSYK Maps',
        html: `
          <h1>Test Email</h1>
          <p>This is a test email from KSYK Maps.</p>
          <p>If you received this, email configuration is working correctly!</p>
          <p>Sent at: ${new Date().toLocaleString('fi-FI')}</p>
        `
      });

      if (result.success) {
        res.json({ success: true, message: 'Test email sent successfully', messageId: result.messageId });
      } else {
        res.status(500).json({ success: false, message: 'Failed to send test email', error: result.error });
      }
    } catch (error: any) {
      console.error('❌ Test email error:', error);
      res.status(500).json({ success: false, message: 'Failed to send test email', error: error.message });
    }
  });

  // Schedule Settings routes
  app.get('/api/schedule-settings', async (_req, res) => {
    try {
      const data = await kvGet('scheduleSettings');
      res.json(data ?? { periods: [], terms: [], breaks: [], specialSchedules: [] });
    } catch (error) {
      await logError(error, 'GET /api/schedule-settings');
      res.status(500).json({ message: "Failed to fetch schedule settings" });
    }
  });

  app.post('/api/schedule-settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { periods, terms, breaks, holidays, specialSchedules } = req.body;
      const settings = {
        periods: periods || [],
        terms: terms || [],
        breaks: breaks || [],
        holidays: holidays || [],
        specialSchedules: specialSchedules || [],
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      };
      await kvSet('scheduleSettings', settings);
      res.json(settings);
    } catch (error) {
      await logError(error, 'POST /api/schedule-settings');
      res.status(500).json({ message: "Failed to save schedule settings" });
    }
  });

  // Appearance Settings routes
  app.get('/api/appearance-settings', async (_req, res) => {
    try {
      const data = await kvGet('appearanceSettings');
      res.json(data ?? { timeFormat: '24h', language: 'fi', dateFormat: 'DD.MM.YYYY' });
    } catch (error) {
      await logError(error, 'GET /api/appearance-settings');
      res.status(500).json({ message: "Failed to fetch appearance settings" });
    }
  });

  app.post('/api/appearance-settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { timeFormat, language, dateFormat } = req.body;
      const settings = {
        timeFormat: timeFormat || '24h',
        language: language || 'fi',
        dateFormat: dateFormat || 'DD.MM.YYYY',
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      };
      await kvSet('appearanceSettings', settings);
      res.json(settings);
    } catch (error) {
      await logError(error, 'POST /api/appearance-settings');
      res.status(500).json({ message: "Failed to save appearance settings" });
    }
  });

  // Event routes
  app.get('/api/events', async (req, res) => {
    try {
      const startDate = req.query.start ? new Date(req.query.start as string) : undefined;
      const endDate = req.query.end ? new Date(req.query.end as string) : undefined;
      const events = await storage.getEvents(startDate, endDate);
      res.json(events);
    } catch (error) {
      await logError(error, 'GET /api/events', { startDate: req.query.startDate, endDate: req.query.endDate });
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      await logError(error, 'POST /api/events', { eventData: req.body });
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  // Announcement routes
  app.get('/api/announcements', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const announcements = await storage.getAnnouncements(limit);
      
      // Auto-delete expired announcements
      const now = new Date();
      const expiredAnnouncements = announcements.filter(announcement => {
        if (!announcement.expiresAt) return false;
        
        let expiryDate: Date;
        if (typeof announcement.expiresAt === 'object' && (announcement.expiresAt as any)._seconds) {
          expiryDate = new Date((announcement.expiresAt as any)._seconds * 1000);
        } else {
          expiryDate = new Date(announcement.expiresAt);
        }
        
        return expiryDate < now;
      });
      
      // Delete expired announcements
      for (const expired of expiredAnnouncements) {
        try {
          await storage.deleteAnnouncement(expired.id);
          console.log(`🗑️ Auto-deleted expired announcement: ${expired.id} (${expired.title})`);
        } catch (deleteError) {
          console.error(`❌ Failed to delete expired announcement ${expired.id}:`, deleteError);
        }
      }
      
      // Return only non-expired announcements
      const activeAnnouncements = announcements.filter(announcement => {
        if (!announcement.expiresAt) return true;
        
        let expiryDate: Date;
        if (typeof announcement.expiresAt === 'object' && (announcement.expiresAt as any)._seconds) {
          expiryDate = new Date((announcement.expiresAt as any)._seconds * 1000);
        } else {
          expiryDate = new Date(announcement.expiresAt);
        }
        
        return expiryDate >= now;
      });
      
      res.json(activeAnnouncements);
    } catch (error) {
      await logError(error, 'GET /api/announcements', { limit: req.query.limit });
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.post('/api/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement(validatedData);
      res.status(201).json(announcement);
    } catch (error) {
      await logError(error, 'POST /api/announcements', { announcementData: req.body });
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.put('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertAnnouncementSchema.partial().parse(req.body);
      const announcement = await storage.updateAnnouncement(req.params.id, validatedData);
      res.json(announcement);
    } catch (error) {
      await logError(error, 'PUT /api/announcements/:id', { announcementId: req.params.id });
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  app.delete('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteAnnouncement(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // force-login and test-login removed — both were unauthenticated debug
  // endpoints that exposed password hashes and created admin sessions without
  // credentials. See security audit C-1 and C-2.

  // Test email endpoint (always available for debugging)
  // Search endpoint for global search
  app.get('/api/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query required" });
      }

      const [rooms, staff] = await Promise.all([
        storage.searchRooms(query),
        storage.searchStaff(query)
      ]);

      res.json({
        rooms,
        staff,
        total: rooms.length + staff.length
      });
    } catch (error) {
      console.error("Error performing global search:", error);
      res.status(500).json({ message: "Failed to perform search" });
    }
  });

  // Ticket routes
  app.get('/api/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const tickets = await storage.getTickets();
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.post('/api/tickets', rateLimiters.general, async (req, res) => {
    try {
      const ticketData = req.body;
      
      // Generate ticket ID if not provided
      const ticketId = ticketData.ticketId || `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      
      console.log('\n🎫 ========== CREATING TICKET ==========');
      console.log('Ticket ID:', ticketId);
      console.log('Type:', ticketData.type);
      console.log('Title:', ticketData.title);
      console.log('Email:', ticketData.email);
      console.log('Name:', ticketData.name);
      console.log('========================================\n');
      
      const ticket = await storage.createTicket({
        ticketId,
        type: ticketData.type,
        title: ticketData.title,
        description: ticketData.description,
        name: ticketData.name || 'Anonymous',
        email: ticketData.email || '',
        status: ticketData.status || 'pending',
        priority: ticketData.priority || 'normal',
        errorReferenceId: ticketData.errorReferenceId || null,
        errorStack: ticketData.errorStack || null,
        errorInfo: ticketData.errorInfo || null,
        userAgent: ticketData.userAgent || req.get('user-agent') || null,
        url: ticketData.url || null,
      });
      
      console.log('✅ Ticket created in database');
      
      // SEND EMAILS FIRST BEFORE RESPONDING
      console.log('\n🔍 EMAIL CHECK - ticketData.email:', ticketData.email);
      
      if (ticketData.email && ticketData.email.trim()) {
        console.log('📧 EMAIL PROVIDED - SENDING NOW');
        
        try {
          const ownerEmail = process.env.OWNER_EMAIL || 'juusojuusto112@gmail.com';
          
          const ownerEmailBody = `New Support Ticket: ${ticketId}\n\nType: ${ticketData.type}\nTitle: ${ticketData.title}\n\nDescription:\n${ticketData.description}\n\nFrom: ${ticketData.name || 'Anonymous'}\nEmail: ${ticketData.email}`;
          
          console.log('📤 Sending to owner:', ownerEmail);
          await sendTicketEmail(ownerEmail, `New Ticket: ${ticketId}`, ownerEmailBody);
          console.log('✅ Owner email sent');
          
          const userEmailBody = `Thank you! Your ticket ${ticketId} has been received.\n\nType: ${ticketData.type}\nTitle: ${ticketData.title}\n\nWe'll respond soon!`;
          
          console.log('📤 Sending to user:', ticketData.email);
          await sendTicketEmail(ticketData.email, `Ticket Received: ${ticketId}`, userEmailBody);
          console.log('✅ User email sent');
        } catch (emailError: any) {
          console.error('❌ EMAIL ERROR:', emailError.message);
        }
      } else {
        console.log('⚠️ NO EMAIL - skipping');
      }
      
      console.log('\n✅ RETURNING RESPONSE');
      res.status(201).json({ ticketId, ...ticket });
    } catch (error) {
      console.error('❌ TICKET ERROR:', error);
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  // Update ticket (admin only)
  app.patch('/api/tickets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'owner' && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const oldTicket = await storage.getTicket(req.params.id);
      if (!oldTicket) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      console.log('\n🔍 ========== OLD TICKET DATA ==========');
      console.log('Old Ticket:', JSON.stringify(oldTicket, null, 2));
      console.log('Old Ticket Email:', oldTicket.email);
      console.log('Old Ticket Email Type:', typeof oldTicket.email);
      console.log('=====================================\n');
      
      // CRITICAL: Preserve email field when updating
      // Only include email in update if it exists (don't pass undefined which would delete the field)
      const updateData: any = { ...req.body };
      if (oldTicket.email) {
        updateData.email = oldTicket.email;
      }
      
      console.log('\n📦 ========== UPDATE DATA ==========');
      console.log('Update Data:', JSON.stringify(updateData, null, 2));
      console.log('Update Data Email:', updateData.email);
      console.log('=====================================\n');
      
      const ticket = await storage.updateTicket(req.params.id, updateData);
      
      console.log('\n🔄 ========== TICKET UPDATE ==========');
      console.log('Ticket ID:', ticket.ticketId);
      console.log('Old Ticket Email:', oldTicket.email);
      console.log('Updated Ticket Email:', ticket.email);
      console.log('Has Response:', !!req.body.response);
      console.log('Response Text:', req.body.response?.substring(0, 100));
      console.log('Should Send Email:', !!(ticket.email && req.body.response));
      console.log('=====================================\n');
      
      // BULLETPROOF EMAIL LOGIC: Try multiple sources for email
      let emailToUse = ticket.email;  // First try: updated ticket from database
      if (!emailToUse) emailToUse = oldTicket.email;  // Second try: old ticket
      if (!emailToUse) emailToUse = updateData.email;  // Third try: update data
      
      // If still no email, fetch the ticket again from database
      if (!emailToUse && req.body.response) {
        console.log('⚠️ Email not found in any source, fetching ticket again...');
        const freshTicket = await storage.getTicket(req.params.id);
        if (freshTicket && freshTicket.email) {
          emailToUse = freshTicket.email;
          console.log('✅ Found email in fresh fetch:', emailToUse);
        }
      }
      
      console.log('\n🚨 ========== EMAIL DECISION ==========');
      console.log('ticket.email:', ticket.email);
      console.log('oldTicket.email:', oldTicket.email);
      console.log('updateData.email:', updateData.email);
      console.log('emailToUse (final):', emailToUse);
      console.log('Has response:', !!req.body.response);
      console.log('WILL SEND EMAIL:', !!(emailToUse && req.body.response));
      console.log('=====================================\n');
      
      if (emailToUse && req.body.response) {
        try {
          console.log('📧 ========== SENDING RESOLVE EMAIL ==========');
          console.log('To:', emailToUse);
          console.log('Response:', req.body.response.substring(0, 100));
          console.log('Email User:', process.env.EMAIL_USER);
          console.log('Email Password Set:', !!process.env.EMAIL_PASSWORD);
          
          const subject = ticket.status === 'resolved' 
            ? `✅ Ticket Resolved: ${ticket.ticketId}`
            : `📝 Ticket Update: ${ticket.ticketId}`;
          
          console.log('📤 Calling sendTicketEmail...');
          
          const emailResult = await sendTicketEmail(
            emailToUse, 
            subject,
            req.body.response,
            {
              ticketId: ticket.ticketId,
              type: ticket.type,
              title: ticket.title,
              status: ticket.status
            }
          );
          
          console.log('📧 Email result:', JSON.stringify(emailResult, null, 2));
          
          if (emailResult.success) {
            console.log('✅ Email sent successfully! Message ID:', emailResult.messageId);
          } else {
            console.error('❌ Email failed:', emailResult.error);
          }
          console.log('=====================================\n');
        } catch (emailError: any) {
          console.error('❌ ========== EMAIL ERROR ==========');
          console.error('Error:', emailError);
          console.error('Message:', emailError.message);
          console.error('Stack:', emailError.stack);
          console.error('Code:', emailError.code);
          console.error('=====================================\n');
        }
      } else {
        console.log('⚠️ No email sent - missing email or response');
        console.log('Has email (ticket):', !!ticket.email);
        console.log('Has email (oldTicket):', !!oldTicket.email);
        console.log('Has email (updateData):', !!updateData.email);
        console.log('Email to use:', emailToUse);
        console.log('Has response:', !!req.body.response);
        console.log('Response value:', req.body.response);
      }
      
      res.json(ticket);
    } catch (error) {
      await logError(error, 'PATCH /api/tickets/:id');
      res.status(500).json({ message: 'Failed to update ticket' });
    }
  });

  app.put('/api/tickets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const oldTicket = await storage.getTicket(req.params.id);
      const ticket = await storage.updateTicket(req.params.id, {
        ...req.body,
        updatedAt: new Date().toISOString()
      });
      
      // Send email notification if status changed
      if (oldTicket && oldTicket.status !== ticket.status && ticket.email) {
        try {
          await fetch(`${process.env.APP_URL || 'https://ksykmaps.fi'}/api/send-ticket-status-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: ticket.email,
              ticketId: ticket.ticketId,
              status: ticket.status,
              title: ticket.title,
              response: req.body.response || '',
            }),
          });
        } catch (emailError) {
          console.error('Failed to send status update email:', emailError);
        }
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error updating ticket:", error);
      res.status(500).json({ message: "Failed to update ticket" });
    }
  });

  // Delete ticket (admin only)
  app.delete('/api/tickets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'owner' && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      console.log('🗑️ Deleting ticket:', req.params.id);
      await storage.deleteTicket(req.params.id);
      console.log('✅ Ticket deleted successfully');
      
      res.json({ success: true, message: 'Ticket deleted' });
    } catch (error) {
      await logError(error, 'DELETE /api/tickets/:id');
      res.status(500).json({ message: 'Failed to delete ticket' });
    }
  });

  app.delete('/api/tickets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteTicket(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      res.status(500).json({ message: "Failed to delete ticket" });
    }
  });

  // Send ticket confirmation email
  // Send ticket notification to owner
  app.post('/api/send-ticket-notification', isAuthenticated, async (req: any, res) => {
    try {
      const callerUser = await storage.getUser(req.user.claims.sub);
      if (!callerUser || (callerUser.role !== 'admin' && callerUser.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { ownerEmail, ticketId, type, title, description, email, name, errorReferenceId } = req.body;
      
      console.log('📧 Sending ticket notification to owner:', ownerEmail);
      
      const { sendTicketEmail } = await import('./emailService.js');
      
      const emailBody = `
New Support Ticket Received

Ticket ID: ${ticketId}
Type: ${type}
Priority: ${req.body.priority || 'normal'}
${errorReferenceId ? `Error Reference: ${errorReferenceId}` : ''}

Title: ${title}

Description:
${description}

Submitted by: ${name || 'Anonymous'}
Email: ${email || 'Not provided'}

View and manage this ticket in the admin panel:
https://ksykmaps.fi/admin-ksyk-management-portal

---
KSYK Maps Support System
      `.trim();
      
      await sendTicketEmail(ownerEmail, `New Ticket: ${ticketId}`, emailBody);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Send ticket confirmation email
  app.post('/api/send-ticket-confirmation', isAuthenticated, async (req: any, res) => {
    try {
      const callerUser = await storage.getUser(req.user.claims.sub);
      if (!callerUser || (callerUser.role !== 'admin' && callerUser.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { email, ticketId, type, title } = req.body;
      
      console.log('📧 Sending ticket confirmation to:', email);
      
      const { sendTicketEmail } = await import('./emailService.js');
      
      const emailBody = `
Thank you for contacting KSYK Maps Support!

Your ticket has been received and assigned ID: ${ticketId}

Type: ${type}
Title: ${title}

Our team will review your request and respond as soon as possible. You will receive an email notification when there is an update.

For reference, please save your ticket ID: ${ticketId}

---
KSYK Maps Support Team
https://ksykmaps.fi
      `.trim();
      
      await sendTicketEmail(email, `Ticket Received: ${ticketId}`, emailBody);
      
      res.json({ success: true, message: 'Confirmation email sent' });
    } catch (error) {
      console.error("Error sending confirmation:", error);
      res.status(500).json({ message: "Failed to send confirmation" });
    }
  });

  // Send ticket response email
  app.post('/api/send-ticket-response', isAuthenticated, async (req: any, res) => {
    try {
      const callerUser = await storage.getUser(req.user.claims.sub);
      if (!callerUser || (callerUser.role !== 'admin' && callerUser.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { email, ticketId, title, response } = req.body;
      
      console.log('📧 Sending ticket response to:', email);
      
      const { sendTicketEmail } = await import('./emailService.js');
      
      const emailBody = `
Your support ticket has been updated!

Ticket ID: ${ticketId}
Title: ${title}

Response from KSYK Maps Support:
${response}

If you have any further questions, please reply to this email or create a new ticket.

---
KSYK Maps Support Team
https://ksykmaps.fi
      `.trim();
      
      await sendTicketEmail(email, `Ticket Update: ${ticketId}`, emailBody);
      
      res.json({ success: true, message: 'Response email sent' });
    } catch (error) {
      console.error("Error sending response:", error);
      res.status(500).json({ message: "Failed to send response" });
    }
  });

  // Send ticket status update email
  app.post('/api/send-ticket-status-update', isAuthenticated, async (req: any, res) => {
    try {
      const { email, ticketId, status, title, response } = req.body;
      
      console.log('📧 Sending ticket status update to:', email);
      
      const { sendTicketEmail } = await import('./emailService.js');
      
      const statusMessages = {
        pending: 'Your ticket is pending review. We will look into it shortly.',
        in_progress: 'Good news! Your ticket is now being investigated by our team. We are actively working on resolving your issue.',
        resolved: 'Your ticket has been resolved! We hope this solution helps.',
        closed: 'Your ticket has been closed. Thank you for your patience.'
      };
      
      const statusEmojis = {
        pending: '⏳',
        in_progress: '🔍',
        resolved: '✅',
        closed: '🔒'
      };
      
      const emailBody = `
Your support ticket status has been updated!

Ticket ID: ${ticketId}
Title: ${title}
New Status: ${statusEmojis[status as keyof typeof statusEmojis] || '📋'} ${status.toUpperCase().replace('_', ' ')}

${statusMessages[status as keyof typeof statusMessages] || 'Status updated.'}

${response ? `\nMessage from support:\n${response}` : ''}

${status === 'in_progress' ? '\n🔍 Our team is currently investigating your issue. You will receive another update once we have more information or when the issue is resolved.' : ''}

${status === 'resolved' || status === 'closed' ? '\nIf you need further assistance, please create a new ticket.' : '\nWe will keep you updated on any progress.'}

---
KSYK Maps Support Team
https://ksykmaps.fi
      `.trim();
      
      await sendTicketEmail(email, `Ticket ${status.toUpperCase().replace('_', ' ')}: ${ticketId}`, emailBody);
      
      res.json({ success: true, message: 'Status update email sent' });
    } catch (error) {
      console.error("Error sending status update:", error);
      res.status(500).json({ message: "Failed to send status update" });
    }
  });

  // Test email endpoint (admin-only)
  app.post('/api/test-email-simple', isAuthenticated, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email address required" });
      }

      console.log('📧 Sending test email to:', email);

      const { sendPasswordSetupEmail } = await import('./emailService.js');

      const emailBody = `
This is a test email from KSYK Maps!

If you received this email, your SMTP configuration is working correctly.

Test Details:
- Sent at: ${new Date().toISOString()}
- Recipient: ${email}
- Server: KSYK Maps Email System

---
KSYK Maps Support Team
https://ksykmaps.fi
      `.trim();

      await sendPasswordSetupEmail(email, 'KSYK Maps - Test Email', emailBody);

      res.json({ success: true, message: 'Test email sent successfully!' });
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email", error: String(error) });
    }
  });

  // App Settings routes
  app.get('/api/settings', async (req, res) => {
    try {
      const settings = await storage.getAppSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching app settings:", error);
      res.status(500).json({ message: "Failed to fetch app settings" });
    }
  });

  app.put('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub ?? req.user?.id;
      const user = userId ? await storage.getUser(userId) : null;
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const settings = await storage.updateAppSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating app settings:", error);
      res.status(500).json({ message: "Failed to update app settings" });
    }
  });

  // Map defaults — admin-set map center/zoom/rotation
  app.get('/api/map-defaults', async (_req, res) => {
    try {
      res.json(await kvGet('mapDefaults'));
    } catch (error) {
      console.error("Error fetching map defaults:", error);
      res.status(500).json({ message: "Failed to fetch map defaults" });
    }
  });

  app.put('/api/map-defaults', isAuthenticated, async (req: any, res) => {
    try {
      const allowed = [
        'osmCenterLat', 'osmCenterLng', 'osmDefaultZoom', 'osmMinZoom',
        'osmMaxZoom', 'osmRotationDeg', 'osmPitchDeg', 'osmTileTheme',
        'osmCampusSpanMeters', 'osmMaxBoundsEnabled', 'osmMaxBoundsNorth',
        'osmMaxBoundsEast', 'osmMaxBoundsSouth', 'osmMaxBoundsWest',
        'mobileCenterLat', 'mobileCenterLng', 'mobileDefaultZoom', 'mobileMinZoom',
        'mobileMaxZoom', 'mobileRotationDeg', 'mobilePitchDeg',
        'desktopCenterLat', 'desktopCenterLng', 'desktopDefaultZoom', 'desktopMinZoom',
        'desktopMaxZoom', 'desktopRotationDeg', 'desktopPitchDeg',
      ];
      const data: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      data.updatedAt = new Date().toISOString();
      await kvMerge('mapDefaults', data);
      res.json({ ...data, success: true });
    } catch (error) {
      console.error("Error saving map defaults:", error);
      res.status(500).json({ message: "Failed to save map defaults" });
    }
  });

  // ── Security & access control ──────────────────────────────────────────
  app.get('/api/security-settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      res.json(await kvGet('securitySettings'));
    } catch (error) {
      console.error("Error fetching security settings:", error);
      res.status(500).json({ message: "Failed to fetch security settings" });
    }
  });

  app.put('/api/security-settings', isAuthenticated, async (req: any, res) => {
    try {
      const caller = await storage.getUser(req.user.claims.sub);
      if (!caller || (caller.role !== 'admin' && caller.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      // Whitelisted fields only — anything else in req.body is dropped.
      // Each field is validated by shape: arrays stay arrays, booleans
      // are coerced, strings are length-capped, numbers are range-clamped.
      const src = req.body || {};
      const safeBool = (v: unknown, fb = false) => typeof v === "boolean" ? v : fb;
      const safeStr = (v: unknown, max = 500) => typeof v === "string" ? v.slice(0, max) : "";
      const safeTier = (v: unknown) => v === "full" || v === "restricted" || v === "blocked" ? v : "restricted";
      const safeArr = <T,>(v: unknown, map: (x: any) => T | null): T[] =>
        Array.isArray(v) ? v.map(map).filter((x): x is T => x !== null).slice(0, 500) : [];
      const safeId = (v: unknown) => typeof v === "string" && v.length < 128 ? v : `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const payload = {
        enabled: safeBool(src.enabled),
        timeWindowEnabled: safeBool(src.timeWindowEnabled),
        schedule: src.schedule && typeof src.schedule === "object" ? src.schedule : {},
        outsideHoursTier: safeTier(src.outsideHoursTier),
        holidays: safeArr(src.holidays, (h: any) => h && typeof h === "object" ? {
          id: safeId(h.id),
          name: safeStr(h.name, 100),
          start: safeStr(h.start, 10),
          end: safeStr(h.end, 10),
        } : null),
        ipGateEnabled: safeBool(src.ipGateEnabled),
        ipAllowlist: safeArr(src.ipAllowlist, (r: any) => r && typeof r === "object" ? {
          id: safeId(r.id),
          cidr: safeStr(r.cidr, 64),
          label: r.label ? safeStr(r.label, 100) : undefined,
        } : null),
        offNetworkTier: safeTier(src.offNetworkTier),
        loginGateEnabled: safeBool(src.loginGateEnabled),
        allowedEmailDomains: safeArr(src.allowedEmailDomains, (d: any) => typeof d === "string" ? d.slice(0, 100) : null),
        loggedInTier: safeTier(src.loggedInTier),
        guestTier: safeTier(src.guestTier),
        restrictedDisabledFeatures: src.restrictedDisabledFeatures && typeof src.restrictedDisabledFeatures === "object" ? src.restrictedDisabledFeatures : {},
        userExceptions: safeArr(src.userExceptions, (e: any) => e && typeof e === "object" && typeof e.email === "string" ? {
          id: safeId(e.id),
          email: e.email.toLowerCase().slice(0, 254),
          tier: safeTier(e.tier),
          expiresAt: e.expiresAt ? safeStr(e.expiresAt, 10) : undefined,
          note: e.note ? safeStr(e.note, 500) : undefined,
        } : null),
        accessRequests: safeArr(src.accessRequests, (r: any) => r && typeof r === "object" && typeof r.email === "string" ? {
          id: safeId(r.id),
          email: r.email.toLowerCase().slice(0, 254),
          reason: safeStr(r.reason, 500),
          createdAt: safeStr(r.createdAt, 40),
          status: r.status === "approved" || r.status === "denied" ? r.status : "pending",
        } : null),
        lockoutMessage: safeStr(src.lockoutMessage, 1000),
        dryRun: safeBool(src.dryRun),
        updatedAt: new Date(),
        updatedBy: req.user?.claims?.email || req.user?.email || "unknown",
      };
      await kvSet('securitySettings', payload);
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving security settings:", error);
      res.status(500).json({ message: "Failed to save security settings" });
    }
  });

  // Reports the caller's IP so the client can pre-flight the access decision.
  // Honours X-Forwarded-For when the app is behind a proxy / load balancer.
  app.get('/api/client-info', (req, res) => {
    const xff = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
    const ip = xff || req.ip || req.socket.remoteAddress || null;
    res.json({ ip, time: new Date().toISOString() });
  });

  // Guest access request — appended into securitySettings.accessRequests
  app.post('/api/security-settings/request-access', async (req, res) => {
    try {
      const { email, reason } = req.body || {};
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }
      const current = (await kvGet('securitySettings')) as any || {};
      const requests = Array.isArray(current.accessRequests) ? current.accessRequests : [];
      const request = {
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        email: email.toLowerCase().trim(),
        reason: (reason || '').toString().slice(0, 500),
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
      };
      await kvSet('securitySettings', { ...current, accessRequests: [request, ...requests].slice(0, 200) });
      res.json({ success: true, id: request.id });
    } catch (error) {
      console.error("Error saving access request:", error);
      res.status(500).json({ message: "Failed to submit request" });
    }
  });

  // ── Microsoft / OAuth sign-in (school email stub) ─────────────────────
  // Real implementation will use msal-node + Azure AD. For now we accept a
  // dev callback that takes ?email= so the access engine can be exercised
  // end-to-end while the OAuth app is being provisioned.
  app.get('/api/auth/microsoft/start', (req, res) => {
    const azureClientId = process.env.AZURE_CLIENT_ID;
    const azureTenant = process.env.AZURE_TENANT_ID || 'common';
    const redirectUri = process.env.AZURE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/auth/microsoft/callback`;
    if (!azureClientId) {
      if (process.env.NODE_ENV !== 'development') {
        return res.status(503).json({ message: 'Microsoft sign-in is not configured' });
      }
      // Dev-only fallback — render a tiny form so testing the flow doesn't require Azure.
      return res.send(`
        <html><body style="font-family: system-ui; max-width: 420px; margin: 4rem auto; padding: 2rem; text-align: center;">
          <h2>Microsoft sign-in (dev)</h2>
          <p style="color:#666;">AZURE_CLIENT_ID is not set. Use this form to simulate a school login.</p>
          <form method="GET" action="/api/auth/microsoft/callback" style="display:flex;flex-direction:column;gap:.5rem;">
            <input type="email" name="email" required placeholder="you@ksyk.fi" style="padding:.5rem .75rem;border:1px solid #ccc;border-radius:.5rem;" />
            <button type="submit" style="padding:.5rem 1rem;background:#2563eb;color:#fff;border:0;border-radius:.5rem;font-weight:600;">Sign in</button>
          </form>
        </body></html>
      `);
    }
    const url = `https://login.microsoftonline.com/${azureTenant}/oauth2/v2.0/authorize`
      + `?client_id=${encodeURIComponent(azureClientId)}`
      + `&response_type=code`
      + `&redirect_uri=${encodeURIComponent(redirectUri)}`
      + `&response_mode=query`
      + `&scope=${encodeURIComponent('openid email profile User.Read')}`;
    res.redirect(url);
  });

  app.get('/api/auth/microsoft/callback', async (req: any, res) => {
    // Dev-only: accept ?email= to simulate OAuth. Blocked in production to prevent
    // auth bypass (anyone could craft a request with ?email=admin@ksyk.fi).
    const isDevBypass = process.env.NODE_ENV === 'development' && !process.env.AZURE_CLIENT_ID;
    if (!isDevBypass) {
      // Production path — real MSAL code exchange would go here.
      return res.redirect('/?auth_error=oauth_not_configured');
    }
    const email = (req.query.email as string) || '';
    if (!email) return res.redirect('/?auth_error=missing_email');
    const role = (process.env.OWNER_EMAILS || '').toLowerCase().split(',').includes(email.toLowerCase()) ? 'owner' : 'student';
    const user = { id: `ms-${email}`, email: email.toLowerCase(), role, provider: 'microsoft' };
    if (typeof req.login === 'function') {
      req.login(user, () => { /* noop */ });
    } else if (req.session) {
      req.session.user = user;
    }
    res.send(`
      <html><body>
        <script>
          try { localStorage.setItem('ksyk_user', ${JSON.stringify(JSON.stringify(user))}); } catch (e) {}
          window.location.replace('/');
        </script>
      </body></html>
    `);
  });

  // Lunch menu proxy to bypass CORS
  app.get("/api/lunch-menu", async (req, res) => {
    try {
      const response = await fetch("https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3026&language=fi");
      const text = await response.text();
      res.setHeader("Content-Type", "application/xml");
      res.send(text);
    } catch (error) {
      console.error("Failed to fetch lunch menu:", error);
      res.status(500).json({ error: "Failed to fetch lunch menu" });
    }
  });

  // POST /api/analytics/feature — named-counter sink written to appLogs.
  app.post('/api/analytics/feature', async (req, res) => {
    try {
      const { name, sessionId, userId } = req.body || {};
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: 'name is required' });
      }
      await storage.createAppLog({
        level: 'info',
        message: `feature:${name.slice(0, 80)}`,
        userId: (userId || '').toString().slice(0, 60) || null,
      }).catch(() => {});
      res.json({ success: true });
    } catch {
      res.json({ success: false });
    }
  });

  // GET /api/analytics/overview — today's counters for the admin Overview panel.
  app.get('/api/analytics/overview', isAuthenticated, async (req: any, res) => {
    const callerUser = await storage.getUser(req.user.claims.sub);
    if (!callerUser || (callerUser.role !== 'admin' && callerUser.role !== 'owner')) {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const [pvRows, featRows, searchRows, eggData] = await Promise.all([
        pgDb.select({ count: pgCount() }).from(pageViews).where(gte(pageViews.createdAt, startOfToday)).catch(() => [{ count: 0 }]),
        pgDb.select({ message: appLogs.message }).from(appLogs)
          .where(and(gte(appLogs.createdAt, startOfToday), eq(appLogs.level, 'info')))
          .limit(2000).catch(() => [] as { message: string }[]),
        pgDb.select({ query: searchAnalytics.query }).from(searchAnalytics)
          .where(gte(searchAnalytics.createdAt, startOfToday))
          .limit(2000).catch(() => [] as { query: string }[]),
        kvGet('easterEggCounters').catch(() => null),
      ]);

      const featureCounts: Record<string, number> = {};
      for (const { message } of featRows as { message: string }[]) {
        if (message?.startsWith('feature:')) {
          const n = message.slice(8) || 'unknown';
          featureCounts[n] = (featureCounts[n] || 0) + 1;
        }
      }
      const topFeatures = Object.entries(featureCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      const searchCounts: Record<string, number> = {};
      for (const { query } of searchRows as { query: string }[]) {
        const q = (query || '').trim().toLowerCase();
        if (q) searchCounts[q] = (searchCounts[q] || 0) + 1;
      }
      const topSearches = Object.entries(searchCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count).slice(0, 10);

      const egg = (eggData as any) || {};
      const eggCounts = {
        secretEasterEgg: egg.secretEasterEgg || 0,
        konamiCode:      egg.konamiCode      || 0,
        devMode:         egg.devMode         || 0,
        ksykTyped:       egg.ksykTyped       || 0,
        logoClicks:      egg.logoClicks      || 0,
        debugCombo:      egg.debugCombo      || 0,
      };

      res.json({
        today: {
          pageviews:   Number((pvRows[0] as any)?.count ?? 0),
          featureUses: (featRows as any[]).filter((r: any) => r.message?.startsWith('feature:')).length,
          searches:    searchRows.length,
        },
        topFeatures,
        topSearches,
        easterEggs: { ...eggCounts, total: Object.values(eggCounts).reduce((s, n) => s + n, 0) },
        fetchedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('analytics overview error:', error);
      res.json({
        today: { pageviews: 0, featureUses: 0, searches: 0 },
        topFeatures: [],
        topSearches: [],
        easterEggs: { secretEasterEgg: 0, konamiCode: 0, devMode: 0, ksykTyped: 0, logoClicks: 0, debugCombo: 0, total: 0 },
        fetchedAt: new Date().toISOString(),
      });
    }
  });

  // GET /api/easter-eggs/recent — recent discoveries feed for Overview.
  app.get('/api/easter-eggs/recent', async (_req, res) => {
    try {
      const data = await kvGet('easterEggRecent') as { entries?: unknown[] } | null;
      res.json(Array.isArray(data?.entries) ? data.entries.slice(0, 50) : []);
    } catch {
      res.json([]);
    }
  });

  // Analytics endpoints
  app.post('/api/analytics/pageview', async (req, res) => {
    try {
      const { sessionId, userId, url, page, referrer, userAgent, ipAddress, country, city, browser, browserVersion, os, deviceType, screenResolution, language, timeZone, duration, isBounce } = req.body;
      // Client sends `page`, older callers send `url`. Accept both so we
      // don't lose events during the transition. The stored value keys the
      // Overview panel's "pageviews today" counter, so having something
      // beats having nothing.
      const path = (url || page || '/').toString();

      storage.createPageView({
        sessionId,
        userId,
        url: path,
        referrer,
        userAgent,
        ipAddress: ipAddress || req.ip,
        country,
        city,
        browser,
        browserVersion,
        os,
        deviceType,
        screenResolution,
        language,
        timeZone,
        duration,
        isBounce
      }).catch(() => {});

      // Also log to app logs for debugging
      await storage.createAppLog({
        level: 'info',
        message: `Page view: ${path}`,
        userId,
        userAgent,
        url: path,
        ipAddress: ipAddress || req.ip
      }).catch(() => { /* app logs sink may be off */ });

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to track page view:', error);
      res.status(500).json({ message: 'Failed to track page view' });
    }
  });

  app.post('/api/analytics/search', async (req, res) => {
    try {
      const { sessionId, userId, query, resultsCount, clickedResult, searchType, filters, userAgent, ipAddress, country, city } = req.body;
      
      await storage.createSearchAnalytic({
        sessionId,
        userId,
        query,
        resultsCount,
        clickedResult,
        searchType,
        filters,
        userAgent,
        ipAddress: ipAddress || req.ip,
        country,
        city
      });

      // Log search activity
      await storage.createAppLog({
        level: 'info',
        message: `Search: "${query}" (${resultsCount} results)`,
        userId,
        userAgent,
        url: req.get('referer'),
        ipAddress: ipAddress || req.ip
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to track search:', error);
      res.status(500).json({ message: 'Failed to track search' });
    }
  });

  app.post('/api/analytics/navigation', async (req, res) => {
    try {
      const { sessionId, userId, fromRoom, toRoom, fromBuilding, toBuilding, navigationType, distance, duration, waypoints, userAgent, ipAddress, country, city } = req.body;
      
      await storage.createNavigationAnalytic({
        sessionId,
        userId,
        fromRoom,
        toRoom,
        fromBuilding,
        toBuilding,
        navigationType,
        distance,
        duration,
        waypoints,
        userAgent,
        ipAddress: ipAddress || req.ip,
        country,
        city
      });

      // Log navigation activity
      await storage.createAppLog({
        level: 'info',
        message: `Navigation: ${fromRoom || fromBuilding} → ${toRoom || toBuilding}`,
        userId,
        userAgent,
        url: req.get('referer'),
        ipAddress: ipAddress || req.ip
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to track navigation:', error);
      res.status(500).json({ message: 'Failed to track navigation' });
    }
  });

  app.post('/api/analytics/session', async (req, res) => {
    try {
      const { sessionId, userId, ipAddress, userAgent, country, city, browser, os, deviceType, language, referrer, landingPage, isNewVisitor } = req.body;
      
      await storage.createUserSession({
        sessionId,
        userId,
        ipAddress: ipAddress || req.ip,
        userAgent,
        country,
        city,
        browser,
        os,
        deviceType,
        language,
        referrer,
        landingPage,
        isNewVisitor
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to create session:', error);
      res.status(500).json({ message: 'Failed to create session' });
    }
  });

  // Analytics track endpoint - receives events from frontend
  app.post('/api/analytics/track', async (req, res) => {
    try {
      const { events, sessionInfo } = req.body;
      
      if (!events || !Array.isArray(events)) {
        return res.status(400).json({ message: 'Events array required' });
      }

      // Store each event
      for (const event of events) {
        try {
          // Store specific analytics based on event type
          if (event.type === 'page_view') {
            try {
              await storage.createPageView({
                sessionId: event.sessionId,
                userId: event.userId,
                url: event.page,
                referrer: event.referrer,
                userAgent: event.userAgent,
                ipAddress: req.ip,
                browser: event.browser,
                os: event.os,
                deviceType: event.device,
                screenResolution: `${event.screen?.width}x${event.screen?.height}`
              });
            } catch (err) {
              console.error('Failed to create page view:', err);
            }
          } else if (event.type === 'search') {
            try {
              await storage.createSearchAnalytic({
                sessionId: event.sessionId,
                userId: event.userId,
                query: event.query,
                resultsCount: event.results,
                searchType: 'general',
                userAgent: event.userAgent,
                ipAddress: req.ip
              });
            } catch (err) {
              console.error('Failed to create search analytic:', err);
            }
          } else if (event.type === 'navigation') {
            try {
              await storage.createNavigationAnalytic({
                sessionId: event.sessionId,
                userId: event.userId,
                fromRoom: event.from,
                toRoom: event.to,
                navigationType: event.method,
                userAgent: event.userAgent,
                ipAddress: req.ip
              });
            } catch (err) {
              console.error('Failed to create navigation analytic:', err);
            }
          }
          
          // Always log to app logs (non-blocking)
          try {
            await storage.createAppLog({
              level: 'info',
              message: `Analytics: ${event.type}`,
              errorInfo: JSON.stringify({
                page: event.page,
                device: event.device,
                browser: event.browser,
                ...event.data
              }),
              userId: event.userId || null,
              userAgent: event.userAgent || null,
              url: event.page || null,
              ipAddress: req.ip || null
            });
          } catch (logErr) {
            // Silently fail - logging shouldn't break analytics
            console.error('Failed to log analytics event:', logErr);
          }
        } catch (eventError) {
          console.error('Failed to store event:', event.type, eventError);
          // Continue processing other events
        }
      }

      res.json({ success: true, processed: events.length });
    } catch (error) {
      console.error('Failed to track analytics:', error);
      // Return success anyway to not break the frontend
      res.json({ success: true, processed: 0 });
    }
  });

  // Analytics data endpoints (admin only)
  app.get('/api/analytics/events', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get recent app logs that are analytics-related
      const logs = await storage.getAppLogs(100);
      const analyticsEvents = logs
        .filter(log => log.message?.startsWith('Analytics:') || log.message?.includes('Search:') || log.message?.includes('viewed:'))
        .map(log => ({
          id: log.id,
          type: log.message?.includes('Search:') ? 'search' : 
                log.message?.includes('Room viewed:') ? 'room_view' :
                log.message?.includes('Building viewed:') ? 'building_view' :
                log.message?.includes('Navigation:') ? 'navigation' : 'page_view',
          message: log.message,
          timestamp: log.timestamp,
          details: log.details,
          userId: log.userId,
          userAgent: log.userAgent
        }));

      res.json(analyticsEvents);
    } catch (error) {
      console.error('Failed to get analytics events:', error);
      res.status(500).json({ message: 'Failed to get analytics events' });
    }
  });

  app.get('/api/analytics/summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const days = req.query.days ? parseInt(req.query.days) : 30;
      
      // Return mock data if storage method doesn't exist
      try {
        const summary = await storage.getAnalyticsSummary(days);
        res.json(summary);
      } catch (storageError) {
        // Return empty/default analytics data
        res.json({
          totalVisitors: 0,
          totalPageViews: 0,
          totalSearches: 0,
          totalNavigationRequests: 0,
          avgSessionDuration: 0,
          bounceRate: 0,
          topCountries: [],
          topBrowsers: [],
          peakHours: []
        });
      }
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      res.status(500).json({ message: 'Failed to get analytics summary' });
    }
  });

  app.get('/api/analytics/searches', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit) : 20;
      
      try {
        const searches = await storage.getTopSearches(limit);
        res.json(searches);
      } catch (storageError) {
        // Return empty array if method doesn't exist
        res.json([]);
      }
    } catch (error) {
      console.error('Failed to get top searches:', error);
      res.status(500).json({ message: 'Failed to get top searches' });
    }
  });

  app.get('/api/analytics/rooms', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit) : 20;
      
      try {
        const rooms = await storage.getPopularRooms(limit);
        res.json(rooms);
      } catch (storageError) {
        // Return empty array if method doesn't exist
        res.json([]);
      }
    } catch (error) {
      console.error('Failed to get popular rooms:', error);
      res.status(500).json({ message: 'Failed to get popular rooms' });
    }
  });

  app.get('/api/analytics/visitors', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const days = req.query.days ? parseInt(req.query.days) : 30;
      
      try {
        const visitors = await storage.getVisitorStats(days);
        res.json(visitors);
      } catch (storageError) {
        // Return empty array if method doesn't exist
        res.json([]);
      }
    } catch (error) {
      console.error('Failed to get visitor stats:', error);
      res.status(500).json({ message: 'Failed to get visitor stats' });
    }
  });

  // Complete data cleanup endpoint - DELETE EVERYTHING
  app.post('/api/admin/cleanup-all', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { confirmDelete } = req.body;
      
      if (confirmDelete !== 'DELETE_EVERYTHING') {
        return res.status(400).json({ message: 'Confirmation required: DELETE_EVERYTHING' });
      }
      
      console.log('\n🗑️ ========== COMPLETE DATA CLEANUP ==========');
      console.log('⚠️ DELETING ALL BUILDINGS, ROOMS, HALLWAYS, STAIRS...');
      
      let deletedCount = {
        buildings: 0,
        rooms: 0,
        hallways: 0,
        floors: 0,
        announcements: 0,
        staff: 0
      };
      
      // Delete all buildings
      const buildings = await storage.getBuildings();
      console.log(`🏢 Found ${buildings.length} buildings to delete`);
      for (const building of buildings) {
        await storage.deleteBuilding(building.id);
        deletedCount.buildings++;
      }
      
      // Delete all rooms
      const rooms = await storage.getRooms();
      console.log(`🚪 Found ${rooms.length} rooms to delete`);
      for (const room of rooms) {
        await storage.deleteRoom(room.id);
        deletedCount.rooms++;
      }
      
      // Delete all hallways
      try {
        const hallways = await storage.getHallways();
        console.log(`🛤️ Found ${hallways.length} hallways to delete`);
        for (const hallway of hallways) {
          await storage.deleteHallway(hallway.id);
          deletedCount.hallways++;
        }
      } catch (error) {
        console.log('No hallways to delete or method not available');
      }
      
      // Delete all floors
      try {
        const floors = await storage.getFloors();
        console.log(`🏗️ Found ${floors.length} floors to delete`);
        for (const floor of floors) {
          if (storage.deleteFloor) {
            await storage.deleteFloor(floor.id);
            deletedCount.floors++;
          }
        }
      } catch (error) {
        console.log('No floors to delete or method not available');
      }
      
      // Delete all announcements
      const announcements = await storage.getAnnouncements(1000);
      console.log(`📢 Found ${announcements.length} announcements to delete`);
      for (const announcement of announcements) {
        await storage.deleteAnnouncement(announcement.id);
        deletedCount.announcements++;
      }
      
      // Delete all staff
      try {
        const staff = await storage.getStaff();
        console.log(`👥 Found ${staff.length} staff members to delete`);
        for (const staffMember of staff) {
          await storage.deleteStaffMember(staffMember.id);
          deletedCount.staff++;
        }
      } catch (error) {
        console.log('No staff to delete or method not available');
      }
      
      console.log('\n✅ CLEANUP COMPLETE!');
      console.log('📊 Deletion Summary:');
      console.log(`   Buildings: ${deletedCount.buildings}`);
      console.log(`   Rooms: ${deletedCount.rooms}`);
      console.log(`   Hallways: ${deletedCount.hallways}`);
      console.log(`   Floors: ${deletedCount.floors}`);
      console.log(`   Announcements: ${deletedCount.announcements}`);
      console.log(`   Staff: ${deletedCount.staff}`);
      console.log('==========================================\n');
      
      res.json({
        success: true,
        message: 'All data deleted successfully',
        deleted: deletedCount,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ CLEANUP ERROR:', error);
      await logError(error, 'POST /api/admin/cleanup-all');
      res.status(500).json({
        success: false,
        message: 'Failed to delete all data',
        error: error.message
      });
    }
  });

  // ============================================
  // LUNCH MENU PROXY (CORS FIX)
  // ============================================
  
  // Proxy lunch menu API to avoid CORS issues
  app.get('/api/lunch-menu', async (req, res) => {
    try {
      const response = await fetch('https://www.compass-group.fi/menuapi/feed/json?costNumber=3026&language=fi');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch menu: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Set CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
      
      res.json(data);
    } catch (error) {
      await logError(error, 'GET /api/lunch-menu');
      res.status(500).json({ 
        message: 'Failed to fetch lunch menu',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ==================== SIMPLE ANALYTICS ENDPOINTS ====================
  // Track page view — delegates to the richer handler above (storage.createPageView)
  // This handler exists for backward-compat with older client callers.
  app.post('/api/analytics/event', async (req, res) => {
    try {
      const { event, data } = req.body;
      await storage.createAppLog({
        level: 'info',
        message: `event:${(event || 'unknown').toString().slice(0, 80)}`,
        errorInfo: data ?? null,
      }).catch(() => {});
      res.json({ success: true });
    } catch {
      res.json({ success: true }); // analytics is best-effort
    }
  });

  // Get analytics summary (admin only)
  app.get('/api/analytics/summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'owner' && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const timeRange = req.query.range || 'month';
      const now = new Date();
      const startDate = new Date();
      if (timeRange === 'week')       startDate.setDate(now.getDate() - 7);
      else if (timeRange === 'month') startDate.setMonth(now.getMonth() - 1);
      else if (timeRange === 'year')  startDate.setFullYear(now.getFullYear() - 1);

      const [pvCount, searchCount] = await Promise.all([
        pgDb.select({ count: pgCount() }).from(pageViews).where(gte(pageViews.createdAt, startDate)),
        pgDb.select({ count: pgCount() }).from(searchAnalytics).where(gte(searchAnalytics.createdAt, startDate)),
      ]);
      res.json({
        totalPageviews: Number((pvCount[0] as any)?.count ?? 0),
        totalEvents: Number((searchCount[0] as any)?.count ?? 0),
      });
    } catch (error) {
      console.error('Analytics summary error:', error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });



  // ── Beacon survey routes ──────────────────────────────────────────────────
  app.get('/api/beacons/:roomId/positions', async (req, res) => {
    try {
      const positions = await getBeaconPositions(req.params.roomId);
      const withQuality = positions.map((p) => ({
        ...p,
        quality: computeFingerprintQuality((p.readings as WifiReading[]) ?? []),
      }));
      res.json(withQuality);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch positions' });
    }
  });

  app.post('/api/beacons/:roomId/positions', isAuthenticated, async (req: any, res) => {
    const { positionLabel, capturedAt, readings, lat, lng, accuracyM } = req.body || {};
    if (!positionLabel || !Array.isArray(readings)) {
      return res.status(400).json({ message: 'positionLabel and readings[] required' });
    }
    try {
      const record = await addBeaconPosition(req.params.roomId, {
        positionLabel: String(positionLabel).slice(0, 60),
        capturedAt, readings, lat, lng, accuracyM,
      });
      res.status(201).json(record);
    } catch (err) {
      res.status(500).json({ message: 'Failed to save position' });
    }
  });

  app.delete('/api/beacons/:roomId/positions/:positionId', isAuthenticated, async (req: any, res) => {
    try {
      await deleteBeaconPosition(req.params.positionId);
      res.status(204).send('');
    } catch (err) {
      res.status(500).json({ message: 'Failed to delete' });
    }
  });

  app.get('/api/beacons/coverage', async (_req, res) => {
    try {
      res.json(await getBeaconCoverage());
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch coverage' });
    }
  });

  // GET /api/beacons/coverage-quality — per-room coverage with floor + quality label.
  // Powers the admin coverage visualization (excellent/good/fair/poor/none per room).
  app.get('/api/beacons/coverage-quality', async (_req, res) => {
    try {
      res.json(await getBeaconCoverageWithQuality());
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch coverage quality' });
    }
  });

  // ── Wi-Fi fingerprint positioning ─────────────────────────────────────────
  // Simple in-process rate limit: 15 req/IP/minute. Good enough for local dev.
  const _wifiRateMap = new Map<string, { n: number; reset: number }>();
  function _wifiRateOk(ip: string): boolean {
    const now = Date.now();
    const entry = _wifiRateMap.get(ip);
    if (!entry || now > entry.reset) { _wifiRateMap.set(ip, { n: 1, reset: now + 60_000 }); return true; }
    entry.n++;
    return entry.n <= 15;
  }

  app.post('/api/wifi/locate', async (req: any, res) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
      ?? req.socket?.remoteAddress ?? 'unknown';
    if (!_wifiRateOk(ip)) {
      pgDb.insert(appLogs).values({ level: 'warn', message: `wifi/locate rate-limited: ${ip}`, ipAddress: ip }).catch(() => {});
      return res.status(429).json({ message: 'Too many requests' });
    }
    const rawReadings = (req.body || {}).readings;
    if (!Array.isArray(rawReadings) || rawReadings.length === 0) {
      return res.status(400).json({ message: 'readings[] required' });
    }
    // Sanitize: keep only valid bssid/rssi pairs, cap at 100 APs.
    const readings = rawReadings.slice(0, 100).flatMap((r: any) => {
      const bssid = String(r?.bssid ?? '').toLowerCase().trim();
      const rssi = Number(r?.rssi);
      if (!bssid || bssid.length > 30 || !isFinite(rssi)) return [];
      return [{ bssid, rssi, ssid: r?.ssid ? String(r.ssid).slice(0, 64) : undefined }];
    });
    if (readings.length === 0) {
      return res.status(400).json({ message: 'No valid readings after sanitization' });
    }
    try {
      const estimate = await wifiLocate(readings);
      if (!estimate) return res.status(404).json({ message: 'No fingerprint data or no match found' });
      res.json(estimate);
    } catch (err) {
      pgDb.insert(appLogs).values({ level: 'error', message: `wifi/locate error: ${(err as Error).message}`, ipAddress: ip }).catch(() => {});
      res.status(500).json({ message: 'Positioning failed' });
    }
  });

  app.get('/api/wifi/locate', async (_req, res) => {
    try {
      const all = await getAllBeaconSurveys();
      res.json({ fingerprintCount: all.length, ready: all.length > 0 });
    } catch (err) {
      res.status(500).json({ message: 'Failed to query fingerprints' });
    }
  });

  // POST /api/wifi/replay — dev/admin tool: replay a sequence of Wi-Fi scan
  // snapshots through the positioning engine and return results for each.
  // Body: { snapshots: [{ t: 0, readings: [{bssid,rssi},...] }, ...] }
  // Used to test positioning accuracy against a recorded calibration walk.
  // POST /api/wifi/replay — admin-only dev tool. Snapshots are processed
  // sequentially (not Promise.all) so a maximal request cannot saturate the
  // DB with hundreds of concurrent fingerprint queries.
  app.post('/api/wifi/replay', isAuthenticated, rateLimiters.mutation, async (req: any, res) => {
    const user = await storage.getUser(req.user.claims.sub);
    if (user?.role !== 'owner' && user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { snapshots } = req.body || {};
    if (!Array.isArray(snapshots) || snapshots.length === 0) {
      return res.status(400).json({ message: 'snapshots[] required' });
    }
    if (snapshots.length > 200) {
      return res.status(400).json({ message: 'Maximum 200 snapshots per replay' });
    }
    try {
      const results: any[] = [];
      for (let idx = 0; idx < snapshots.length; idx++) {
        const snap = snapshots[idx];
        const rawReadings = Array.isArray(snap.readings) ? snap.readings : [];
        const readings = rawReadings.slice(0, 100).flatMap((r: any) => {
          const bssid = String(r?.bssid ?? '').toLowerCase().trim();
          const rssi = Number(r?.rssi);
          if (!bssid || bssid.length > 30 || !isFinite(rssi)) return [];
          return [{ bssid, rssi }];
        });
        try {
          const estimate = readings.length > 0 ? await wifiLocate(readings) : null;
          results.push({ index: idx, t: snap.t ?? idx, position: estimate, error: null });
        } catch (err) {
          results.push({ index: idx, t: snap.t ?? idx, position: null, error: (err as Error).message });
        }
      }
      res.json({ results, fingerprintCount: (await getAllBeaconSurveys()).length });
    } catch (err) {
      res.status(500).json({ message: 'Replay failed' });
    }
  });

  // GET /api/wifi/fingerprints — full fingerprint database for on-device KNN.
  // The Android app downloads this once and caches it on disk so positioning
  // can run locally when the server is unreachable (airplane mode, poor signal).
  app.get('/api/wifi/fingerprints', async (_req, res) => {
    try {
      const fps = await getAllFingerprintsWithFloor();
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      res.json(fps);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch fingerprints' });
    }
  });

  // ============================================
  // REGISTER AALTO SPACE ROUTES
  // ============================================
  console.log('🏫 Registering KSYK Maps campus routes...');
  registerCampusRoutes(app);

  console.log('🗺️  Registering nav-graph + route + map-package routes...');
  registerMapRoutes(app);

  console.log('🥚 Registering easter-egg routes...');
  registerEasterEggRoutes(app);

  console.log('📊 Registering adblock-safe telemetry routes...');
  registerTelemetryRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
