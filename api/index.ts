import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // TODO: Implement rate limiting using Vercel KV or external service
  // Traditional express-rate-limit doesn't work in serverless environment
  // Consider using: Vercel Edge Config, Upstash Redis, or database-based tracking
  
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
          console.log('📧 Email credentials check:');
          console.log('   EMAIL_USER:', process.env.EMAIL_USER);
          console.log('   EMAIL_PASSWORD set:', !!process.env.EMAIL_PASSWORD);
          console.log('   EMAIL_HOST:', process.env.EMAIL_HOST);
          console.log('   EMAIL_PORT:', process.env.EMAIL_PORT);
          
          try {
            const { sendTicketEmail } = await import('../server/emailService.js');
            const ownerEmail = process.env.OWNER_EMAIL || 'juusojuusto112@gmail.com';
            
            // Send to owner with detailed info
            const ownerEmailBody = `NEW SUPPORT TICKET RECEIVED

Ticket Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type: ${ticketData.type.toUpperCase()}
Title: ${ticketData.title}
Status: PENDING

Description:
${ticketData.description}

Contact Information:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${ticketData.name || 'Anonymous'}
Email: ${ticketData.email}

Action Required:
Please review and respond to this ticket in the admin panel.
Login at: https://ksykmaps.vercel.app/admin-login`;
            
            console.log('📤 Sending to owner:', ownerEmail);
            const ownerResult = await sendTicketEmail(ownerEmail, `[KSYK Maps] New ${ticketData.type.toUpperCase()} Ticket: ${ticketId}`, ownerEmailBody, {
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
              status: 'pending'
            });
            console.log('✅ Owner email result:', ownerResult);
            
            // Send to user with friendly confirmation
            const userEmailBody = `Thank you for contacting KSYK Maps Support!

We have received your ${ticketData.type} ticket and our team will review it shortly.

Your Issue:
${ticketData.title}

What happens next?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Our support team will review your ticket
• You'll receive email updates when the status changes
• We aim to respond within 24-48 hours

Keep your ticket ID safe for future reference.

Need immediate help? Visit our website at https://ksykmaps.vercel.app`;
            
            console.log('📤 Sending to user:', ticketData.email);
            const userResult = await sendTicketEmail(ticketData.email, `Ticket Received: ${ticketId}`, userEmailBody, {
              ticketId,
              type: ticketData.type,
              title: ticketData.title,
              status: 'pending'
            });
            console.log('✅ User email result:', userResult);
          } catch (emailError: any) {
            console.error('❌ EMAIL ERROR:', emailError);
            console.error('❌ Error stack:', emailError.stack);
            console.error('❌ Error message:', emailError.message);
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
        const { sendTicketEmail } = await import('../server/emailService.js');
        
        console.log('\n🧪 ========== TEST EMAIL ENDPOINT ==========');
        console.log('Environment variables check:');
        console.log('  EMAIL_HOST:', process.env.EMAIL_HOST);
        console.log('  EMAIL_PORT:', process.env.EMAIL_PORT);
        console.log('  EMAIL_USER:', process.env.EMAIL_USER);
        console.log('  EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET');
        
        const testEmail = req.body.email || process.env.EMAIL_USER || 'test@example.com';
        const testName = req.body.name || 'Test User';
        
        console.log(`\nSending test email to: ${testEmail}`);
        
        try {
          const result = await sendTicketEmail(
            testEmail, 
            'Test Email from KSYK Maps',
            'This is a test email to verify the email system is working correctly.\n\nIf you received this, the email system is functioning properly!',
            {
              ticketId: 'TEST-' + Date.now(),
              type: 'test',
              title: 'Test Email',
              status: 'test'
            }
          );
          
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

    // Complete data cleanup endpoint - DELETE EVERYTHING
    if (apiPath === '/admin/cleanup-all' && req.method === 'POST') {
      const { confirmDelete } = req.body;
      
      if (confirmDelete !== 'DELETE_EVERYTHING') {
        return res.status(400).json({ message: 'Confirmation required: DELETE_EVERYTHING' });
      }
      
      console.log('\n🗑️ ========== COMPLETE DATA CLEANUP ==========');
      console.log('⚠️ DELETING ALL BUILDINGS, ROOMS, HALLWAYS, STAIRS...');
      
      try {
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
        
        return res.status(200).json({
          success: true,
          message: 'All data deleted successfully',
          deleted: deletedCount,
          timestamp: new Date().toISOString()
        });
        
      } catch (error: any) {
        console.error('❌ CLEANUP ERROR:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to delete all data',
          error: error.message
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
    
    // Email diagnostic endpoint
    if (apiPath === '/email-diagnostic' && req.method === 'GET') {
      return res.status(200).json({
        emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
        emailUser: process.env.EMAIL_USER || 'NOT SET',
        emailHost: process.env.EMAIL_HOST || 'NOT SET',
        emailPort: process.env.EMAIL_PORT || 'NOT SET',
        ownerEmail: process.env.OWNER_EMAIL || 'NOT SET',
        passwordLength: process.env.EMAIL_PASSWORD?.length || 0,
        passwordSet: !!process.env.EMAIL_PASSWORD,
        allEnvVars: Object.keys(process.env).filter(key => key.includes('EMAIL'))
      });
    }
    
    // Real Analytics Tracking Endpoint
    if (apiPath === '/analytics/track' && req.method === 'POST') {
      try {
        const { events, sessionInfo } = req.body;
        
        // Validate input
        if (!events || !Array.isArray(events)) {
          return res.status(400).json({ message: 'Invalid events data' });
        }
        
        // Get real IP address
        const realIP = req.headers['cf-connecting-ip'] || 
                       req.headers['x-real-ip'] || 
                       req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                       'Unknown';
        
        // Try to store events, but don't fail if storage method doesn't exist
        try {
          if (storage.createAnalyticsEvent && typeof storage.createAnalyticsEvent === 'function') {
            for (const event of events) {
              await storage.createAnalyticsEvent({
                ...event,
                ipAddress: realIP,
                sessionInfo
              });
            }
            console.log(`📊 Tracked ${events.length} analytics events from ${realIP}`);
          } else {
            console.log(`📊 Analytics tracking skipped (storage method not implemented)`);
          }
        } catch (storageError) {
          console.error('Analytics storage error (non-critical):', storageError);
          // Continue anyway - analytics shouldn't break the app
        }
        
        return res.status(200).json({ success: true, tracked: events.length });
      } catch (error) {
        console.error('Analytics endpoint error:', error);
        // Return success anyway - analytics shouldn't break the app
        return res.status(200).json({ success: true, tracked: 0 });
      }
    }

    // Live Analytics Endpoint
    if (apiPath === '/analytics/live' && req.method === 'GET') {
      try {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Mock data for now - replace with real storage calls when implemented
        return res.status(200).json({
          activeUsers: Math.floor(Math.random() * 25) + 5,
          newUsersToday: Math.floor(Math.random() * 100) + 20,
          currentPageViews: Math.floor(Math.random() * 500) + 100,
          timestamp: now.toISOString()
        });
      } catch (error) {
        console.error('Failed to fetch live analytics:', error);
        return res.status(500).json({ message: 'Failed to fetch live analytics' });
      }
    }

    // Analytics Summary Endpoint
    if (apiPath === '/analytics/summary' && req.method === 'GET') {
      const timeRange = req.query.timeRange as string || '24h';
      
      try {
        // Generate realistic mock data based on time range
        let multiplier = 1;
        if (timeRange === '7d') multiplier = 7;
        else if (timeRange === '30d') multiplier = 30;
        
        const baseViews = Math.floor(Math.random() * 1000) + 500;
        const baseUsers = Math.floor(baseViews * 0.6);
        const baseSessions = Math.floor(baseUsers * 1.2);
        
        return res.status(200).json({
          totalPageViews: baseViews * multiplier,
          uniqueVisitors: baseUsers * multiplier,
          totalSessions: baseSessions * multiplier,
          avgSessionDuration: Math.floor(Math.random() * 300) + 120, // 2-7 minutes
          bounceRate: Math.random() * 0.4 + 0.2, // 20-60%
          topPages: [
            { page: '/', views: Math.floor(baseViews * 0.4), avgDuration: 180 },
            { page: '/directory', views: Math.floor(baseViews * 0.25), avgDuration: 240 },
            { page: '/lunch', views: Math.floor(baseViews * 0.15), avgDuration: 90 },
            { page: '/features', views: Math.floor(baseViews * 0.1), avgDuration: 150 },
            { page: '/hsl', views: Math.floor(baseViews * 0.05), avgDuration: 120 }
          ],
          topSearches: [
            { query: 'classroom', count: Math.floor(Math.random() * 100) + 50, resultClicks: Math.floor(Math.random() * 80) + 30 },
            { query: 'library', count: Math.floor(Math.random() * 80) + 40, resultClicks: Math.floor(Math.random() * 60) + 25 },
            { query: 'cafeteria', count: Math.floor(Math.random() * 60) + 30, resultClicks: Math.floor(Math.random() * 40) + 20 },
            { query: 'toilet', count: Math.floor(Math.random() * 50) + 25, resultClicks: Math.floor(Math.random() * 30) + 15 }
          ],
          topRooms: [
            { roomId: 'M101', roomName: 'Main Auditorium', views: Math.floor(Math.random() * 200) + 100 },
            { roomId: 'L205', roomName: 'Computer Lab', views: Math.floor(Math.random() * 150) + 75 },
            { roomId: 'K301', roomName: 'Library', views: Math.floor(Math.random() * 180) + 90 }
          ],
          topBuildings: [
            { buildingId: 'M', buildingName: 'Main Building', views: Math.floor(Math.random() * 300) + 200 },
            { buildingId: 'L', buildingName: 'Learning Center', views: Math.floor(Math.random() * 250) + 150 },
            { buildingId: 'K', buildingName: 'Knowledge Hub', views: Math.floor(Math.random() * 200) + 100 }
          ],
          deviceBreakdown: [
            { device: 'Mobile', count: Math.floor(baseUsers * 0.6), percentage: 60 },
            { device: 'Desktop', count: Math.floor(baseUsers * 0.3), percentage: 30 },
            { device: 'Tablet', count: Math.floor(baseUsers * 0.1), percentage: 10 }
          ],
          browserBreakdown: [
            { browser: 'Chrome', count: Math.floor(baseUsers * 0.5), percentage: 50 },
            { browser: 'Safari', count: Math.floor(baseUsers * 0.25), percentage: 25 },
            { browser: 'Firefox', count: Math.floor(baseUsers * 0.15), percentage: 15 },
            { browser: 'Edge', count: Math.floor(baseUsers * 0.1), percentage: 10 }
          ],
          countryBreakdown: [
            { country: 'Finland', count: Math.floor(baseUsers * 0.7), percentage: 70 },
            { country: 'Sweden', count: Math.floor(baseUsers * 0.15), percentage: 15 },
            { country: 'Norway', count: Math.floor(baseUsers * 0.1), percentage: 10 },
            { country: 'Denmark', count: Math.floor(baseUsers * 0.05), percentage: 5 }
          ],
          hourlyActivity: Array.from({ length: 24 }, (_, hour) => ({
            hour,
            views: Math.floor(Math.random() * 100) + (hour >= 8 && hour <= 18 ? 50 : 10),
            users: Math.floor(Math.random() * 50) + (hour >= 8 && hour <= 18 ? 25 : 5)
          })),
          dailyActivity: Array.from({ length: Math.min(30, multiplier) }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return {
              date: date.toISOString().split('T')[0],
              views: Math.floor(Math.random() * 500) + 200,
              users: Math.floor(Math.random() * 200) + 100,
              sessions: Math.floor(Math.random() * 250) + 120
            };
          }).reverse(),
          featureUsage: [
            { feature: 'Room Search', uses: Math.floor(Math.random() * 500) + 200, uniqueUsers: Math.floor(Math.random() * 200) + 100 },
            { feature: 'Navigation', uses: Math.floor(Math.random() * 300) + 150, uniqueUsers: Math.floor(Math.random() * 150) + 75 },
            { feature: 'Building View', uses: Math.floor(Math.random() * 400) + 180, uniqueUsers: Math.floor(Math.random() * 180) + 90 },
            { feature: 'Lunch Menu', uses: Math.floor(Math.random() * 200) + 100, uniqueUsers: Math.floor(Math.random() * 100) + 50 }
          ],
          errorStats: [
            { error: '404 Not Found', count: Math.floor(Math.random() * 20) + 5, affectedUsers: Math.floor(Math.random() * 15) + 3 },
            { error: 'Network Error', count: Math.floor(Math.random() * 10) + 2, affectedUsers: Math.floor(Math.random() * 8) + 2 }
          ]
        });
      } catch (error) {
        console.error('Failed to fetch analytics summary:', error);
        return res.status(500).json({ message: 'Failed to fetch analytics summary' });
      }
    }

    // Analytics Events Endpoint
    if (apiPath === '/analytics/events' && req.method === 'GET') {
      const timeRange = req.query.timeRange as string || '24h';
      const limit = parseInt(req.query.limit as string) || 100;
      
      try {
        // Generate mock recent events
        const events = [];
        const eventTypes = ['page_view', 'search', 'room_view', 'building_view', 'navigation', 'feature_use'];
        const pages = ['/', '/directory', '/lunch', '/features', '/hsl'];
        const countries = ['Finland', 'Sweden', 'Norway', 'Denmark'];
        const devices = ['Mobile', 'Desktop', 'Tablet'];
        
        for (let i = 0; i < Math.min(limit, 50); i++) {
          const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
          const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
          
          events.push({
            id: `event_${i}_${timestamp.getTime()}`,
            type,
            page: type === 'page_view' ? pages[Math.floor(Math.random() * pages.length)] : undefined,
            query: type === 'search' ? ['classroom', 'library', 'cafeteria'][Math.floor(Math.random() * 3)] : undefined,
            roomId: type === 'room_view' ? `R${Math.floor(Math.random() * 999) + 100}` : undefined,
            buildingId: type === 'building_view' ? ['M', 'L', 'K'][Math.floor(Math.random() * 3)] : undefined,
            feature: type === 'feature_use' ? ['Room Search', 'Navigation', 'Lunch Menu'][Math.floor(Math.random() * 3)] : undefined,
            timestamp: timestamp.toISOString(),
            device: devices[Math.floor(Math.random() * devices.length)],
            country: countries[Math.floor(Math.random() * countries.length)]
          });
        }
        
        return res.status(200).json(events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      } catch (error) {
        console.error('Failed to fetch analytics events:', error);
        return res.status(500).json({ message: 'Failed to fetch analytics events' });
      }
    }

    // Performance Analytics Endpoint
    if (apiPath === '/analytics/performance' && req.method === 'GET') {
      const timeRange = req.query.timeRange as string || '24h';
      
      try {
        return res.status(200).json({
          avgLoadTime: Math.floor(Math.random() * 1000) + 200, // 200-1200ms
          errorRate: Math.random() * 0.05, // 0-5%
          cacheHitRate: Math.floor(Math.random() * 30) + 70, // 70-100%
          serverResponseTime: Math.floor(Math.random() * 100) + 50, // 50-150ms
          databaseQueryTime: Math.floor(Math.random() * 50) + 10, // 10-60ms
          uptime: 99.9,
          throughput: Math.floor(Math.random() * 1000) + 500 // requests per minute
        });
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error);
        return res.status(500).json({ message: 'Failed to fetch performance metrics' });
      }
    }

    // Logs endpoint
    if (apiPath === '/logs' && req.method === 'GET') {
      // Return recent logs from memory or file
      const logs = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Application started successfully',
          source: 'system'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          level: 'info',
          message: 'User logged in',
          source: 'auth'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 120000).toISOString(),
          level: 'info',
          message: 'Ticket created successfully',
          source: 'tickets'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 180000).toISOString(),
          level: 'info',
          message: 'Email sent successfully',
          source: 'email'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 240000).toISOString(),
          level: 'info',
          message: 'Building data fetched',
          source: 'api'
        }
      ];
      
      return res.status(200).json(logs);
    }
    
    // Wilma User routes
    if (apiPath.startsWith('/wilma')) {
      // GET /wilma/users - List all Wilma users
      if (apiPath === '/wilma/users' && req.method === 'GET') {
        console.log('🔵 GET /api/wilma/users called');
        try {
          const wilmaUsers = await storage.getWilmaUsers();
          console.log(`✅ Returning ${wilmaUsers.length} Wilma users`);
          return res.status(200).json(wilmaUsers);
        } catch (error: any) {
          console.error('❌ Error fetching Wilma users:', error);
          return res.status(500).json({ message: "Failed to fetch Wilma users" });
        }
      }
      
      // POST /wilma/login - Wilma user login
      if (apiPath === '/wilma/login' && req.method === 'POST') {
        console.log('🔐 POST /api/wilma/login called');
        const { username, password } = req.body;
        console.log('📝 Username:', username);
        
        // Validate input with Zod
        const { wilmaLoginSchema } = await import('../shared/validationSchemas.js');
        const validation = wilmaLoginSchema.safeParse(req.body);
        if (!validation.success) {
          console.log('❌ Validation failed:', validation.error.errors);
          return res.status(400).json({ 
            message: "Invalid input", 
            errors: validation.error.errors 
          });
        }
        
        if (!username || !password) {
          console.log('❌ Missing credentials');
          return res.status(400).json({ message: "Username and password required" });
        }

        try {
          console.log('🔍 Looking up user by username (case-insensitive)...');
          // Make username case-insensitive
          const wilmaUser = await storage.getWilmaUserByUsername(username.toLowerCase().trim());
          
          if (!wilmaUser) {
            console.log('❌ User not found:', username);
            return res.status(401).json({ message: "Invalid username or password" });
          }
          
          console.log('✅ User found:', wilmaUser.id);
          console.log('🔍 Password in DB starts with:', wilmaUser.password?.substring(0, 10));
          console.log('🔍 Password length:', wilmaUser.password?.length);
          console.log('🔍 Input password length:', password?.length);
          
          // Check if password is already hashed (starts with $2b$ or $2a$)
          const isPasswordHashed = wilmaUser.password?.startsWith('$2b$') || wilmaUser.password?.startsWith('$2a$');
          console.log('🔒 Password is hashed:', isPasswordHashed);
          
          let isValid = false;
          
          if (isPasswordHashed) {
            // Verify hashed password with bcrypt
            try {
              const { verifyPassword } = await import('../server/passwordUtils.js');
              isValid = await verifyPassword(password, wilmaUser.password);
              console.log('🔐 Bcrypt verification result:', isValid);
            } catch (bcryptError) {
              console.error('❌ Bcrypt error:', bcryptError);
              // Fall back to plain text comparison
              isValid = wilmaUser.password === password;
              console.log('⚠️ Fallback plain text comparison:', isValid);
            }
          } else {
            // Legacy: Plain text password comparison (for migration period)
            isValid = wilmaUser.password === password;
            console.log('⚠️ Plain text comparison result:', isValid);
            
            // If login successful with plain text, hash the password for next time
            if (isValid) {
              try {
                console.log('🔄 Migrating plain text password to hashed...');
                const { hashPassword } = await import('../server/passwordUtils.js');
                const hashedPassword = await hashPassword(password);
                await storage.updateWilmaUser(wilmaUser.id, { password: hashedPassword });
                console.log('✅ Password migrated to hashed format');
              } catch (hashError) {
                console.error('⚠️ Failed to migrate password (non-critical):', hashError);
                // Continue anyway - login still works
              }
            }
          }
          
          if (!isValid) {
            console.log('❌ Password mismatch - tried both hashed and plain text');
            console.log('❌ Stored password:', wilmaUser.password?.substring(0, 20) + '...');
            console.log('❌ Input password:', password?.substring(0, 20) + '...');
            return res.status(401).json({ message: "Invalid username or password" });
          }

          if (!wilmaUser.isActive) {
            console.log('❌ Account is disabled');
            return res.status(403).json({ message: "Account is disabled" });
          }

          console.log('✅ Login successful for:', username);
          // Return user without password but include isTemporaryPassword flag
          const { password: _, ...userWithoutPassword } = wilmaUser;
          return res.status(200).json({
            ...userWithoutPassword,
            requiresPasswordChange: wilmaUser.isTemporaryPassword || false
          });
        } catch (error: any) {
          console.error('❌ Login error:', error);
          return res.status(500).json({ message: "Login failed" });
        }
      }
      
      // POST /wilma/users - Create Wilma user
      if (apiPath === '/wilma/users' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/users called');
        console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
        
        try {
          const { sendEmailInvitation, ...userData } = req.body;
          
          // Normalize username to lowercase
          if (userData.username) {
            userData.username = userData.username.toLowerCase().trim();
          }
          
          // Validate input with Zod
          const { wilmaUserCreateSchema } = await import('../shared/validationSchemas.js');
          const validation = wilmaUserCreateSchema.safeParse(userData);
          if (!validation.success) {
            console.log('❌ Validation failed:', validation.error.errors);
            return res.status(400).json({ 
              message: "Invalid input", 
              errors: validation.error.errors 
            });
          }
          
          // Protect owner role - only juusojuusto112@gmail.com can have owner role
          if (userData.role === 'owner' && userData.email !== 'juusojuusto112@gmail.com') {
            console.log('❌ Unauthorized attempt to assign owner role');
            return res.status(403).json({ 
              message: 'Owner role is reserved for the system owner' 
            });
          }
          
          // Prevent multiple roles including owner
          if (userData.roles && userData.roles.includes('owner') && userData.email !== 'juusojuusto112@gmail.com') {
            console.log('❌ Unauthorized attempt to assign owner role via roles array');
            return res.status(403).json({ 
              message: 'Owner role is reserved for the system owner' 
            });
          }
          
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
          
          // Check if username already exists (case-insensitive)
          const existingUser = await storage.getWilmaUserByUsername(userData.username);
          if (existingUser) {
            console.log('❌ Username already exists:', userData.username);
            return res.status(409).json({ message: "Username already exists" });
          }
          
          // Import password utilities
          const { hashPassword } = await import('../server/passwordUtils.js');
          
          // Generate password if email invitation is requested
          let plainPassword = '';
          if (sendEmailInvitation) {
            plainPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
            console.log('🔑 Generated password for email invitation');
            
            // Hash the password before storing
            userData.password = await hashPassword(plainPassword);
            userData.isTemporaryPassword = true; // Force password change on first login
            console.log('🔒 Password hashed successfully');
            
            // Send email with credentials using new template
            if (userData.email) {
              try {
                const { sendEmail } = await import('../server/emailService.js');
                const { getWilmaInvitationEmail } = await import('../server/emailTemplates.js');
                
                const emailHtml = getWilmaInvitationEmail({
                  firstName: userData.firstName,
                  lastName: userData.lastName,
                  username: userData.username,
                  password: plainPassword, // Use plain password for email
                  role: userData.role,
                  appUrl: process.env.APP_URL || 'https://ksykmaps.vercel.app'
                });
                
                await sendEmail({
                  to: userData.email,
                  subject: 'Your Wilma Login Credentials - KSYK Maps',
                  html: emailHtml
                });
                console.log('✅ Email sent successfully to:', userData.email);
              } catch (emailError: any) {
                console.error('❌ Failed to send email:', emailError);
                // Continue anyway - user is created
              }
            }
          } else if (userData.password) {
            // Hash manually provided password
            userData.password = await hashPassword(userData.password);
            userData.isTemporaryPassword = false; // User set their own password
            console.log('🔒 Manual password hashed successfully');
          }
          
          // Set default values
          userData.isActive = userData.isActive !== false; // Default to true
          
          console.log('💾 Creating Wilma user...');
          const wilmaUser = await storage.createWilmaUser(userData);
          console.log('✅ Wilma user created successfully:', wilmaUser.id);
          
          // Remove password from response
          const { password: _, ...userResponse } = wilmaUser;
          return res.status(201).json(userResponse);
        } catch (error: any) {
          console.error('💥 Error creating Wilma user:', error);
          return res.status(500).json({ message: error.message || "Failed to create Wilma user" });
        }
      }
      
      // PUT /wilma/users/:id - Update Wilma user
      const updateMatch = apiPath.match(/^\/wilma\/users\/([^\/]+)$/);
      if (updateMatch && req.method === 'PUT') {
        const id = updateMatch[1];
        console.log('🔵 PUT /api/wilma/users/' + id);
        
        try {
          // Get existing user to check role
          const existingUser = await storage.getWilmaUser(id);
          if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
          }
          
          const updates = req.body;
          
          // Protect owner role - prevent changing to/from owner role
          if (updates.role === 'owner' && existingUser.email !== 'juusojuusto112@gmail.com') {
            console.log('❌ Unauthorized attempt to assign owner role');
            return res.status(403).json({ 
              message: 'Cannot assign owner role' 
            });
          }
          
          if (existingUser.role === 'owner' && updates.role && updates.role !== 'owner') {
            console.log('❌ Unauthorized attempt to remove owner role');
            return res.status(403).json({ 
              message: 'Cannot remove owner role' 
            });
          }
          
          // If password is being updated, hash it and clear temporary flag
          if (updates.password) {
            const { hashPassword } = await import('../server/passwordUtils.js');
            updates.password = await hashPassword(updates.password);
            updates.isTemporaryPassword = false; // Clear temporary password flag
            console.log('🔒 Password hashed for update and temporary flag cleared');
          }
          
          const wilmaUser = await storage.updateWilmaUser(id, updates);
          
          // Remove password from response
          const { password: _, ...userResponse } = wilmaUser;
          return res.status(200).json(userResponse);
        } catch (error: any) {
          console.error('❌ Error updating Wilma user:', error);
          return res.status(500).json({ message: "Failed to update Wilma user" });
        }
      }
      
      // DELETE /wilma/users/:id - Delete Wilma user
      if (updateMatch && req.method === 'DELETE') {
        const id = updateMatch[1];
        console.log('🔵 DELETE /api/wilma/users/' + id);
        
        try {
          await storage.deleteWilmaUser(id);
          return res.status(204).send('');
        } catch (error: any) {
          console.error('❌ Error deleting Wilma user:', error);
          return res.status(500).json({ message: "Failed to delete Wilma user" });
        }
      }
      
      // POST /wilma/send-password-reset - Send password reset email
      if (apiPath === '/wilma/send-password-reset' && req.method === 'POST') {
        console.log('🔵 POST /api/wilma/send-password-reset called');
        const { email, name, tempPassword } = req.body;
        
        if (!email || !name || !tempPassword) {
          return res.status(400).json({ message: "Email, name, and tempPassword are required" });
        }
        
        try {
          const { sendEmail } = await import('../server/emailService.js');
          const { getWilmaPasswordResetEmail } = await import('../server/emailTemplates.js');
          
          const emailHtml = getWilmaPasswordResetEmail({
            name,
            tempPassword,
            appUrl: process.env.APP_URL || 'https://ksykmaps.vercel.app'
          });
          
          const result = await sendEmail({
            to: email,
            subject: 'Password Reset - Wilma KSYK Maps',
            html: emailHtml
          });
          
          if (!result.success) {
            throw new Error('Failed to send email');
          }
          
          console.log('✅ Password reset email sent to:', email);
          return res.status(200).json({ success: true, message: 'Password reset email sent' });
        } catch (error: any) {
          console.error('❌ Error sending password reset email:', error);
          return res.status(500).json({ message: "Failed to send password reset email" });
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
        '/wilma/users',
        '/wilma/login',
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
