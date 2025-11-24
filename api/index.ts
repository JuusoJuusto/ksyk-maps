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
    
    // Announcements endpoint
    if (apiPath === '/announcements' && req.method === 'GET') {
      const announcements = await storage.getAnnouncements();
      return res.status(200).json(announcements);
    }
    
    // Auth user endpoint
    if (apiPath === '/auth/user' && req.method === 'GET') {
      // For now, return unauthorized
      // TODO: Implement proper auth
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
        '/auth/user'
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
