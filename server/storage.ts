import {
  users,
  buildings,
  floors,
  hallways,
  rooms,
  staff,
  events,
  announcements,
  type User,
  type UpsertUser,
  type Building,
  type InsertBuilding,
  type Floor,
  type InsertFloor,
  type Hallway,
  type InsertHallway,
  type Room,
  type InsertRoom,
  type Staff,
  type InsertStaff,
  type Event,
  type InsertEvent,
  type Announcement,
  type InsertAnnouncement,
} from "@shared/schema";
import { db } from "./db";
import { eq, like, and, desc, or } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Building operations
  getBuildings(): Promise<Building[]>;
  getBuilding(id: string): Promise<Building | undefined>;
  createBuilding(building: InsertBuilding): Promise<Building>;
  updateBuilding(id: string, building: Partial<InsertBuilding>): Promise<Building>;
  deleteBuilding(id: string): Promise<void>;
  
  // Floor operations
  getFloors(buildingId?: string): Promise<Floor[]>;
  getFloor(id: string): Promise<Floor | undefined>;
  createFloor(floor: InsertFloor): Promise<Floor>;
  updateFloor(id: string, floor: Partial<InsertFloor>): Promise<Floor>;
  deleteFloor(id: string): Promise<void>;
  
  // Hallway operations
  getHallways(buildingId?: string, floorId?: string): Promise<Hallway[]>;
  getHallway(id: string): Promise<Hallway | undefined>;
  createHallway(hallway: InsertHallway): Promise<Hallway>;
  updateHallway(id: string, hallway: Partial<InsertHallway>): Promise<Hallway>;
  deleteHallway(id: string): Promise<void>;
  
  // Room operations
  getRooms(buildingId?: string): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room>;
  deleteRoom(id: string): Promise<void>;
  searchRooms(query: string): Promise<Room[]>;
  
  // Staff operations
  getStaff(): Promise<Staff[]>;
  getStaffMember(id: string): Promise<Staff | undefined>;
  createStaffMember(staff: InsertStaff): Promise<Staff>;
  updateStaffMember(id: string, staff: Partial<InsertStaff>): Promise<Staff>;
  deleteStaffMember(id: string): Promise<void>;
  searchStaff(query: string, department?: string): Promise<Staff[]>;
  
  // Event operations
  getEvents(startDate?: Date, endDate?: Date): Promise<Event[]>;
  getEvent(id: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: string): Promise<void>;
  
  // Announcement operations
  getAnnouncements(limit?: number): Promise<Announcement[]>;
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Building operations
  async getBuildings(): Promise<Building[]> {
    return await db.select().from(buildings).where(eq(buildings.isActive, true));
  }

  async getBuilding(id: string): Promise<Building | undefined> {
    const [building] = await db.select().from(buildings).where(eq(buildings.id, id));
    return building;
  }

  async createBuilding(building: InsertBuilding): Promise<Building> {
    const [newBuilding] = await db.insert(buildings).values(building).returning();
    return newBuilding;
  }

  async updateBuilding(id: string, building: Partial<InsertBuilding>): Promise<Building> {
    const [updatedBuilding] = await db
      .update(buildings)
      .set({ ...building, updatedAt: new Date() })
      .where(eq(buildings.id, id))
      .returning();
    return updatedBuilding;
  }

  async deleteBuilding(id: string): Promise<void> {
    await db.update(buildings).set({ isActive: false }).where(eq(buildings.id, id));
  }

  // Floor operations
  async getFloors(buildingId?: string): Promise<Floor[]> {
    if (buildingId) {
      return await db.select().from(floors).where(and(eq(floors.isActive, true), eq(floors.buildingId, buildingId)));
    }
    return await db.select().from(floors).where(eq(floors.isActive, true));
  }

  async getFloor(id: string): Promise<Floor | undefined> {
    const [floor] = await db.select().from(floors).where(eq(floors.id, id));
    return floor;
  }

  async createFloor(floor: InsertFloor): Promise<Floor> {
    const [newFloor] = await db.insert(floors).values(floor).returning();
    return newFloor;
  }

  async updateFloor(id: string, floor: Partial<InsertFloor>): Promise<Floor> {
    const [updatedFloor] = await db
      .update(floors)
      .set({ ...floor, updatedAt: new Date() })
      .where(eq(floors.id, id))
      .returning();
    return updatedFloor;
  }

  async deleteFloor(id: string): Promise<void> {
    await db.update(floors).set({ isActive: false }).where(eq(floors.id, id));
  }

  // Hallway operations
  async getHallways(buildingId?: string, floorId?: string): Promise<Hallway[]> {
    let conditions = [eq(hallways.isActive, true)];
    
    if (buildingId) {
      conditions.push(eq(hallways.buildingId, buildingId));
    }
    if (floorId) {
      conditions.push(eq(hallways.floorId, floorId));
    }
    
    return await db.select().from(hallways).where(and(...conditions));
  }

  async getHallway(id: string): Promise<Hallway | undefined> {
    const [hallway] = await db.select().from(hallways).where(eq(hallways.id, id));
    return hallway;
  }

  async createHallway(hallway: InsertHallway): Promise<Hallway> {
    const [newHallway] = await db.insert(hallways).values(hallway).returning();
    return newHallway;
  }

  async updateHallway(id: string, hallway: Partial<InsertHallway>): Promise<Hallway> {
    const [updatedHallway] = await db
      .update(hallways)
      .set({ ...hallway, updatedAt: new Date() })
      .where(eq(hallways.id, id))
      .returning();
    return updatedHallway;
  }

  async deleteHallway(id: string): Promise<void> {
    await db.update(hallways).set({ isActive: false }).where(eq(hallways.id, id));
  }

  // Room operations
  async getRooms(buildingId?: string): Promise<Room[]> {
    if (buildingId) {
      return await db.select().from(rooms).where(and(eq(rooms.isActive, true), eq(rooms.buildingId, buildingId)));
    }
    return await db.select().from(rooms).where(eq(rooms.isActive, true));
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room> {
    const [updatedRoom] = await db
      .update(rooms)
      .set({ ...room, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updatedRoom;
  }

  async deleteRoom(id: string): Promise<void> {
    await db.update(rooms).set({ isActive: false }).where(eq(rooms.id, id));
  }

  async searchRooms(query: string): Promise<Room[]> {
    return await db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.isActive, true),
          or(
            like(rooms.roomNumber, `%${query}%`),
            like(rooms.name, `%${query}%`),
            like(rooms.nameEn, `%${query}%`),
            like(rooms.nameFi, `%${query}%`)
          )
        )
      );
  }

  // Staff operations
  async getStaff(): Promise<Staff[]> {
    return await db.select().from(staff).where(eq(staff.isActive, true));
  }

  async getStaffMember(id: string): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.id, id));
    return staffMember;
  }

  async createStaffMember(staffData: InsertStaff): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffData).returning();
    return newStaff;
  }

  async updateStaffMember(id: string, staffData: Partial<InsertStaff>): Promise<Staff> {
    const [updatedStaff] = await db
      .update(staff)
      .set({ ...staffData, updatedAt: new Date() })
      .where(eq(staff.id, id))
      .returning();
    return updatedStaff;
  }

  async deleteStaffMember(id: string): Promise<void> {
    await db.update(staff).set({ isActive: false }).where(eq(staff.id, id));
  }

  async searchStaff(query: string, department?: string): Promise<Staff[]> {
    let whereConditions = and(
      eq(staff.isActive, true),
      or(
        like(staff.firstName, `%${query}%`),
        like(staff.lastName, `%${query}%`),
        like(staff.position, `%${query}%`),
        like(staff.positionEn, `%${query}%`),
        like(staff.positionFi, `%${query}%`)
      )
    );

    if (department) {
      whereConditions = and(
        whereConditions,
        or(
          like(staff.department, `%${department}%`),
          like(staff.departmentEn, `%${department}%`),
          like(staff.departmentFi, `%${department}%`)
        )
      );
    }

    return await db.select().from(staff).where(whereConditions);
  }

  // Event operations
  async getEvents(startDate?: Date, endDate?: Date): Promise<Event[]> {
    if (startDate && endDate) {
      return await db.select().from(events)
        .where(
          and(
            eq(events.isActive, true),
            and(
              eq(events.startTime, startDate),
              eq(events.endTime, endDate)
            )
          )
        )
        .orderBy(desc(events.startTime));
    }
    
    return await db.select().from(events)
      .where(eq(events.isActive, true))
      .orderBy(desc(events.startTime));
  }

  async getEvent(id: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await db.insert(events).values(event).returning();
    return newEvent;
  }

  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event> {
    const [updatedEvent] = await db
      .update(events)
      .set({ ...event, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    await db.update(events).set({ isActive: false }).where(eq(events.id, id));
  }

  // Announcement operations
  async getAnnouncements(limit = 10): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.createdAt))
      .limit(limit);
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [announcement] = await db.select().from(announcements).where(eq(announcements.id, id));
    return announcement;
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
    return newAnnouncement;
  }

  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [updatedAnnouncement] = await db
      .update(announcements)
      .set({ ...announcement, updatedAt: new Date() })
      .where(eq(announcements.id, id))
      .returning();
    return updatedAnnouncement;
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await db.update(announcements).set({ isActive: false }).where(eq(announcements.id, id));
  }
}

