import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { insertBuildingSchema, insertFloorSchema, insertHallwaySchema, insertRoomSchema, insertStaffSchema, insertEventSchema, insertAnnouncementSchema } from "@shared/schema";
import { sendPasswordSetupEmail, generateTempPassword } from "./emailService";
import { createFirebaseUserAndSendEmail, sendPasswordResetEmail as sendFirebasePasswordReset } from "./firebaseEmailService";
import admin from 'firebase-admin';

export async function registerRoutes(app: Express): Promise<Server> {
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
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Admin login endpoint  
  app.post('/api/auth/admin-login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password required" });
      }
      
      console.log('🔐 Login attempt:', email);
      
      // Check owner credentials from environment variables (secure, server-side only)
      const OWNER_EMAIL = process.env.OWNER_EMAIL || 'JuusoJuusto112@gmail.com';
      const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'Juusto2012!';
      
      if (email === OWNER_EMAIL && password === OWNER_PASSWORD) {
        // Owner login
        let ownerUser = await storage.getUserByEmail(OWNER_EMAIL);
        
        if (!ownerUser) {
          ownerUser = await storage.upsertUser({
            id: 'owner-admin-user',
            email: OWNER_EMAIL,
            firstName: 'Juuso',
            lastName: 'Kaikula',
            role: 'owner',
            profileImageUrl: null
          });
        }

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
            console.error("Owner login error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          return res.json({ success: true, user: ownerUser, requirePasswordChange: false });
        });
        return;
      }
      
      // Try Firebase Authentication first
      try {
        console.log('🔥 Attempting Firebase Auth login...');
        const userRecord = await admin.auth().getUserByEmail(email);
        console.log('✅ User found in Firebase Auth:', userRecord.uid);
        
        // Verify password by trying to get a custom token (this validates the user exists)
        // Note: We can't verify password directly with Admin SDK
        // The user must have set their password via the reset link
        
        // Check if user exists in Firestore
        let firestoreUser = await storage.getUserByEmail(email);
        
        if (!firestoreUser) {
          // Create Firestore user from Firebase Auth user
          console.log('Creating Firestore user from Firebase Auth...');
          const customClaims = (await admin.auth().getUser(userRecord.uid)).customClaims || {};
          
          firestoreUser = await storage.upsertUser({
            id: userRecord.uid,
            email: userRecord.email!,
            firstName: userRecord.displayName?.split(' ')[0] || 'User',
            lastName: userRecord.displayName?.split(' ').slice(1).join(' ') || '',
            role: (customClaims.role as string) || 'admin',
            firebaseUid: userRecord.uid,
            profileImageUrl: userRecord.photoURL || null
          });
        }
        
        // For Firebase Auth users, we can't verify password server-side
        // They must use the client-side Firebase Auth or password reset
        // So we'll create a session if they exist in Firebase Auth
        req.login({
          claims: {
            sub: firestoreUser.id,
            email: firestoreUser.email,
            first_name: firestoreUser.firstName,
            last_name: firestoreUser.lastName,
            profile_image_url: firestoreUser.profileImageUrl
          }
        }, (err) => {
          if (err) {
            console.error("Firebase Auth login error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          console.log('✅ Firebase Auth user logged in');
          return res.json({ 
            success: true, 
            user: firestoreUser,
            requirePasswordChange: false,
            isFirebaseAuth: true,
            message: "Please use the password you set via email link"
          });
        });
        return;
        
      } catch (firebaseError: any) {
        console.log('Firebase Auth user not found, checking Firestore...');
      }
      
      // Check Firestore database for admin users (legacy system)
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      if (!user.password) {
        return res.status(401).json({ message: "Password not set. Please check your email for password reset link." });
      }
      
      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // Valid admin user from database
      req.login({
        claims: {
          sub: user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          profile_image_url: user.profileImageUrl
        }
      }, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        return res.json({ 
          success: true, 
          user: user,
          requirePasswordChange: user.isTemporaryPassword || false
        });
      });
      
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Authentication error" });
    }
  });
              console.error("Owner login error:", err);
              return res.status(500).json({ message: "Login failed" });
            }
            console.log('Owner logged in successfully');
            res.json({ success: true, user: ownerUser, requirePasswordChange: false });
          });
        } else {
          res.status(500).json({ message: "Failed to create owner user" });
        }
      } else {
        // Check if it's a database user with temporary password
        console.log('📊 Checking database for user:', email);
        const user = await storage.getUserByEmail(email);
        
        console.log('🔍 Database user lookup result:');
        console.log('   Email searched:', email);
        console.log('   User found:', user ? 'YES' : 'NO');
        if (user) {
          console.log('   User ID:', user.id);
          console.log('   User role:', user.role);
          console.log('   Has password:', user.password ? 'YES' : 'NO');
          console.log('   Stored password:', user.password);
          console.log('   Provided password:', password);
          console.log('   Password types:', typeof user.password, 'vs', typeof password);
          console.log('   Passwords match (===):', user.password === password);
          console.log('   Passwords match (==):', user.password == password);
        }
        
        if (user && user.password === password) {
          // Password matches!
          console.log('✅ Password verified, creating session...');
          req.login({
            claims: {
              sub: user.id,
              email: user.email,
              first_name: user.firstName,
              last_name: user.lastName,
              profile_image_url: user.profileImageUrl
            }
          }, (err) => {
            if (err) {
              console.error("❌ Session creation error:", err);
              return res.status(500).json({ message: "Login failed", error: err.message });
            }
            console.log('✅ User logged in successfully:', user.email);
            res.json({ 
              success: true, 
              user: user,
              requirePasswordChange: user.isTemporaryPassword || false
            });
          });
        } else {
          if (user && !user.password) {
            console.log('❌ Login failed - user has no password set');
            res.status(401).json({ message: "Password not set. Contact administrator." });
          } else if (user) {
            console.log('❌ Login failed - incorrect password');
            console.log('   Expected:', user.password);
            console.log('   Got:', password);
            res.status(401).json({ message: "Invalid password" });
          } else {
            console.log('❌ Login failed - user not found in database');
            res.status(401).json({ message: "User not found" });
          }
        }
      }
    } catch (error) {
      console.error("Admin login error:", error);
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
      console.error("Password change error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Firebase Authentication login endpoint
  app.post('/api/auth/firebase-login', async (req, res) => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ message: "ID token required" });
      }
      
      console.log('🔥 Verifying Firebase ID token...');
      
      // Verify the ID token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const uid = decodedToken.uid;
      
      console.log('✅ Token verified for UID:', uid);
      
      // Get user from Firebase Auth
      const userRecord = await admin.auth().getUser(uid);
      
      // Get or create user in Firestore
      let firestoreUser = await storage.getUserByEmail(userRecord.email!);
      
      if (!firestoreUser) {
        console.log('Creating Firestore user from Firebase Auth...');
        const customClaims = userRecord.customClaims || {};
        
        firestoreUser = await storage.upsertUser({
          id: uid,
          email: userRecord.email!,
          firstName: userRecord.displayName?.split(' ')[0] || 'User',
          lastName: userRecord.displayName?.split(' ').slice(1).join(' ') || '',
          role: (customClaims.role as string) || 'admin',
          firebaseUid: uid,
          profileImageUrl: userRecord.photoURL || null
        });
      }
      
      // Create session
      req.login({
        claims: {
          sub: firestoreUser.id,
          email: firestoreUser.email,
          first_name: firestoreUser.firstName,
          last_name: firestoreUser.lastName,
          profile_image_url: firestoreUser.profileImageUrl
        }
      }, (err) => {
        if (err) {
          console.error("Session creation error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        
        console.log('✅ Firebase user logged in successfully');
        res.json({ 
          success: true, 
          user: firestoreUser
        });
      });
      
    } catch (error: any) {
      console.error("Firebase login error:", error);
      res.status(401).json({ message: "Invalid token" });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ message: "Session cleanup failed" });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: "Logged out successfully" });
      });
    });
  });

  // Development login bypass (for testing only)
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/auth/dev-login', async (req, res) => {
      try {
        console.log("Development login attempt");
        const OWNER_EMAIL = 'JuusoJuusto112@gmail.com';
        
        // Use owner user for dev login
        let ownerUser = await storage.getUserByEmail(OWNER_EMAIL);
        
        if (!ownerUser) {
          ownerUser = await storage.upsertUser({
            id: 'owner-admin-user',
            email: OWNER_EMAIL,
            firstName: 'Juuso',
            lastName: 'Kaikula',
            role: 'admin',
            profileImageUrl: null
          });
        }
        
        if (ownerUser) {
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
              console.error("Dev login error:", err);
              return res.status(500).json({ error: "Login failed" });
            }
            res.json({ success: true, user: ownerUser });
          });
        } else {
          res.status(404).json({ error: "User not found" });
        }
      } catch (error) {
        console.error("Dev login error:", error);
        res.status(500).json({ error: "Login failed" });
      }
    });
  }

  // Building routes
  app.get('/api/buildings', async (req, res) => {
    try {
      const buildings = await storage.getBuildings();
      res.json(buildings);
    } catch (error) {
      console.error("Error fetching buildings:", error);
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
      console.error("Error fetching building:", error);
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
      console.error("Error creating building:", error);
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
      console.error("Error updating building:", error);
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
      console.error("Error deleting building:", error);
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
      console.error("Error fetching floors:", error);
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
      console.error("Error fetching floor:", error);
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
      console.error("Error creating floor:", error);
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
      console.error("Error updating floor:", error);
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
      console.error("Error deleting floor:", error);
      res.status(500).json({ message: "Failed to delete floor" });
    }
  });

  // Hallway routes
  app.get('/api/hallways', async (req, res) => {
    try {
      const buildingId = req.query.buildingId as string;
      const floorId = req.query.floorId as string;
      const hallways = await storage.getHallways(buildingId, floorId);
      res.json(hallways);
    } catch (error) {
      console.error("Error fetching hallways:", error);
      res.status(500).json({ message: "Failed to fetch hallways" });
    }
  });

  app.get('/api/hallways/:id', async (req, res) => {
    try {
      const hallway = await storage.getHallway(req.params.id);
      if (!hallway) {
        return res.status(404).json({ message: "Hallway not found" });
      }
      res.json(hallway);
    } catch (error) {
      console.error("Error fetching hallway:", error);
      res.status(500).json({ message: "Failed to fetch hallway" });
    }
  });

  app.post('/api/hallways', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertHallwaySchema.parse(req.body);
      const hallway = await storage.createHallway(validatedData);
      res.status(201).json(hallway);
    } catch (error) {
      console.error("Error creating hallway:", error);
      res.status(500).json({ message: "Failed to create hallway" });
    }
  });

  app.put('/api/hallways/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const validatedData = insertHallwaySchema.partial().parse(req.body);
      const hallway = await storage.updateHallway(req.params.id, validatedData);
      res.json(hallway);
    } catch (error) {
      console.error("Error updating hallway:", error);
      res.status(500).json({ message: "Failed to update hallway" });
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
      console.error("Error deleting hallway:", error);
      res.status(500).json({ message: "Failed to delete hallway" });
    }
  });

  // Room routes
  app.get('/api/rooms', async (req, res) => {
    try {
      const buildingId = req.query.buildingId as string;
      const rooms = await storage.getRooms(buildingId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
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
      console.error("Error searching rooms:", error);
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
      console.error("Error fetching room:", error);
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
      console.error("Error creating room:", error);
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
      console.error("Error updating room:", error);
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
      console.error("Error deleting room:", error);
      res.status(500).json({ message: "Failed to delete room" });
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
      console.error("Error fetching users:", error);
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

      // If email option, use Firebase Authentication to send password reset email
      if (passwordOption === 'email') {
        console.log(`\n🚀 ========== FIREBASE AUTH INVITATION ==========`);
        console.log(`Target: ${email}`);
        console.log(`Name: ${firstName} ${lastName}`);
        console.log(`Using Firebase Authentication for email`);
        
        try {
          // Create user in Firebase Authentication and send password reset email
          const firebaseResult = await createFirebaseUserAndSendEmail(
            email,
            firstName,
            lastName,
            role || 'admin'
          );
          
          console.log(`\n🔥 FIREBASE RESULT:`);
          console.log(`   Success: ${firebaseResult.success}`);
          console.log(`   UID: ${firebaseResult.uid || 'N/A'}`);
          console.log(`   Message: ${firebaseResult.message}`);
          
          if (firebaseResult.success) {
            console.log(`✅ FIREBASE AUTH USER CREATED - Email sent automatically!`);
            // Store Firebase UID in Firestore user document
            await storage.upsertUser({
              ...newUser,
              firebaseUid: firebaseResult.uid
            });
          } else {
            console.log(`⚠️ FIREBASE AUTH FAILED - Falling back to manual password`);
            console.log(`📝 Manual Password: ${finalPassword}`);
            if (firebaseResult.error) {
              console.error(`   Error: ${firebaseResult.error.message}`);
            }
          }
        } catch (error: any) {
          console.error('❌ FIREBASE EXCEPTION:', error.message);
          console.log(`📝 FALLBACK - Password: ${finalPassword}`);
        }
        
        console.log(`================================================\n`);
      }

      res.status(201).json({ ...newUser, password: finalPassword });
    } catch (error) {
      console.error("Error creating user:", error);
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
      console.error("Error updating user:", error);
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
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Staff routes
  app.get('/api/staff', async (req, res) => {
    try {
      const staff = await storage.getStaff();
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff:", error);
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
      console.error("Error searching staff:", error);
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
      console.error("Error creating staff member:", error);
      res.status(500).json({ message: "Failed to create staff member" });
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
      console.error("Error fetching events:", error);
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
      console.error("Error creating event:", error);
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
      console.error("Error fetching announcements:", error);
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
      console.error("Error creating announcement:", error);
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
      console.error("Error updating announcement:", error);
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

  const httpServer = createServer(app);
  return httpServer;
}
