import * as dotenv from 'dotenv';
import {
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
  type AppSettings,
  type InsertAppSettings,
} from "../shared/schema.js";

// Load environment variables
dotenv.config();

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(limit?: number, offset?: number): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  updateUser(id: string, updates: Partial<Record<string, unknown>>): Promise<void>;
  
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
  getStaff(limit?: number, offset?: number): Promise<Staff[]>;
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
  
  // Ticket operations
  getTickets(): Promise<any[]>;
  getTicket(id: string): Promise<any | undefined>;
  createTicket(ticket: any): Promise<any>;
  updateTicket(id: string, ticket: any): Promise<any>;
  deleteTicket(id: string): Promise<void>;
  
  // App Settings operations
  getAppSettings(): Promise<AppSettings>;
  updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings>;
  
  // Admin Login Log operations
  createAdminLoginLog(log: {
    userId: string | null;
    email: string;
    userName: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    loginStatus: 'success' | 'failed';
    failureReason?: string | null;
    sessionId?: string | null;
  }): Promise<void>;
  
  getAdminLoginLogs(limit?: number): Promise<any[]>;
  
  // App Log operations
  createAppLog(log: {
    level?: string;
    type?: string;
    message: string;
    details?: string | null;
    timestamp?: Date;
    errorReferenceId?: string | null;
    errorStack?: string | null;
    errorInfo?: any;
    userAgent?: string | null;
    url?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
    action?: string | null;
    userName?: string | null;
  }): Promise<void>;
  
  getAppLogs(limit?: number): Promise<any[]>;

  // Easter egg tracking
  trackEasterEggDiscovery(data: { eggId: string; eggName: string; userId: string; timestamp: string }): Promise<void>;
  getEasterEggStats(): Promise<any>;

  // Analytics operations
  createPageView(view: any): Promise<void>;
  createSearchAnalytic(search: any): Promise<void>;
  createNavigationAnalytic(navigation: any): Promise<void>;
  createUserSession(session: any): Promise<void>;
  updateUserSession(sessionId: string, updates: any): Promise<void>;
  getAnalyticsSummary(days?: number): Promise<any>;
  getLiveAnalytics(): Promise<any>;
  getAnalyticsEvents(timeRange: string, limit: number): Promise<any[]>;
  getPerformanceMetrics(timeRange: string): Promise<any>;
  getTopSearches(limit?: number): Promise<any[]>;
  getPopularRooms(limit?: number): Promise<any[]>;
  getVisitorStats(days?: number): Promise<any>;
  
}



// Simple in-memory storage â€” no hardcoded campus data. Admin populates
// the map via the Builder; MemStorage only runs when Firebase is missing
// (dev / offline fallback), and even then it starts empty so the map
// reflects the real database state instead of a stale seed.
class MemStorage implements IStorage {
  private mockBuildings: Building[] = ([] as unknown as Building[]);

  private mockRooms: Room[] = ([] as unknown as Room[]);

  private mockFloors: Floor[] = [];

  // User operations
  private mockUsers: User[] = [];

  // In-memory log stores (persists for server lifetime)
  private loginLogs: any[] = [];
  private appLogs: any[] = [];
  private easterEggDiscoveries: any[] = [];

