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
        timestamp: new Date().toISOString(),
        env: {
          USE_FIREBASE: process.env.USE_FIREBASE,
          HAS_FIREBASE_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT,
          FIREBASE_SERVICE_ACCOUNT_LENGTH: process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0,
          NODE_ENV: process.env.NODE_ENV
        }
      });
    }
    
    // Debug endpoint to check storage
    if (apiPath === '/debug') {
      const { storage } = await import('../server/storage.js');
      const buildings = await storage.getBuildings();
      return res.status(200).json({
        storageType: storage.constructor.name,
        buildingCount: buildings.length,
        buildings: buildings,
        env: {
          USE_FIREBASE: process.env.USE_FIREBASE,
          HAS_FIREBASE_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT
        }
      });
    }
    
    // Import and use storage
    const { storage } = await import('../server/storage.js');
    
    // Buildings endpoints
    if (apiPath.startsWith('/buildings')) {
      if (req.method === 'GET' && apiPath === '/buildings') {
        console.log('🏢 Fetching buildings from storage...');
        const buildings = await storage.getBuildings();
        console.log(`✅ Found ${buildings.length} buildings`);
        console.log('Buildings data:', JSON.stringify(buildings, null, 2));
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

    // Hallways endpoints
    if (apiPath.startsWith('/hallways')) {
      if (req.method === 'GET' && apiPath === '/hallways') {
        const buildingId = req.query.buildingId as string | undefined;
        const hallways = await storage.getHallways(buildingId);
        return res.status(200).json(hallways);
      }
      
      if (req.method === 'POST' && apiPath === '/hallways') {
        const hallway = await storage.createHallway(req.body);
        return res.status(201).json(hallway);
      }
      
      // Handle /hallways/:id routes
      const idMatch = apiPath.match(/^\/hallways\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        
        if (req.method === 'DELETE') {
          await storage.deleteHallway(id);
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
    
    // Lunch menu proxy to bypass CORS
    if (apiPath === '/lunch-menu' && req.method === 'GET') {
      try {
        const response = await fetch("https://www.compass-group.fi/menuapi/feed/rss/current-week?costNumber=3026&language=fi");
        const text = await response.text();
        res.setHeader("Content-Type", "application/xml");
        return res.status(200).send(text);
      } catch (error: any) {
        console.error("Failed to fetch lunch menu:", error);
        return res.status(500).json({ error: "Failed to fetch lunch menu" });
      }
    }
    
    // Tickets endpoints
    if (apiPath.startsWith('/tickets')) {
      if (req.method === 'GET') {
        const tickets = await storage.getTickets();
        return res.status(200).json(tickets);
      }
      
      if (req.method === 'POST') {
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
          ...ticketData,
          ticketId,
          name: ticketData.name || 'Anonymous',
          email: ticketData.email || '',
          status: ticketData.status || 'pending',
          priority: ticketData.priority || 'normal',
        });
        
        console.log('✅ Ticket created in database');
        
        // SEND EMAILS AND DISCORD NOTIFICATIONS
        if (ticketData.email && ticketData.email.trim()) {
          console.log('📧 EMAIL PROVIDED - SENDING NOW');
          
          try {
            const { sendTicketEmail } = await import('../server/emailService.js');
            const ownerEmail = process.env.OWNER_EMAIL || 'juusojuusto112@gmail.com';
            
            // Send to owner
            const ownerEmailBody = `You have received a new support ticket from ${ticketData.name || 'Anonymous'}.

Description:
${ticketData.description}

Contact Information:
Email: ${ticketData.email}
Name: ${ticketData.name || 'Anonymous'}

Please review and respond to this ticket as soon as possible.`;
            
            console.log('📤 Sending to owner:', ownerEmail);
            await sendTicketEmail(ownerEmail, `New Ticket: ${ticketId}`, ownerEmailBody, {
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
              status: 'pending'
            });
            console.log('✅ Owner email sent');
            
            // Send to user
            const userEmailBody = `Thank you for contacting KSYK Maps Support!

We have received your ${ticketData.type} ticket and our team will review it shortly.

Your Issue:
${ticketData.title}

What happens next?
• Our support team will review your ticket
• You'll receive email updates when the status changes
• We aim to respond within 24-48 hours

Keep your ticket ID safe for future reference.`;
            
            console.log('📤 Sending to user:', ticketData.email);
            await sendTicketEmail(ticketData.email, `Ticket Received: ${ticketId}`, userEmailBody, {
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
              status: 'pending'
            });
            console.log('✅ User email sent');
          } catch (emailError: any) {
            console.error('❌ EMAIL ERROR:', emailError.message);
          }
        } else {
          console.log('⚠️ NO EMAIL - skipping');
        }
        
        // Send Discord notification
        if (process.env.VITE_DISCORD_TICKETS_WEBHOOK) {
          try {
            console.log('📢 Sending Discord notification...');
            const discordEmbed = {
              embeds: [{
                title: `🎫 New Support Ticket: ${ticketId}`,
                color: ticketData.type === 'bug' ? 0xff0000 : ticketData.type === 'feature' ? 0x00ff00 : 0x0099ff,
                fields: [
                  { name: 'Type', value: ticketData.type, inline: true },
                  { name: 'Status', value: 'pending', inline: true },
                  { name: 'Title', value: ticketData.title },
                  { name: 'Description', value: ticketData.description.substring(0, 1000) },
                  { name: 'From', value: `${ticketData.name || 'Anonymous'} (${ticketData.email})`, inline: true },
                ],
                timestamp: new Date().toISOString(),
                footer: { text: 'KSYK Maps Support System' }
              }]
            };
            
            await fetch(process.env.VITE_DISCORD_TICKETS_WEBHOOK, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(discordEmbed)
            });
            console.log('✅ Discord notification sent');
          } catch (discordError: any) {
            console.error('❌ Discord notification error:', discordError.message);
          }
        }
        
        console.log('\n✅ RETURNING RESPONSE');
        return res.status(201).json({ ticketId, ...ticket });
      }
      
      // Handle /tickets/:id routes
      const idMatch = apiPath.match(/^\/tickets\/([^\/]+)$/);
      if (idMatch) {
        const id = idMatch[1];
        
        if (req.method === 'GET') {
          const ticket = await storage.getTicket(id);
          if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
          }
          return res.status(200).json(ticket);
        }
        
        if (req.method === 'PUT' || req.method === 'PATCH') {
          const ticket = await storage.updateTicket(id, req.body);
          return res.status(200).json(ticket);
        }
        
        if (req.method === 'DELETE') {
          await storage.deleteTicket(id);
          return res.status(200).json({ success: true, message: 'Ticket deleted successfully' });
        }
      }
    }
    
    // Settings endpoints
    if (apiPath === '/settings') {
      if (req.method === 'GET') {
        const settings = await storage.getAppSettings();
        return res.status(200).json(settings);
      }
      
      if (req.method === 'PUT' || req.method === 'PATCH') {
        const settings = await storage.updateAppSettings(req.body);
        return res.status(200).json(settings);
      }
    }
    
    // Test email endpoint
    if (apiPath === '/test-email') {
      if (req.method === 'GET') {
        return res.status(200).json({
          message: "Test email endpoint - use POST to send test email",
          usage: "POST /api/test-email with body: {\"email\": \"your@email.com\", \"name\": \"Your Name\"}",
          envVarsSet: {
            EMAIL_HOST: !!process.env.EMAIL_HOST,
            EMAIL_PORT: !!process.env.EMAIL_PORT,
            EMAIL_USER: !!process.env.EMAIL_USER,
            EMAIL_PASSWORD: !!process.env.EMAIL_PASSWORD
          }
        });
      }
      
      if (req.method === 'POST') {
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
      
      console.log('\n🔐 ========== API LOGIN ATTEMPT ==========');
      console.log('Email:', email);
      console.log('Password length:', password?.length);
      console.log('Timestamp:', new Date().toISOString());
      
      if (!email || !password) {
        console.log('❌ Missing email or password');
        return res.status(400).json({ message: "Email and password required", success: false });
      }
      
      // Check owner credentials from database only
      const OWNER_EMAIL = 'JuusoJuusto112@gmail.com';
      
      console.log('🔑 Checking owner credentials...');
      console.log('   Email match:', email === OWNER_EMAIL);
      
      if (email === OWNER_EMAIL) {
        console.log('✅ OWNER LOGIN DETECTED');
        // Check if owner user exists in database, create if not
        let ownerUser = await storage.getUserByEmail(OWNER_EMAIL);
        
        if (!ownerUser) {
          console.log('❌ Owner user not found in database');
          console.log('=====================================\n');
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }

        // Check password against database
        if (!ownerUser.password || ownerUser.password !== password) {
          console.log('❌ Invalid owner password');
          console.log('=====================================\n');
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }
        
        console.log('✅ Owner logged in successfully');
        console.log('=====================================\n');
        return res.status(200).json({
          success: true,
          user: ownerUser,
          requirePasswordChange: false
        });
      }
      
      // Check Firestore database for admin users
      console.log('📊 Checking Firestore database...');
      const user = await storage.getUserByEmail(email);
      
      console.log('🔍 Database lookup result:');
      console.log('   User found:', !!user);
      
      if (user) {
        console.log('   User ID:', user.id);
        console.log('   User email:', user.email);
        console.log('   User role:', user.role);
        console.log('   Has password field:', 'password' in user);
        console.log('   Password is set:', !!user.password);
        console.log('   Password value:', user.password);
        console.log('   Provided password:', password);
        console.log('   Password match (===):', user.password === password);
        console.log('   Is temporary:', user.isTemporaryPassword);
      }
      
      if (!user) {
        console.log('❌ User not found in database');
        console.log('=====================================\n');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      if (!user.password) {
        console.log('❌ User has no password set');
        console.log('=====================================\n');
        return res.status(401).json({
          success: false,
          message: 'Password not set. Please check your email for password setup link.'
        });
      }
      
      if (user.password !== password) {
        console.log('❌ Password mismatch!');
        console.log('   Expected:', user.password);
        console.log('   Got:', password);
        console.log('=====================================\n');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
      
      // Valid admin user from database
      console.log('✅ PASSWORD MATCH! User logged in successfully!');
      console.log('   Requires password change:', user.isTemporaryPassword || false);
      console.log('=====================================\n');
      return res.status(200).json({
        success: true,
        user: user,
        requirePasswordChange: user.isTemporaryPassword || false
      });
    }
    
    // Password change endpoint
    if (apiPath === '/auth/change-password' && req.method === 'POST') {
      const { newPassword } = req.body;
      
      console.log('\n🔐 ========== PASSWORD CHANGE ==========');
      console.log('New password length:', newPassword?.length);
      
      if (!newPassword || newPassword.length < 6) {
        console.log('❌ Password too short');
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      // For now, we'll use a simple approach - get user from request body
      // In production, this should use session authentication
      const { userId, email } = req.body;
      
      if (!userId && !email) {
        console.log('❌ No user identifier provided');
        return res.status(400).json({ message: "User identifier required" });
      }
      
      try {
        let user;
        if (userId) {
          user = await storage.getUser(userId);
        } else if (email) {
          user = await storage.getUserByEmail(email);
        }
        
        if (!user) {
          console.log('❌ User not found');
          return res.status(404).json({ message: "User not found" });
        }
        
        console.log('📝 Updating password for:', user.email);
        
        // Update user password
        await storage.upsertUser({
          id: user.id,
          password: newPassword,
          isTemporaryPassword: false
        });
        
        console.log('✅ Password changed successfully');
        console.log('=====================================\n');
        
        return res.status(200).json({ 
          success: true, 
          message: "Password changed successfully" 
        });
      } catch (error: any) {
        console.error('❌ Password change error:', error);
        return res.status(500).json({ message: "Failed to change password" });
      }
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
        '/settings',
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
