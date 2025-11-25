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
    
    // Buildings endpoint
    if (apiPath === '/buildings' && req.method === 'GET') {
      const buildings = await storage.getBuildings();
      return res.status(200).json(buildings);
    }
    
    // Rooms endpoint
    if (apiPath === '/rooms' && req.method === 'GET') {
      const buildingId = req.query.buildingId as string | undefined;
      const rooms = await storage.getRooms(buildingId);
      return res.status(200).json(rooms);
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
        '/auth/user',
        '/auth/admin-login'
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
