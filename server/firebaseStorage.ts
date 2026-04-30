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

  // Wilma User operations
  async getWilmaUsers(role?: string): Promise<any[]> {
    try {
      console.log('🔍 FirebaseStorage.getWilmaUsers called', role ? `with role filter: ${role}` : '');
      
      if (role === 'student') {
        // Get from wilmaUsers/students subcollection
        const snapshot = await db.collection('wilmaUsers').doc('students').collection('list').where('isActive', '==', true).get();
        console.log(`📦 Found ${snapshot.size} active students`);
        const students = snapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id }; // Ensure doc.id takes precedence
        });
        console.log('📦 Sample student:', students[0]);
        return students;
      }
      
      if (role === 'parent') {
        // Get from wilmaUsers/parents subcollection
        const snapshot = await db.collection('wilmaUsers').doc('parents').collection('list').where('isActive', '==', true).get();
        console.log(`📦 Found ${snapshot.size} active parents`);
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id };
        });
      }
      
      // Get all - fetch from both subcollections
      const [studentsSnapshot, parentsSnapshot, othersSnapshot] = await Promise.all([
        db.collection('wilmaUsers').doc('students').collection('list').where('isActive', '==', true).get(),
        db.collection('wilmaUsers').doc('parents').collection('list').where('isActive', '==', true).get(),
        db.collection('wilmaUsers').where('isActive', '==', true).get()
      ]);
      
      const users = [
        ...studentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id };
        }),
        ...parentsSnapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id };
        }),
        ...othersSnapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, id: doc.id };
        })
      ];
      
      console.log('✅ Returning Wilma users:', users.length);
      return users;
    } catch (error) {
      console.error('❌ Error fetching Wilma users:', error);
      return [];
    }
  }

  async getWilmaUser(id: string): Promise<any | undefined> {
    try {
      console.log('🔍 FirebaseStorage.getWilmaUser called with ID:', id);
      
      // Try students subcollection first
      let doc = await db.collection('wilmaUsers').doc('students').collection('list').doc(id).get();
      if (doc.exists) {
        console.log('✅ Found student in students subcollection');
        const data = doc.data();
        return { ...data, id: doc.id };
      }
      
      // Try parents subcollection
      doc = await db.collection('wilmaUsers').doc('parents').collection('list').doc(id).get();
      if (doc.exists) {
        console.log('✅ Found user in parents subcollection');
        const data = doc.data();
        return { ...data, id: doc.id };
      }
      
      // Try main collection
      doc = await db.collection('wilmaUsers').doc(id).get();
      if (doc.exists) {
        console.log('✅ Found user in main collection');
        const data = doc.data();
        return { ...data, id: doc.id };
      }
      
      console.log('❌ User not found in any collection');
      return undefined;
    } catch (error) {
      console.error('❌ Error fetching Wilma user:', error);
      return undefined;
    }
  }

  async getWilmaUserByUsername(username: string): Promise<any | undefined> {
    try {
      // Try students
      let snapshot = await db.collection('wilmaUsers').doc('students').collection('list').where('username', '==', username).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      // Try parents
      snapshot = await db.collection('wilmaUsers').doc('parents').collection('list').where('username', '==', username).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      // Try main collection
      snapshot = await db.collection('wilmaUsers').where('username', '==', username).limit(1).get();
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      return undefined;
    } catch (error) {
      console.error('Error fetching Wilma user by username:', error);
      return undefined;
    }
  }

  async getWilmaUserByStudentId(studentId: string): Promise<any | undefined> {
    try {
      console.log('🔍 Looking up student by studentId:', studentId);
      
      // Only search in students subcollection
      const snapshot = await db.collection('wilmaUsers').doc('students').collection('list')
        .where('studentId', '==', studentId)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        console.log('✅ Found student by studentId:', doc.id);
        return { id: doc.id, ...doc.data() };
      }
      
      console.log('❌ Student not found with studentId:', studentId);
      return undefined;
    } catch (error) {
      console.error('Error fetching Wilma user by studentId:', error);
      return undefined;
    }
  }

  async createWilmaUser(wilmaUser: any): Promise<any> {
    try {
      console.log('🔵 FirebaseStorage.createWilmaUser called with:', JSON.stringify(wilmaUser, null, 2));
      
      // Determine collection based on role
      let collectionRef;
      if (wilmaUser.role === 'student') {
        collectionRef = db.collection('wilmaUsers').doc('students').collection('list');
      } else if (wilmaUser.role === 'parent') {
        collectionRef = db.collection('wilmaUsers').doc('parents').collection('list');
      } else {
        collectionRef = db.collection('wilmaUsers');
      }
      
      const docRef = collectionRef.doc();
      const wilmaUserData = {
        ...wilmaUser,
        id: docRef.id,
        isActive: wilmaUser.isActive !== false, // Default to true
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('💾 Saving to Firebase:', JSON.stringify(wilmaUserData, null, 2));
      await docRef.set(wilmaUserData);
      console.log('✅ Wilma user saved successfully with ID:', docRef.id);
      
      return wilmaUserData;
    } catch (error) {
      console.error('❌ Error creating Wilma user:', error);
      throw error;
    }
  }

  async updateWilmaUser(id: string, wilmaUser: any): Promise<any> {
    try {
      const updateData = {
        ...wilmaUser,
        updatedAt: new Date(),
      };
      
      // Get the user first to determine which collection it's in
      const existingUser = await this.getWilmaUser(id);
      if (!existingUser) {
        throw new Error('User not found');
      }
      
      // Update in the correct collection
      if (existingUser.role === 'student') {
        await db.collection('wilmaUsers').doc('students').collection('list').doc(id).update(updateData);
      } else if (existingUser.role === 'parent') {
        await db.collection('wilmaUsers').doc('parents').collection('list').doc(id).update(updateData);
      } else {
        await db.collection('wilmaUsers').doc(id).update(updateData);
      }
      
      const updated = await this.getWilmaUser(id);
      return updated;
    } catch (error) {
      console.error('Error updating Wilma user:', error);
      throw error;
    }
  }

  async deleteWilmaUser(id: string): Promise<void> {
    try {
      console.log('🗑️ Permanently deleting Wilma user:', id);
      
      // Get the user first to determine which collection it's in
      const existingUser = await this.getWilmaUser(id);
      if (!existingUser) {
        console.log('⚠️ User not found, nothing to delete');
        return;
      }
      
      // Delete from the correct collection
      if (existingUser.role === 'student') {
        await db.collection('wilmaUsers').doc('students').collection('list').doc(id).delete();
      } else if (existingUser.role === 'parent') {
        await db.collection('wilmaUsers').doc('parents').collection('list').doc(id).delete();
      } else {
        await db.collection('wilmaUsers').doc(id).delete();
      }
      
      console.log('✅ Wilma user permanently deleted from database');
    } catch (error) {
      console.error('Error deleting Wilma user:', error);
      throw error;
    }
  }

  // Parent-Child Linking operations
  async linkParentToChild(parentId: string, childId: string): Promise<void> {
    try {
      console.log(`🔗 Linking parent ${parentId} to child ${childId}`);
      
      // Get parent and child
      const parent = await this.getWilmaUser(parentId);
      const child = await this.getWilmaUser(childId);
      
      if (!parent || !child) {
        throw new Error('Parent or child not found');
      }
      
      if (parent.role !== 'parent') {
        throw new Error('User is not a parent');
      }
      
      if (child.role !== 'student') {
        throw new Error('User is not a student');
      }
      
      // Check if already linked
      if (child.parent1Id === parentId || child.parent2Id === parentId) {
        throw new Error('Parent already linked to this child');
      }
      
      // Determine which parent slot to use
      let updateData: any = {};
      if (!child.parent1Id) {
        updateData = {
          parent1Id: parentId,
          parent1FirstName: parent.firstName,
          parent1LastName: parent.lastName,
          parent1Email: parent.email,
          parent1Phone: parent.phone,
          parent1Relationship: 'Parent',
        };
      } else if (!child.parent2Id) {
        updateData = {
          parent2Id: parentId,
          parent2FirstName: parent.firstName,
          parent2LastName: parent.lastName,
          parent2Email: parent.email,
          parent2Phone: parent.phone,
          parent2Relationship: 'Parent',
        };
      } else {
        throw new Error('Child already has 2 parents linked');
      }
      
      // Update child with parent info
      await this.updateWilmaUser(childId, updateData);
      
      console.log('✅ Parent linked to child successfully');
    } catch (error) {
      console.error('Error linking parent to child:', error);
      throw error;
    }
  }

  async unlinkParentFromChild(parentId: string, childId: string): Promise<void> {
    try {
      console.log(`🔓 Unlinking parent ${parentId} from child ${childId}`);
      
      const child = await this.getWilmaUser(childId);
      if (!child) {
        throw new Error('Child not found');
      }
      
      let updateData: any = {};
      if (child.parent1Id === parentId) {
        updateData = {
          parent1Id: null,
          parent1FirstName: null,
          parent1LastName: null,
          parent1Email: null,
          parent1Phone: null,
          parent1Relationship: null,
        };
      } else if (child.parent2Id === parentId) {
        updateData = {
          parent2Id: null,
          parent2FirstName: null,
          parent2LastName: null,
          parent2Email: null,
          parent2Phone: null,
          parent2Relationship: null,
        };
      } else {
        throw new Error('Parent not linked to this child');
      }
      
      await this.updateWilmaUser(childId, updateData);
      
      console.log('✅ Parent unlinked from child successfully');
    } catch (error) {
      console.error('Error unlinking parent from child:', error);
      throw error;
    }
  }

  async getChildrenForParent(parentId: string): Promise<any[]> {
    try {
      console.log(`👨‍👩‍👧‍👦 Getting children for parent ${parentId}`);
      
      // Search in students subcollection
      const snapshot1 = await db.collection('wilmaUsers').doc('students').collection('list')
        .where('parent1Id', '==', parentId)
        .where('isActive', '==', true)
        .get();
      
      const snapshot2 = await db.collection('wilmaUsers').doc('students').collection('list')
        .where('parent2Id', '==', parentId)
        .where('isActive', '==', true)
        .get();
      
      const children = [
        ...snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data() })),
        ...snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      ];
      
      // Remove duplicates
      const uniqueChildren = Array.from(new Map(children.map(c => [c.id, c])).values());
      
      console.log(`✅ Found ${uniqueChildren.length} children for parent`);
      return uniqueChildren;
    } catch (error) {
      console.error('Error getting children for parent:', error);
      return [];
    }
  }

  async getParentsForChild(childId: string): Promise<any[]> {
    try {
      console.log(`👨‍👩‍👧 Getting parents for child ${childId}`);
      
      const child = await this.getWilmaUser(childId);
      if (!child) {
        return [];
      }
      
      const parents: any[] = [];
      
      if (child.parent1Id) {
        const parent1 = await this.getWilmaUser(child.parent1Id);
        if (parent1) {
          parents.push(parent1);
        }
      }
      
      if (child.parent2Id) {
        const parent2 = await this.getWilmaUser(child.parent2Id);
        if (parent2) {
          parents.push(parent2);
        }
      }
      
      console.log(`✅ Found ${parents.length} parents for child`);
      return parents;
    } catch (error) {
      console.error('Error getting parents for child:', error);
      return [];
    }
  }

  // Wilma Schedule operations
  async getWilmaSchedulesAll(classFilter?: string): Promise<any[]> {
    try {
      let query = db.collection('wilmaSchedules');
      
      if (classFilter) {
        query = query.where('class', '==', classFilter) as any;
      }
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting all Wilma schedules:', error);
      return [];
    }
  }

  async getWilmaSchedules(studentId: string): Promise<any[]> {
    try {
      const snapshot = await db.collection('wilmaSchedules')
        .where('studentId', '==', studentId)
        .where('isActive', '==', true)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting Wilma schedules:', error);
      return [];
    }
  }

  async createWilmaSchedule(schedule: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaSchedules').doc();
      const scheduleData = {
        ...schedule,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(scheduleData);
      return scheduleData;
    } catch (error) {
      console.error('Error creating Wilma schedule:', error);
      throw error;
    }
  }

  async updateWilmaSchedule(id: string, data: any): Promise<any> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };
      await db.collection('wilmaSchedules').doc(id).update(updateData);
      const doc = await db.collection('wilmaSchedules').doc(id).get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error updating Wilma schedule:', error);
      throw error;
    }
  }

  async deleteWilmaSchedule(id: string): Promise<void> {
    try {
      await db.collection('wilmaSchedules').doc(id).delete();
      console.log('✅ Schedule deleted:', id);
    } catch (error) {
      console.error('Error deleting Wilma schedule:', error);
      throw error;
    }
  }

  // Wilma Settings operations
  async getWilmaSettings(): Promise<any> {
    try {
      const doc = await db.collection('wilmaSettings').doc('default').get();
      if (!doc.exists) {
        // Return default settings
        return {
          schoolName: 'Kulosaaren yhteiskoulu',
          academicYear: '2025-2026',
          semesterStart: '2025-08-15',
          semesterEnd: '2025-12-20',
          notificationsEnabled: true,
          emailNotifications: true,
          sessionTimeout: 30
        };
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting Wilma settings:', error);
      return {};
    }
  }

  async updateWilmaSettings(settings: any): Promise<any> {
    try {
      const updateData = {
        ...settings,
        updatedAt: new Date()
      };
      await db.collection('wilmaSettings').doc('default').set(updateData, { merge: true });
      return await this.getWilmaSettings();
    } catch (error) {
      console.error('Error updating Wilma settings:', error);
      throw error;
    }
  }

  // Wilma Grade operations
  async getWilmaGrades(studentId: string): Promise<any[]> {
    try {
      const snapshot = await db.collection('wilmaGrades')
        .where('studentId', '==', studentId)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting Wilma grades:', error);
      return [];
    }
  }

  async createWilmaGrade(grade: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaGrades').doc();
      const gradeData = {
        ...grade,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(gradeData);
      return gradeData;
    } catch (error) {
      console.error('Error creating Wilma grade:', error);
      throw error;
    }
  }

  async updateWilmaGrade(id: string, data: any): Promise<any> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };
      await db.collection('wilmaGrades').doc(id).update(updateData);
      const doc = await db.collection('wilmaGrades').doc(id).get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error updating Wilma grade:', error);
      throw error;
    }
  }

  async deleteWilmaGrade(id: string): Promise<void> {
    try {
      await db.collection('wilmaGrades').doc(id).delete();
      console.log('✅ Grade deleted:', id);
    } catch (error) {
      console.error('Error deleting Wilma grade:', error);
      throw error;
    }
  }

  // Wilma Assignment operations
  async getWilmaAssignments(studentId: string): Promise<any[]> {
    try {
      const snapshot = await db.collection('wilmaAssignments')
        .where('studentId', '==', studentId)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting Wilma assignments:', error);
      return [];
    }
  }

  async createWilmaAssignment(assignment: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaAssignments').doc();
      const assignmentData = {
        ...assignment,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(assignmentData);
      return assignmentData;
    } catch (error) {
      console.error('Error creating Wilma assignment:', error);
      throw error;
    }
  }

  async updateWilmaAssignment(id: string, data: any): Promise<any> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };
      await db.collection('wilmaAssignments').doc(id).update(updateData);
      const doc = await db.collection('wilmaAssignments').doc(id).get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error updating Wilma assignment:', error);
      throw error;
    }
  }

  async deleteWilmaAssignment(id: string): Promise<void> {
    try {
      await db.collection('wilmaAssignments').doc(id).delete();
      console.log('✅ Assignment deleted:', id);
    } catch (error) {
      console.error('Error deleting Wilma assignment:', error);
      throw error;
    }
  }

  async getWilmaAssignmentsByClass(classId: string): Promise<any[]> {
    try {
      const snapshot = await db.collection('wilmaAssignments')
        .where('classId', '==', classId)
        .orderBy('dueDate', 'asc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting class assignments:', error);
      // Fallback without orderBy
      try {
        const snapshot = await db.collection('wilmaAssignments')
          .where('classId', '==', classId)
          .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (fallbackError) {
        return [];
      }
    }
  }

  // Wilma Message operations
  async getAllWilmaMessages(): Promise<any[]> {
    try {
      const snapshot = await db.collection('wilmaMessages')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting all Wilma messages:', error);
      // If orderBy fails (no index), try without it
      try {
        const snapshot = await db.collection('wilmaMessages').limit(100).get();
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort in memory
        return messages.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  async getWilmaMessages(userId: string): Promise<any[]> {
    try {
      const snapshot = await db.collection('wilmaMessages')
        .where('toUserId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting Wilma messages:', error);
      return [];
    }
  }

  async getWilmaMessagesAll(): Promise<any[]> {
    try {
      const snapshot = await db.collection('wilmaMessages')
        .orderBy('sentAt', 'desc')
        .limit(100)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting all Wilma messages:', error);
      // Try without orderBy if index doesn't exist
      try {
        const snapshot = await db.collection('wilmaMessages').limit(100).get();
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort in memory
        return messages.sort((a: any, b: any) => {
          const dateA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
          const dateB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
          return dateB - dateA;
        });
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return [];
      }
    }
  }

  async createWilmaMessage(message: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaMessages').doc();
      const messageData = {
        ...message,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(messageData);
      return messageData;
    } catch (error) {
      console.error('Error creating Wilma message:', error);
      throw error;
    }
  }

  async deleteWilmaMessage(id: string): Promise<void> {
    try {
      await db.collection('wilmaMessages').doc(id).delete();
      console.log('✅ Message deleted:', id);
    } catch (error) {
      console.error('Error deleting Wilma message:', error);
      throw error;
    }
  }

  async markWilmaMessageAsRead(id: string): Promise<void> {
    try {
      await db.collection('wilmaMessages').doc(id).update({
        read: true,
        updatedAt: new Date()
      });
      console.log('✅ Message marked as read:', id);
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  // Wilma Attendance operations
  async getWilmaAttendance(studentId: string): Promise<any[]> {
    try {
      const snapshot = await db.collection('wilmaAttendance')
        .where('studentId', '==', studentId)
        .orderBy('date', 'desc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting Wilma attendance:', error);
      return [];
    }
  }

  async createWilmaAttendance(attendance: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaAttendance').doc();
      const attendanceData = {
        ...attendance,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(attendanceData);
      return attendanceData;
    } catch (error) {
      console.error('Error creating Wilma attendance:', error);
      throw error;
    }
  }

  async updateWilmaAttendance(id: string, data: any): Promise<any> {
    try {
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };
      await db.collection('wilmaAttendance').doc(id).update(updateData);
      const doc = await db.collection('wilmaAttendance').doc(id).get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error updating Wilma attendance:', error);
      throw error;
    }
  }

  async deleteWilmaAttendance(id: string): Promise<void> {
    try {
      await db.collection('wilmaAttendance').doc(id).delete();
      console.log('✅ Attendance deleted:', id);
    } catch (error) {
      console.error('Error deleting Wilma attendance:', error);
      throw error;
    }
  }

  async getWilmaAttendanceByClass(classId: string, date?: string): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaAttendance').where('classId', '==', classId);
      if (date) {
        query = query.where('date', '==', date);
      }
      const snapshot = await query.orderBy('date', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting class attendance:', error);
      return [];
    }
  }

  // Wilma Exam operations
  async getWilmaExams(studentId: string): Promise<any[]> {
    try {
      const snapshot = await db.collection('wilmaExams')
        .where('studentId', '==', studentId)
        .orderBy('date', 'asc')
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting Wilma exams:', error);
      return [];
    }
  }

  async createWilmaExam(exam: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaExams').doc();
      const examData = {
        ...exam,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(examData);
      return examData;
    } catch (error) {
      console.error('Error creating Wilma exam:', error);
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

  // Ticket operations
  async getTickets(): Promise<any[]> {
    try {
      const snapshot = await db.collection('tickets').orderBy('createdAt', 'desc').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting tickets:', error);
      throw error;
    }
  }

  async getTicket(id: string): Promise<any | undefined> {
    try {
      console.log('🔍 FirebaseStorage.getTicket called for ID:', id);
      const doc = await db.collection('tickets').doc(id).get();
      if (!doc.exists) {
        console.log('❌ Ticket not found:', id);
        return undefined;
      }
      const data = doc.data();
      const ticket = { id: doc.id, ...data };
      console.log('📧 Ticket email field:', ticket.email);
      console.log('📋 Full ticket data:', JSON.stringify(ticket, null, 2));
      return ticket;
    } catch (error) {
      console.error('Error getting ticket:', error);
      throw error;
    }
  }

  async createTicket(ticket: any): Promise<any> {
    try {
      const docRef = await db.collection('tickets').add({
        ...ticket,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      const doc = await docRef.get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  async updateTicket(id: string, ticket: any): Promise<any> {
    try {
      console.log('🔧 FirebaseStorage.updateTicket called');
      console.log('   Ticket ID:', id);
      console.log('   Update data:', JSON.stringify(ticket, null, 2));
      console.log('   Email in update data:', ticket.email);
      
      // CRITICAL FIX: Use set with merge to preserve existing fields like email
      await db.collection('tickets').doc(id).set({
        ...ticket,
        updatedAt: new Date()
      }, { merge: true });
      
      console.log('✅ Firestore update complete, fetching updated ticket...');
      const updated = await this.getTicket(id);
      
      if (!updated) throw new Error('Ticket not found after update');
      
      console.log('📧 Updated ticket email:', updated.email);
      console.log('📋 Full updated ticket:', JSON.stringify(updated, null, 2));
      
      return updated;
    } catch (error) {
      console.error('❌ Error updating ticket:', error);
      throw error;
    }
  }

  async deleteTicket(id: string): Promise<void> {
    try {
      await db.collection('tickets').doc(id).delete();
    } catch (error) {
      console.error('Error deleting ticket:', error);
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

  // Admin Login Log operations
  async createAdminLoginLog(log: {
    userId: string | null;
    email: string;
    userName?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    loginStatus: string;
    failureReason?: string | null;
    sessionId?: string | null;
  }): Promise<void> {
    try {
      const docRef = db.collection('adminLoginLogs').doc();
      const logData = {
        ...log,
        id: docRef.id,
        createdAt: new Date(),
      };
      
      console.log('Creating admin login log in Firebase:', logData);
      await docRef.set(logData);
      console.log('Admin login log created successfully:', docRef.id);
    } catch (error) {
      console.error('Error creating admin login log:', error);
      // Don't throw - logging should not break the login flow
    }
  }

  async getAdminLoginLogs(limit: number = 100): Promise<any[]> {
    try {
      const snapshot = await db.collection('adminLoginLogs')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting admin login logs:', error);
      return [];
    }
  }

  // App Log operations
  async createAppLog(log: {
    level: string;
    message: string;
    errorReferenceId?: string | null;
    errorStack?: string | null;
    errorInfo?: any;
    userAgent?: string | null;
    url?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
  }): Promise<void> {
    try {
      const docRef = db.collection('appLogs').doc();
      const logData = {
        ...log,
        id: docRef.id,
        source: log.level || 'info',
        timestamp: new Date(),
        createdAt: new Date(),
      };
      
      await docRef.set(logData);
      console.log(`📝 App Log [${log.level?.toUpperCase() || 'INFO'}] saved to Firebase:`, log.message);
    } catch (error) {
      console.error('Error creating app log:', error);
      // Don't throw - logging should not break the application flow
    }
  }

  async getAppLogs(limit: number = 100): Promise<any[]> {
    try {
      const snapshot = await db.collection('appLogs')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      }));
    } catch (error) {
      console.error('Error getting app logs:', error);
      return [];
    }
  }

  // Analytics operations
  async createPageView(view: any): Promise<void> {
    try {
      const docRef = db.collection('pageViews').doc();
      await docRef.set({
        ...view,
        id: docRef.id,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating page view:', error);
    }
  }

  async createSearchAnalytic(search: any): Promise<void> {
    try {
      const docRef = db.collection('searchAnalytics').doc();
      await docRef.set({
        ...search,
        id: docRef.id,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating search analytic:', error);
    }
  }

  async createNavigationAnalytic(navigation: any): Promise<void> {
    try {
      const docRef = db.collection('navigationAnalytics').doc();
      await docRef.set({
        ...navigation,
        id: docRef.id,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error creating navigation analytic:', error);
    }
  }

  async createUserSession(session: any): Promise<void> {
    try {
      const docRef = db.collection('userSessions').doc(session.sessionId || db.collection('userSessions').doc().id);
      await docRef.set({
        ...session,
        createdAt: new Date(),
        lastActivity: new Date()
      });
    } catch (error) {
      console.error('Error creating user session:', error);
    }
  }

  async updateUserSession(sessionId: string, updates: any): Promise<void> {
    try {
      await db.collection('userSessions').doc(sessionId).update({
        ...updates,
        lastActivity: new Date()
      });
    } catch (error) {
      console.error('Error updating user session:', error);
    }
  }

  async getAnalyticsSummary(days: number = 30): Promise<any> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Get page views
      const pageViewsSnapshot = await db.collection('pageViews')
        .where('createdAt', '>=', cutoffDate)
        .get();
      
      // Get searches
      const searchesSnapshot = await db.collection('searchAnalytics')
        .where('createdAt', '>=', cutoffDate)
        .get();
      
      // Get navigation requests
      const navigationSnapshot = await db.collection('navigationAnalytics')
        .where('createdAt', '>=', cutoffDate)
        .get();
      
      // Get unique sessions
      const sessionsSnapshot = await db.collection('userSessions')
        .where('createdAt', '>=', cutoffDate)
        .get();

      // Calculate metrics
      const pageViews = pageViewsSnapshot.docs;
      const searches = searchesSnapshot.docs;
      const navigations = navigationSnapshot.docs;
      const sessions = sessionsSnapshot.docs;

      // Get unique visitors (unique session IDs)
      const uniqueSessionIds = new Set(sessions.map(doc => doc.id));
      const uniqueVisitors = uniqueSessionIds.size;

      // Calculate session durations
      let totalDuration = 0;
      let validSessions = 0;
      sessions.forEach(doc => {
        const data = doc.data();
        if (data.duration && typeof data.duration === 'number') {
          totalDuration += data.duration;
          validSessions++;
        }
      });
      const avgSessionDuration = validSessions > 0 ? Math.round(totalDuration / validSessions) : 180;

      // Calculate bounce rate (sessions with only 1 page view)
      const sessionPageCounts: { [key: string]: number } = {};
      pageViews.forEach(doc => {
        const sessionId = doc.data().sessionId;
        if (sessionId) {
          sessionPageCounts[sessionId] = (sessionPageCounts[sessionId] || 0) + 1;
        }
      });
      const bouncedSessions = Object.values(sessionPageCounts).filter(count => count === 1).length;
      const bounceRate = sessions.length > 0 ? bouncedSessions / sessions.length : 0;

      // Top pages with avg duration
      const pageCounts: { [key: string]: { views: number; totalDuration: number; count: number } } = {};
      pageViews.forEach(doc => {
        const data = doc.data();
        const page = data.page || data.path || 'Unknown';
        if (!pageCounts[page]) {
          pageCounts[page] = { views: 0, totalDuration: 0, count: 0 };
        }
        pageCounts[page].views++;
        if (data.duration && typeof data.duration === 'number') {
          pageCounts[page].totalDuration += data.duration;
          pageCounts[page].count++;
        }
      });
      const topPages = Object.entries(pageCounts)
        .map(([page, data]) => ({
          page,
          views: data.views,
          avgDuration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Top searches with result clicks
      const searchCounts: { [key: string]: { count: number; clicks: number } } = {};
      searches.forEach(doc => {
        const data = doc.data();
        const query = data.query?.toLowerCase() || '';
        if (query) {
          if (!searchCounts[query]) {
            searchCounts[query] = { count: 0, clicks: 0 };
          }
          searchCounts[query].count++;
          if (data.resultClicked) {
            searchCounts[query].clicks++;
          }
        }
      });
      const topSearches = Object.entries(searchCounts)
        .map(([query, data]) => ({
          query,
          count: data.count,
          resultClicks: data.clicks
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Top rooms
      const roomCounts: { [key: string]: { views: number; name: string } } = {};
      pageViews.forEach(doc => {
        const data = doc.data();
        if (data.roomId) {
          if (!roomCounts[data.roomId]) {
            roomCounts[data.roomId] = { views: 0, name: data.roomName || data.roomId };
          }
          roomCounts[data.roomId].views++;
        }
      });
      const topRooms = Object.entries(roomCounts)
        .map(([roomId, data]) => ({
          roomId,
          roomName: data.name,
          views: data.views
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Top buildings
      const buildingCounts: { [key: string]: { views: number; name: string } } = {};
      pageViews.forEach(doc => {
        const data = doc.data();
        if (data.buildingId) {
          if (!buildingCounts[data.buildingId]) {
            buildingCounts[data.buildingId] = { views: 0, name: data.buildingName || data.buildingId };
          }
          buildingCounts[data.buildingId].views++;
        }
      });
      const topBuildings = Object.entries(buildingCounts)
        .map(([buildingId, data]) => ({
          buildingId,
          buildingName: data.name,
          views: data.views
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Device breakdown
      const deviceCounts: { [key: string]: number } = {};
      pageViews.forEach(doc => {
        const device = doc.data().device || 'Unknown';
        deviceCounts[device] = (deviceCounts[device] || 0) + 1;
      });
      const totalDeviceViews = pageViews.length || 1;
      const deviceBreakdown = Object.entries(deviceCounts)
        .map(([device, count]) => ({
          device,
          count,
          percentage: Math.round((count / totalDeviceViews) * 100)
        }))
        .sort((a, b) => b.count - a.count);

      // Browser breakdown
      const browserCounts: { [key: string]: number } = {};
      pageViews.forEach(doc => {
        const browser = doc.data().browser || 'Unknown';
        browserCounts[browser] = (browserCounts[browser] || 0) + 1;
      });
      const browserBreakdown = Object.entries(browserCounts)
        .map(([browser, count]) => ({
          browser,
          count,
          percentage: Math.round((count / totalDeviceViews) * 100)
        }))
        .sort((a, b) => b.count - a.count);

      // Country breakdown
      const countryCounts: { [key: string]: number } = {};
      pageViews.forEach(doc => {
        const country = doc.data().country || 'Unknown';
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      });
      const countryBreakdown = Object.entries(countryCounts)
        .map(([country, count]) => ({
          country,
          count,
          percentage: Math.round((count / totalDeviceViews) * 100)
        }))
        .sort((a, b) => b.count - a.count);

      // Hourly activity
      const hourlyData: { [key: number]: { views: number; users: Set<string> } } = {};
      for (let i = 0; i < 24; i++) {
        hourlyData[i] = { views: 0, users: new Set() };
      }
      pageViews.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate();
        if (date) {
          const hour = date.getHours();
          hourlyData[hour].views++;
          if (data.sessionId) {
            hourlyData[hour].users.add(data.sessionId);
          }
        }
      });
      const hourlyActivity = Object.entries(hourlyData)
        .map(([hour, data]) => ({
          hour: parseInt(hour),
          views: data.views,
          users: data.users.size
        }));

      // Daily activity
      const dailyData: { [key: string]: { views: number; users: Set<string>; sessions: Set<string> } } = {};
      pageViews.forEach(doc => {
        const data = doc.data();
        const date = data.createdAt?.toDate();
        if (date) {
          const dateStr = date.toISOString().split('T')[0];
          if (!dailyData[dateStr]) {
            dailyData[dateStr] = { views: 0, users: new Set(), sessions: new Set() };
          }
          dailyData[dateStr].views++;
          if (data.userId) dailyData[dateStr].users.add(data.userId);
          if (data.sessionId) dailyData[dateStr].sessions.add(data.sessionId);
        }
      });
      const dailyActivity = Object.entries(dailyData)
        .map(([date, data]) => ({
          date,
          views: data.views,
          users: data.users.size,
          sessions: data.sessions.size
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Feature usage
      const featureCounts: { [key: string]: { uses: number; users: Set<string> } } = {};
      pageViews.forEach(doc => {
        const data = doc.data();
        if (data.feature) {
          if (!featureCounts[data.feature]) {
            featureCounts[data.feature] = { uses: 0, users: new Set() };
          }
          featureCounts[data.feature].uses++;
          if (data.userId) {
            featureCounts[data.feature].users.add(data.userId);
          }
        }
      });
      const featureUsage = Object.entries(featureCounts)
        .map(([feature, data]) => ({
          feature,
          uses: data.uses,
          uniqueUsers: data.users.size
        }))
        .sort((a, b) => b.uses - a.uses);

      // Error stats
      const errorCounts: { [key: string]: { count: number; users: Set<string> } } = {};
      pageViews.forEach(doc => {
        const data = doc.data();
        if (data.error) {
          if (!errorCounts[data.error]) {
            errorCounts[data.error] = { count: 0, users: new Set() };
          }
          errorCounts[data.error].count++;
          if (data.userId) {
            errorCounts[data.error].users.add(data.userId);
          }
        }
      });
      const errorStats = Object.entries(errorCounts)
        .map(([error, data]) => ({
          error,
          count: data.count,
          affectedUsers: data.users.size
        }))
        .sort((a, b) => b.count - a.count);

      return {
        totalPageViews: pageViews.length,
        uniqueVisitors,
        totalSessions: sessions.length,
        avgSessionDuration,
        bounceRate,
        topPages,
        topSearches,
        topRooms,
        topBuildings,
        deviceBreakdown,
        browserBreakdown,
        countryBreakdown,
        hourlyActivity,
        dailyActivity,
        featureUsage,
        errorStats
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return {
        totalPageViews: 0,
        uniqueVisitors: 0,
        totalSessions: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
        topPages: [],
        topSearches: [],
        topRooms: [],
        topBuildings: [],
        deviceBreakdown: [],
        browserBreakdown: [],
        countryBreakdown: [],
        hourlyActivity: [],
        dailyActivity: [],
        featureUsage: [],
        errorStats: []
      };
    }
  }

  async getTopSearches(limit: number = 10): Promise<any[]> {
    try {
      const snapshot = await db.collection('searchAnalytics')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get();

      // Count search queries
      const queryCounts: { [key: string]: { count: number; type: string } } = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const query = data.query?.toLowerCase() || '';
        if (query) {
          if (!queryCounts[query]) {
            queryCounts[query] = { count: 0, type: data.searchType || 'general' };
          }
          queryCounts[query].count++;
        }
      });

      return Object.entries(queryCounts)
        .map(([query, data]) => ({ query, count: data.count, type: data.type }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top searches:', error);
      return [];
    }
  }

  async getPopularRooms(limit: number = 10): Promise<any[]> {
    try {
      // Get room views from app logs
      const snapshot = await db.collection('appLogs')
        .where('message', '>=', 'Room viewed:')
        .where('message', '<', 'Room viewed;')
        .orderBy('message')
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();

      // Count room visits
      const roomCounts: { [key: string]: { count: number; building: string } } = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const message = data.message || '';
        const match = message.match(/Room viewed: (.+)/);
        if (match) {
          const roomName = match[1];
          if (!roomCounts[roomName]) {
            roomCounts[roomName] = { count: 0, building: 'Unknown' };
          }
          roomCounts[roomName].count++;
        }
      });

      return Object.entries(roomCounts)
        .map(([roomNumber, data]) => ({ 
          roomNumber, 
          visits: data.count, 
          building: data.building 
        }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting popular rooms:', error);
      return [];
    }
  }

  async getVisitorStats(days: number = 30): Promise<any> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const snapshot = await db.collection('userSessions')
        .where('createdAt', '>=', cutoffDate)
        .get();

      return {
        totalVisitors: snapshot.size,
        newVisitors: snapshot.docs.filter(doc => doc.data().isNewVisitor).length,
        returningVisitors: snapshot.docs.filter(doc => !doc.data().isNewVisitor).length
      };
    } catch (error) {
      console.error('Error getting visitor stats:', error);
      return {
        totalVisitors: 0,
        newVisitors: 0,
        returningVisitors: 0
      };
    }
  }

  async getLiveAnalytics(): Promise<any> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Get active sessions from last 5 minutes
      const activeSessionsSnapshot = await db.collection('userSessions')
        .where('lastActivity', '>=', fiveMinutesAgo)
        .get();

      // Get new users today
      const newUsersTodaySnapshot = await db.collection('userSessions')
        .where('createdAt', '>=', todayStart)
        .get();

      // Calculate current page views from active sessions
      let currentPageViews = 0;
      activeSessionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        currentPageViews += data.pageViews || 0;
      });

      return {
        activeUsers: activeSessionsSnapshot.size,
        newUsersToday: newUsersTodaySnapshot.size,
        currentPageViews,
        timestamp: now.toISOString()
      };
    } catch (error) {
      console.error('Error getting live analytics:', error);
      return {
        activeUsers: 0,
        newUsersToday: 0,
        currentPageViews: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getAnalyticsEvents(timeRange: string, limit: number): Promise<any[]> {
    try {
      let cutoffDate = new Date();
      
      // Calculate cutoff date based on time range
      if (timeRange === '1h') {
        cutoffDate.setHours(cutoffDate.getHours() - 1);
      } else if (timeRange === '24h') {
        cutoffDate.setDate(cutoffDate.getDate() - 1);
      } else if (timeRange === '7d') {
        cutoffDate.setDate(cutoffDate.getDate() - 7);
      } else if (timeRange === '30d') {
        cutoffDate.setDate(cutoffDate.getDate() - 30);
      }

      // Query page views as events
      const snapshot = await db.collection('pageViews')
        .where('createdAt', '>=', cutoffDate)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type || 'page_view',
          page: data.page || data.path,
          query: data.query,
          roomId: data.roomId,
          buildingId: data.buildingId,
          feature: data.feature,
          error: data.error,
          userId: data.userId,
          sessionId: data.sessionId,
          ipAddress: data.ipAddress || 'Unknown',
          userAgent: data.userAgent || 'Unknown',
          timestamp: data.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          duration: data.duration,
          referrer: data.referrer,
          device: data.device || 'Unknown',
          browser: data.browser || 'Unknown',
          os: data.os || 'Unknown',
          country: data.country,
          city: data.city
        };
      });
    } catch (error) {
      console.error('Error getting analytics events:', error);
      return [];
    }
  }

  async getPerformanceMetrics(timeRange: string): Promise<any> {
    try {
      let cutoffDate = new Date();
      
      // Calculate cutoff date based on time range
      if (timeRange === '1h') {
        cutoffDate.setHours(cutoffDate.getHours() - 1);
      } else if (timeRange === '24h') {
        cutoffDate.setDate(cutoffDate.getDate() - 1);
      } else if (timeRange === '7d') {
        cutoffDate.setDate(cutoffDate.getDate() - 7);
      } else if (timeRange === '30d') {
        cutoffDate.setDate(cutoffDate.getDate() - 30);
      }

      // Get page views for load time calculation
      const pageViewsSnapshot = await db.collection('pageViews')
        .where('createdAt', '>=', cutoffDate)
        .get();

      // Get errors for error rate calculation
      const errorsSnapshot = await db.collection('appLogs')
        .where('level', '==', 'error')
        .where('createdAt', '>=', cutoffDate)
        .get();

      const totalRequests = pageViewsSnapshot.size;
      const errorCount = errorsSnapshot.size;

      // Calculate average load time
      let totalLoadTime = 0;
      let loadTimeCount = 0;

      pageViewsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const loadTime = data.loadTime || data.duration;
        if (loadTime && typeof loadTime === 'number') {
          totalLoadTime += loadTime;
          loadTimeCount++;
        }
      });

      const avgLoadTime = loadTimeCount > 0 ? Math.round(totalLoadTime / loadTimeCount) : 0;
      const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;

      // Calculate server response time from API logs if available
      let totalResponseTime = 0;
      let responseTimeCount = 0;

      pageViewsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const responseTime = data.serverResponseTime;
        if (responseTime && typeof responseTime === 'number') {
          totalResponseTime += responseTime;
          responseTimeCount++;
        }
      });

      const serverResponseTime = responseTimeCount > 0 ? Math.round(totalResponseTime / responseTimeCount) : 0;

      return {
        avgLoadTime,
        errorRate: Math.round(errorRate * 10000) / 100, // Convert to percentage with 2 decimals
        cacheHitRate: 0, // TODO: Implement cache tracking
        serverResponseTime,
        databaseQueryTime: 0, // TODO: Implement query time tracking
        uptime: 100, // TODO: Implement uptime tracking
        throughput: totalRequests
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {
        avgLoadTime: 0,
        errorRate: 0,
        cacheHitRate: 0,
        serverResponseTime: 0,
        databaseQueryTime: 0,
        uptime: 100,
        throughput: 0
      };
    }
  }

  // Wilma Classes operations
  async getWilmaClasses(): Promise<any[]> {
    try {
      const snapshot = await db.collection('wilmaClasses').get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting Wilma classes:', error);
      return [];
    }
  }

  async getWilmaClass(id: string): Promise<any | undefined> {
    try {
      const doc = await db.collection('wilmaClasses').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting Wilma class:', error);
      return undefined;
    }
  }

  async createWilmaClass(classData: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaClasses').doc();
      const data = {
        ...classData,
        id: docRef.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await docRef.set(data);
      return data;
    } catch (error) {
      console.error('Error creating Wilma class:', error);
      throw error;
    }
  }

  async updateWilmaClass(id: string, classData: any): Promise<any> {
    try {
      const updateData = {
        ...classData,
        updatedAt: new Date(),
      };
      await db.collection('wilmaClasses').doc(id).update(updateData);
      return await this.getWilmaClass(id);
    } catch (error) {
      console.error('Error updating Wilma class:', error);
      throw error;
    }
  }

  async deleteWilmaClass(id: string): Promise<void> {
    try {
      await db.collection('wilmaClasses').doc(id).delete();
      console.log('✅ Class deleted:', id);
    } catch (error) {
      console.error('Error deleting Wilma class:', error);
      throw error;
    }
  }

  // ============================================
  // WILMA COURSES OPERATIONS
  // ============================================
  
  async getWilmaCourses(teacherId?: string, classId?: string): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaCourses');
      if (teacherId) query = query.where('teacherId', '==', teacherId);
      if (classId) query = query.where('classId', '==', classId);
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting Wilma courses:', error);
      return [];
    }
  }

  async getWilmaCourse(id: string): Promise<any | undefined> {
    try {
      const doc = await db.collection('wilmaCourses').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting Wilma course:', error);
      return undefined;
    }
  }

  async createWilmaCourse(courseData: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaCourses').doc();
      const data = { ...courseData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
      await docRef.set(data);
      return data;
    } catch (error) {
      console.error('Error creating Wilma course:', error);
      throw error;
    }
  }

  async updateWilmaCourse(id: string, courseData: any): Promise<any> {
    try {
      await db.collection('wilmaCourses').doc(id).update({ ...courseData, updatedAt: new Date() });
      return await this.getWilmaCourse(id);
    } catch (error) {
      console.error('Error updating Wilma course:', error);
      throw error;
    }
  }

  async deleteWilmaCourse(id: string): Promise<void> {
    try {
      await db.collection('wilmaCourses').doc(id).delete();
    } catch (error) {
      console.error('Error deleting Wilma course:', error);
      throw error;
    }
  }

  // ============================================
  // WILMA LESSON JOURNAL OPERATIONS
  // ============================================
  
  async getWilmaLessonJournals(courseId?: string, teacherId?: string, date?: string): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaLessonJournal');
      if (courseId) query = query.where('courseId', '==', courseId);
      if (teacherId) query = query.where('teacherId', '==', teacherId);
      if (date) query = query.where('date', '==', date);
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting lesson journals:', error);
      return [];
    }
  }

  async getWilmaLessonJournal(id: string): Promise<any | undefined> {
    try {
      const doc = await db.collection('wilmaLessonJournal').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting lesson journal:', error);
      return undefined;
    }
  }

  async createWilmaLessonJournal(journalData: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaLessonJournal').doc();
      const data = { ...journalData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
      await docRef.set(data);
      return data;
    } catch (error) {
      console.error('Error creating lesson journal:', error);
      throw error;
    }
  }

  async updateWilmaLessonJournal(id: string, journalData: any): Promise<any> {
    try {
      await db.collection('wilmaLessonJournal').doc(id).update({ ...journalData, updatedAt: new Date() });
      return await this.getWilmaLessonJournal(id);
    } catch (error) {
      console.error('Error updating lesson journal:', error);
      throw error;
    }
  }

  async deleteWilmaLessonJournal(id: string): Promise<void> {
    try {
      await db.collection('wilmaLessonJournal').doc(id).delete();
    } catch (error) {
      console.error('Error deleting lesson journal:', error);
      throw error;
    }
  }

  // ============================================
  // WILMA HOMEWORK EXTENDED OPERATIONS
  // ============================================
  
  async getWilmaHomeworkExtended(courseId?: string, teacherId?: string): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaHomeworkExtended');
      if (courseId) query = query.where('courseId', '==', courseId);
      if (teacherId) query = query.where('teacherId', '==', teacherId);
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting homework:', error);
      return [];
    }
  }

  async getWilmaHomeworkExtendedById(id: string): Promise<any | undefined> {
    try {
      const doc = await db.collection('wilmaHomeworkExtended').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting homework:', error);
      return undefined;
    }
  }

  async createWilmaHomeworkExtended(homeworkData: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaHomeworkExtended').doc();
      const data = { ...homeworkData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
      await docRef.set(data);
      return data;
    } catch (error) {
      console.error('Error creating homework:', error);
      throw error;
    }
  }

  async updateWilmaHomeworkExtended(id: string, homeworkData: any): Promise<any> {
    try {
      await db.collection('wilmaHomeworkExtended').doc(id).update({ ...homeworkData, updatedAt: new Date() });
      return await this.getWilmaHomeworkExtendedById(id);
    } catch (error) {
      console.error('Error updating homework:', error);
      throw error;
    }
  }

  async deleteWilmaHomeworkExtended(id: string): Promise<void> {
    try {
      await db.collection('wilmaHomeworkExtended').doc(id).delete();
    } catch (error) {
      console.error('Error deleting homework:', error);
      throw error;
    }
  }

  // ============================================
  // WILMA HOMEWORK SUBMISSIONS OPERATIONS
  // ============================================
  
  async getWilmaHomeworkSubmissions(homeworkId?: string, studentId?: string): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaHomeworkSubmissions');
      if (homeworkId) query = query.where('homeworkId', '==', homeworkId);
      if (studentId) query = query.where('studentId', '==', studentId);
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting submissions:', error);
      return [];
    }
  }

  async getWilmaHomeworkSubmission(id: string): Promise<any | undefined> {
    try {
      const doc = await db.collection('wilmaHomeworkSubmissions').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting submission:', error);
      return undefined;
    }
  }

  async createWilmaHomeworkSubmission(submissionData: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaHomeworkSubmissions').doc();
      const data = { ...submissionData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
      await docRef.set(data);
      return data;
    } catch (error) {
      console.error('Error creating submission:', error);
      throw error;
    }
  }

  async updateWilmaHomeworkSubmission(id: string, submissionData: any): Promise<any> {
    try {
      await db.collection('wilmaHomeworkSubmissions').doc(id).update({ ...submissionData, updatedAt: new Date() });
      return await this.getWilmaHomeworkSubmission(id);
    } catch (error) {
      console.error('Error updating submission:', error);
      throw error;
    }
  }

  async deleteWilmaHomeworkSubmission(id: string): Promise<void> {
    try {
      await db.collection('wilmaHomeworkSubmissions').doc(id).delete();
    } catch (error) {
      console.error('Error deleting submission:', error);
      throw error;
    }
  }

  // ============================================
  // WILMA EXAMS EXTENDED OPERATIONS
  // ============================================
  
  async getWilmaExamsExtended(courseId?: string, teacherId?: string): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaExamsExtended');
      if (courseId) query = query.where('courseId', '==', courseId);
      if (teacherId) query = query.where('teacherId', '==', teacherId);
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting exams:', error);
      return [];
    }
  }

  async getWilmaExamExtended(id: string): Promise<any | undefined> {
    try {
      const doc = await db.collection('wilmaExamsExtended').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting exam:', error);
      return undefined;
    }
  }

  async createWilmaExamExtended(examData: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaExamsExtended').doc();
      const data = { ...examData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
      await docRef.set(data);
      return data;
    } catch (error) {
      console.error('Error creating exam:', error);
      throw error;
    }
  }

  async updateWilmaExamExtended(id: string, examData: any): Promise<any> {
    try {
      await db.collection('wilmaExamsExtended').doc(id).update({ ...examData, updatedAt: new Date() });
      return await this.getWilmaExamExtended(id);
    } catch (error) {
      console.error('Error updating exam:', error);
      throw error;
    }
  }

  async deleteWilmaExamExtended(id: string): Promise<void> {
    try {
      await db.collection('wilmaExamsExtended').doc(id).delete();
    } catch (error) {
      console.error('Error deleting exam:', error);
      throw error;
    }
  }

  // ============================================
  // WILMA EXAM RESULTS OPERATIONS
  // ============================================
  
  async getWilmaExamResults(examId?: string, studentId?: string): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaExamResults');
      if (examId) query = query.where('examId', '==', examId);
      if (studentId) query = query.where('studentId', '==', studentId);
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting exam results:', error);
      return [];
    }
  }

  async getWilmaExamResult(id: string): Promise<any | undefined> {
    try {
      const doc = await db.collection('wilmaExamResults').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting exam result:', error);
      return undefined;
    }
  }

  async createWilmaExamResult(resultData: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaExamResults').doc();
      const data = { ...resultData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
      await docRef.set(data);
      return data;
    } catch (error) {
      console.error('Error creating exam result:', error);
      throw error;
    }
  }

  async updateWilmaExamResult(id: string, resultData: any): Promise<any> {
    try {
      await db.collection('wilmaExamResults').doc(id).update({ ...resultData, updatedAt: new Date() });
      return await this.getWilmaExamResult(id);
    } catch (error) {
      console.error('Error updating exam result:', error);
      throw error;
    }
  }

  async deleteWilmaExamResult(id: string): Promise<void> {
    try {
      await db.collection('wilmaExamResults').doc(id).delete();
    } catch (error) {
      console.error('Error deleting exam result:', error);
      throw error;
    }
  }

  // ============================================
  // WILMA BEHAVIOR NOTES OPERATIONS
  // ============================================
  
  async getWilmaBehaviorNotes(studentId?: string, teacherId?: string): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaBehaviorNotes');
      if (studentId) query = query.where('studentId', '==', studentId);
      if (teacherId) query = query.where('teacherId', '==', teacherId);
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting behavior notes:', error);
      return [];
    }
  }

  async getWilmaBehaviorNote(id: string): Promise<any | undefined> {
    try {
      const doc = await db.collection('wilmaBehaviorNotes').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting behavior note:', error);
      return undefined;
    }
  }

  async createWilmaBehaviorNote(noteData: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaBehaviorNotes').doc();
      const data = { ...noteData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
      await docRef.set(data);
      return data;
    } catch (error) {
      console.error('Error creating behavior note:', error);
      throw error;
    }
  }

  async updateWilmaBehaviorNote(id: string, noteData: any): Promise<any> {
    try {
      await db.collection('wilmaBehaviorNotes').doc(id).update({ ...noteData, updatedAt: new Date() });
      return await this.getWilmaBehaviorNote(id);
    } catch (error) {
      console.error('Error updating behavior note:', error);
      throw error;
    }
  }

  async deleteWilmaBehaviorNote(id: string): Promise<void> {
    try {
      await db.collection('wilmaBehaviorNotes').doc(id).delete();
    } catch (error) {
      console.error('Error deleting behavior note:', error);
      throw error;
    }
  }

  // ============================================
  // WILMA NOTIFICATIONS OPERATIONS
  // ============================================
  
  async getWilmaNotifications(userId: string, unreadOnly?: boolean): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaNotifications').where('userId', '==', userId);
      if (unreadOnly) query = query.where('isRead', '==', false);
      const snapshot = await query.orderBy('createdAt', 'desc').get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  async getWilmaNotification(id: string): Promise<any | undefined> {
    try {
      const doc = await db.collection('wilmaNotifications').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting notification:', error);
      return undefined;
    }
  }

  async createWilmaNotification(notificationData: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaNotifications').doc();
      const data = { ...notificationData, id: docRef.id, createdAt: new Date() };
      await docRef.set(data);
      return data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async updateWilmaNotification(id: string, notificationData: any): Promise<any> {
    try {
      await db.collection('wilmaNotifications').doc(id).update(notificationData);
      return await this.getWilmaNotification(id);
    } catch (error) {
      console.error('Error updating notification:', error);
      throw error;
    }
  }

  async markWilmaNotificationAsRead(id: string): Promise<void> {
    try {
      await db.collection('wilmaNotifications').doc(id).update({ isRead: true, readAt: new Date() });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllWilmaNotificationsAsRead(userId: string): Promise<void> {
    try {
      const snapshot = await db.collection('wilmaNotifications')
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get();
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { isRead: true, readAt: new Date() });
      });
      
      await batch.commit();
      console.log(`✅ Marked ${snapshot.size} notifications as read for user ${userId}`);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  async deleteWilmaNotification(id: string): Promise<void> {
    try {
      await db.collection('wilmaNotifications').doc(id).delete();
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // ============================================
  // WILMA DASHBOARD PREFERENCES OPERATIONS
  // ============================================
  
  async saveWilmaDashboardPreferences(userId: string, preferences: any): Promise<void> {
    try {
      await db.collection('wilmaDashboardPreferences').doc(userId).set({
        ...preferences,
        userId,
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ Dashboard preferences saved for user: ${userId}`);
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
      throw error;
    }
  }

  async getWilmaDashboardPreferences(userId: string): Promise<any | null> {
    try {
      const doc = await db.collection('wilmaDashboardPreferences').doc(userId).get();
      if (!doc.exists) {
        console.log(`ℹ️ No dashboard preferences found for user: ${userId}`);
        return null;
      }
      return doc.data();
    } catch (error) {
      console.error('Error getting dashboard preferences:', error);
      return null;
    }
  }

  // ============================================
  // WILMA CALENDAR EVENTS OPERATIONS
  // ============================================
  
  async getWilmaCalendarEvents(userId?: string, startDate?: string, endDate?: string): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaCalendarEvents');
      if (userId) query = query.where('userId', '==', userId);
      if (startDate) query = query.where('startDate', '>=', startDate);
      if (endDate) query = query.where('startDate', '<=', endDate);
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting calendar events:', error);
      return [];
    }
  }

  async getWilmaCalendarEvent(id: string): Promise<any | undefined> {
    try {
      const doc = await db.collection('wilmaCalendarEvents').doc(id).get();
      if (!doc.exists) return undefined;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error getting calendar event:', error);
      return undefined;
    }
  }

  async createWilmaCalendarEvent(eventData: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaCalendarEvents').doc();
      const data = { ...eventData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
      await docRef.set(data);
      return data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  async updateWilmaCalendarEvent(id: string, eventData: any): Promise<any> {
    try {
      await db.collection('wilmaCalendarEvents').doc(id).update({ ...eventData, updatedAt: new Date() });
      return await this.getWilmaCalendarEvent(id);
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  async deleteWilmaCalendarEvent(id: string): Promise<void> {
    try {
      await db.collection('wilmaCalendarEvents').doc(id).delete();
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  // ============================================
  // WILMA ANALYTICS OPERATIONS
  // ============================================
  
  async createWilmaAnalytic(analyticData: any): Promise<void> {
    try {
      const docRef = db.collection('wilmaAnalytics').doc();
      await docRef.set({ ...analyticData, id: docRef.id, createdAt: new Date() });
    } catch (error) {
      console.error('Error creating analytic:', error);
      throw error;
    }
  }

  async getWilmaAnalytics(userId?: string, eventType?: string, days?: number): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaAnalytics');
      if (userId) query = query.where('userId', '==', userId);
      if (eventType) query = query.where('eventType', '==', eventType);
      if (days) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        query = query.where('createdAt', '>=', cutoffDate);
      }
      const snapshot = await query.get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting analytics:', error);
      return [];
    }
  }

  async getWilmaAnalyticsSummary(days?: number): Promise<any> {
    try {
      const analytics = await this.getWilmaAnalytics(undefined, undefined, days);
      return {
        totalEvents: analytics.length,
        eventsByType: analytics.reduce((acc: any, a: any) => {
          acc[a.eventType] = (acc[a.eventType] || 0) + 1;
          return acc;
        }, {}),
        eventsByUser: analytics.reduce((acc: any, a: any) => {
          acc[a.userId] = (acc[a.userId] || 0) + 1;
          return acc;
        }, {})
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return {};
    }
  }

  // ============================================
  // WILMA AI INTERACTIONS OPERATIONS
  // ============================================
  
  async createWilmaAiInteraction(interactionData: any): Promise<any> {
    try {
      const docRef = db.collection('wilmaAiInteractions').doc();
      const data = { ...interactionData, id: docRef.id, createdAt: new Date() };
      await docRef.set(data);
      return data;
    } catch (error) {
      console.error('Error creating AI interaction:', error);
      throw error;
    }
  }

  async getWilmaAiInteractions(userId?: string, featureType?: string): Promise<any[]> {
    try {
      let query: any = db.collection('wilmaAiInteractions');
      if (userId) query = query.where('userId', '==', userId);
      if (featureType) query = query.where('featureType', '==', featureType);
      const snapshot = await query.orderBy('createdAt', 'desc').get();
      return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting AI interactions:', error);
      return [];
    }
  }

  async updateWilmaAiInteraction(id: string, interactionData: any): Promise<any> {
    try {
      await db.collection('wilmaAiInteractions').doc(id).update(interactionData);
      const doc = await db.collection('wilmaAiInteractions').doc(id).get();
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error updating AI interaction:', error);
      throw error;
    }
  }

  async getWilmaAiUsageStats(days?: number): Promise<any> {
    try {
      const interactions = await this.getWilmaAiInteractions();
      const filtered = days ? interactions.filter((i: any) => {
        const date = i.createdAt?.toDate?.() || new Date(i.createdAt);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        return date >= cutoff;
      }) : interactions;
      
      return {
        totalInteractions: filtered.length,
        byFeature: filtered.reduce((acc: any, i: any) => {
          acc[i.featureType] = (acc[i.featureType] || 0) + 1;
          return acc;
        }, {}),
        avgRating: filtered.filter((i: any) => i.rating).reduce((sum: number, i: any) => sum + i.rating, 0) / filtered.filter((i: any) => i.rating).length || 0,
        totalTokens: filtered.reduce((sum: number, i: any) => sum + (i.tokensUsed || 0), 0)
      };
    } catch (error) {
      console.error('Error getting AI usage stats:', error);
      return {};
    }
  }
}

export const firebaseStorage = new FirebaseStorage();