// Simple in-memory storage with mock data for KSYK campus
class MemStorage implements IStorage {
  private mockBuildings: Building[] = [
    { id: "1", name: "M", nameEn: "Music Building", nameFi: "Musiikkitalo", description: null, descriptionEn: "Music and arts education", descriptionFi: "Musiikin ja taiteen opetus", floors: 3, mapPositionX: -200, mapPositionY: 50, colorCode: "#9333EA", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "2", name: "K", nameEn: "Central Hall", nameFi: "Keskushalli", description: null, descriptionEn: "Main building", descriptionFi: "Päärakennus", floors: 3, mapPositionX: 100, mapPositionY: 0, colorCode: "#DC2626", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "3", name: "L", nameEn: "Gymnasium", nameFi: "Liikuntahalli", description: null, descriptionEn: "Sports and physical education", descriptionFi: "Urheilu ja liikuntakasvatus", floors: 2, mapPositionX: 350, mapPositionY: 80, colorCode: "#059669", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "4", name: "R", nameEn: "R Building", nameFi: "R-rakennus", description: null, descriptionEn: "Research and laboratories", descriptionFi: "Tutkimus ja laboratoriot", floors: 3, mapPositionX: -50, mapPositionY: 200, colorCode: "#F59E0B", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "5", name: "A", nameEn: "A Building", nameFi: "A-rakennus", description: null, descriptionEn: "Administration and offices", descriptionFi: "Hallinto ja toimistot", floors: 3, mapPositionX: 250, mapPositionY: 180, colorCode: "#8B5CF6", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "6", name: "U", nameEn: "U Building", nameFi: "U-rakennus", description: null, descriptionEn: "University programs", descriptionFi: "Yliopisto-ohjelmat", floors: 3, mapPositionX: -100, mapPositionY: -120, colorCode: "#3B82F6", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
    { id: "7", name: "OG", nameEn: "Old Gymnasium", nameFi: "Vanha liikuntahalli", description: null, descriptionEn: "Historic sports facility", descriptionFi: "Historiallinen liikuntapaikka", floors: 2, mapPositionX: 200, mapPositionY: -80, colorCode: "#06B6D4", isActive: true, capacity: null, facilities: null, accessInfo: null, createdAt: new Date(), updatedAt: new Date() },
  ];

  private mockRooms: Room[] = [
    // Music Building (M) - Floor 1
    { id: "1", buildingId: "1", roomNumber: "M12", name: null, nameEn: "Music Room 12", nameFi: "Musiikkiluokka 12", floor: 1, type: "music_room", subType: null, capacity: 30, mapPositionX: -180, mapPositionY: 70, width: 50, height: 35, colorCode: "#6B7280", equipment: ["piano", "microphone", "speakers"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: "2", buildingId: "1", roomNumber: "M15", name: null, nameEn: "Music Room 15", nameFi: "Musiikkiluokka 15", floor: 1, type: "music_room", subType: null, capacity: 25, mapPositionX: -220, mapPositionY: 30, width: 45, height: 30, colorCode: "#6B7280", equipment: ["piano", "drums"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Music Building (M) - Floor 2
    { id: "3", buildingId: "1", roomNumber: "M22", name: null, nameEn: "Music Theory Room", nameFi: "Musiikin teoria", floor: 2, type: "classroom", subType: null, capacity: 20, mapPositionX: -180, mapPositionY: 70, width: 50, height: 35, colorCode: "#6B7280", equipment: ["whiteboard", "projector"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Music Building (M) - Floor 3
    { id: "4", buildingId: "1", roomNumber: "M32", name: null, nameEn: "Recording Studio", nameFi: "Äänitysstudio", floor: 3, type: "studio", subType: null, capacity: 15, mapPositionX: -180, mapPositionY: 70, width: 50, height: 35, colorCode: "#6B7280", equipment: ["recording_equipment", "soundproof"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Central Hall (K) - Floor 1
    { id: "5", buildingId: "2", roomNumber: "K15", name: null, nameEn: "Main Classroom", nameFi: "Pääluokka", floor: 1, type: "classroom", subType: null, capacity: 35, mapPositionX: 120, mapPositionY: 20, width: 55, height: 40, colorCode: "#6B7280", equipment: ["projector", "whiteboard", "computer"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: "6", buildingId: "2", roomNumber: "K10", name: null, nameEn: "Language Lab", nameFi: "Kielilaboratorio", floor: 1, type: "lab", subType: null, capacity: 30, mapPositionX: 80, mapPositionY: -20, width: 50, height: 35, colorCode: "#6B7280", equipment: ["headphones", "language_software"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Central Hall (K) - Floor 2
    { id: "7", buildingId: "2", roomNumber: "K25", name: null, nameEn: "Science Classroom", nameFi: "Tiedeluokka", floor: 2, type: "classroom", subType: null, capacity: 28, mapPositionX: 120, mapPositionY: 20, width: 55, height: 40, colorCode: "#6B7280", equipment: ["lab_bench", "microscopes"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Central Hall (K) - Floor 3
    { id: "8", buildingId: "2", roomNumber: "K35", name: null, nameEn: "Art Studio", nameFi: "Taidestudio", floor: 3, type: "studio", subType: null, capacity: 25, mapPositionX: 120, mapPositionY: 20, width: 55, height: 40, colorCode: "#6B7280", equipment: ["easels", "art_supplies"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Gymnasium (L) - Floor 1
    { id: "9", buildingId: "3", roomNumber: "L01", name: null, nameEn: "Main Gymnasium", nameFi: "Pääliikuntahalli", floor: 1, type: "gymnasium", subType: null, capacity: 200, mapPositionX: 370, mapPositionY: 100, width: 80, height: 60, colorCode: "#6B7280", equipment: ["basketball_court", "volleyball_net", "sound_system"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: "10", buildingId: "3", roomNumber: "L05", name: null, nameEn: "Fitness Room", nameFi: "Kuntosali", floor: 1, type: "fitness", subType: null, capacity: 30, mapPositionX: 330, mapPositionY: 60, width: 50, height: 35, colorCode: "#6B7280", equipment: ["weights", "treadmills"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Gymnasium (L) - Floor 2
    { id: "11", buildingId: "3", roomNumber: "L15", name: null, nameEn: "Dance Studio", nameFi: "Tanssistudio", floor: 2, type: "studio", subType: null, capacity: 40, mapPositionX: 370, mapPositionY: 100, width: 60, height: 45, colorCode: "#6B7280", equipment: ["mirrors", "sound_system", "ballet_bars"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // R Building - Floor 1
    { id: "12", buildingId: "4", roomNumber: "R10", name: null, nameEn: "Chemistry Lab", nameFi: "Kemian laboratorio", floor: 1, type: "lab", subType: null, capacity: 24, mapPositionX: -30, mapPositionY: 220, width: 55, height: 40, colorCode: "#6B7280", equipment: ["fume_hood", "lab_bench", "safety_shower"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // R Building - Floor 2
    { id: "13", buildingId: "4", roomNumber: "R20", name: null, nameEn: "Physics Lab", nameFi: "Fysiikan laboratorio", floor: 2, type: "lab", subType: null, capacity: 22, mapPositionX: -30, mapPositionY: 220, width: 55, height: 40, colorCode: "#6B7280", equipment: ["oscilloscope", "lab_bench"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // R Building - Floor 3
    { id: "14", buildingId: "4", roomNumber: "R30", name: null, nameEn: "Biology Lab", nameFi: "Biologian laboratorio", floor: 3, type: "lab", subType: null, capacity: 26, mapPositionX: -30, mapPositionY: 220, width: 55, height: 40, colorCode: "#6B7280", equipment: ["microscopes", "specimens"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // A Building - Floor 1
    { id: "15", buildingId: "5", roomNumber: "A20", name: null, nameEn: "Office 20", nameFi: "Toimisto 20", floor: 1, type: "office", subType: null, capacity: 4, mapPositionX: 270, mapPositionY: 200, width: 40, height: 30, colorCode: "#6B7280", equipment: ["desk", "computer"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // A Building - Floor 2
    { id: "16", buildingId: "5", roomNumber: "A25", name: null, nameEn: "Conference Room", nameFi: "Kokoushuone", floor: 2, type: "meeting", subType: null, capacity: 12, mapPositionX: 270, mapPositionY: 200, width: 50, height: 35, colorCode: "#6B7280", equipment: ["projector", "conference_table"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // A Building - Floor 3
    { id: "17", buildingId: "5", roomNumber: "A35", name: null, nameEn: "Principal's Office", nameFi: "Rehtorin toimisto", floor: 3, type: "office", subType: null, capacity: 6, mapPositionX: 270, mapPositionY: 200, width: 45, height: 32, colorCode: "#6B7280", equipment: ["desk", "bookshelf"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // U Building - Floor 1
    { id: "18", buildingId: "6", roomNumber: "U30", name: null, nameEn: "Computer Lab", nameFi: "Tietokoneluokka", floor: 1, type: "lab", subType: null, capacity: 32, mapPositionX: -80, mapPositionY: -100, width: 60, height: 40, colorCode: "#6B7280", equipment: ["computers", "projector", "printer"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // U Building - Floor 2
    { id: "19", buildingId: "6", roomNumber: "U35", name: null, nameEn: "Study Hall", nameFi: "Lukusali", floor: 2, type: "study", subType: null, capacity: 50, mapPositionX: -80, mapPositionY: -100, width: 70, height: 50, colorCode: "#6B7280", equipment: ["desks", "quiet_zone"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // U Building - Floor 3
    { id: "20", buildingId: "6", roomNumber: "U40", name: null, nameEn: "Library", nameFi: "Kirjasto", floor: 3, type: "library", subType: null, capacity: 80, mapPositionX: -80, mapPositionY: -100, width: 75, height: 55, colorCode: "#6B7280", equipment: ["books", "study_tables", "computers"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },

    // Old Gymnasium (OG) - Floor 1
    { id: "21", buildingId: "7", roomNumber: "OG5", name: null, nameEn: "Small Gym", nameFi: "Pieni sali", floor: 1, type: "gymnasium", subType: null, capacity: 60, mapPositionX: 220, mapPositionY: -60, width: 60, height: 45, colorCode: "#6B7280", equipment: ["badminton_court", "sound_system"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    
    // Old Gymnasium (OG) - Floor 2
    { id: "22", buildingId: "7", roomNumber: "OG10", name: null, nameEn: "Sports Equipment Storage", nameFi: "Urheiluvälinevarasto", floor: 2, type: "storage", subType: null, capacity: 10, mapPositionX: 220, mapPositionY: -60, width: 40, height: 30, colorCode: "#6B7280", equipment: ["sports_equipment"], features: null, emergencyInfo: null, accessibilityInfo: null, maintenanceNotes: null, lastInspected: null, isPublic: true, isAccessible: true, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ];

  private mockFloors: Floor[] = [
    { id: "1", buildingId: "1", floorNumber: 1, name: null, nameEn: "Ground Floor", nameFi: "Pohjakerros", description: null, descriptionEn: "Main entrance", descriptionFi: "Pääsisäänkäynti", mapImageUrl: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    { id: "2", buildingId: "2", floorNumber: 1, name: null, nameEn: "Ground Floor", nameFi: "Pohjakerros", description: null, descriptionEn: "Main entrance", descriptionFi: "Pääsisäänkäynti", mapImageUrl: null, isActive: true, createdAt: new Date(), updatedAt: new Date() },
  ];

  // User operations
  private mockUsers: User[] = [];

  async getUser(id: string): Promise<User | undefined> { 
    return this.mockUsers.find(u => u.id === id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> { 
    return this.mockUsers.find(u => u.email === email);
  }
  
  async upsertUser(userData: UpsertUser): Promise<User> { 
    const existingIndex = this.mockUsers.findIndex(u => u.id === userData.id || u.email === userData.email);
    
    const user: User = {
      id: userData.id || `user-${Date.now()}`,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: userData.role || 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    if (existingIndex >= 0) {
      this.mockUsers[existingIndex] = user;
    } else {
      this.mockUsers.push(user);
    }
    
    return user;
  }

  // Building operations
  async getBuildings(): Promise<Building[]> { return this.mockBuildings; }
  async getBuilding(id: string): Promise<Building | undefined> { return this.mockBuildings.find(b => b.id === id); }
  async createBuilding(building: InsertBuilding): Promise<Building> { throw new Error("Not implemented"); }
  async updateBuilding(id: string, building: Partial<InsertBuilding>): Promise<Building> { throw new Error("Not implemented"); }
  async deleteBuilding(id: string): Promise<void> { throw new Error("Not implemented"); }

  // Floor operations  
  async getFloors(buildingId?: string): Promise<Floor[]> { return this.mockFloors; }
  async getFloor(id: string): Promise<Floor | undefined> { return this.mockFloors.find(f => f.id === id); }
  async createFloor(floor: InsertFloor): Promise<Floor> { throw new Error("Not implemented"); }
  async updateFloor(id: string, floor: Partial<InsertFloor>): Promise<Floor> { throw new Error("Not implemented"); }
  async deleteFloor(id: string): Promise<void> { throw new Error("Not implemented"); }

  // Room operations
  async getRooms(buildingId?: string): Promise<Room[]> { return this.mockRooms; }
  async getRoom(id: string): Promise<Room | undefined> { return this.mockRooms.find(r => r.id === id); }
  async createRoom(room: InsertRoom): Promise<Room> { 
    const newRoom: Room = {
      id: (this.mockRooms.length + 1).toString(),
      buildingId: room.buildingId,
      roomNumber: room.roomNumber,
      name: room.name || null,
      nameEn: room.nameEn || null,
      nameFi: room.nameFi || null,
      floor: room.floor ?? 1,
      capacity: room.capacity ?? null,
      type: room.type ?? 'classroom',
      subType: room.subType || null,
      equipment: room.equipment || null,
      features: room.features || null,
      mapPositionX: room.mapPositionX || null,
      mapPositionY: room.mapPositionY || null,
      width: room.width || null,
      height: room.height || null,
      colorCode: room.colorCode || "#6B7280",
      emergencyInfo: room.emergencyInfo || null,
      accessibilityInfo: room.accessibilityInfo || null,
      maintenanceNotes: room.maintenanceNotes || null,
      lastInspected: room.lastInspected || null,
      isPublic: room.isPublic ?? true,
      isAccessible: room.isAccessible ?? true,
      isActive: room.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockRooms.push(newRoom);
    return newRoom;
  }
  async updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room> { 
    const index = this.mockRooms.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Room not found");
    this.mockRooms[index] = { ...this.mockRooms[index], ...room, updatedAt: new Date() };
    return this.mockRooms[index];
  }
  async deleteRoom(id: string): Promise<void> { 
    const index = this.mockRooms.findIndex(r => r.id === id);
    if (index !== -1) {
      this.mockRooms[index].isActive = false;
    }
  }
  async searchRooms(query: string): Promise<Room[]> { return this.mockRooms.filter(r => r.roomNumber.includes(query)); }

  // Hallway operations
  async getHallways(buildingId?: string, floorId?: string): Promise<Hallway[]> { return []; }
  async getHallway(id: string): Promise<Hallway | undefined> { return undefined; }
  async createHallway(hallway: InsertHallway): Promise<Hallway> { throw new Error("Not implemented"); }
  async updateHallway(id: string, hallway: Partial<InsertHallway>): Promise<Hallway> { throw new Error("Not implemented"); }
  async deleteHallway(id: string): Promise<void> { throw new Error("Not implemented"); }

  // Staff operations
  async getStaff(): Promise<Staff[]> { return []; }
  async getStaffMember(id: string): Promise<Staff | undefined> { return undefined; }
  async createStaffMember(staff: InsertStaff): Promise<Staff> { throw new Error("Not implemented"); }
  async updateStaffMember(id: string, staff: Partial<InsertStaff>): Promise<Staff> { throw new Error("Not implemented"); }
  async deleteStaffMember(id: string): Promise<void> { throw new Error("Not implemented"); }
  async searchStaff(query: string, department?: string): Promise<Staff[]> { return []; }

  // Event operations
  async getEvents(startDate?: Date, endDate?: Date): Promise<Event[]> { return []; }
  async getEvent(id: string): Promise<Event | undefined> { return undefined; }
  async createEvent(event: InsertEvent): Promise<Event> { throw new Error("Not implemented"); }
  async updateEvent(id: string, event: Partial<InsertEvent>): Promise<Event> { throw new Error("Not implemented"); }
  async deleteEvent(id: string): Promise<void> { throw new Error("Not implemented"); }

  // Announcement operations
  async getAnnouncements(limit?: number): Promise<Announcement[]> { return []; }
  async getAnnouncement(id: string): Promise<Announcement | undefined> { return undefined; }
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> { throw new Error("Not implemented"); }
  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement> { throw new Error("Not implemented"); }
  async deleteAnnouncement(id: string): Promise<void> { throw new Error("Not implemented"); }
}

export const storage = new MemStorage();
