import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { insertBuildingSchema, insertFloorSchema, insertHallwaySchema, insertRoomSchema, insertStaffSchema, insertEventSchema, insertAnnouncementSchema } from "@shared/schema";
import { sendPasswordSetupEmail, sendTicketEmail, generateTempPassword } from "./emailService";
import { rateLimiters } from "./rateLimiter";
import { getFirestore } from 'firebase-admin/firestore';
import { registerWilmaExtendedRoutes } from "./wilmaExtendedRoutes";
import { registerCampusRoutes } from "./campusRoutes";
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

const db = getFirestore();

// Session timeout - COMPLETELY DISABLED
// No session timeout checks at all
function sessionTimeoutMiddleware(req: any, res: any, next: any) {
  // Always skip - session timeout completely disabled
  return next();
}

export async function registerRoutes(app: Express): Promise<Server> {
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

  // Logs API endpoint - for frontend error logging
  app.post('/api/logs', async (req, res) => {
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
      if (normalizedEmail === 'juusojuusto112@gmail.com') {
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
          sessionId: req.sessionID || null
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
          sessionId: req.sessionID || null
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

      // Store the secret temporarily in session
      req.session.tempTwoFactorSecret = setup.secret;

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
      const { code } = req.body;
      const secret = req.session.tempTwoFactorSecret;

      if (!secret) {
        return res.status(400).json({ message: 'No 2FA setup in progress' });
      }

      if (!code || code.length !== 6) {
        return res.status(400).json({ message: 'Invalid verification code' });
      }

      const { TwoFactorAuthService } = await import('./twoFactorAuth');
      const result = await TwoFactorAuthService.enableTwoFactor(userId, secret, code);

      if (result.success) {
        // Clear temp secret
        delete req.session.tempTwoFactorSecret;
        
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
        secret: req.session.tempTwoFactorSecret || null,
      });
    } catch (error) {
      console.error('Error checking 2FA status:', error);
      res.status(500).json({ message: 'Failed to check 2FA status' });
    }
  });

  // Verify 2FA code during login
  app.post('/api/auth/2fa/verify', async (req, res) => {
    try {
      const { userId, code } = req.body;

      if (!userId || !code) {
        return res.status(400).json({ message: 'User ID and code required' });
      }

      const user = await storage.getUserById(userId);
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
      const user = await storage.getUserById(userId);
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
          email: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          ipAddress: req.ip || req.connection?.remoteAddress || null,
          userAgent: req.headers['user-agent'] || null,
          loginStatus: 'success',
          sessionId: req.sessionID || null
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
        // Store code in session with expiry
        req.session.emailVerificationCode = result.code;
        req.session.emailCodeExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
        
        res.json({ success: true, message: 'Verification code sent to your email' });
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
      const { code } = req.body;
      
      if (!req.session.emailVerificationCode || !req.session.emailCodeExpiry) {
        return res.status(400).json({ success: false, message: 'No verification code sent' });
      }
      
      if (Date.now() > req.session.emailCodeExpiry) {
        delete req.session.emailVerificationCode;
        delete req.session.emailCodeExpiry;
        return res.status(400).json({ success: false, message: 'Verification code expired' });
      }
      
      if (code === req.session.emailVerificationCode) {
        delete req.session.emailVerificationCode;
        delete req.session.emailCodeExpiry;
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
      const stats = await storage.getEasterEggStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching easter egg stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Track Easter Egg Discovery
  app.post('/api/easter-eggs/track', async (req, res) => {
    try {
      const { eggId, eggName } = req.body;
      const userId = req.user?.claims?.sub || 'anonymous';
      
      await storage.trackEasterEggDiscovery({
        eggId,
        eggName,
        userId,
        timestamp: new Date().toISOString(),
      });

      await storage.createAppLog({
        level: 'success',
        message: `🥚 Easter egg discovered: ${eggName}`,
        action: 'easter_egg',
        userId: userId !== 'anonymous' ? userId : null,
        userName: null,
      }).catch(() => {});

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
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
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
      
      // Generate reset token (valid for 1 hour)
      const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const resetExpiry = Date.now() + 3600000; // 1 hour
      
      // Store reset token in database
      await storage.upsertUser({
        id: user.id,
        passwordResetToken: resetToken,
        passwordResetExpiry: new Date(resetExpiry)
      });
      
      // Send reset email
      const resetUrl = `${process.env.APP_URL || 'http://localhost:5000'}/wilma/reset-password?token=${resetToken}`;
      
      try {
        const emailService = await import('./emailService');
        await emailService.sendEmail({
          to: email,
          subject: 'Password Reset Request - KSYK Maps Wilma',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #003d82 0%, #0052a3 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Salasanan palautus</h1>
              </div>
              <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px; color: #333;">Hei ${user.firstName},</p>
                <p style="font-size: 16px; color: #333;">Olet pyytänyt salasanan palautusta Wilma-tilillesi.</p>
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
                <p>© 2026 KSYK Maps Wilma • Kaikki oikeudet pidätetään</p>
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
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // Find user by reset token
      const users = await storage.getUsers();
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

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err: any) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Session cleanup failed" });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: "Logged out successfully" });
      });
    });
  });

  // Test email endpoint (for debugging)
  app.post('/api/test-email', async (req, res) => {
    try {
      console.log('\n🧪 ========== TEST EMAIL ENDPOINT ==========');
      console.log('Environment variables check:');
      console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
      console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
      console.log('  EMAIL_USER:', process.env.EMAIL_USER);
      console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET');
      
      const testEmail = req.body.email || 'JuusoJuusto112@gmail.com';
      const testName = req.body.name || 'Test User';
      const testPassword = 'TestPass123!';
      
      console.log(`\nSending test email to: ${testEmail}`);
      
      const result = await sendPasswordSetupEmail(testEmail, testName, testPassword);
      
      console.log('\nTest email result:', result);
      console.log('==========================================\n');
      
      res.json({
        success: result.success,
        mode: result.mode,
        message: result.success ? 'Email sent successfully!' : 'Email failed to send',
        details: result,
        envVars: {
          EMAIL_HOST: process.env.EMAIL_HOST,
          EMAIL_PORT: process.env.EMAIL_PORT,
          EMAIL_USER: process.env.EMAIL_USER,
          EMAIL_PASSWORD_SET: !!process.env.EMAIL_PASSWORD
        }
      });
    } catch (error: any) {
      console.error('Test email error:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });

  // Development login bypass (for testing only) - REMOVED FOR SECURITY

  // Building routes
  app.get('/api/buildings', async (req, res) => {
    try {
      const buildings = await storage.getBuildings();
      res.json(buildings);
    } catch (error) {
      await logError(error, 'GET /api/buildings');
      res.status(500).json({ message: "Failed to fetch buildings" });
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

  app.post('/api/buildings', isAuthenticated, async (req: any, res) => {
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

  app.put('/api/buildings/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/buildings/:id', isAuthenticated, async (req: any, res) => {
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
      res.json(floors);
    } catch (error) {
      await logError(error, 'GET /api/floors', { buildingId: req.query.buildingId });
      res.status(500).json({ message: "Failed to fetch floors" });
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

  app.post('/api/floors', isAuthenticated, async (req: any, res) => {
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

  app.put('/api/floors/:id', isAuthenticated, async (req: any, res) => {
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

  app.delete('/api/floors/:id', isAuthenticated, async (req: any, res) => {
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
      res.json(rooms);
    } catch (error) {
      await logError(error, 'GET /api/rooms', { buildingId: req.query.buildingId });
      res.status(500).json({ message: "Failed to fetch rooms" });
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

  app.post('/api/rooms', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(validatedData);
      res.status(201).json(room);
    } catch (error) {
      await logError(error, 'POST /api/rooms', { roomData: req.body });
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.put('/api/rooms/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertRoomSchema.partial().parse(req.body);
      const room = await storage.updateRoom(req.params.id, validatedData);
      res.json(room);
    } catch (error) {
      await logError(error, 'PUT /api/rooms/:id', { roomId: req.params.id });
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete('/api/rooms/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteRoom(req.params.id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/rooms/:id', { roomId: req.params.id });
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  // Room schedule endpoint — returns today's timetable for a room.
  // Queries the wilma_schedules table by room number and today's day-of-week.
  // Architecture is intentionally modular: swap the storage call below for a
  // live Wilma API proxy when credentials become available.
  app.get('/api/rooms/:id/schedule', async (req, res) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) return res.status(404).json({ message: 'Room not found' });

      const now = new Date();
      // JS getDay(): 0=Sun, 1=Mon … 6=Sat  →  wilma_schedules day_of_week: 1=Mon … 5=Fri
      const jsDay = now.getDay();
      const wilmaDay = jsDay === 0 || jsDay === 6 ? null : jsDay; // null on weekends

      interface WilmaScheduleRow {
        id: string;
        dayOfWeek: number;
        timeSlot: string;       // e.g. "08:00-09:30"
        subject: string;
        room: string;
        teacherName: string;
        teacherId: string | null;
        isActive: boolean;
      }

      let schedule: WilmaScheduleRow[] = [];
      if (wilmaDay !== null) {
        // Fetch all schedules for this room number on today's weekday
        try {
          const all: WilmaScheduleRow[] = await (storage as any).getWilmaSchedulesAll?.() ?? [];
          schedule = all.filter(
            (s) => s.isActive && s.dayOfWeek === wilmaDay &&
              s.room?.toUpperCase() === room.roomNumber?.toUpperCase()
          );
        } catch { /* wilma_schedules may not be seeded — return empty gracefully */ }
      }

      // Parse "HH:MM-HH:MM" into minutes-from-midnight for current/next detection
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const parse = (slot: string) => {
        const [start, end] = slot.split('-');
        const [sh, sm] = (start || '').split(':').map(Number);
        const [eh, em] = (end || '').split(':').map(Number);
        return {
          startMins: (sh || 0) * 60 + (sm || 0),
          endMins: (eh || 0) * 60 + (em || 0),
        };
      };

      const entries = schedule
        .sort((a, b) => parse(a.timeSlot).startMins - parse(b.timeSlot).startMins)
        .map((s) => {
          const { startMins, endMins } = parse(s.timeSlot);
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
              !schedule.some((x) => {
                const p = parse(x.timeSlot);
                return nowMins >= p.startMins && nowMins < p.endMins;
              }) &&
              startMins === Math.min(
                ...schedule.filter((x) => parse(x.timeSlot).startMins > nowMins).map((x) => parse(x.timeSlot).startMins)
              ),
          };
        });

      res.json({
        roomId: req.params.id,
        roomNumber: room.roomNumber,
        date: now.toISOString().slice(0, 10),
        dayOfWeek: wilmaDay,
        schedule: entries,
        source: entries.length > 0 ? 'wilma' : 'none',
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
      res.json(hallways);
    } catch (error) {
      await logError(error, 'GET /api/hallways', { buildingId: req.query.buildingId });
      res.status(500).json({ message: "Failed to fetch hallways" });
    }
  });

  app.post('/api/hallways', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const hallwayData = insertHallwaySchema.parse(req.body);
      const hallway = await storage.createHallway(hallwayData);
      res.json(hallway);
    } catch (error) {
      await logError(error, 'POST /api/hallways', { hallwayData: req.body });
      res.status(500).json({ message: "Failed to create hallway" });
    }
  });

  app.delete('/api/hallways/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      await storage.deleteHallway(req.params.id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/hallways/:id', { hallwayId: req.params.id });
      res.status(500).json({ message: "Failed to delete hallway" });
    }
  });

  // User routes (admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all users from Firebase
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error) {
      await logError(error, 'GET /api/users', { isAuthenticated: req.isAuthenticated() });
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, firstName, lastName, role, password, passwordOption } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, first name, and last name are required" });
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
        console.log(`Password: ${finalPassword}`);
        
        try {
          const emailResult = await sendPasswordSetupEmail(email, firstName, finalPassword);
          
          console.log(`\n📧 EMAIL RESULT:`);
          console.log(`   Success: ${emailResult.success}`);
          console.log(`   Mode: ${emailResult.mode}`);
          
          if (emailResult.success) {
            console.log(`✅ EMAIL SENT to ${email}`);
          } else {
            console.log(`⚠️ EMAIL NOT SENT - Password: ${finalPassword}`);
          }
        } catch (error: any) {
          console.error('❌ EMAIL ERROR:', error.message);
          console.log(`📝 Password: ${finalPassword}`);
        }
        
        console.log(`==========================================\n`);
      }

      res.status(201).json({ ...newUser, password: finalPassword });
    } catch (error) {
      await logError(error, 'POST /api/users', { email: req.body?.email });
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put('/api/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { email, firstName, lastName, role, newPassword } = req.body;

      // Don't allow editing owner account
      if (id === 'owner-admin-user') {
        return res.status(403).json({ message: "Cannot edit owner account" });
      }

      const updateData: any = {
        id,
        email,
        firstName,
        lastName,
        role
      };

      // Only update password if provided
      if (newPassword) {
        updateData.password = newPassword;
      }

      const updatedUser = await storage.upsertUser(updateData);
      res.json(updatedUser);
    } catch (error) {
      await logError(error, 'PUT /api/users/:id', { userId: req.params.id });
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete('/api/users/:id', isAuthenticated, async (req: any, res) => {
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
      if (userToDelete && userToDelete.email === 'JuusoJuusto112@gmail.com' && userToDelete.firstName === 'Juuso' && userToDelete.lastName === 'Kaikula') {
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
      const staff = await storage.getStaff();
      res.json(staff);
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

  // Wilma User routes
  app.get('/api/wilma/users', async (req, res) => {
    try {
      console.log('🔵 GET /api/wilma/users called');
      const role = req.query.role as string | undefined;
      console.log('📝 Role filter:', role || 'none');
      
      const wilmaUsers = await storage.getWilmaUsers(role);
      console.log(`✅ Returning ${wilmaUsers.length} Wilma users`);
      res.json(wilmaUsers);
    } catch (error) {
      console.error('❌ Error in GET /api/wilma/users:', error);
      await logError(error, 'GET /api/wilma/users');
      res.status(500).json({ message: "Failed to fetch Wilma users" });
    }
  });

  // Wilma User by ID route (MUST BE BEFORE :id routes to avoid conflicts)
  app.get('/api/wilma/users/:id', async (req, res) => {
    try {
      console.log('🔍 GET /api/wilma/users/:id called with ID:', req.params.id);
      const wilmaUser = await storage.getWilmaUser(req.params.id);
      
      if (!wilmaUser) {
        console.log('❌ Wilma user not found:', req.params.id);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log('✅ Wilma user found:', wilmaUser.id);
      res.json(wilmaUser);
    } catch (error) {
      console.error('❌ Error in GET /api/wilma/users/:id:', error);
      await logError(error, 'GET /api/wilma/users/:id', { userId: req.params.id });
      res.status(500).json({ message: "Failed to fetch Wilma user" });
    }
  });

  app.post('/api/wilma/login', rateLimiters.auth, async (req, res) => {
    try {
      console.log('🔐 POST /api/wilma/login called');
      const { username, password } = req.body;
      console.log('📝 Username:', username);
      
      if (!username || !password) {
        console.log('❌ Missing credentials');
        return res.status(400).json({ message: "Username and password required" });
      }

      console.log('🔍 Looking up user by username...');
      const wilmaUser = await storage.getWilmaUserByUsername(username);
      
      if (!wilmaUser) {
        console.log('❌ User not found:', username);
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      console.log('✅ User found:', wilmaUser.id);
      
      if (wilmaUser.password !== password) {
        console.log('❌ Password mismatch');
        return res.status(401).json({ message: "Invalid username or password" });
      }

      if (!wilmaUser.isActive) {
        console.log('❌ Account is disabled');
        return res.status(403).json({ message: "Account is disabled" });
      }

      console.log('✅ Login successful for:', username);
      // Return user without password
      const { password: _, ...userWithoutPassword } = wilmaUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('❌ Login error:', error);
      await logError(error, 'POST /api/wilma/login', { username: req.body.username });
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/wilma/users', isAuthenticated, async (req: any, res) => {
    try {
      console.log('🔵 POST /api/wilma/users called');
      console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
      
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        console.log('❌ Access denied - user role:', user?.role);
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { sendEmailInvitation, ...userData } = req.body;
      
      // Validation
      if (!userData.username || !userData.firstName || !userData.lastName) {
        console.log('❌ Missing required fields');
        return res.status(400).json({ message: "Username, first name, and last name are required" });
      }
      
      if (!sendEmailInvitation && !userData.password) {
        console.log('❌ Password required when not sending email invitation');
        return res.status(400).json({ message: "Password is required when not sending email invitation" });
      }
      
      if (sendEmailInvitation && !userData.email) {
        console.log('❌ Email required for invitation');
        return res.status(400).json({ message: "Email is required for email invitation" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getWilmaUserByUsername(userData.username);
      if (existingUser) {
        console.log('❌ Username already exists:', userData.username);
        return res.status(409).json({ message: "Username already exists" });
      }
      
      // Generate password if email invitation is requested
      if (sendEmailInvitation) {
        const generatedPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
        userData.password = generatedPassword;
        console.log('🔑 Generated password for email invitation');
        
        // Send email with credentials
        if (userData.email) {
          try {
            const emailService = await import('./emailService');
            await emailService.sendEmail({
              to: userData.email,
              subject: 'Your Wilma Login Credentials - KSYK Maps',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #003d82;">Welcome to Wilma!</h2>
                  <p>Hello ${userData.firstName} ${userData.lastName},</p>
                  <p>Your Wilma account has been created. Here are your login credentials:</p>
                  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Username:</strong> ${userData.username}</p>
                    <p style="margin: 5px 0;"><strong>Password:</strong> ${generatedPassword}</p>
                    <p style="margin: 5px 0;"><strong>Role:</strong> ${userData.role}</p>
                  </div>
                  <p>You can login at: <a href="${process.env.APP_URL || 'http://localhost:5000'}/wilma">${process.env.APP_URL || 'http://localhost:5000'}/wilma</a></p>
                  <p style="color: #666; font-size: 12px; margin-top: 30px;">Please change your password after first login.</p>
                </div>
              `
            });
            console.log('✅ Email sent successfully to:', userData.email);
          } catch (emailError) {
            console.error('❌ Failed to send email:', emailError);
            // Continue anyway - user is created
          }
        }
      }
      
      // Set default values
      userData.isActive = userData.isActive !== false; // Default to true
      
      // Auto-generate student ID for students (6-digit numbers)
      if (userData.role === 'student' && !userData.studentId) {
        // Generate 6-digit student ID (100000 - 999999)
        const random = Math.floor(100000 + Math.random() * 900000).toString();
        userData.studentId = random;
        console.log('🎓 Auto-generated 6-digit student ID:', userData.studentId);
      }
      
      // Auto-generate email for students if not provided
      if (userData.role === 'student' && !userData.email) {
        const cleanFirst = userData.firstName.toLowerCase().replace(/[^a-z]/g, '');
        const cleanLast = userData.lastName.toLowerCase().replace(/[^a-z]/g, '');
        userData.email = `${cleanFirst}.${cleanLast}@ksyk.fi`;
        console.log('📧 Auto-generated email:', userData.email);
      }
      
      console.log('💾 Creating Wilma user...');
      const wilmaUser = await storage.createWilmaUser(userData);
      console.log('✅ Wilma user created successfully:', wilmaUser.id);
      
      // DO NOT send email automatically - admin will trigger it manually
      
      // Remove password from response
      const { password: _, ...userResponse } = wilmaUser;
      res.status(201).json(userResponse);
    } catch (error: any) {
      console.error('💥 Error creating Wilma user:', error);
      await logError(error, 'POST /api/wilma/users', { wilmaUserData: req.body });
      res.status(500).json({ message: error.message || "Failed to create Wilma user" });
    }
  });

  app.put('/api/wilma/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const wilmaUser = await storage.updateWilmaUser(req.params.id, req.body);
      res.json(wilmaUser);
    } catch (error) {
      await logError(error, 'PUT /api/wilma/users/:id', { wilmaUserId: req.params.id });
      res.status(500).json({ message: "Failed to update Wilma user" });
    }
  });

  app.delete('/api/wilma/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      await storage.deleteWilmaUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/wilma/users/:id', { wilmaUserId: req.params.id });
      res.status(500).json({ message: "Failed to delete Wilma user" });
    }
  });

  // User settings endpoint
  app.post('/api/wilma/user-settings', async (req, res) => {
    try {
      const { userId, settings } = req.body;
      
      if (!userId || !settings) {
        return res.status(400).json({ message: "Missing userId or settings" });
      }

      // Save settings to Firestore
      const settingsRef = db.collection('wilma_user_settings').doc(userId);
      await settingsRef.set({
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      console.log(`✅ Settings saved for user ${userId}`);
      res.json({ success: true, message: "Settings saved successfully" });
    } catch (error) {
      await logError(error, 'POST /api/wilma/user-settings', { userId: req.body.userId });
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Password reset email endpoint
  app.post('/api/wilma/users/:id/send-password-reset', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get user details
      const userDoc = await db.collection('wilmaUsers').doc(id).get();
      if (!userDoc.exists) {
        return res.status(404).json({ success: false, message: "Käyttäjää ei löytynyt" });
      }

      const user = userDoc.data();
      if (!user?.email) {
        return res.status(400).json({ success: false, message: "Käyttäjällä ei ole sähköpostiosoitetta" });
      }

      // Generate reset token (simple random string for now)
      const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const resetExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token to user document
      await db.collection('wilmaUsers').doc(id).update({
        resetToken,
        resetTokenExpiry: resetExpiry.toISOString()
      });

      // Send email
      const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #003d82;">Salasanan nollaus - Wilma</h2>
          <p>Hei ${user.firstName} ${user.lastName},</p>
          <p>Olet pyytänyt salasanan nollausta Wilma-järjestelmään.</p>
          <p>Klikkaa alla olevaa linkkiä nollataksesi salasanasi:</p>
          <p style="margin: 20px 0;">
            <a href="${resetLink}" style="background-color: #003d82; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
              Nollaa salasana
            </a>
          </p>
          <p>Linkki on voimassa 1 tunnin ajan.</p>
          <p>Jos et pyytänyt salasanan nollausta, voit jättää tämän viestin huomiotta.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">
            Tämä on automaattinen viesti. Älä vastaa tähän viestiin.
          </p>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject: 'Salasanan nollaus - Wilma',
        html: emailHtml
      });

      console.log(`✅ Password reset email sent to ${user.email}`);
      res.json({ success: true, message: `Salasanan nollauslinkki lähetetty osoitteeseen ${user.email}` });
    } catch (error) {
      console.error('❌ Password reset email error:', error);
      await logError(error, 'POST /api/wilma/users/:id/send-password-reset', { userId: req.params.id });
      res.status(500).json({ success: false, message: "Sähköpostin lähetys epäonnistui" });
    }
  });

  app.get('/api/wilma/user-settings/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      const settingsRef = db.collection('wilma_user_settings').doc(userId);
      const doc = await settingsRef.get();

      if (!doc.exists) {
        return res.json({ settings: null });
      }

      res.json({ settings: doc.data() });
    } catch (error) {
      await logError(error, 'GET /api/wilma/user-settings/:userId', { userId: req.params.userId });
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // Bulk send welcome emails
  app.post('/api/wilma/send-bulk-emails', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📧 Bulk email send requested');
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const students = await storage.getWilmaUsers('student');
      console.log(`📊 Found ${students.length} students`);
      
      let sent = 0;
      let failed = 0;
      const errors: string[] = [];
      
      for (const student of students) {
        if (student.email && student.isTemporaryPassword) {
          // If no plainPassword, generate a new one
          if (!student.plainPassword) {
            const { hashPassword } = await import('./passwordUtils');
            const plainPass = generateTempPassword();
            const hashedPass = await hashPassword(plainPass);
            
            student.password = hashedPass;
            student.plainPassword = plainPass;
            
            await storage.updateWilmaUser(student.id, {
              password: hashedPass,
              plainPassword: plainPass,
              isTemporaryPassword: true
            });
            console.log(`🔑 Regenerated password for ${student.email}`);
          }
          
          const parentEmails = [];
          if (student.parent1Email) parentEmails.push(student.parent1Email);
          if (student.parent2Email) parentEmails.push(student.parent2Email);
          
          try {
            const emailService = await import('./emailService');
            const result = await emailService.sendWilmaStudentWelcomeEmail(
              student.email,
              `${student.firstName} ${student.lastName}`,
              student.plainPassword || student.password, // Use plainPassword
              student.username,
              student.studentId,
              parentEmails.length > 0 ? parentEmails : undefined
            );
            
            if (result.success) {
              sent++;
              console.log(`✅ Email sent to ${student.email}`);
            } else {
              failed++;
              errors.push(`${student.email}: ${result.error || 'Unknown error'}`);
              console.error(`❌ Failed to send email to ${student.email}:`, result.error);
            }
          } catch (emailError: any) {
            console.error(`❌ Failed to send email to ${student.email}:`, emailError);
            failed++;
            errors.push(`${student.email}: ${emailError.message || 'Unknown error'}`);
          }
        } else {
          console.log(`⏭️ Skipping ${student.email} - missing email, password, or not temporary`);
        }
      }
      
      console.log(`📊 Bulk email complete: ${sent} sent, ${failed} failed`);
      res.json({ success: true, sent, failed, errors: errors.slice(0, 10) }); // Return first 10 errors
    } catch (error: any) {
      console.error('❌ Bulk email error:', error);
      await logError(error, 'POST /api/wilma/send-bulk-emails');
      res.status(500).json({ 
        message: "Failed to send bulk emails",
        error: error.message || 'Unknown error'
      });
    }
  });

  // Test email endpoint
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

  // Wilma Schedule routes
  // Get schedule by userId (query param)
  app.get('/api/wilma/schedule', async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      
      // Return mock schedule data for now
      const mockSchedule = [
        { time: '08:00 - 09:30', subject: 'Matematiikka', room: 'A201', teacher: 'M. Virtanen' },
        { time: '09:45 - 11:15', subject: 'Englanti', room: 'B105', teacher: 'A. Korhonen' },
        { time: '11:30 - 13:00', subject: 'Lounastauko', room: '-', teacher: '-' },
        { time: '13:15 - 14:45', subject: 'Fysiikka', room: 'C301', teacher: 'P. Nieminen' },
        { time: '15:00 - 16:30', subject: 'Historia', room: 'A105', teacher: 'L. Mäkinen' },
      ];
      
      res.json(mockSchedule);
    } catch (error) {
      await logError(error, 'GET /api/wilma/schedule', { userId: req.query.userId });
      res.status(500).json({ message: "Failed to fetch schedule" });
    }
  });

  app.get('/api/wilma/schedules/:studentId', async (req, res) => {
    try {
      const schedules = await storage.getWilmaSchedules(req.params.studentId);
      res.json(schedules);
    } catch (error) {
      await logError(error, 'GET /api/wilma/schedules/:studentId', { studentId: req.params.studentId });
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  // Wilma Grade routes
  app.get('/api/wilma/grades/:studentId', async (req, res) => {
    try {
      const grades = await storage.getWilmaGrades(req.params.studentId);
      res.json(grades);
    } catch (error) {
      await logError(error, 'GET /api/wilma/grades/:studentId', { studentId: req.params.studentId });
      res.status(500).json({ message: "Failed to fetch grades" });
    }
  });

  app.post('/api/wilma/grades', isAuthenticated, async (req: any, res) => {
    try {
      const grade = await storage.createWilmaGrade(req.body);
      res.status(201).json(grade);
    } catch (error) {
      await logError(error, 'POST /api/wilma/grades');
      res.status(500).json({ message: "Failed to create grade" });
    }
  });

  // Wilma Assignment routes
  app.get('/api/wilma/assignments/:studentId', async (req, res) => {
    try {
      const assignments = await storage.getWilmaAssignments(req.params.studentId);
      res.json(assignments);
    } catch (error) {
      await logError(error, 'GET /api/wilma/assignments/:studentId', { studentId: req.params.studentId });
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.post('/api/wilma/assignments', isAuthenticated, async (req: any, res) => {
    try {
      const assignment = await storage.createWilmaAssignment(req.body);
      res.status(201).json(assignment);
    } catch (error) {
      await logError(error, 'POST /api/wilma/assignments');
      res.status(500).json({ message: "Failed to create assignment" });
    }
  });

  // Wilma Message routes
  app.get('/api/wilma/messages', async (req, res) => {
    try {
      // Get all messages (admin view) - use storage layer
      const messages = await storage.getAllWilmaMessages();
      res.json(messages);
    } catch (error) {
      await logError(error, 'GET /api/wilma/messages');
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/wilma/messages', isAuthenticated, async (req: any, res) => {
    try {
      const { recipient, subject, message } = req.body;
      
      if (!recipient || !subject || !message) {
        return res.status(400).json({ message: "Recipient, subject, and message are required" });
      }
      
      const messageData = {
        recipient,
        subject,
        message,
        sender: req.user?.claims?.email || 'admin',
        sentAt: new Date().toISOString(),
        read: false,
        sent: false
      };
      
      const newMessage = await storage.createWilmaMessage(messageData);
      res.status(201).json(newMessage);
    } catch (error) {
      await logError(error, 'POST /api/wilma/messages');
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.delete('/api/wilma/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteWilmaMessage(req.params.id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/wilma/messages/:id', { messageId: req.params.id });
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  app.put('/api/wilma/messages/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      await storage.markWilmaMessageAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      await logError(error, 'PUT /api/wilma/messages/:id/read', { messageId: req.params.id });
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.put('/api/wilma/messages/:id/star', isAuthenticated, async (req: any, res) => {
    try {
      const { starred } = req.body;
      const messageId = req.params.id;
      
      // Get message from Firebase
      const messageRef = db.collection('wilmaMessages').doc(messageId);
      await messageRef.update({
        isStarred: starred,
        updatedAt: new Date().toISOString()
      });
      
      res.json({ success: true, starred });
    } catch (error) {
      await logError(error, 'PUT /api/wilma/messages/:id/star', { messageId: req.params.id });
      res.status(500).json({ message: "Failed to star message" });
    }
  });

  app.put('/api/wilma/messages/:id/archive', isAuthenticated, async (req: any, res) => {
    try {
      const { archived } = req.body;
      const messageId = req.params.id;
      
      // Get message from Firebase
      const messageRef = db.collection('wilmaMessages').doc(messageId);
      await messageRef.update({
        isArchived: archived,
        updatedAt: new Date().toISOString()
      });
      
      res.json({ success: true, archived });
    } catch (error) {
      await logError(error, 'PUT /api/wilma/messages/:id/archive', { messageId: req.params.id });
      res.status(500).json({ message: "Failed to archive message" });
    }
  });

  // Wilma Schedule routes (full CRUD)
  app.get('/api/wilma/schedules', async (req, res) => {
    try {
      const classFilter = req.query.class as string | undefined;
      const schedules = await storage.getWilmaSchedulesAll(classFilter);
      res.json(schedules);
    } catch (error) {
      await logError(error, 'GET /api/wilma/schedules');
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post('/api/wilma/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const schedule = await storage.createWilmaSchedule(req.body);
      res.status(201).json(schedule);
    } catch (error) {
      await logError(error, 'POST /api/wilma/schedules');
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  app.delete('/api/wilma/schedules/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteWilmaSchedule(req.params.id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/wilma/schedules/:id');
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  // Wilma Settings routes
  app.get('/api/wilma/settings', async (req, res) => {
    try {
      const settings = await storage.getWilmaSettings();
      res.json(settings);
    } catch (error) {
      await logError(error, 'GET /api/wilma/settings');
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put('/api/wilma/settings', isAuthenticated, async (req: any, res) => {
    try {
      const settings = await storage.updateWilmaSettings(req.body);
      res.json(settings);
    } catch (error) {
      await logError(error, 'PUT /api/wilma/settings');
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // Schedule Settings routes
  app.get('/api/schedule-settings', async (req, res) => {
    try {
      const doc = await db.collection('scheduleSettings').doc('default').get();
      if (!doc.exists) {
        // Return default settings
        return res.json({
          periods: [],
          terms: [],
          breaks: [],
          specialSchedules: []
        });
      }
      res.json(doc.data());
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
        updatedBy: user.id
      };

      await db.collection('scheduleSettings').doc('default').set(settings);
      res.json(settings);
    } catch (error) {
      await logError(error, 'POST /api/schedule-settings');
      res.status(500).json({ message: "Failed to save schedule settings" });
    }
  });

  // Appearance Settings routes
  app.get('/api/appearance-settings', async (req, res) => {
    try {
      const doc = await db.collection('appearanceSettings').doc('default').get();
      if (!doc.exists) {
        // Return default settings
        return res.json({
          timeFormat: '24h',
          language: 'fi',
          dateFormat: 'DD.MM.YYYY'
        });
      }
      res.json(doc.data());
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
        updatedBy: user.id
      };

      await db.collection('appearanceSettings').doc('default').set(settings);
      res.json(settings);
    } catch (error) {
      await logError(error, 'POST /api/appearance-settings');
      res.status(500).json({ message: "Failed to save appearance settings" });
    }
  });

  // Wilma Attendance routes
  app.get('/api/wilma/attendance/:studentId', async (req, res) => {
    try {
      const attendance = await storage.getWilmaAttendance(req.params.studentId);
      res.json(attendance);
    } catch (error) {
      await logError(error, 'GET /api/wilma/attendance/:studentId', { studentId: req.params.studentId });
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.post('/api/wilma/attendance', isAuthenticated, async (req: any, res) => {
    try {
      const attendance = await storage.createWilmaAttendance(req.body);
      res.status(201).json(attendance);
    } catch (error) {
      await logError(error, 'POST /api/wilma/attendance');
      res.status(500).json({ message: "Failed to create attendance" });
    }
  });

  // Wilma Exam routes
  app.get('/api/wilma/exams/:studentId', async (req, res) => {
    try {
      const exams = await storage.getWilmaExams(req.params.studentId);
      res.json(exams);
    } catch (error) {
      await logError(error, 'GET /api/wilma/exams/:studentId', { studentId: req.params.studentId });
      res.status(500).json({ message: "Failed to fetch exams" });
    }
  });

  app.post('/api/wilma/exams', isAuthenticated, async (req: any, res) => {
    try {
      const exam = await storage.createWilmaExam(req.body);
      res.status(201).json(exam);
    } catch (error) {
      await logError(error, 'POST /api/wilma/exams');
      res.status(500).json({ message: "Failed to create exam" });
    }
  });

  // Wilma Attendance Marks routes (Enhanced)
  app.get('/api/wilma/attendance-marks', async (req, res) => {
    try {
      const { studentId, period, schoolYear, date, startDate, endDate, markType } = req.query;
      
      // Get all marks from Firebase
      const marksRef = db.collection('wilmaAttendanceMarks');
      let query: any = marksRef;
      
      if (studentId) query = query.where('studentId', '==', studentId);
      if (markType) query = query.where('markType', '==', markType);
      if (date) query = query.where('date', '==', date);
      
      const snapshot = await query.orderBy('date', 'desc').limit(500).get();
      const marks = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      
      // Filter by date range if provided
      let filteredMarks = marks;
      if (startDate && endDate) {
        filteredMarks = marks.filter((m: any) => m.date >= startDate && m.date <= endDate);
      }
      
      res.json(filteredMarks);
    } catch (error) {
      await logError(error, 'GET /api/wilma/attendance-marks');
      res.status(500).json({ message: "Failed to fetch attendance marks" });
    }
  });

  app.post('/api/wilma/attendance-marks', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const markData = {
        ...req.body,
        teacherId: currentUser.id,
        teacherName: `${currentUser.firstName} ${currentUser.lastName}`,
        notifiedParent: false,
        createdAt: new Date().toISOString(),
      };

      // Get student name
      const student = await storage.getWilmaUserByStudentId(markData.studentId);
      if (student) {
        markData.studentName = `${student.firstName} ${student.lastName}`;
      }

      const docRef = await db.collection('wilmaAttendanceMarks').add(markData);
      const mark = { id: docRef.id, ...markData };
      
      res.status(201).json(mark);
    } catch (error) {
      await logError(error, 'POST /api/wilma/attendance-marks');
      res.status(500).json({ message: "Failed to create attendance mark" });
    }
  });

  app.put('/api/wilma/attendance-marks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateData = {
        ...req.body,
        updatedAt: new Date().toISOString(),
      };

      await db.collection('wilmaAttendanceMarks').doc(id).update(updateData);
      const doc = await db.collection('wilmaAttendanceMarks').doc(id).get();
      const mark = { id: doc.id, ...doc.data() };
      
      res.json(mark);
    } catch (error) {
      await logError(error, 'PUT /api/wilma/attendance-marks/:id', { markId: req.params.id });
      res.status(500).json({ message: "Failed to update attendance mark" });
    }
  });

  app.delete('/api/wilma/attendance-marks/:id', isAuthenticated, async (req: any, res) => {
    try {
      await db.collection('wilmaAttendanceMarks').doc(req.params.id).delete();
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/wilma/attendance-marks/:id', { markId: req.params.id });
      res.status(500).json({ message: "Failed to delete attendance mark" });
    }
  });

  app.get('/api/wilma/attendance-marks/stats/:studentId', async (req, res) => {
    try {
      const { studentId } = req.params;
      const snapshot = await db.collection('wilmaAttendanceMarks')
        .where('studentId', '==', studentId)
        .get();
      
      const marks = snapshot.docs.map((doc: any) => doc.data());
      
      const stats = {
        total: marks.length,
        present: marks.filter((m: any) => m.markType === 'present').length,
        absent: marks.filter((m: any) => m.markType === 'absent').length,
        late: marks.filter((m: any) => m.markType === 'late').length,
        behavioral: marks.filter((m: any) => 
          ['sleeping', 'phone_use', 'talking', 'bad_behavior'].includes(m.markType)
        ).length,
      };
      
      stats.attendanceRate = stats.total > 0 
        ? ((stats.present / stats.total) * 100).toFixed(1) 
        : '0';
      
      res.json(stats);
    } catch (error) {
      await logError(error, 'GET /api/wilma/attendance-marks/stats/:studentId');
      res.status(500).json({ message: "Failed to fetch attendance stats" });
    }
  });

  // Bulk attendance marks
  app.post('/api/wilma/attendance-marks/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const { marks } = req.body;
      
      if (!marks || !Array.isArray(marks)) {
        return res.status(400).json({ message: "Marks array is required" });
      }

      const createdMarks = [];
      for (const markData of marks) {
        const mark = {
          ...markData,
          id: db.collection('wilmaAttendanceMarks').doc().id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await db.collection('wilmaAttendanceMarks').doc(mark.id).set(mark);
        createdMarks.push(mark);
      }

      res.status(201).json({ success: true, count: createdMarks.length, marks: createdMarks });
    } catch (error) {
      await logError(error, 'POST /api/wilma/attendance-marks/bulk');
      res.status(500).json({ message: "Failed to create bulk attendance marks" });
    }
  });

  // Absence notifications routes
  app.get('/api/wilma/absence-notifications', async (req, res) => {
    try {
      const { date, status, studentId } = req.query;
      
      let query = db.collection('wilmaAbsenceNotifications');
      
      if (date) {
        query = query.where('date', '==', date) as any;
      }
      if (status) {
        query = query.where('status', '==', status) as any;
      }
      if (studentId) {
        query = query.where('studentId', '==', studentId) as any;
      }

      const snapshot = await query.get();
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      res.json(notifications);
    } catch (error) {
      await logError(error, 'GET /api/wilma/absence-notifications');
      res.status(500).json({ message: "Failed to fetch absence notifications" });
    }
  });

  app.post('/api/wilma/absence-notifications', async (req, res) => {
    try {
      const notificationData = req.body;
      
      const notification = {
        ...notificationData,
        id: db.collection('wilmaAbsenceNotifications').doc().id,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await db.collection('wilmaAbsenceNotifications').doc(notification.id).set(notification);
      res.status(201).json(notification);
    } catch (error) {
      await logError(error, 'POST /api/wilma/absence-notifications');
      res.status(500).json({ message: "Failed to create absence notification" });
    }
  });

  app.put('/api/wilma/absence-notifications/:id/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, markType } = req.body;

      // Update notification status
      await db.collection('wilmaAbsenceNotifications').doc(id).update({
        status,
        confirmedAt: new Date().toISOString(),
        confirmedBy: req.user?.claims?.email || 'teacher'
      });

      // If confirmed, create attendance mark
      if (status === 'confirmed') {
        const notificationDoc = await db.collection('wilmaAbsenceNotifications').doc(id).get();
        const notification = notificationDoc.data();

        if (notification) {
          const mark = {
            id: db.collection('wilmaAttendanceMarks').doc().id,
            studentId: notification.studentId,
            studentName: notification.studentName,
            date: notification.date,
            timeSlot: '08:00-09:30',
            subject: 'Poissaolo',
            markType: markType || 'sick',
            status: 'confirmed',
            notes: `Huoltajan ilmoitus: ${notification.reason}`,
            teacherId: req.user?.claims?.sub || 'system',
            teacherName: req.user?.claims?.email || 'System',
            parentNotified: true,
            createdAt: new Date().toISOString()
          };

          await db.collection('wilmaAttendanceMarks').doc(mark.id).set(mark);
        }
      }

      res.json({ success: true });
    } catch (error) {
      await logError(error, 'PUT /api/wilma/absence-notifications/:id/confirm');
      res.status(500).json({ message: "Failed to confirm absence notification" });
    }
  });

  // Wilma Classes routes (Complete CRUD)
  app.get('/api/wilma/classes', async (req, res) => {
    try {
      const snapshot = await db.collection('wilmaClasses').orderBy('grade').orderBy('name').get();
      const classes = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      res.json(classes);
    } catch (error) {
      await logError(error, 'GET /api/wilma/classes');
      res.status(500).json({ message: "Failed to fetch classes" });
    }
  });

  app.get('/api/wilma/classes/:id', async (req, res) => {
    try {
      const doc = await db.collection('wilmaClasses').doc(req.params.id).get();
      if (!doc.exists) {
        return res.status(404).json({ message: "Class not found" });
      }
      res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
      await logError(error, 'GET /api/wilma/classes/:id', { classId: req.params.id });
      res.status(500).json({ message: "Failed to fetch class" });
    }
  });

  app.post('/api/wilma/classes', isAuthenticated, async (req: any, res) => {
    try {
      const classData = {
        ...req.body,
        studentCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      const docRef = await db.collection('wilmaClasses').add(classData);
      const newClass = { id: docRef.id, ...classData };
      
      res.status(201).json(newClass);
    } catch (error) {
      await logError(error, 'POST /api/wilma/classes');
      res.status(500).json({ message: "Failed to create class" });
    }
  });

  app.put('/api/wilma/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const updateData = {
        ...req.body,
        updatedAt: new Date().toISOString(),
      };
      
      await db.collection('wilmaClasses').doc(req.params.id).update(updateData);
      const doc = await db.collection('wilmaClasses').doc(req.params.id).get();
      
      res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
      await logError(error, 'PUT /api/wilma/classes/:id', { classId: req.params.id });
      res.status(500).json({ message: "Failed to update class" });
    }
  });

  app.delete('/api/wilma/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      await db.collection('wilmaClasses').doc(req.params.id).delete();
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/wilma/classes/:id', { classId: req.params.id });
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  app.get('/api/wilma/classes/:id/students', async (req, res) => {
    try {
      const classDoc = await db.collection('wilmaClasses').doc(req.params.id).get();
      if (!classDoc.exists) {
        return res.status(404).json({ message: "Class not found" });
      }
      
      const classData = classDoc.data();
      const snapshot = await db.collection('wilmaUsers')
        .where('studentClass', '==', classData.name)
        .where('role', '==', 'student')
        .get();
      
      const students = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      res.json(students);
    } catch (error) {
      await logError(error, 'GET /api/wilma/classes/:id/students', { classId: req.params.id });
      res.status(500).json({ message: "Failed to fetch class students" });
    }
  });

  app.put('/api/wilma/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      const classData = await storage.updateWilmaClass(req.params.id, req.body);
      res.json(classData);
    } catch (error) {
      await logError(error, 'PUT /api/wilma/classes/:id', { classId: req.params.id });
      res.status(500).json({ message: "Failed to update class" });
    }
  });

  app.delete('/api/wilma/classes/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteWilmaClass(req.params.id);
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/wilma/classes/:id', { classId: req.params.id });
      res.status(500).json({ message: "Failed to delete class" });
    }
  });

  // ==================== COURSES/GROUPS (Kurssit/Ryhmät) ====================
  // Get all courses
  app.get('/api/wilma/courses', async (req, res) => {
    try {
      const snapshot = await db.collection('wilmaCourses').orderBy('subject').orderBy('name').get();
      const courses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(courses);
    } catch (error) {
      await logError(error, 'GET /api/wilma/courses');
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  // Get course by ID
  app.get('/api/wilma/courses/:id', async (req, res) => {
    try {
      const doc = await db.collection('wilmaCourses').doc(req.params.id).get();
      if (!doc.exists) {
        return res.status(404).json({ message: "Course not found" });
      }
      res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
      await logError(error, 'GET /api/wilma/courses/:id', { courseId: req.params.id });
      res.status(500).json({ message: "Failed to fetch course" });
    }
  });

  // Create course
  app.post('/api/wilma/courses', isAuthenticated, async (req: any, res) => {
    try {
      const courseData = {
        name: req.body.name,
        code: req.body.code,
        subject: req.body.subject,
        description: req.body.description || '',
        teacherId: req.body.teacherId,
        teacherName: req.body.teacherName,
        room: req.body.room || '',
        grade: req.body.grade || '',
        maxStudents: req.body.maxStudents || 30,
        schedule: req.body.schedule || [], // Array of {day, startTime, endTime, room}
        startDate: req.body.startDate,
        endDate: req.body.endDate,
        isActive: req.body.isActive !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await db.collection('wilmaCourses').add(courseData);
      const newCourse = { id: docRef.id, ...courseData };
      res.status(201).json(newCourse);
    } catch (error) {
      await logError(error, 'POST /api/wilma/courses');
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Update course
  app.put('/api/wilma/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      const updateData = {
        ...req.body,
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('wilmaCourses').doc(req.params.id).update(updateData);
      const doc = await db.collection('wilmaCourses').doc(req.params.id).get();
      res.json({ id: doc.id, ...doc.data() });
    } catch (error) {
      await logError(error, 'PUT /api/wilma/courses/:id', { courseId: req.params.id });
      res.status(500).json({ message: "Failed to update course" });
    }
  });

  // Delete course
  app.delete('/api/wilma/courses/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Also delete all enrollments for this course
      const enrollmentsSnapshot = await db.collection('wilmaEnrollments')
        .where('courseId', '==', req.params.id)
        .get();
      
      const batch = db.batch();
      enrollmentsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      await db.collection('wilmaCourses').doc(req.params.id).delete();
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/wilma/courses/:id', { courseId: req.params.id });
      res.status(500).json({ message: "Failed to delete course" });
    }
  });

  // Get students enrolled in a course
  app.get('/api/wilma/courses/:id/students', async (req, res) => {
    try {
      const enrollmentsSnapshot = await db.collection('wilmaEnrollments')
        .where('courseId', '==', req.params.id)
        .get();
      
      const studentIds = enrollmentsSnapshot.docs.map(doc => doc.data().studentId);
      
      if (studentIds.length === 0) {
        return res.json([]);
      }
      
      const studentsSnapshot = await db.collection('wilmaUsers')
        .where('role', '==', 'student')
        .get();
      
      const students = studentsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((s: any) => studentIds.includes(s.id));
      
      res.json(students);
    } catch (error) {
      await logError(error, 'GET /api/wilma/courses/:id/students', { courseId: req.params.id });
      res.status(500).json({ message: "Failed to fetch course students" });
    }
  });

  // ==================== ENROLLMENTS (Ilmoittautumiset) ====================
  // Get all enrollments for a student
  app.get('/api/wilma/students/:studentId/enrollments', async (req, res) => {
    try {
      const enrollmentsSnapshot = await db.collection('wilmaEnrollments')
        .where('studentId', '==', req.params.studentId)
        .get();
      
      const enrollments = await Promise.all(
        enrollmentsSnapshot.docs.map(async (doc) => {
          const enrollmentData = doc.data();
          const courseDoc = await db.collection('wilmaCourses').doc(enrollmentData.courseId).get();
          return {
            id: doc.id,
            ...enrollmentData,
            course: courseDoc.exists ? { id: courseDoc.id, ...courseDoc.data() } : null
          };
        })
      );
      
      res.json(enrollments);
    } catch (error) {
      await logError(error, 'GET /api/wilma/students/:studentId/enrollments', { studentId: req.params.studentId });
      res.status(500).json({ message: "Failed to fetch student enrollments" });
    }
  });

  // Enroll student in course
  app.post('/api/wilma/enrollments', isAuthenticated, async (req: any, res) => {
    try {
      const { studentId, courseId, studentName, courseName } = req.body;
      
      // Check if already enrolled
      const existingSnapshot = await db.collection('wilmaEnrollments')
        .where('studentId', '==', studentId)
        .where('courseId', '==', courseId)
        .get();
      
      if (!existingSnapshot.empty) {
        return res.status(409).json({ message: "Student already enrolled in this course" });
      }
      
      const enrollmentData = {
        studentId,
        courseId,
        studentName,
        courseName,
        enrolledAt: new Date().toISOString(),
        status: 'active'
      };
      
      const docRef = await db.collection('wilmaEnrollments').add(enrollmentData);
      const newEnrollment = { id: docRef.id, ...enrollmentData };
      res.status(201).json(newEnrollment);
    } catch (error) {
      await logError(error, 'POST /api/wilma/enrollments');
      res.status(500).json({ message: "Failed to enroll student" });
    }
  });

  // Remove enrollment
  app.delete('/api/wilma/enrollments/:id', isAuthenticated, async (req: any, res) => {
    try {
      await db.collection('wilmaEnrollments').doc(req.params.id).delete();
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/wilma/enrollments/:id', { enrollmentId: req.params.id });
      res.status(500).json({ message: "Failed to remove enrollment" });
    }
  });

  // Get student's individual schedule based on enrollments
  app.get('/api/wilma/students/:studentId/schedule', async (req, res) => {
    try {
      // Get all enrollments for the student
      const enrollmentsSnapshot = await db.collection('wilmaEnrollments')
        .where('studentId', '==', req.params.studentId)
        .where('status', '==', 'active')
        .get();
      
      // Get all courses the student is enrolled in
      const courseIds = enrollmentsSnapshot.docs.map(doc => doc.data().courseId);
      
      if (courseIds.length === 0) {
        return res.json([]);
      }
      
      const coursesSnapshot = await db.collection('wilmaCourses')
        .where('isActive', '==', true)
        .get();
      
      const enrolledCourses = coursesSnapshot.docs
        .filter(doc => courseIds.includes(doc.id))
        .map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Build schedule from courses
      const schedule: any[] = [];
      enrolledCourses.forEach((course: any) => {
        if (course.schedule && Array.isArray(course.schedule)) {
          course.schedule.forEach((slot: any) => {
            schedule.push({
              courseId: course.id,
              courseName: course.name,
              courseCode: course.code,
              subject: course.subject,
              teacherName: course.teacherName,
              day: slot.day,
              startTime: slot.startTime,
              endTime: slot.endTime,
              room: slot.room || course.room
            });
          });
        }
      });
      
      // Sort by day and time
      const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      schedule.sort((a, b) => {
        const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return a.startTime.localeCompare(b.startTime);
      });
      
      res.json(schedule);
    } catch (error) {
      await logError(error, 'GET /api/wilma/students/:studentId/schedule', { studentId: req.params.studentId });
      res.status(500).json({ message: "Failed to fetch student schedule" });
    }
  });

  // Wilma Dashboard Stats
  app.get('/api/wilma/stats', async (req, res) => {
    try {
      const students = await storage.getWilmaUsers('student');
      const teachers = await storage.getWilmaUsers('teacher');
      const parents = await storage.getWilmaUsers('parent');
      
      // Count active users (logged in within last 24 hours)
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const activeStudents = students.filter((s: any) => s.lastLogin && new Date(s.lastLogin) > yesterday).length;
      const activeTeachers = teachers.filter((t: any) => t.lastLogin && new Date(t.lastLogin) > yesterday).length;
      
      res.json({
        totalUsers: students.length + teachers.length + parents.length,
        students: students.length,
        teachers: teachers.length,
        parents: parents.length,
        activeStudents,
        activeTeachers,
        activeUsers: activeStudents + activeTeachers,
      });
    } catch (error) {
      await logError(error, 'GET /api/wilma/stats');
      res.status(500).json({ message: "Failed to fetch stats" });
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

  // NUCLEAR OPTION - Login without session (for omelimeilit only)
  app.post('/api/auth/force-login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      console.log('💥 FORCE LOGIN ATTEMPT:', email);
      
      if (email === 'omelimeilit@gmail.com') {
        // Get or create user
        let user = await storage.getUserByEmail(email);
        if (!user) {
          user = await storage.upsertUser({
            email: 'omelimeilit@gmail.com',
            firstName: 'Okko',
            lastName: 'Kettunen',
            role: 'admin',
            password: 'test',
            profileImageUrl: null
          });
        }
        
        console.log('💥 FORCE LOGIN SUCCESS - NO SESSION');
        
        // Return success WITHOUT creating session
        // Frontend will store this in localStorage
        return res.json({
          success: true,
          user: user,
          requirePasswordChange: false,
          forceLogin: true,
          message: 'Logged in without session (emergency mode)'
        });
      }
      
      return res.status(401).json({ message: 'Force login only available for omelimeilit@gmail.com' });
    } catch (error) {
      console.error('Force login error:', error);
      return res.status(500).json({ message: 'Force login failed' });
    }
  });

  // Test login endpoint (NO AUTH REQUIRED - for debugging only)
  app.post('/api/test-login', async (req, res) => {
    try {
      const { email } = req.body;
      
      console.log('\n🧪 ========== TEST LOGIN ENDPOINT ==========');
      console.log('Testing login for:', email);
      
      // Check if user exists
      const user = await storage.getUserByEmail(email);
      console.log('User found:', user ? 'YES' : 'NO');
      
      if (user) {
        console.log('User details:', {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          hasPassword: !!user.password,
          password: user.password
        });
      }
      
      console.log('==========================================\n');
      
      res.json({
        success: true,
        userExists: !!user,
        user: user ? {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          hasPassword: !!user.password,
          password: user.password
        } : null
      });
    } catch (error: any) {
      console.error('Test login error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message
      });
    }
  });

  // Test email endpoint (always available for debugging)
  app.post('/api/test-email', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email } = req.body;
      const testPassword = generateTempPassword();
      
      console.log('\n🧪 ========== TESTING EMAIL ==========');
      console.log('Sending test email to:', email);
      console.log('Environment check:');
      console.log('  EMAIL_USER:', process.env.EMAIL_USER ? '✅ SET' : '❌ NOT SET');
      console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ SET (length: ' + (process.env.EMAIL_PASSWORD?.length || 0) + ')' : '❌ NOT SET');
      console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
      console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
      console.log('  NODE_ENV:', process.env.NODE_ENV);
      
      const result = await sendPasswordSetupEmail(email, 'Test User', testPassword);
      
      console.log('Test result:', result);
      console.log('=====================================\n');
      
      res.json({ 
        success: result.success, 
        mode: result.mode,
        password: testPassword,
        messageId: result.messageId,
        message: result.success 
          ? `✅ Email sent successfully via ${result.mode}!` 
          : `❌ Email failed: ${result.error?.message || 'Unknown error'}`,
        error: result.error ? {
          message: result.error.message,
          code: result.error.code,
          command: result.error.command
        } : null,
        config: {
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          user: process.env.EMAIL_USER,
          hasPassword: !!process.env.EMAIL_PASSWORD,
          passwordLength: process.env.EMAIL_PASSWORD?.length || 0
        }
      });
    } catch (error: any) {
      console.error('Test email error:', error);
      res.status(500).json({ 
        success: false,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

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

  app.post('/api/tickets', async (req, res) => {
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
          await fetch(`${req.protocol}://${req.get('host')}/api/send-ticket-status-update`, {
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
  app.post('/api/send-ticket-notification', async (req, res) => {
    try {
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
https://ksykmaps.vercel.app/admin-ksyk-management-portal

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
  app.post('/api/send-ticket-confirmation', async (req, res) => {
    try {
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
https://ksykmaps.vercel.app
      `.trim();
      
      await sendTicketEmail(email, `Ticket Received: ${ticketId}`, emailBody);
      
      res.json({ success: true, message: 'Confirmation email sent' });
    } catch (error) {
      console.error("Error sending confirmation:", error);
      res.status(500).json({ message: "Failed to send confirmation" });
    }
  });

  // Send ticket response email
  app.post('/api/send-ticket-response', async (req, res) => {
    try {
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
https://ksykmaps.vercel.app
      `.trim();
      
      await sendTicketEmail(email, `Ticket Update: ${ticketId}`, emailBody);
      
      res.json({ success: true, message: 'Response email sent' });
    } catch (error) {
      console.error("Error sending response:", error);
      res.status(500).json({ message: "Failed to send response" });
    }
  });

  // Send ticket status update email
  app.post('/api/send-ticket-status-update', async (req, res) => {
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
https://ksykmaps.vercel.app
      `.trim();
      
      await sendTicketEmail(email, `Ticket ${status.toUpperCase().replace('_', ' ')}: ${ticketId}`, emailBody);
      
      res.json({ success: true, message: 'Status update email sent' });
    } catch (error) {
      console.error("Error sending status update:", error);
      res.status(500).json({ message: "Failed to send status update" });
    }
  });

  // Test email endpoint
  app.post('/api/test-email', async (req, res) => {
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
https://ksykmaps.vercel.app
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

  // Map defaults — admin-set map center/zoom/rotation saved to DB so all users see the same home view
  app.get('/api/map-defaults', async (req, res) => {
    try {
      const doc = await db.collection('mapDefaults').doc('default').get();
      if (!doc.exists) {
        return res.json(null);
      }
      res.json(doc.data());
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
        'osmMaxBoundsEast', 'osmMaxBoundsSouth', 'osmMaxBoundsWest'
      ];
      const data: Record<string, any> = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }
      data.updatedAt = new Date();
      await db.collection('mapDefaults').doc('default').set(data, { merge: true });
      res.json({ ...data, success: true });
    } catch (error) {
      console.error("Error saving map defaults:", error);
      res.status(500).json({ message: "Failed to save map defaults" });
    }
  });

  // ── Security & access control ──────────────────────────────────────────
  // All settings are stored in a single Firestore doc, ready for the future
  // Supabase migration (one JSON column on a `app_settings` table).
  app.get('/api/security-settings', async (req, res) => {
    try {
      const doc = await db.collection('securitySettings').doc('default').get();
      if (!doc.exists) return res.json(null);
      res.json(doc.data());
    } catch (error) {
      console.error("Error fetching security settings:", error);
      res.status(500).json({ message: "Failed to fetch security settings" });
    }
  });

  app.put('/api/security-settings', isAuthenticated, async (req: any, res) => {
    try {
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
      await db.collection('securitySettings').doc('default').set(payload, { merge: false });
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

  // Guest access request — written to securitySettings.accessRequests
  app.post('/api/security-settings/request-access', async (req, res) => {
    try {
      const { email, reason } = req.body || {};
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email is required" });
      }
      const ref = db.collection('securitySettings').doc('default');
      const snap = await ref.get();
      const current = (snap.data() as any) || {};
      const requests = Array.isArray(current.accessRequests) ? current.accessRequests : [];
      const request = {
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        email: email.toLowerCase().trim(),
        reason: (reason || '').toString().slice(0, 500),
        createdAt: new Date().toISOString(),
        status: 'pending' as const,
      };
      await ref.set({ ...current, accessRequests: [request, ...requests].slice(0, 200) }, { merge: true });
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
      // Dev fallback — render a tiny form so testing the flow doesn't require Azure.
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
    // Real flow would exchange `code` for tokens here. For dev / when AZURE_CLIENT_ID
    // is not set, accept ?email= and create a session directly so the rest of the
    // access pipeline can be tested.
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

  // POST /api/analytics/feature — named-counter sink. Client helper
  // trackFeature() hits this on every feature use (settings opened, floor
  // change, 3D toggle, etc). We keep it in a dedicated collection so the
  // Overview panel can top-N without scanning the raw events blob.
  app.post('/api/analytics/feature', async (req, res) => {
    try {
      const { name, meta, sessionId, userId } = req.body || {};
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: 'name is required' });
      }
      await db.collection('analytics_features').add({
        name: name.slice(0, 80),
        meta: meta && typeof meta === 'object' ? meta : null,
        sessionId: (sessionId || '').toString().slice(0, 60),
        userId: (userId || '').toString().slice(0, 60),
        createdAt: new Date(),
      });
      res.json({ success: true });
    } catch (error) {
      console.error('feature POST error:', error);
      res.json({ success: false });
    }
  });

  // GET /api/analytics/overview — small aggregation for the admin Overview
  // panel. Returns today's counters + top-N slices in one roundtrip.
  app.get('/api/analytics/overview', async (req, res) => {
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const [pvSnap, featSnap, searchSnap, eggSnap] = await Promise.all([
        db.collection('analytics_pageviews').where('createdAt', '>=', startOfToday).limit(2000).get()
          .catch(() => ({ docs: [] as any[] })),
        db.collection('analytics_features').where('createdAt', '>=', startOfToday).limit(2000).get()
          .catch(() => ({ docs: [] as any[] })),
        db.collection('searchAnalytics').where('createdAt', '>=', startOfToday).limit(2000).get()
          .catch(() => ({ docs: [] as any[] })),
        db.collection('easterEggs').doc('counters').get()
          .catch(() => ({ exists: false, data: () => ({}) } as any)),
      ]);
      const featureCounts: Record<string, number> = {};
      featSnap.docs.forEach((d: any) => {
        const n = (d.data() as any)?.name || 'unknown';
        featureCounts[n] = (featureCounts[n] || 0) + 1;
      });
      const topFeatures = Object.entries(featureCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 5);
      const searchCounts: Record<string, number> = {};
      searchSnap.docs.forEach((d: any) => {
        const q = ((d.data() as any)?.query || '').toString().trim().toLowerCase();
        if (!q) return;
        searchCounts[q] = (searchCounts[q] || 0) + 1;
      });
      const topSearches = Object.entries(searchCounts)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count).slice(0, 10);
      const eggData = (eggSnap.exists ? eggSnap.data() : {}) as any;
      const eggCounts = {
        secretEasterEgg: eggData.secretEasterEgg || 0,
        konamiCode: eggData.konamiCode || 0,
        devMode: eggData.devMode || 0,
        ksykTyped: eggData.ksykTyped || 0,
        logoClicks: eggData.logoClicks || 0,
        debugCombo: eggData.debugCombo || 0,
      };
      const totalEggs = Object.values(eggCounts).reduce((s: number, n: number) => s + n, 0);
      res.json({
        today: {
          pageviews: pvSnap.docs.length,
          featureUses: featSnap.docs.length,
          searches: searchSnap.docs.length,
        },
        topFeatures,
        topSearches,
        easterEggs: { ...eggCounts, total: totalEggs },
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
  app.get('/api/easter-eggs/recent', async (req, res) => {
    try {
      const doc = await db.collection('easterEggs').doc('recent').get();
      const entries = (doc.exists ? (doc.data() as any)?.entries : []) || [];
      res.json(entries.slice(-50).reverse());
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

      // Fire-and-forget dual-write: legacy storage.createPageView (used by
      // AppLogsManager's rich charts) + analytics_pageviews (used by the
      // Overview counter). Each is wrapped so one failure doesn't kill the
      // other.
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
      }).catch(() => { /* legacy sink may be off in some envs — ignore */ });

      try {
        await db.collection('analytics_pageviews').add({
          page: path.slice(0, 200),
          sessionId: (sessionId || '').toString().slice(0, 60),
          userId: (userId || '').toString().slice(0, 60),
          referrer: (referrer || '').toString().slice(0, 200),
          userAgent: (userAgent || req.get('user-agent') || '').toString().slice(0, 300),
          createdAt: new Date(),
        });
      } catch { /* firestore transient — client will retry on next nav */ }

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
          await storage.deleteStaff(staffMember.id);
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
  // WILMA SUPPORT TICKETS API
  // ============================================
  
  // Create support ticket
  app.post('/api/wilma/tickets', async (req, res) => {
    try {
      const { title, description, category, priority, userId, userRole } = req.body;
      
      if (!title || !description || !category || !priority || !userId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const ticketId = `ticket_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const ticket = {
        id: ticketId,
        title,
        description,
        category,
        priority,
        userId,
        userRole: userRole || 'student',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        responses: []
      };
      
      // Store in Firestore
      await db.collection('wilma_support_tickets').doc(ticketId).set(ticket);
      
      console.log('✅ Support ticket created:', ticketId);
      res.status(201).json(ticket);
    } catch (error) {
      await logError(error, 'POST /api/wilma/tickets', { body: req.body });
      res.status(500).json({ message: 'Failed to create support ticket' });
    }
  });
  
  // Get support tickets (filtered by user or all for admin)
  app.get('/api/wilma/tickets', async (req, res) => {
    try {
      const { userId, userRole } = req.query;
      
      let query = db.collection('wilma_support_tickets');
      
      // If not admin, filter by userId
      if (userRole !== 'admin' && userRole !== 'teacher' && userId) {
        query = query.where('userId', '==', userId);
      }
      
      const snapshot = await query.orderBy('createdAt', 'desc').get();
      const tickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      res.json(tickets);
    } catch (error) {
      await logError(error, 'GET /api/wilma/tickets', { query: req.query });
      res.status(500).json({ message: 'Failed to fetch support tickets' });
    }
  });
  
  // Update support ticket (status, add response, etc.)
  app.put('/api/wilma/tickets/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const ticketRef = db.collection('wilma_support_tickets').doc(id);
      const ticketDoc = await ticketRef.get();
      
      if (!ticketDoc.exists) {
        return res.status(404).json({ message: 'Ticket not found' });
      }
      
      const updatedData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await ticketRef.update(updatedData);
      
      const updatedTicket = await ticketRef.get();
      res.json({ id: updatedTicket.id, ...updatedTicket.data() });
    } catch (error) {
      await logError(error, 'PUT /api/wilma/tickets/:id', { ticketId: req.params.id });
      res.status(500).json({ message: 'Failed to update support ticket' });
    }
  });
  
  // Delete support ticket (admin only)
  app.delete('/api/wilma/tickets/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      await db.collection('wilma_support_tickets').doc(id).delete();
      
      res.status(204).send();
    } catch (error) {
      await logError(error, 'DELETE /api/wilma/tickets/:id', { ticketId: req.params.id });
      res.status(500).json({ message: 'Failed to delete support ticket' });
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
  // Track page view (simple, no auth required for tracking)
  app.post('/api/analytics/pageview', async (req, res) => {
    try {
      const { page, timestamp } = req.body;
      
      await db.collection('analytics_pageviews').add({
        page: page || '/',
        timestamp: timestamp || new Date().toISOString(),
        userAgent: req.get('user-agent') || 'unknown',
        ip: req.ip || 'unknown',
        createdAt: new Date().toISOString()
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Analytics pageview error:', error);
      res.status(500).json({ message: "Failed to track page view" });
    }
  });

  // Track event (simple, no auth required for tracking)
  app.post('/api/analytics/event', async (req, res) => {
    try {
      const { event, data, timestamp } = req.body;
      
      await db.collection('analytics_events').add({
        event: event || 'unknown',
        data: data || {},
        timestamp: timestamp || new Date().toISOString(),
        userAgent: req.get('user-agent') || 'unknown',
        ip: req.ip || 'unknown',
        createdAt: new Date().toISOString()
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Analytics event error:', error);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  // Get analytics summary (admin only, uses existing isAuthenticated)
  app.get('/api/analytics/summary', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'owner' && user?.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      
      const timeRange = req.query.range || 'month';
      const now = new Date();
      let startDate = new Date();
      
      if (timeRange === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (timeRange === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      }
      
      const pageviewsSnapshot = await db.collection('analytics_pageviews')
        .where('timestamp', '>=', startDate.toISOString())
        .get();
      
      const eventsSnapshot = await db.collection('analytics_events')
        .where('timestamp', '>=', startDate.toISOString())
        .get();
      
      const pageviews = pageviewsSnapshot.docs.map(doc => doc.data());
      const events = eventsSnapshot.docs.map(doc => doc.data());
      
      res.json({
        totalPageviews: pageviews.length,
        totalEvents: events.length,
        pageviews,
        events
      });
    } catch (error) {
      console.error('Analytics summary error:', error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ============================================
  // WILMA SETTINGS ENDPOINTS
  // ============================================
  
  // Get settings
  app.get('/api/wilma/settings', async (req, res) => {
    try {
      const settingsRef = db.collection('wilma_settings').doc('app_settings');
      const doc = await settingsRef.get();
      
      if (!doc.exists) {
        return res.json({});
      }
      
      res.json(doc.data());
    } catch (error) {
      await logError(error, 'GET /api/wilma/settings');
      res.status(500).json({ message: "Asetusten lataus epäonnistui" });
    }
  });

  // Save settings
  app.post('/api/wilma/settings', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "Vain ylläpitäjät voivat muokata asetuksia" });
      }

      const settingsRef = db.collection('wilma_settings').doc('app_settings');
      await settingsRef.set(req.body, { merge: true });
      
      console.log('✅ Settings saved to Firestore');
      
      res.json({ success: true, message: "Asetukset tallennettu" });
    } catch (error) {
      await logError(error, 'POST /api/wilma/settings');
      res.status(500).json({ message: "Asetusten tallennus epäonnistui" });
    }
  });

  // ============================================
  // CODING PLATFORM ROUTES
  // ============================================
  console.log('🎓 Registering Coding Platform Routes...');
  
  // Get all courses
  app.get('/api/coding/courses', async (req, res) => {
    try {
      const courses = await storage.getCodingCourses();
      res.json(courses);
    } catch (error) {
      await logError(error, 'GET /api/coding/courses');
      res.status(500).json({ message: 'Failed to fetch courses' });
    }
  });
  
  // Get single course
  app.get('/api/coding/courses/:id', async (req, res) => {
    try {
      const course = await storage.getCodingCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ message: 'Course not found' });
      }
      res.json(course);
    } catch (error) {
      await logError(error, 'GET /api/coding/courses/:id', { courseId: req.params.id });
      res.status(500).json({ message: 'Failed to fetch course' });
    }
  });
  
  // Get modules for a course
  app.get('/api/coding/courses/:courseId/modules', async (req, res) => {
    try {
      const modules = await storage.getCodingModules(req.params.courseId);
      res.json(modules);
    } catch (error) {
      await logError(error, 'GET /api/coding/courses/:courseId/modules', { courseId: req.params.courseId });
      res.status(500).json({ message: 'Failed to fetch modules' });
    }
  });
  
  // Get lessons for a module
  app.get('/api/coding/modules/:moduleId/lessons', async (req, res) => {
    try {
      const lessons = await storage.getCodingLessons(req.params.moduleId);
      res.json(lessons);
    } catch (error) {
      await logError(error, 'GET /api/coding/modules/:moduleId/lessons', { moduleId: req.params.moduleId });
      res.status(500).json({ message: 'Failed to fetch lessons' });
    }
  });
  
  // Get exercises for a lesson
  app.get('/api/coding/lessons/:lessonId/exercises', async (req, res) => {
    try {
      const exercises = await storage.getCodingExercises(req.params.lessonId);
      res.json(exercises);
    } catch (error) {
      await logError(error, 'GET /api/coding/lessons/:lessonId/exercises', { lessonId: req.params.lessonId });
      res.status(500).json({ message: 'Failed to fetch exercises' });
    }
  });
  
  // Get user progress
  app.get('/api/coding/progress/:userId', async (req, res) => {
    try {
      const courseId = req.query.courseId as string | undefined;
      const progress = await storage.getCodingUserProgress(req.params.userId, courseId);
      res.json(progress);
    } catch (error) {
      await logError(error, 'GET /api/coding/progress/:userId', { userId: req.params.userId });
      res.status(500).json({ message: 'Failed to fetch progress' });
    }
  });
  
  // Update user progress
  app.post('/api/coding/progress', async (req, res) => {
    try {
      const { userId, courseId, ...progressData } = req.body;
      
      // Check if progress exists
      const existing = await storage.getCodingUserProgressByCourse(userId, courseId);
      
      let result;
      if (existing) {
        result = await storage.updateCodingUserProgress(existing.id, progressData);
      } else {
        result = await storage.createCodingUserProgress({ userId, courseId, ...progressData });
      }
      
      res.json(result);
    } catch (error) {
      await logError(error, 'POST /api/coding/progress', { body: req.body });
      res.status(500).json({ message: 'Failed to update progress' });
    }
  });
  
  // Submit code exercise
  app.post('/api/coding/submit', async (req, res) => {
    try {
      const { userId, exerciseId, code, language, passed, testResults, executionTime, xpEarned } = req.body;
      
      const submission = await storage.createCodingSubmission({
        userId,
        exerciseId,
        code,
        language,
        passed,
        testResults,
        executionTime,
        xpEarned
      });
      
      // Update user stats if passed
      if (passed && xpEarned) {
        const stats = await storage.getCodingUserStats(userId);
        if (stats) {
          await storage.updateCodingUserStats(userId, {
            totalXp: (stats.totalXp || 0) + xpEarned,
            exercisesCompleted: (stats.exercisesCompleted || 0) + 1,
            level: Math.floor(((stats.totalXp || 0) + xpEarned) / 500) + 1
          });
        } else {
          await storage.createCodingUserStats({
            userId,
            totalXp: xpEarned,
            exercisesCompleted: 1,
            level: 1,
            streak: 0
          });
        }
      }
      
      res.json(submission);
    } catch (error) {
      await logError(error, 'POST /api/coding/submit', { body: req.body });
      res.status(500).json({ message: 'Failed to submit code' });
    }
  });
  
  // Get user submissions
  app.get('/api/coding/submissions/:userId', async (req, res) => {
    try {
      const exerciseId = req.query.exerciseId as string | undefined;
      const submissions = await storage.getCodingSubmissions(req.params.userId, exerciseId);
      res.json(submissions);
    } catch (error) {
      await logError(error, 'GET /api/coding/submissions/:userId', { userId: req.params.userId });
      res.status(500).json({ message: 'Failed to fetch submissions' });
    }
  });
  
  // Create classroom
  app.post('/api/coding/classroom/create', async (req, res) => {
    try {
      const { name, description, teacherId, teacherName } = req.body;
      
      // Generate unique 6-character join code
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const classroom = await storage.createCodingClassroom({
        name,
        description,
        teacherId,
        teacherName,
        joinCode,
        students: [],
        assignedCourses: [],
        isActive: true
      });
      
      res.json(classroom);
    } catch (error) {
      await logError(error, 'POST /api/coding/classroom/create', { body: req.body });
      res.status(500).json({ message: 'Failed to create classroom' });
    }
  });
  
  // Join classroom
  app.post('/api/coding/classroom/join', async (req, res) => {
    try {
      const { joinCode, studentId } = req.body;
      
      const classroom = await storage.getCodingClassroomByJoinCode(joinCode);
      if (!classroom) {
        return res.status(404).json({ message: 'Classroom not found' });
      }
      
      await storage.joinCodingClassroom(classroom.id, studentId);
      
      res.json({ success: true, classroom });
    } catch (error) {
      await logError(error, 'POST /api/coding/classroom/join', { body: req.body });
      res.status(500).json({ message: 'Failed to join classroom' });
    }
  });
  
  // Get classrooms (for teacher or student)
  app.get('/api/coding/classrooms', async (req, res) => {
    try {
      const teacherId = req.query.teacherId as string | undefined;
      const classrooms = await storage.getCodingClassrooms(teacherId);
      res.json(classrooms);
    } catch (error) {
      await logError(error, 'GET /api/coding/classrooms');
      res.status(500).json({ message: 'Failed to fetch classrooms' });
    }
  });
  
  // Get classroom assignments
  app.get('/api/coding/classroom/:classroomId/assignments', async (req, res) => {
    try {
      const assignments = await storage.getCodingClassroomAssignments(req.params.classroomId);
      res.json(assignments);
    } catch (error) {
      await logError(error, 'GET /api/coding/classroom/:classroomId/assignments', { classroomId: req.params.classroomId });
      res.status(500).json({ message: 'Failed to fetch assignments' });
    }
  });
  
  // Get leaderboard
  app.get('/api/coding/leaderboard', async (req, res) => {
    try {
      const type = (req.query.type as string) || 'alltime';
      const period = req.query.period as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      const leaderboard = await storage.getCodingLeaderboard(type, period, limit);
      res.json(leaderboard);
    } catch (error) {
      await logError(error, 'GET /api/coding/leaderboard');
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });
  
  // Get user stats
  app.get('/api/coding/stats/:userId', async (req, res) => {
    try {
      let stats = await storage.getCodingUserStats(req.params.userId);
      
      // Create default stats if none exist
      if (!stats) {
        stats = await storage.createCodingUserStats({
          userId: req.params.userId,
          totalXp: 0,
          level: 1,
          streak: 0,
          coursesCompleted: 0,
          lessonsCompleted: 0,
          exercisesCompleted: 0,
          badges: [],
          rank: null
        });
      }
      
      res.json(stats);
    } catch (error) {
      await logError(error, 'GET /api/coding/stats/:userId', { userId: req.params.userId });
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });
  
  // AI Coding Help endpoint
  app.post('/api/ai/coding-help', async (req, res) => {
    try {
      const { question, code, language, context } = req.body;
      
      // Import Gemini AI
      const { generateAIResponse } = await import('./lib/geminiAI.js');
      
      // Build prompt for coding help
      let prompt = `You are a helpful coding tutor. Answer this question clearly and concisely:\n\n${question}`;
      
      if (code) {
        prompt += `\n\nHere's the code:\n\`\`\`${language || 'python'}\n${code}\n\`\`\``;
      }
      
      if (context) {
        prompt += `\n\nContext: ${context}`;
      }
      
      prompt += '\n\nProvide a clear, beginner-friendly explanation. If suggesting code, use proper formatting.';
      
      const answer = await generateAIResponse(prompt);
      
      res.json({
        success: true,
        answer,
        suggestions: [] // Can be enhanced later
      });
    } catch (error) {
      await logError(error, 'POST /api/ai/coding-help', { body: req.body });
      res.status(500).json({ 
        success: false,
        error: 'Failed to get AI response. Please try again later.' 
      });
    }
  });

  // ============================================
  // WILMA INTEGRATION CONFIG (owner-only, credentials never leave server)
  // ============================================
  app.get('/api/admin/wilma-config', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'owner') {
        return res.status(403).json({ message: 'Owner access required' });
      }
      const doc = await db.collection('wilma_integration').doc('config').get();
      if (!doc.exists) {
        return res.json({ configured: false, serverUrl: '', lastSync: null, connectionStatus: 'not_configured' });
      }
      const data = doc.data() as any;
      // NEVER return credentials — only metadata
      res.json({
        configured: !!(data.serverUrl && data.username),
        serverUrl: data.serverUrl || '',
        lastSync: data.lastSync || null,
        connectionStatus: data.connectionStatus || 'unknown',
        lastTestAt: data.lastTestAt || null,
      });
    } catch (error) {
      await logError(error, 'GET /api/admin/wilma-config');
      res.status(500).json({ message: 'Failed to fetch Wilma config' });
    }
  });

  app.post('/api/admin/wilma-config', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'owner') {
        return res.status(403).json({ message: 'Owner access required' });
      }
      const { serverUrl, username, password } = req.body;
      if (!serverUrl || !username) {
        return res.status(400).json({ message: 'serverUrl and username are required' });
      }
      const configRef = db.collection('wilma_integration').doc('config');
      const update: any = {
        serverUrl: serverUrl.trim(),
        username: username.trim(),
        updatedAt: new Date().toISOString(),
        connectionStatus: 'unchecked',
      };
      // Only overwrite password if a new one is provided
      if (password && password.trim()) {
        update.password = password.trim();
      }
      await configRef.set(update, { merge: true });
      res.json({ success: true, message: 'Wilma configuration saved' });
    } catch (error) {
      await logError(error, 'POST /api/admin/wilma-config');
      res.status(500).json({ message: 'Failed to save Wilma config' });
    }
  });

  app.post('/api/admin/wilma-config/test', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'owner') {
        return res.status(403).json({ message: 'Owner access required' });
      }
      const doc = await db.collection('wilma_integration').doc('config').get();
      if (!doc.exists) {
        return res.status(400).json({ success: false, message: 'Wilma not configured yet' });
      }
      const data = doc.data() as any;
      if (!data.serverUrl || !data.username || !data.password) {
        return res.status(400).json({ success: false, message: 'Incomplete configuration — serverUrl, username, and password are required' });
      }
      // Validate URL format
      try { new URL(data.serverUrl); } catch {
        return res.status(400).json({ success: false, message: 'Invalid server URL format' });
      }
      // Attempt a real connection to the Wilma server
      let connectionStatus = 'error';
      let statusMessage = '';
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const testUrl = data.serverUrl.replace(/\/$/, '') + '/';
        const testRes = await fetch(testUrl, { signal: controller.signal, redirect: 'manual' });
        clearTimeout(timeout);
        connectionStatus = (testRes.status >= 200 && testRes.status < 500) ? 'reachable' : 'error';
        statusMessage = `HTTP ${testRes.status}`;
      } catch (err: any) {
        connectionStatus = 'unreachable';
        statusMessage = err.name === 'AbortError' ? 'Connection timed out' : String(err.message || err);
      }
      await db.collection('wilma_integration').doc('config').update({
        connectionStatus,
        lastTestAt: new Date().toISOString(),
      });
      res.json({ success: connectionStatus === 'reachable', status: connectionStatus, message: statusMessage });
    } catch (error) {
      await logError(error, 'POST /api/admin/wilma-config/test');
      res.status(500).json({ success: false, message: 'Test failed due to server error' });
    }
  });

  // ============================================
  // REGISTER WILMA EXTENDED ROUTES
  // ============================================
  console.log('🔵 Registering Wilma Extended Routes...');
  registerWilmaExtendedRoutes(app);

  // ============================================
  // REGISTER AALTO SPACE ROUTES
  // ============================================
  console.log('🏫 Registering KSYK Maps campus routes...');
  registerCampusRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
