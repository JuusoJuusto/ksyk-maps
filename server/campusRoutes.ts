/**
 * KSYK Maps campus API routes
 * Room booking, campus services, favorites, and notifications
 */

import type { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated } from "./simpleAuth";

export function registerCampusRoutes(app: Express) {
  // ============================================
  // ROOM BOOKING ROUTES
  // ============================================

  // Get available rooms for booking
  app.get('/api/rooms/available', async (req, res) => {
    try {
      const { date, time, duration, minCapacity, amenities } = req.query;
      
      // Parse parameters
      const requestedDate = date as string;
      const requestedTime = time as string;
      const durationMinutes = parseInt(duration as string) || 60;
      const capacity = parseInt(minCapacity as string) || 1;
      const requiredAmenities = amenities ? (amenities as string).split(',').filter(Boolean) : [];

      // Get all bookable rooms
      const allRooms = await storage.getRooms();
      const bookableRooms = allRooms.filter((room: any) => room.isBookable);

      // Filter by capacity
      let filteredRooms = bookableRooms.filter((room: any) => 
        (room.maxOccupancy || room.capacity || 0) >= capacity
      );

      // Filter by amenities
      if (requiredAmenities.length > 0) {
        filteredRooms = filteredRooms.filter((room: any) => {
          const roomAmenities = room.amenities || [];
          return requiredAmenities.every(amenity => 
            roomAmenities.some((ra: string) => ra.toLowerCase().includes(amenity.toLowerCase()))
          );
        });
      }

      // Check availability (simplified - in production, check against bookings)
      const startDateTime = new Date(`${requestedDate}T${requestedTime}`);
      const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

      // TODO: Check against actual bookings in database
      // For now, return all filtered rooms as available
      const availableRooms = filteredRooms.map((room: any) => ({
        ...room,
        currentStatus: 'free', // Simplified - should check real-time status
        nextAvailableAt: null,
      }));

      res.json(availableRooms);
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      res.status(500).json({ message: 'Failed to fetch available rooms' });
    }
  });

  // Book a room
  app.post('/api/rooms/book', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { roomId, startTime, endTime, purpose, attendees, notes } = req.body;

      if (!roomId || !startTime || !endTime) {
        return res.status(400).json({ message: 'Room ID, start time, and end time are required' });
      }

      // Verify room is bookable
      const room = await storage.getRoom(roomId);
      if (!room || !room.isBookable) {
        return res.status(400).json({ message: 'Room is not available for booking' });
      }

      // Check capacity
      if (attendees && room.maxOccupancy && attendees > room.maxOccupancy) {
        return res.status(400).json({ message: `Room capacity is ${room.maxOccupancy} people` });
      }

      // TODO: Check for conflicting bookings
      // For now, create booking directly

      // Generate QR code for check-in
      const qrCode = `KSYK-${roomId}-${Date.now()}`;

      const booking = await storage.createRoomBooking({
        roomId,
        userId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        purpose: purpose || 'study',
        attendees: attendees || 1,
        notes: notes || null,
        status: 'confirmed',
        qrCode,
      });

      // Update room status
      await storage.updateRoom(roomId, {
        currentStatus: 'reserved',
        nextAvailableAt: new Date(endTime),
      });

      // Create notification
      await storage.createNotification({
        userId,
        type: 'booking_reminder',
        title: 'Room Booking Confirmed',
        titleFi: 'Huonevaraus vahvistettu',
        message: `Your booking for room ${room.roomNumber} is confirmed`,
        messageFi: `Varauksesi huoneeseen ${room.roomNumber} on vahvistettu`,
        priority: 'normal',
      });

      res.status(201).json(booking);
    } catch (error) {
      console.error('Error creating booking:', error);
      res.status(500).json({ message: 'Failed to create booking' });
    }
  });

  // Get user's bookings
  app.get('/api/bookings/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookings = await storage.getUserBookings(userId);
      
      // Enrich with room data
      const enrichedBookings = await Promise.all(
        bookings.map(async (booking: any) => {
          const room = await storage.getRoom(booking.roomId);
          return { ...booking, room };
        })
      );

      res.json(enrichedBookings);
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      res.status(500).json({ message: 'Failed to fetch bookings' });
    }
  });

  // Cancel a booking
  app.delete('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const bookingId = req.params.id;

      const booking = await storage.getRoomBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Verify ownership
      if (booking.userId !== userId) {
        return res.status(403).json({ message: 'Not authorized to cancel this booking' });
      }

      // Update booking status
      await storage.updateRoomBooking(bookingId, {
        status: 'cancelled',
      });

      // Update room status if this was the next booking
      const room = await storage.getRoom(booking.roomId);
      if (room.currentStatus === 'reserved') {
        await storage.updateRoom(booking.roomId, {
          currentStatus: 'free',
          nextAvailableAt: null,
        });
      }

      res.json({ success: true, message: 'Booking cancelled' });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(500).json({ message: 'Failed to cancel booking' });
    }
  });

  // ============================================
  // CAMPUS SERVICES ROUTES
  // ============================================

  // Get campus services
  app.get('/api/services', async (req, res) => {
    try {
      const { type, openOnly } = req.query;
      
      let services = await storage.getCampusServices();

      // Filter by type
      if (type && type !== 'all') {
        services = services.filter((s: any) => s.type === type);
      }

      // Filter by open status
      if (openOnly === 'true') {
        services = services.filter((s: any) => s.currentlyOpen);
      }

      res.json(services);
    } catch (error) {
      console.error('Error fetching campus services:', error);
      res.status(500).json({ message: 'Failed to fetch services' });
    }
  });

  // Get single service
  app.get('/api/services/:id', async (req, res) => {
    try {
      const service = await storage.getCampusService(req.params.id);
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }
      res.json(service);
    } catch (error) {
      console.error('Error fetching service:', error);
      res.status(500).json({ message: 'Failed to fetch service' });
    }
  });

  // Create campus service (admin only)
  app.post('/api/services', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const service = await storage.createCampusService(req.body);
      res.status(201).json(service);
    } catch (error) {
      console.error('Error creating service:', error);
      res.status(500).json({ message: 'Failed to create service' });
    }
  });

  // Update campus service (admin only)
  app.put('/api/services/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'owner')) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const service = await storage.updateCampusService(req.params.id, req.body);
      res.json(service);
    } catch (error) {
      console.error('Error updating service:', error);
      res.status(500).json({ message: 'Failed to update service' });
    }
  });

  // ============================================
  // FAVORITES ROUTES
  // ============================================

  // Get user favorites
  app.get('/api/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavorites(userId);
      
      // Enrich with room/service data
      const enrichedFavorites = await Promise.all(
        favorites.map(async (fav: any) => {
          if (fav.roomId) {
            const room = await storage.getRoom(fav.roomId);
            return { ...fav, room };
          } else if (fav.serviceId) {
            const service = await storage.getCampusService(fav.serviceId);
            return { ...fav, service };
          }
          return fav;
        })
      );

      res.json(enrichedFavorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ message: 'Failed to fetch favorites' });
    }
  });

  // Toggle favorite
  app.post('/api/favorites/toggle', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { roomId, serviceId, type, nickname } = req.body;

      // Check if already favorited
      const existing = await storage.findUserFavorite(userId, roomId, serviceId);

      if (existing) {
        // Remove favorite
        await storage.deleteUserFavorite(existing.id);
        res.json({ success: true, action: 'removed' });
      } else {
        // Add favorite
        const favorite = await storage.createUserFavorite({
          userId,
          roomId: roomId || null,
          serviceId: serviceId || null,
          type,
          nickname: nickname || null,
        });
        res.json({ success: true, action: 'added', favorite });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      res.status(500).json({ message: 'Failed to toggle favorite' });
    }
  });

  // ============================================
  // NOTIFICATIONS ROUTES
  // ============================================

  // Get user notifications
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // Mark notification as read
  app.put('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationId = req.params.id;

      const notification = await storage.getNotification(notificationId);
      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ message: 'Notification not found' });
      }

      await storage.updateNotification(notificationId, {
        read: true,
        readAt: new Date(),
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Failed to update notification' });
    }
  });

  // Mark all notifications as read
  app.post('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ message: 'Failed to update notifications' });
    }
  });

  // ============================================
  // USER HISTORY ROUTES
  // ============================================

  // Track user action
  app.post('/api/history/track', async (req, res) => {
    try {
      const { userId, sessionId, roomId, serviceId, action, searchQuery } = req.body;

      await storage.createUserHistory({
        userId: userId || null,
        sessionId: sessionId || null,
        roomId: roomId || null,
        serviceId: serviceId || null,
        action,
        searchQuery: searchQuery || null,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error tracking user action:', error);
      res.status(500).json({ message: 'Failed to track action' });
    }
  });

  // Get user history
  app.get('/api/history/my', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const history = await storage.getUserHistory(userId, limit);
      res.json(history);
    } catch (error) {
      console.error('Error fetching user history:', error);
      res.status(500).json({ message: 'Failed to fetch history' });
    }
  });

  console.log('✅ KSYK Maps campus routes registered');
}
