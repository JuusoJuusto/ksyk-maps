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
  AppSettings,
  InsertAppSettings,
} from "@shared/schema";

// Initialize Firebase Admin (server-side)
let firebaseInitialized = false;
let firebaseError: Error | null = null;

if (!getApps().length) {
  try {
    console.log('🔥 Attempting Firebase initialization...');
    console.log('Environment check:', {
      HAS_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      SERVICE_ACCOUNT_LENGTH: process.env.FIREBASE_SERVICE_ACCOUNT?.length || 0,
      HAS_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
      HAS_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
      HAS_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY
    });
    
    // Priority 1: Try FIREBASE_SERVICE_ACCOUNT environment variable (for Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        console.log('📝 Parsing FIREBASE_SERVICE_ACCOUNT...');
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        
        console.log('🔑 Service account parsed, initializing Firebase...');
        initializeApp({
          credential: cert(serviceAccount),
          projectId: "ksyk-maps",
        });
        
        firebaseInitialized = true;
        console.log('✅ Firebase initialized with FIREBASE_SERVICE_ACCOUNT env var');
      } catch (parseError) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', parseError);
        firebaseError = parseError as Error;
        throw parseError;
      }
    }
    // Priority 2: Try to load service account key from file (for local development)
    else {
      const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        
        initializeApp({
          credential: cert(serviceAccount),
          projectId: "ksyk-maps",
        });
        
        firebaseInitialized = true;
        console.log('✅ Firebase initialized with serviceAccountKey.json file');
      } else {
        // Priority 3: Try individual environment variables
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
        
        if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
          initializeApp({
            credential: cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: privateKey,
            }),
          });
          
          firebaseInitialized = true;
          console.log('✅ Firebase initialized with individual environment variables');
        } else {
          const error = new Error('No Firebase credentials found. Please set FIREBASE_SERVICE_ACCOUNT environment variable.');
          firebaseError = error;
          console.error('❌', error.message);
          throw error;
        }
      }
    }
  } catch (error) {
    firebaseError = error as Error;
    console.error('❌ Firebase initialization error:', error);
    console.error('Available env vars:', {
      hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    });
    throw error;
  }
}

const db = getFirestore();

export class FirebaseStorage implements IStorage {
  constructor() {
    if (!firebaseInitialized) {
      const errorMsg = firebaseError 
        ? `Firebase not initialized: ${firebaseError.message}`
        : 'Firebase not initialized for unknown reason';
      console.error('❌ FirebaseStorage constructor error:', errorMsg);
      throw new Error(errorMsg);
    }
    console.log('✅ FirebaseStorage instance created successfully');
  }
  
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
      console.log('🔍 FirebaseStorage.getBuildings() called');
      console.log('📊 Querying Firestore for buildings with isActive=true...');
      
      const snapshot = await db.collection('buildings').where('isActive', '==', true).get();
      
      console.log(`📦 Firestore returned ${snapshot.size} documents`);
      
      if (snapshot.empty) {
        console.log('⚠️ No buildings found with isActive=true');
        console.log('🔍 Trying to get ALL buildings (without isActive filter)...');
        
        const allSnapshot = await db.collection('buildings').get();
        console.log(`📦 Total buildings in collection: ${allSnapshot.size}`);
        
        if (!allSnapshot.empty) {
          const allBuildings = allSnapshot.docs.map(doc => {
            const data = doc.data();
            console.log(`  - Building ${doc.id}: isActive=${data.isActive}, name=${data.name}`);
            return { id: doc.id, ...data };
          });
          
          // Return all buildings regardless of isActive status
          console.log('✅ Returning all buildings (ignoring isActive filter)');
          return allBuildings as Building[];
        }
      }
      
      const buildings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Building));
      console.log(`✅ Returning ${buildings.length} active buildings`);
      return buildings;
    } catch (error) {
      console.error('❌ Error getting buildings:', error);
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
      console.log(`🗑️ Deleting building: ${id}`);
      await db.collection('buildings').doc(id).delete();
      console.log(`✅ Building ${id} deleted successfully`);
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
        isActive: true, // CRITICAL: Set isActive to true so hallways show up
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('Creating hallway in Firebase:', hallwayData);
      await docRef.set(hallwayData);
      console.log('Hallway created successfully:', docRef.id);
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
        isActive: true, // CRITICAL: Set isActive to true so rooms show up
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('Creating room in Firebase:', roomData);
      await docRef.set(roomData);
      console.log('Room created successfully:', docRef.id);
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
      const now = new Date();
      
      // Try with orderBy first
      try {
        const snapshot = await db.collection('announcements')
          .where('isActive', '==', true)
          .orderBy('createdAt', 'desc')
          .limit(limit * 2) // Fetch more to account for expired ones
          .get();
        
        const announcements = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Announcement))
          .filter(announcement => {
            // Filter out expired announcements
            if (announcement.expiresAt) {
              const expiresDate = announcement.expiresAt instanceof Date 
                ? announcement.expiresAt 
                : new Date(announcement.expiresAt);
              return expiresDate > now;
            }
            return true; // No expiry date means it doesn't expire
          })
          .slice(0, limit); // Apply the original limit after filtering
        
        return announcements;
      } catch (indexError) {
        // If index doesn't exist, fetch without orderBy
        console.log('⚠️ Firebase index not found, fetching without orderBy');
        const snapshot = await db.collection('announcements')
          .where('isActive', '==', true)
          .limit(limit * 2) // Fetch more to account for expired ones
          .get();
        
        const announcements = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Announcement))
          .filter(announcement => {
            // Filter out expired announcements
            if (announcement.expiresAt) {
              const expiresDate = announcement.expiresAt instanceof Date 
                ? announcement.expiresAt 
                : new Date(announcement.expiresAt);
              return expiresDate > now;
            }
            return true; // No expiry date means it doesn't expire
          });
        
        // Sort in memory
        const sorted = announcements.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        
        return sorted.slice(0, limit); // Apply the original limit after filtering
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

  // App Settings operations
  async getAppSettings(): Promise<AppSettings> {
    try {
      const doc = await db.collection('appSettings').doc('default').get();
      if (!doc.exists) {
        // Return default settings if not found
        const defaultSettings: AppSettings = {
          id: 'default',
          appName: 'KSYK Map',
          appNameEn: 'KSYK Map',
          appNameFi: 'KSYK Kartta',
          logoUrl: null,
          primaryColor: '#3B82F6',
          secondaryColor: '#2563EB',
          headerTitle: 'Campus Map',
          headerTitleEn: 'Campus Map',
          headerTitleFi: 'Kampuskartta',
          footerText: null,
          footerTextEn: null,
          footerTextFi: null,
          contactEmail: null,
          contactPhone: null,
          showStats: true,
          showAnnouncements: true,
          enableSearch: true,
          defaultLanguage: 'en',
          updatedAt: new Date()
        };
        // Create default settings
        await db.collection('appSettings').doc('default').set(defaultSettings);
        return defaultSettings;
      }
      return { id: doc.id, ...doc.data() } as AppSettings;
    } catch (error) {
      console.error('Error getting app settings:', error);
      throw error;
    }
  }

  async updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings> {
    try {
      const updateData = {
        ...settings,
        updatedAt: new Date()
      };
      await db.collection('appSettings').doc('default').set(updateData, { merge: true });
      const updated = await this.getAppSettings();
      return updated;
    } catch (error) {
      console.error('Error updating app settings:', error);
      throw error;
    }
  }
}

export const firebaseStorage = new FirebaseStorage();