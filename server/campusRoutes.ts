/**
 * KSYK Maps campus API routes
 * Room booking, campus services, favorites, and notifications
 * Storage methods for booking/services/favorites/notifications are not yet
 * implemented — these routes return safe empty responses or 501.
 */

import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./simpleAuth";

export function registerCampusRoutes(app: Express) {
  // ── ROOM BOOKING ROUTES ──────────────────────────────────────────────────

  app.get('/api/rooms/available', async (req, res) => {
    try {
      const { minCapacity, amenities } = req.query;
      const capacity = parseInt(minCapacity as string) || 1;
      const requiredAmenities = amenities ? (amenities as string).split(',').filter(Boolean) : [];
      const allRooms = await storage.getRooms();
      let filtered = (allRooms as any[]).filter(r => r.isBookable);
      if (capacity > 1) filtered = filtered.filter(r => (r.maxOccupancy || r.capacity || 0) >= capacity);
      if (requiredAmenities.length) {
        filtered = filtered.filter(r =>
          requiredAmenities.every(a => (r.amenities || []).some((ra: string) => ra.toLowerCase().includes(a.toLowerCase())))
        );
      }
      res.json(filtered.map(r => ({ ...r, currentStatus: 'free', nextAvailableAt: null })));
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      res.status(500).json({ message: 'Failed to fetch available rooms' });
    }
  });

  app.post('/api/rooms/book', isAuthenticated, (_req, res) => {
    res.status(501).json({ message: 'Room booking not yet implemented' });
  });

  app.get('/api/bookings/my', isAuthenticated, (_req, res) => {
    res.json([]);
  });

  app.delete('/api/bookings/:id', isAuthenticated, (_req, res) => {
    res.status(501).json({ message: 'Booking cancellation not yet implemented' });
  });

  // ── CAMPUS SERVICES ROUTES ───────────────────────────────────────────────

  app.get('/api/services', (_req, res) => {
    res.json([]);
  });

  app.get('/api/services/:id', (_req, res) => {
    res.status(404).json({ message: 'Service not found' });
  });

  app.post('/api/services', isAuthenticated, (_req, res) => {
    res.status(501).json({ message: 'Campus services not yet implemented' });
  });

  app.put('/api/services/:id', isAuthenticated, (_req, res) => {
    res.status(501).json({ message: 'Campus services not yet implemented' });
  });

  // ── FAVORITES ROUTES ─────────────────────────────────────────────────────

  app.get('/api/favorites', isAuthenticated, (_req, res) => {
    res.json([]);
  });

  app.post('/api/favorites/toggle', isAuthenticated, (_req, res) => {
    res.status(501).json({ message: 'Favorites not yet implemented' });
  });

  // ── NOTIFICATIONS ROUTES ─────────────────────────────────────────────────

  app.get('/api/notifications', isAuthenticated, (_req, res) => {
    res.json([]);
  });

  app.put('/api/notifications/:id/read', isAuthenticated, (_req, res) => {
    res.status(501).json({ message: 'Notifications not yet implemented' });
  });

  app.post('/api/notifications/read-all', isAuthenticated, (_req, res) => {
    res.json({ success: true });
  });

  // ── USER HISTORY ROUTES ──────────────────────────────────────────────────

  app.post('/api/history/track', (_req, res) => {
    res.json({ success: true });
  });

  app.get('/api/history/my', isAuthenticated, (_req, res) => {
    res.json([]);
  });

  console.log('✅ KSYK Maps campus routes registered');
}
