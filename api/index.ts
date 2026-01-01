import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Simple router based on URL path
    const path = req.url || '/';
    
    // Remove /api prefix if present
    const apiPath = path.replace(/^\/api/, '');
    
    console.log(`Handling request: ${req.method} ${apiPath}`);
    
    // Health check
    if (apiPath === '/' || apiPath === '') {
      return res.status(200).json({
        message: "KSYK Maps API is running",
        version: "1.0.0",
        timestamp: new Date().toISOString()
      });
    }
    
    // Import and use storage
    const { storage } = await import('../server/storage.js');
    
    // Buildings endpoints
    if (apiPath.startsWith('/buildings')) {
      if (req.method === 'GET' && apiPath === '/buildings') {
        const buildings = await storage.getBuildings();
        return res.status(200).json(buildings);
      }
      
      if (req.method === 'POST' && apiPath === '/buildings') {
        const building = await storage.createBuilding(req.body);
        return res.status(201).json(building);
      }
      
      // Handle /buildings/:id routes
      const idMatch = apiPath.match(/^\/buildings\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        
        if (req.method === 'GET') {
          const building = await storage.getBuilding(id);
          if (!building) {
            return res.status(404).json({ message: 'Building not found' });
          }
          return res.status(200).json(building);
        }
        
        if (req.method === 'PUT' || req.method === 'PATCH') {
          const building = await storage.updateBuilding(id, req.body);
          return res.status(200).json(building);
        }
        
        if (req.method === 'DELETE') {
          await storage.deleteBuilding(id);
          return res.status(204).send('');
        }
      }
    }
    
    // Rooms endpoints
    if (apiPath.startsWith('/rooms')) {
      if (req.method === 'GET' && apiPath === '/rooms') {
        const buildingId = req.query.buildingId as string | undefined;
        const rooms = await storage.getRooms(buildingId);
        return res.status(200).json(rooms);
      }
      
      if (req.method === 'POST' && apiPath === '/rooms') {
        const room = await storage.createRoom(req.body);
        return res.status(201).json(room);
      }
      
      // Handle /rooms/:id routes
      const idMatch = apiPath.match(/^\/rooms\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        
        if (req.method === 'GET') {
          const room = await storage.getRoom(id);
          if (!room) {
            return res.status(404).json({ message: 'Room not found' });
          }
          return res.status(200).json(room);
        }
        
        if (req.method === 'PUT' || req.method === 'PATCH') {
          const room = await storage.updateRoom(id, req.body);
          return res.status(200).json(room);
        }
        
        if (req.method === 'DELETE') {
          await storage.deleteRoom(id);
          return res.status(204).send('');
        }
      }
    }
    
    // Floors endpoint
    if (apiPath === '/floors' && req.method === 'GET') {
      const buildingId = req.query.buildingId as string | undefined;
      const floors = await storage.getFloors(buildingId);
      return res.status(200).json(floors);
    }
    
    // Staff endpoint
    if (apiPath === '/staff' && req.method === 'GET') {
      const staff = await storage.getStaff();
      return res.status(200).json(staff);
    }
    
    // Announcements endpoints
    if (apiPath.startsWith('/announcements')) {
      if (req.method === 'GET') {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const announcements = await storage.getAnnouncements(limit);
        return res.status(200).json(announcements);
      }
      
      if (req.method === 'POST') {
        const announcement = await storage.createAnnouncement(req.body);
        return res.status(201).json(announcement);
      }
      
      // Handle /announcements/:id routes
      const idMatch = apiPath.match(/^\/announcements\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        
        if (req.method === 'GET') {
          const announcement = await storage.getAnnouncement(id);
          if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
          }
          return res.status(200).json(announcement);
        }
        
        if (req.method === 'PUT' || req.method === 'PATCH') {
          const announcement = await storage.updateAnnouncement(id, req.body);
          return res.status(200).json(announcement);
        }
        
        if (req.method === 'DELETE') {
          await storage.deleteAnnouncement(id);
          return res.status(204).send('');
        }
      }
    }
    
    // Test email endpoint
    if (apiPath === '/test-email' && req.method === 'POST') {
      const { sendPasswordSetupEmail, generateTempPassword } = await import('../server/emailService.js');
      
      console.log('\n🧪 ========== TEST EMAIL ENDPOINT ==========');
      console.log('Environment variables check:');
      console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
      console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
      console.log('  EMAIL_USER:', process.env.EMAIL_USER);
      console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET');
      
      const testEmail = req.body.email || process.env.EMAIL_USER || 'test@example.com';
      const testName = req.body.name || 'Test User';
      const testPassword = 'TestPass123!';
      
      console.log(`\nSending test email to: ${testEmail}`);
      
      try {
        const result = await sendPasswordSetupEmail(testEmail, testName, testPassword);
        
        console.log('\nTest email result:', result);
        console.log('==========================================\n');
        
        return res.status(200).json({
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
        return res.status(500).json({
          success: false,
          error: error.message,
          stack: error.stack
        });
      }
    }

    // Admin cleanup endpoint - DELETE ALL DATA
    if (apiPath === '/admin/cleanup' && req.method === 'POST') {
      const { confirmDelete } = req.body;
      
      if (confirmDelete !== 'DELETE_ALL') {
        return res.status(400).json({ message: 'Confirmation required' });
      }
      
      // Delete all buildings
      const buildings = await storage.getBuildings();
      for (const building of buildings) {
        await storage.deleteBuilding(building.id);
      }
      
      // Delete all rooms
      const rooms = await storage.getRooms();
      for (const room of rooms) {
        await storage.deleteRoom(room.id);
      }
      
      // Delete all announcements
      const announcements = await storage.getAnnouncements(1000);
      for (const announcement of announcements) {
        await storage.deleteAnnouncement(announcement.id);
      }
      
      return res.status(200).json({
        success: true,
        deleted: {
          buildings: buildings.length,
          rooms: rooms.length,
          announcements: announcements.length
        }
      });
    }
    
    // Admin login endpoint
    if (apiPath === '/auth/admin-login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      // Hardcoded owner credentials
      const OWNER_EMAIL = 'JuusoJuusto112@gmail.com';
      const OWNER_PASSWORD = 'Juusto2012!';
      
      if (email === OWNER_EMAIL && password === OWNER_PASSWORD) {
        // Check if owner user exists in database, create if not
        let ownerUser = await storage.getUserByEmail(OWNER_EMAIL);
        
        if (!ownerUser) {
          console.log('Creating owner admin user in database...');
          ownerUser = await storage.upsertUser({
            id: 'owner-admin-user',
            email: OWNER_EMAIL,
            firstName: 'Juuso',
            lastName: 'Kaikula',
            role: 'admin',
            profileImageUrl: null
          });
        }
        
        return res.status(200).json({
          success: true,
          user: ownerUser
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Auth user endpoint
    if (apiPath === '/auth/user' && req.method === 'GET') {
      // For now, return unauthorized
      // TODO: Implement proper auth with sessions
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Users endpoints
    if (apiPath.startsWith('/users')) {
      if (req.method === 'GET') {
        const users = await storage.getAllUsers();
        return res.status(200).json(users);
      }
      
      if (req.method === 'POST') {
        const { sendPasswordSetupEmail, generateTempPassword } = await import('../server/emailService.js');
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

        return res.status(201).json({ ...newUser, password: finalPassword });
      }
      
      // Handle /users/:id routes
      const idMatch = apiPath.match(/^\/users\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        
        if (req.method === 'GET') {
          const user = await storage.getUser(id);
          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }
          return res.status(200).json(user);
        }
        
        if (req.method === 'DELETE') {
          await storage.deleteUser(id);
          return res.status(204).send('');
        }
      }
    }
    
    // 404 for unknown routes
    return res.status(404).json({
      message: "Not found",
      path: apiPath,
      availableEndpoints: [
        '/buildings',
        '/rooms',
        '/floors',
        '/staff',
        '/announcements',
        '/users',
        '/auth/user',
        '/auth/admin-login',
        '/test-email (POST)'
      ]
    });
    
  } catch (error: any) {
    console.error("API Error:", {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method
    });
    
    return res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
}
