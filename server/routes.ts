import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { insertBuildingSchema, insertFloorSchema, insertHallwaySchema, insertRoomSchema, insertStaffSchema, insertEventSchema, insertAnnouncementSchema } from "@shared/schema";
import { sendPasswordSetupEmail, generateTempPassword } from "./emailService";

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
  app.post('/api/auth/admin-login', async (req, res) => {
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

  // Change password endpoint
  app.post('/api/auth/change-password', isAuthenticated, async (req: any, res) => {
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
      res.json(announcements);
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
      if (!user || user.role !== 'admin') {
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
      
      console.log('✅ Ticket created in database:', ticket);
      console.log('📋 Ticket ID to return:', ticketId);
      
      // Send email notification to owner
      if (ticketData.email) {
        try {
          const ownerEmail = process.env.OWNER_EMAIL || 'juusojuusto112@gmail.com';
          
          console.log('\n📧 ========== SENDING EMAILS ==========');
          console.log('Owner email:', ownerEmail);
          console.log('User email:', ticketData.email);
          console.log('======================================\n');
          
          // Send notification to owner
          console.log('📤 Sending notification to owner...');
          const ownerResponse = await fetch(`${req.protocol}://${req.get('host')}/api/send-ticket-notification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ownerEmail,
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
              description: ticketData.description,
              email: ticketData.email,
              name: ticketData.name,
              errorReferenceId: ticketData.errorReferenceId,
            }),
          });
          console.log('📧 Owner notification response:', ownerResponse.status, await ownerResponse.text());
          
          // Send auto-reply to user
          console.log('📤 Sending confirmation to user...');
          const userResponse = await fetch(`${req.protocol}://${req.get('host')}/api/send-ticket-confirmation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: ticketData.email,
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
            }),
          });
          console.log('📧 User confirmation response:', userResponse.status, await userResponse.text());
          
          console.log('✅ All emails sent successfully!\n');
        } catch (emailError) {
          console.error('❌ Failed to send ticket emails:', emailError);
          console.error('   Error details:', emailError);
        }
      } else {
        console.log('⚠️ No email provided, skipping email notifications');
      }
      
      console.log('\n✅ ========== TICKET CREATION COMPLETE ==========');
      console.log('Returning response with ticketId:', ticketId);
      console.log('================================================\n');
      
      // IMPORTANT: Ensure ticketId is in the response
      res.status(201).json({ ticketId, ...ticket });
    } catch (error) {
      console.error("\n❌ ========== TICKET CREATION ERROR ==========");
      console.error("Error:", error);
      console.error("==============================================\n");
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
      const ticket = await storage.updateTicket(req.params.id, req.body);
      
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
          console.error('Failed to send ticket status update email:', emailError);
        }
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
      
      const { sendPasswordSetupEmail } = await import('./emailService.js');
      
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
      
      await sendPasswordSetupEmail(ownerEmail, `New Ticket: ${ticketId}`, emailBody);
      
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
      
      const { sendPasswordSetupEmail } = await import('./emailService.js');
      
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
      
      await sendPasswordSetupEmail(email, `Ticket Received: ${ticketId}`, emailBody);
      
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
      
      const { sendPasswordSetupEmail } = await import('./emailService.js');
      
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
      
      await sendPasswordSetupEmail(email, `Ticket Update: ${ticketId}`, emailBody);
      
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
      
      const { sendPasswordSetupEmail } = await import('./emailService.js');
      
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
      
      await sendPasswordSetupEmail(email, `Ticket ${status.toUpperCase().replace('_', ' ')}: ${ticketId}`, emailBody);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
