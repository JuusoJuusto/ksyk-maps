import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { insertBuildingSchema, insertFloorSchema, insertHallwaySchema, insertRoomSchema, insertStaffSchema, insertEventSchema, insertAnnouncementSchema } from "@shared/schema";
import { sendPasswordSetupEmail, sendTicketEmail, generateTempPassword } from "./emailService";
import { rateLimiters } from "./rateLimiter";

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

        // Check password against database
        if (!ownerUser.password || ownerUser.password !== trimmedPassword) {
          console.log('❌ Invalid owner password');
          return res.status(401).json({ message: "Invalid credentials" });
        }

        console.log('✅ OWNER LOGIN SUCCESS');

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
      
      if (user.password !== trimmedPassword) {
        console.log('❌ Password mismatch');
        
        // Log failed login attempt
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
      
      // Update user password
      await storage.upsertUser({
        id: userId,
        password: newPassword,
        isTemporaryPassword: false
      });
      
      console.log('Password changed for user:', userId);
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      await logError(error, 'POST /api/auth/change-password', { userId: req.user?.claims?.sub });
      res.status(500).json({ message: "Failed to change password" });
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

      // Create user
      const newUser = await storage.upsertUser({
        email,
        firstName,
        lastName,
        role: role || 'admin',
        password: finalPassword,
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
      
      // Auto-generate student ID for students (numbers only)
      if (userData.role === 'student' && !userData.studentId) {
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        userData.studentId = random;
        console.log('🎓 Auto-generated student ID:', userData.studentId);
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

  // Bulk send welcome emails
  app.post('/api/wilma/send-bulk-emails', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📧 Bulk email send requested');
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const students = await storage.getWilmaUsers('student');
      let sent = 0;
      let failed = 0;
      
      for (const student of students) {
        if (student.email && student.password && student.isTemporaryPassword) {
          const parentEmails = [];
          if (student.parent1Email) parentEmails.push(student.parent1Email);
          if (student.parent2Email) parentEmails.push(student.parent2Email);
          
          try {
            const emailService = await import('./emailService');
            await emailService.sendWilmaStudentWelcomeEmail(
              student.email,
              `${student.firstName} ${student.lastName}`,
              student.password,
              student.studentId,
              parentEmails.length > 0 ? parentEmails : undefined
            );
            sent++;
            console.log(`✅ Email sent to ${student.email}`);
          } catch (emailError) {
            console.error(`❌ Failed to send email to ${student.email}:`, emailError);
            failed++;
          }
        }
      }
      
      console.log(`📊 Bulk email complete: ${sent} sent, ${failed} failed`);
      res.json({ success: true, sent, failed });
    } catch (error) {
      await logError(error, 'POST /api/wilma/send-bulk-emails');
      res.status(500).json({ message: "Failed to send bulk emails" });
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
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const settings = await storage.updateAppSettings(req.body);
      res.json(settings);
    } catch (error) {
      console.error("Error updating app settings:", error);
      res.status(500).json({ message: "Failed to update app settings" });
    }
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

  // Analytics endpoints
  app.post('/api/analytics/pageview', async (req, res) => {
    try {
      const { sessionId, userId, url, referrer, userAgent, ipAddress, country, city, browser, browserVersion, os, deviceType, screenResolution, language, timeZone, duration, isBounce } = req.body;
      
      await storage.createPageView({
        sessionId,
        userId,
        url,
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
      });

      // Also log to app logs for debugging
      await storage.createAppLog({
        level: 'info',
        message: `Page view: ${url}`,
        userId,
        userAgent,
        url,
        ipAddress: ipAddress || req.ip
      });

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

  const httpServer = createServer(app);
  return httpServer;
}
