import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import * as fs from 'fs';
import type { IStorage } from './storage';
import type {
  User,
  UpsertUser,
  Building,
  InsertBuilding,
  Floor,
  InsertFloor,
  Hallway,
  InsertHallway,
  Room,
  InsertRoom,
  Staff,
  InsertStaff,
  Event,
  InsertEvent,
  Announcement,
  InsertAnnouncement,
} from "@shared/schema";

// Initialize Firebase Admin (server-side)
if (!getApps().length) {
  try {
    // Try to load service account key from file
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      
      initializeApp({
        credential: cert(serviceAccount),
        projectId: "ksyk-maps",
      });
      
      console.log('✅ Firebase initialized with service account key');
    } else {
      // Fallback: Try environment variables
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      
      if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
        initializeApp({
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
        });
        
        console.log('✅ Firebase initialized with environment variables');
      } else {
        // Last resort: Initialize without credentials (will use default)
        initializeApp({
          projectId: "ksyk-maps",
        });
        
        console.log('⚠️ Firebase initialized without credentials (limited functionality)');
      }
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    throw error;
  }
}

const db = getFirestore();

export class FirebaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const doc = await db.collection('users').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
      if (snapshot.empty) return undefined;
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const snapshot = await db.collection('users').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await db.collection('users').doc(id).delete();
      console.log(`User ${id} deleted successfully`);
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    try {
      // Use provided ID or generate a real Firebase ID
      const userId = user.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      
      // Check if user exists
      const existingDoc = await db.collection('users').doc(userId).get();
      
      const userData: any = {
        ...user,
        updatedAt: now,
      };
      
      // Only set createdAt for new users
      if (!existingDoc.exists) {
        userData.createdAt = now;
      }
      
      await db.collection('users').doc(userId).set(userData, { merge: true });
      
      // Get the full user data
      const finalDoc = await db.collection('users').doc(userId).get();
      return { id: userId, ...finalDoc.data() } as User;
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  // Building operations
  async getBuildings(): Promise<Building[]> {
    try {
      const snapshot = await db.collection('buildings').where('isActive', '==', true).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Building));
    } catch (error) {
      console.error('Error getting buildings:', error);
      return [];
    }
  }

  async getBuilding(id: string): Promise<Building | undefined> {
    try {
      const doc = await db.collection('buildings').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as Building;
    } catch (error) {
      console.error('Error getting building:', error);
      return undefined;
    }
  }

  async createBuilding(building: InsertBuilding): Promise<Building> {
    try {
      const docRef = db.collection('buildings').doc();
      const buildingData = {
        ...building,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await docRef.set(buildingData);
      return buildingData as Building;
    } catch (error) {
      console.error('Error creating building:', error);
      throw error;
    }
  }

  async updateBuilding(id: string, building: Partial<InsertBuilding>): Promise<Building> {
    try {
      const updateData = {
        ...building,
        updatedAt: new Date(),
      };
      
      await db.collection('buildings').doc(id).update(updateData);
      const updated = await this.getBuilding(id);
      if (!updated) throw new Error('Building not found after update');
      return updated;
    } catch (error) {
      console.error('Error updating building:', error);
      throw error;
    }
  }

  async deleteBuilding(id: string): Promise<void> {
    try {
      await db.collection('buildings').doc(id).update({ isActive: false });
    } catch (error) {
      console.error('Error deleting building:', error);
      throw error;
    }
  }

  // Floor operations
  async getFloors(buildingId?: string): Promise<Floor[]> {
    try {
      let query = db.collection('floors').where('isActive', '==', true);
      if (buildingId) {
        query = query.where('buildingId', '==', buildingId);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Floor));
    } catch (error) {
      console.error('Error getting floors:', error);
      return [];
    }
  }

  async getFloor(id: string): Promise<Floor | undefined> {
    try {
      const doc = await db.collection('floors').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as Floor;
    } catch (error) {
      console.error('Error getting floor:', error);
      return undefined;
    }
  }

  async createFloor(floor: InsertFloor): Promise<Floor> {
    try {
      const docRef = db.collection('floors').doc();
      const floorData = {
        ...floor,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await docRef.set(floorData);
      return floorData as Floor;
    } catch (error) {
      console.error('Error creating floor:', error);
      throw error;
    }
  }

  async updateFloor(id: string, floor: Partial<InsertFloor>): Promise<Floor> {
    try {
      const updateData = {
        ...floor,
        updatedAt: new Date(),
      };
      
      await db.collection('floors').doc(id).update(updateData);
      const updated = await this.getFloor(id);
      if (!updated) throw new Error('Floor not found after update');
      return updated;
    } catch (error) {
      console.error('Error updating floor:', error);
      throw error;
    }
  }

  async deleteFloor(id: string): Promise<void> {
    try {
      await db.collection('floors').doc(id).update({ isActive: false });
    } catch (error) {
      console.error('Error deleting floor:', error);
      throw error;
    }
  }

  // Hallway operations
  async getHallways(buildingId?: string, floorId?: string): Promise<Hallway[]> {
    try {
      let query = db.collection('hallways').where('isActive', '==', true);
      if (buildingId) {
        query = query.where('buildingId', '==', buildingId);
      }
      if (floorId) {
        query = query.where('floorId', '==', floorId);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Hallway));
    } catch (error) {
      console.error('Error getting hallways:', error);
      return [];
    }
  }

  async getHallway(id: string): Promise<Hallway | undefined> {
    try {
      const doc = await db.collection('hallways').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as Hallway;
    } catch (error) {
      console.error('Error getting hallway:', error);
      return undefined;
    }
  }

  async createHallway(hallway: InsertHallway): Promise<Hallway> {
    try {
      const docRef = db.collection('hallways').doc();
      const hallwayData = {
        ...hallway,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await docRef.set(hallwayData);
      return hallwayData as Hallway;
    } catch (error) {
      console.error('Error creating hallway:', error);
      throw error;
    }
  }

  async updateHallway(id: string, hallway: Partial<InsertHallway>): Promise<Hallway> {
    try {
      const updateData = {
        ...hallway,
        updatedAt: new Date(),
      };
      
      await db.collection('hallways').doc(id).update(updateData);
      const updated = await this.getHallway(id);
      if (!updated) throw new Error('Hallway not found after update');
      return updated;
    } catch (error) {
      console.error('Error updating hallway:', error);
      throw error;
    }
  }

  async deleteHallway(id: string): Promise<void> {
    try {
      await db.collection('hallways').doc(id).update({ isActive: false });
    } catch (error) {
      console.error('Error deleting hallway:', error);
      throw error;
    }
  }

  // Room operations
  async getRooms(buildingId?: string): Promise<Room[]> {
    try {
      let query = db.collection('rooms').where('isActive', '==', true);
      if (buildingId) {
        query = query.where('buildingId', '==', buildingId);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
    } catch (error) {
      console.error('Error getting rooms:', error);
      return [];
    }
  }

  async getRoom(id: string): Promise<Room | undefined> {
    try {
      const doc = await db.collection('rooms').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as Room;
    } catch (error) {
      console.error('Error getting room:', error);
      return undefined;
    }
  }

  async searchRooms(query: string): Promise<Room[]> {
    try {
      // Firebase doesn't support full-text search natively, so we'll do a simple search
      const snapshot = await db.collection('rooms')
        .where('isActive', '==', true)
        .get();
      
      const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Room));
      
      // Client-side filtering for search
      const searchTerm = query.toLowerCase();
      return rooms.filter(room => 
        room.name?.toLowerCase().includes(searchTerm) ||
        room.roomNumber?.toLowerCase().includes(searchTerm) ||
        room.type?.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching rooms:', error);
      return [];
    }
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    try {
      const docRef = db.collection('rooms').doc();
      const roomData = {
        ...room,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await docRef.set(roomData);
      return roomData as Room;
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room> {
    try {
      const updateData = {
        ...room,
        updatedAt: new Date(),
      };
      
      await db.collection('rooms').doc(id).update(updateData);
      const updated = await this.getRoom(id);
      if (!updated) throw new Error('Room not found after update');
      return updated;
    } catch (error) {
      console.error('Error updating room:', error);
      throw error;
    }
  }

  async deleteRoom(id: string): Promise<void> {
    try {
      await db.collection('rooms').doc(id).update({ isActive: false });
    } catch (error) {
      console.error('Error deleting room:', error);
      throw error;
    }
  }

  // Staff operations
  async getStaff(): Promise<Staff[]> {
    try {
      const snapshot = await db.collection('staff').where('isActive', '==', true).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
    } catch (error) {
      console.error('Error getting staff:', error);
      return [];
    }
  }

  async getStaffMember(id: string): Promise<Staff | undefined> {
    try {
      const doc = await db.collection('staff').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as Staff;
    } catch (error) {
      console.error('Error getting staff member:', error);
      return undefined;
    }
  }

  async updateStaffMember(id: string, staff: Partial<InsertStaff>): Promise<Staff> {
    try {
      const updateData = {
        ...staff,
        updatedAt: new Date(),
      };
      
      await db.collection('staff').doc(id).update(updateData);
      const updated = await this.getStaffMember(id);
      if (!updated) throw new Error('Staff member not found after update');
      return updated;
    } catch (error) {
      console.error('Error updating staff member:', error);
      throw error;
    }
  }

  async deleteStaffMember(id: string): Promise<void> {
    try {
      await db.collection('staff').doc(id).update({ isActive: false });
    } catch (error) {
      console.error('Error deleting staff member:', error);
      throw error;
    }
  }

  async searchStaff(query: string, department?: string): Promise<Staff[]> {
    try {
      let dbQuery = db.collection('staff').where('isActive', '==', true);
      if (department) {
        dbQuery = dbQuery.where('department', '==', department);
      }
      
      const snapshot = await dbQuery.get();
      const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      
      // Client-side filtering for search
      const searchTerm = query.toLowerCase();
      return staff.filter(member => 
        member.firstName?.toLowerCase().includes(searchTerm) ||
        member.lastName?.toLowerCase().includes(searchTerm) ||
        member.email?.toLowerCase().includes(searchTerm) ||
        member.position?.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching staff:', error);
      return [];
    }
  }

  async createStaffMember(staff: InsertStaff): Promise<Staff> {
    try {
      const docRef = db.collection('staff').doc();
      const staffData = {
        ...staff,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await docRef.set(staffData);
      return staffData as Staff;
    } catch (error) {
      console.error('Error creating staff member:', error);
      throw error;
    }
  }

  // Event operations
  async getEvents(startDate?: Date, endDate?: Date): Promise<Event[]> {
    try {
      let query = db.collection('events').where('isActive', '==', true);
      
      if (startDate) {
        query = query.where('startTime', '>=', startDate);
      }
      if (endDate) {
        query = query.where('startTime', '<=', endDate);
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }

  async getEvent(id: string): Promise<Event | undefined> {
    try {
      const doc = await db.collection('events').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as Event;
    } catch (error) {
      console.error('Error getting event:', error);
      return undefined;
    }
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    try {
      const docRef = db.collection('events').doc();
      const eventData = {
        ...event,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await docRef.set(eventData);
      return eventData as Event;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event> {
    try {
      const updateData = {
        ...event,
        updatedAt: new Date(),
      };
      
      await db.collection('events').doc(id).update(updateData);
      const updated = await this.getEvent(id);
      if (!updated) throw new Error('Event not found after update');
      return updated;
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(id: string): Promise<void> {
    try {
      await db.collection('events').doc(id).update({ isActive: false });
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // Announcement operations
  async getAnnouncements(limit: number = 10): Promise<Announcement[]> {
    try {
      // Try with orderBy first
      try {
        const snapshot = await db.collection('announcements')
          .where('isActive', '==', true)
          .orderBy('createdAt', 'desc')
          .limit(limit)
          .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      } catch (indexError) {
        // If index doesn't exist, fetch without orderBy
        console.log('⚠️ Firebase index not found, fetching without orderBy');
        const snapshot = await db.collection('announcements')
          .where('isActive', '==', true)
          .limit(limit)
          .get();
        
        const announcements = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
        // Sort in memory
        return announcements.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      }
    } catch (error) {
      console.error('Error getting announcements:', error);
      return [];
    }
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    try {
      const doc = await db.collection('announcements').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() } as Announcement;
    } catch (error) {
      console.error('Error getting announcement:', error);
      return undefined;
    }
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    try {
      const docRef = db.collection('announcements').doc();
      const announcementData = {
        ...announcement,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await docRef.set(announcementData);
      return announcementData as Announcement;
    } catch (error) {
      console.error('Error creating announcement:', error);
      throw error;
    }
  }

  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement> {
    try {
      const updateData = {
        ...announcement,
        updatedAt: new Date(),
      };
      
      await db.collection('announcements').doc(id).update(updateData);
      const updated = await this.getAnnouncement(id);
      if (!updated) throw new Error('Announcement not found after update');
      return updated;
    } catch (error) {
      console.error('Error updating announcement:', error);
      throw error;
    }
  }

  async deleteAnnouncement(id: string): Promise<void> {
    try {
      await db.collection('announcements').doc(id).update({ isActive: false });
    } catch (error) {
      console.error('Error deleting announcement:', error);
      throw error;
    }
  }
}

export const firebaseStorage = new FirebaseStorage();