  async getUser(id: string): Promise<User | undefined> { 
    return this.mockUsers.find(u => u.id === id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.mockUsers.find(u => u.email === email);
  }

  async getUserByResetToken(_token: string): Promise<User | undefined> {
    // MemStorage doesn't persist reset tokens.  Password reset only works
    // against the real Postgres store, so return undefined here.
    return undefined;
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
      password: userData.password || null,
      isTemporaryPassword: userData.isTemporaryPassword || null,
      canLoginToKsykMaps: userData.canLoginToKsykMaps ?? null,
      twoFactorSecret: userData.twoFactorSecret || null,
      twoFactorEnabled: userData.twoFactorEnabled || false,
      twoFactorBackupCodes: userData.twoFactorBackupCodes || null,
      passwordResetToken: userData.passwordResetToken || null,
      passwordResetExpiry: userData.passwordResetExpiry || null,
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

  async getAllUsers(limit = 200, offset = 0): Promise<User[]> {
    return this.mockUsers.slice(offset, offset + limit);
  }

  async deleteUser(id: string): Promise<void> {
    const index = this.mockUsers.findIndex(u => u.id === id);
    if (index >= 0) {
      this.mockUsers.splice(index, 1);
    }
  }

  async updateUser(id: string, updates: Partial<Record<string, unknown>>): Promise<void> {
    const index = this.mockUsers.findIndex(u => u.id === id);
    if (index >= 0) {
      this.mockUsers[index] = { ...this.mockUsers[index], ...updates, updatedAt: new Date() } as User;
    }
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
    // Cast newRoom via `as unknown as Room` â€” the Room shape has many
    // extra optional fields (currentStatus, virtualTourUrl, photos,
    // isBookable, etc) we don't seed here; nulls are the runtime default.
    const newRoom = {
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
    } as unknown as Room;
    this.mockRooms.push(newRoom);
    return newRoom;
  }
  async updateRoom(id: string, room: Partial<InsertRoom>): Promise<Room> {
    const index = this.mockRooms.findIndex(r => r.id === id);
    if (index === -1) throw new Error("Room not found");
    this.mockRooms[index] = { ...this.mockRooms[index], ...(room as any), updatedAt: new Date() };
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
  async getStaff(_limit = 200, _offset = 0): Promise<Staff[]> { return []; }
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
  private mockAnnouncements: Announcement[] = [];
  
  async getAnnouncements(limit?: number): Promise<Announcement[]> { 
    return this.mockAnnouncements.slice(0, limit || 10); 
  }
  
  async getAnnouncement(id: string): Promise<Announcement | undefined> { 
    return this.mockAnnouncements.find(a => a.id === id); 
  }
  
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> { 
    const newAnnouncement: Announcement = {
      id: `announcement-${Date.now()}`,
      ...announcement,
      isActive: announcement.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Announcement;
    this.mockAnnouncements.push(newAnnouncement);
    return newAnnouncement;
  }
  
  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement> { 
    const index = this.mockAnnouncements.findIndex(a => a.id === id);
    if (index === -1) throw new Error("Announcement not found");
    this.mockAnnouncements[index] = { ...this.mockAnnouncements[index], ...announcement, updatedAt: new Date() } as Announcement;
    return this.mockAnnouncements[index];
  }
  
  async deleteAnnouncement(id: string): Promise<void> { 
    const index = this.mockAnnouncements.findIndex(a => a.id === id);
    if (index !== -1) {
      this.mockAnnouncements.splice(index, 1);
    }
  }

  // Ticket operations
  private mockTickets: any[] = [];
  
  async getTickets(): Promise<any[]> {
    return this.mockTickets;
  }
  
  async getTicket(id: string): Promise<any | undefined> {
    return this.mockTickets.find(t => t.id === id);
  }
  
  async createTicket(ticket: any): Promise<any> {
    const newTicket = {
      id: `ticket-${Date.now()}`,
      ...ticket,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockTickets.push(newTicket);
    return newTicket;
  }
  
  async updateTicket(id: string, ticket: any): Promise<any> {
    const index = this.mockTickets.findIndex(t => t.id === id);
    if (index === -1) throw new Error("Ticket not found");
    this.mockTickets[index] = { ...this.mockTickets[index], ...ticket, updatedAt: new Date() };
    return this.mockTickets[index];
  }
  
  async deleteTicket(id: string): Promise<void> {
    const index = this.mockTickets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.mockTickets.splice(index, 1);
    }
  }

  // App Settings operations
  // AppSettings has grown ~30 feature-flag fields (enableEasterEgg,
  // enableEvents, enableTicketSystem, backupFrequencyHours, etc) not
  // populated in this mock. Cast through unknown â€” nulls are fine at
  // runtime for the fields we don't seed.
  private mockAppSettings: AppSettings = ({
    id: 'default',
    appName: 'KSYK Map',
    appNameEn: 'KSYK Map',
    appNameFi: 'KSYK Kartta',
    logoUrl: null,
    primaryColor: '#3B82F6',
    secondaryColor: '#F59E0B',
    successColor: '#10B981',
    warningColor: '#EF4444',
    theme: 'light',
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
    enableAnimations: true,
    enableAutoSave: true,
    compactMode: false,
    defaultLanguage: 'en',
    aiSensitivity: '0.7',
    enableSmartSnap: true,
    enableRoomAutoCreation: false,
    cacheMinutes: 30,
    maxImageSizeMB: 10,
    enablePreloadImages: true,
    enableLazyLoading: true,
    defaultZoomLevel: '1.0',
    updatedAt: new Date()
  } as unknown as AppSettings);

  async getAppSettings(): Promise<AppSettings> {
    return this.mockAppSettings;
  }

  async updateAppSettings(settings: Partial<InsertAppSettings>): Promise<AppSettings> {
    this.mockAppSettings = { ...this.mockAppSettings, ...settings, updatedAt: new Date() };
    return this.mockAppSettings;
  }

  // Admin Login Log operations
  async createAdminLoginLog(log: {
    userId: string | null;
    email: string;
    userName: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    loginStatus: 'success' | 'failed';
    failureReason?: string | null;
    sessionId?: string | null;
  }): Promise<void> {
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...log,
      createdAt: new Date(),
    };
    this.loginLogs.unshift(entry);
    if (this.loginLogs.length > 500) this.loginLogs.length = 500;
  }

  async getAdminLoginLogs(limit: number = 100): Promise<any[]> {
    return this.loginLogs.slice(0, limit);
  }

  // App Log operations
  async createAppLog(log: {
    level?: string;
    type?: string;
    message: string;
    details?: string | null;
    timestamp?: Date;
    errorReferenceId?: string | null;
    errorStack?: string | null;
    errorInfo?: any;
    userAgent?: string | null;
    url?: string | null;
    userId?: string | null;
    ipAddress?: string | null;
    action?: string | null;
    userName?: string | null;
  }): Promise<void> {
    const entry = {
      id: `alog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ...log,
      level: log.level ?? log.type ?? 'info',
      createdAt: new Date(),
    };
    this.appLogs.unshift(entry);
    if (this.appLogs.length > 1000) this.appLogs.length = 1000;
  }

  async getAppLogs(limit: number = 100): Promise<any[]> {
    return this.appLogs.slice(0, limit);
  }

  async trackEasterEggDiscovery(data: { eggId: string; eggName: string; userId: string; timestamp: string }): Promise<void> {
    this.easterEggDiscoveries.unshift({ ...data, id: `egg-${Date.now()}` });
    if (this.easterEggDiscoveries.length > 500) this.easterEggDiscoveries.length = 500;
  }

  async getEasterEggStats(): Promise<any> {
    const counts: Record<string, { name: string; count: number; lastFound: string }> = {};
    for (const d of this.easterEggDiscoveries) {
      if (!counts[d.eggId]) counts[d.eggId] = { name: d.eggName, count: 0, lastFound: d.timestamp };
      counts[d.eggId].count++;
    }
    return {
      totalDiscoveries: this.easterEggDiscoveries.length,
      uniqueEggs: Object.keys(counts).length,
      byEgg: Object.entries(counts).map(([id, v]) => ({ id, ...v })),
      recent: this.easterEggDiscoveries.slice(0, 20),
    };
  }

  // Analytics methods - mock implementations for in-memory storage
  async createPageView(view: any): Promise<void> {
    // Mock implementation - no-op
  }

  async createSearchAnalytic(search: any): Promise<void> {
    // Mock implementation - no-op
  }

  async createNavigationAnalytic(navigation: any): Promise<void> {
    // Mock implementation - no-op
  }

  async createUserSession(session: any): Promise<void> {
    // Mock implementation - no-op
  }

  async updateUserSession(sessionId: string, updates: any): Promise<void> {
    // Mock implementation - no-op
  }

  async getAnalyticsSummary(_days: number = 30): Promise<any> {
    // Fresh-install MemStorage â€” no persistent analytics yet. Return
    // ZEROS not made-up numbers so admins can trust what they see.
    // The real numbers appear once Firestore/Postgres is configured
    // and the client starts writing via /api/telemetry/*.
    return {
      totalVisitors: 0,
      totalPageViews: 0,
      totalSearches: 0,
      totalNavigationRequests: 0,
      topCountries: [],
      topBrowsers: [],
      peakHours: [],
      avgSessionDuration: 0,
    };
  }

  async getTopSearches(limit: number = 10): Promise<any[]> {
    // Mock top searches
    // Fresh install â€” no persistent search analytics yet.
    return [];
  }

  async getPopularRooms(_limit: number = 10): Promise<any[]> {
    return [];
  }

  async getVisitorStats(_days: number = 30): Promise<any> {
    return {
      uniqueVisitors: 0,
      returningVisitors: 0,
      newVisitors: 0,
      bounceRate: 0,
      avgPagesPerSession: 0,
      topReferrers: [],
    };
  }

  async getLiveAnalytics(): Promise<any> { return {}; }
  async getAnalyticsEvents(_timeRange: string, _limit: number): Promise<any[]> { return []; }
  async getPerformanceMetrics(_timeRange: string): Promise<any> { return {}; }

}

// Create storage factory function
async function createStorage(): Promise<IStorage> {
  if (process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL) {
    try {
      const { DatabaseStorage } = await import('./postgresStorage.js');
      return new DatabaseStorage() as unknown as IStorage;
    } catch (error) {
      console.warn('PostgreSQL unavailable, falling back to in-memory storage:', error);
    }
  }
  return new MemStorage();
}
export const storage = await createStorage();
